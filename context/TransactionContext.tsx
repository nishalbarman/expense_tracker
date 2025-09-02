// context/TransactionContext.tsx

import NetInfo from "@react-native-community/netinfo";
import firestore, { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import "react-native-get-random-values";
import Toast from "react-native-toast-message";
import { v4 as uuidv4 } from "uuid";
import type { Transaction, TransactionContextType } from "../types";
import { mmkvStorage } from "@/mmkv/mmkvStorage";

const LOCAL_UID = "__local__"; // placeholder userId for pre-login items [11]

/**
 * Firestore rules reminder (flat collection):
 * allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
 * Queries must include where("userId","==",auth.uid). [6][10]
 */

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const useTransactions = (): TransactionContextType => {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error("useTransactions must be used within a TransactionProvider");
  }
  return context;
};

interface TransactionProviderProps {
  children: ReactNode;
}

export const TransactionProvider: React.FC<TransactionProviderProps> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [uid, setUid] = useState<string | null>(null);

  const [pendingIntent, setPendingIntent] = useState<"sync_all" | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  // Persisted flags/queues
  useEffect(() => {
    mmkvStorage.getItem("autoSync").then((val) => {
      if (val !== null) setAutoSync(val === "true");
    });
  }, []); // [11]
  useEffect(() => {
    mmkvStorage.setItem("autoSync", String(autoSync));
  }, [autoSync]); // [11]
  useEffect(() => {
    mmkvStorage
      .getItem("pendingDeletes")
      .then((val) => {
        if (val) setPendingDeleteIds(JSON.parse(val));
      })
      .catch(() => {});
  }, []); // [11]

  // Listen to Firebase Auth state; migrate local -> uid on first login; hydrate; optionally autosync
  useEffect(() => {
    const unsub = auth().onAuthStateChanged(async (user) => {
      const nextUid = user?.uid ?? null;
      setUid(nextUid);

      if (nextUid) {
        // 1) migrate any "__local__" items to this uid so they don't disappear post-login [11][1]
        await migrateLocalTransactionsToUid(nextUid);

        // 2) hydrate local for this uid (only my items kept in memory) [11]
        await loadTransactions(nextUid);
        setLoading(false);

        // 3) resume pending intent (e.g., user tapped "Sync now" before login) [2]
        if (pendingIntent === "sync_all") {
          setPendingIntent(null);
          setShowLogin(false);
          if (autoSync && !isSyncing) {
            await syncAllTransactions();
          }
        } else if (autoSync && !isSyncing) {
          // If auto-sync is ON, proceed
          await syncAllTransactions();
        }
      } else {
        // Signed out: hydrate whatever is locally cached (may include LOCAL_UID rows)
        const stored = await mmkvStorage.getItem("transactions");
        if (stored) setTransactions(JSON.parse(stored));
        setLoading(false);
      }
    });
    return unsub;
  }, [autoSync, isSyncing, pendingIntent]); // [2][11]

  // Also listen for connectivity to attempt sync when back online and authenticated
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && autoSync && !isSyncing && auth().currentUser?.uid) {
        syncAllTransactions();
      }
    });
    return unsubscribe;
  }, [autoSync, isSyncing]); // [11]

  // Storage helpers
  const saveTransactions = async (arr: Transaction[]) => {
    await mmkvStorage.setItem("transactions", JSON.stringify(arr));
  }; // [11]
  const savePendingDeletes = async (ids: string[]) => {
    await mmkvStorage.setItem("pendingDeletes", JSON.stringify(ids));
  }; // [11]

  // Migration: rewrite pre-login items to new uid and mark unsynced
  const migrateLocalTransactionsToUid = async (newUid: string) => {
    try {
      const stored = await mmkvStorage.getItem("transactions");
      const arr: Transaction[] = stored ? JSON.parse(stored) : [];
      let changed = false;
      const migrated = arr.map((tx) => {
        if (!tx.userId || tx.userId === LOCAL_UID) {
          changed = true;
          return { ...tx, userId: newUid, synced: false };
        }
        return tx;
      });
      if (changed) {
        setTransactions(migrated);
        await saveTransactions(migrated);
      }
    } catch (e) {
      console.warn("Migration skipped:", e);
    }
  }; // [11][1]

  // Load current user's transactions from local cache; if empty for that user, fetch initial server copy
  const loadTransactions = async (userId: string): Promise<void> => {
    try {
      const storedTransactions = await mmkvStorage.getItem("transactions");
      if (storedTransactions) {
        const all = JSON.parse(storedTransactions) as Transaction[];
        const mine = all.filter((t) => t.userId === userId);
        setTransactions(mine);
        if (mine.length === 0) {
          const lastSyncTime = await getLastSyncTime(userId);
          const serverTransactions = await fetchServerTransactions(userId, lastSyncTime);
          setTransactions(serverTransactions);
          await saveTransactions(serverTransactions);
          await updateLastSyncTime(userId, new Date().toISOString());
        }
      } else {
        const lastSyncTime = new Date(0).toISOString();
        const serverTransactions = await fetchServerTransactions(userId, lastSyncTime);
        setTransactions(serverTransactions);
        await saveTransactions(serverTransactions);
        await updateLastSyncTime(userId, new Date().toISOString());
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
      Toast.show({ type: "error", text1: "Error", text2: "Failed to load transactions." });
    }
  }; // [11][6]

  // Offline-first CRUD: always write locally; only network when signed-in
  const addTransaction = async (newTx: Omit<Transaction, "id" | "synced" | "userId">) => {
    const user = auth().currentUser;
    const effectiveUid = user?.uid ?? LOCAL_UID;
    const tx: Transaction = {
      ...newTx,
      id: uuidv4(),
      synced: !!user,
      userId: effectiveUid,
    };
    const next = [...transactions, tx];
    await saveTransactions(next);
    setTransactions(next);
    if (user?.uid) await syncSingleTransaction({ ...tx, userId: user.uid });
  }; // [11]

  const updateTransaction = async (next: Transaction) => {
    const updated = { ...next, synced: false };
    setTransactions((prev) => {
      const arr = prev.map((t) => (t.id === updated.id ? updated : t));
      saveTransactions(arr).catch(() => {});
      return arr;
    });
    const user = auth().currentUser;
    if (user?.uid) {
      await attemptUpdateTransaction(updated.id, {
        amount: updated.amount,
        category: updated.category,
        date: updated.date,
        notes: updated.notes,
        type: updated.type,
        userId: user.uid,
        timestamp: firestore.Timestamp.fromDate(new Date(updated.date)),
      });
      await markTransactionAsSynced(updated.id);
    }
  }; // [11]

  const deleteTransaction = async (id: string) => {
    const next = transactions.filter((t) => t.id !== id);
    setTransactions(next);
    await saveTransactions(next);
    const user = auth().currentUser;
    if (user?.uid) {
      try {
        await attemptDeleteTransaction(id);
      } catch {
        queuePendingDelete(id);
      }
    } else {
      queuePendingDelete(id);
    }
  }; // [11]

  const queuePendingDelete = (id: string) =>
    setPendingDeleteIds((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      savePendingDeletes(next).catch(() => {});
      return next;
    }); // [11]

  // Retryable remote ops
  const attemptDeleteTransaction = async (id: string): Promise<void> => {
    const net = await NetInfo.fetch();
    if (!net.isConnected) throw new Error("Offline");
    const MAX_RETRIES = 5;
    let attempt = 0;
    let delay = 1000;
    while (attempt < MAX_RETRIES) {
      try {
        await firestore().collection("transactions").doc(id).delete();
        setPendingDeleteIds((prev) => {
          const next = prev.filter((x) => x !== id);
          savePendingDeletes(next).catch(() => {});
          return next;
        });
        return;
      } catch (e) {
        attempt += 1;
        if (attempt >= MAX_RETRIES) throw e;
        await sleep(delay);
        delay *= 2;
      }
    }
  }; // [6]

  const attemptUpdateTransaction = async (
    id: string,
    patch: {
      amount: number;
      category: string;
      date: string;
      notes?: string;
      type: Transaction["type"];
      userId: string;
      timestamp: FirebaseFirestoreTypes.Timestamp | any;
    }
  ): Promise<void> => {
    const net = await NetInfo.fetch();
    if (!net.isConnected) throw new Error("Offline");
    const MAX_RETRIES = 5;
    let attempt = 0;
    let delay = 1000;
    while (attempt < MAX_RETRIES) {
      try {
        await firestore().collection("transactions").doc(id).set(patch as any, { merge: true });
        return;
      } catch (e: any) {
        attempt += 1;
        if (attempt >= MAX_RETRIES) throw e;
        await sleep(delay);
        delay *= 2;
      }
    }
  }; // [6]

  // Unsynced selector uses current uid at call-time to avoid stale closure
  const getUnsyncedTransactions = (): Transaction[] => {
    const uidNow = auth().currentUser?.uid;
    if (!uidNow) return [];
    return transactions.filter((tx) => !tx.synced && tx.userId === uidNow);
  }; // [6]

  // Server fetch with inclusive timestamp to avoid missing same-time docs
  const fetchServerTransactions = async (userId: string, lastSyncTime: string): Promise<Transaction[]> => {
    try {
      const querySnapshot = await firestore()
        .collection("transactions")
        .where("userId", "==", userId)
        .where("timestamp", ">=", firestore.Timestamp.fromDate(new Date(lastSyncTime)))
        .get();
      const serverTransactions: Transaction[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as any;
        serverTransactions.push({
          id: doc.id,
          amount: data.amount,
          category: data.category,
          date: data.date,
          notes: data.notes,
          type: data.type,
          userId: data.userId,
          synced: true,
        });
      });
      return serverTransactions;
    } catch (error) {
      console.error("Error fetching server transactions:", error);
      throw error;
    }
  }; // [6][10]

  const getLastSyncTime = async (userId: string): Promise<string> => {
    try {
      const lastSync = await mmkvStorage.getItem(`lastSyncTime:${userId}`);
      return lastSync || new Date(0).toISOString();
    } catch (error) {
      console.error("Error getting last sync time:", error);
      return new Date(0).toISOString();
    }
  }; // [11]

  const updateLastSyncTime = async (userId: string, timestamp: string): Promise<void> => {
    try {
      await mmkvStorage.setItem(`lastSyncTime:${userId}`, timestamp);
    } catch (error) {
      console.error("Error updating last sync time:", error);
    }
  }; // [11]

  // Merge server -> local for current auth uid only
  const mergeTransactions = async (serverTransactions: Transaction[]) => {
    try {
      const uidNow = auth().currentUser?.uid;
      setTransactions((prevTransactions) => {
        const localMap = new Map(prevTransactions.map((tx) => [tx.id, tx]));
        const merged = [...prevTransactions];
        serverTransactions.forEach((serverTx) => {
          if (!localMap.has(serverTx.id)) {
            merged.push({ ...serverTx, synced: true });
          }
        });
        const onlyMine = uidNow ? merged.filter((t) => t.userId === uidNow) : merged;
        saveTransactions(onlyMine).catch(() => {});
        return onlyMine;
      });
    } catch (error) {
      console.error("Error merging transactions:", error);
      throw error;
    }
  }; // [11]

  const syncSingleTransaction = async (transaction: Transaction): Promise<void> => {
    if (isSyncing) {
      console.log("Currently syncing. Queuing transaction for later sync.");
      return;
    }
    setIsSyncing(true);
    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        Toast.show({ type: "info", text1: "Offline Mode", text2: "Using local data. Will sync when online." });
        return;
      }
      await attemptSyncTransaction(transaction);
    } catch (error) {
      console.error("Sync failed for transaction:", transaction.id, error);
      Toast.show({ type: "error", text1: "Sync Failed", text2: "Will retry when online." });
    } finally {
      setIsSyncing(false);
    }
  }; // [11]

  const attemptSyncTransaction = async (transaction: Transaction): Promise<void> => {
    const MAX_RETRIES = 5;
    let attempt = 0;
    let success = false;
    let delay = 1000;
    while (attempt < MAX_RETRIES && !success) {
      try {
        const uidNow = auth().currentUser?.uid;
        if (!uidNow) throw new Error("No auth user");
        await uploadTransaction({ ...transaction, userId: uidNow });
        await markTransactionAsSynced(transaction.id);
        success = true;
        Toast.show({ type: "success", text1: "Upload Successful", text2: `Transaction ${transaction.id} synced.` });
      } catch (error) {
        attempt += 1;
        if (attempt < MAX_RETRIES) {
          await sleep(delay);
          delay *= 2;
        } else {
          console.error(`Failed to upload transaction ${transaction.id} after ${MAX_RETRIES} attempts`);
          Toast.show({ type: "error", text1: "Sync Error", text2: `Failed to sync transaction ${transaction.id}.` });
        }
      }
    }
  }; // [6]

  const markTransactionAsSynced = async (id: string): Promise<void> => {
    try {
      setTransactions((prevTransactions) => {
        const updatedTransactions = prevTransactions.map((tx) => (tx.id === id ? { ...tx, synced: true } : tx));
        saveTransactions(updatedTransactions).catch((error) => {
          console.error("Error saving to mmkvStorage:", error);
        });
        return updatedTransactions;
      });
    } catch (error) {
      console.error("Error marking transaction as synced:", error);
    }
  }; // [11]

  const uploadTransaction = async (transaction: Transaction): Promise<void> => {
    try {
      await firestore().collection("transactions").doc(transaction.id).set(
        {
          amount: transaction.amount,
          category: transaction.category,
          date: transaction.date,
          notes: transaction.notes,
          type: transaction.type,
          userId: transaction.userId,
          timestamp: firestore.Timestamp.fromDate(new Date(transaction.date)),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error uploading transaction:", error);
      throw error;
    }
  }; // [6]

  // Auth-gated sync
  const requireLogin = async () => {
    if (auth().currentUser?.uid) return true;
    setPendingIntent("sync_all");
    setShowLogin(true);
    Toast.show({ type: "info", text1: "Login required", text2: "Sign in to sync & back up." });
    return false;
  }; // [2][1]

  const syncAllTransactions = async (): Promise<void> => {
    if (isSyncing) return;
    if (!auth().currentUser?.uid) {
      await requireLogin();
      return;
    }
    setIsSyncing(true);
    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        Toast.show({ type: "info", text1: "Offline Mode", text2: "Using local data. Will sync when online." });
        return;
      }

      // 1) process queued deletions first
      if (pendingDeleteIds.length > 0) {
        const toDelete = [...pendingDeleteIds];
        for (const id of toDelete) {
          try {
            await attemptDeleteTransaction(id);
            setTransactions((prev) => {
              const next = prev.filter((t) => t.id !== id);
              saveTransactions(next).catch(() => {});
              return next;
            });
          } catch {
            console.warn("Delete retry pending for id:", id);
          }
        }
      }

      // 2) upload unsynced
      const unsyncedTransactions = getUnsyncedTransactions();
      if (unsyncedTransactions.length > 0) {
        Toast.show({
          type: "info",
          text1: "Syncing",
          text2: `Uploading ${unsyncedTransactions.length} transactions...`,
        });
        for (const transaction of unsyncedTransactions) {
          await attemptSyncTransaction(transaction);
        }
      }

      // 3) fetch and merge from server
      await fetchAndMergeServerTransactions();
    } catch (error) {
      console.error("Bulk sync process failed:", error);
      Toast.show({ type: "error", text1: "Sync Failed", text2: "Changes saved locally. Will retry when online." });
    } finally {
      setIsSyncing(false);
    }
  }; // [11][6]

  const fetchAndMergeServerTransactions = async (): Promise<void> => {
    const uidNow = auth().currentUser?.uid;
    if (!uidNow) return;
    const since = await getLastSyncTime(uidNow);
    const serverTxs = await fetchServerTransactions(uidNow, since);
    if (serverTxs.length > 0) {
      await mergeTransactions(serverTxs);
      const maxMillis = serverTxs.reduce((m, t) => {
        const ts = new Date(t.date).getTime();
        return ts > m ? ts : m;
      }, new Date(since).getTime());
      await updateLastSyncTime(uidNow, new Date(maxMillis).toISOString());
      Toast.show({ type: "success", text1: "Sync Complete", text2: `Updated with ${serverTxs.length} items.` });
    }
  }; // [12][10]

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)); // [11]

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        addTransaction,
        deleteTransaction,
        updateTransaction,
        syncAllTransactions,
        isSyncing,
        autoSync,
        setAutoSync: (value: boolean) => setAutoSync(value),
      }}>
      {children}
      {/* Render a global login modal/screen when showLogin is true.
         Implement the modal to perform sign-in or link anonymous -> credential, then onAuthStateChanged resumes sync. [2][1] */}
    </TransactionContext.Provider>
  );
};
