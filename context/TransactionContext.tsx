// context/TransactionContext.tsx
// import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import "react-native-get-random-values";
import Toast from "react-native-toast-message";
import { v4 as uuidv4 } from "uuid";
import type { Transaction, TransactionContextType } from "../types";
import { mmkvStorage } from "@/mmkv/mmkvStorage";

/**
 * IMPORTANT: Ensure Firestore Security Rules restrict per-user access.
 * Example rule patterns:
 *
 * 1) Flat collection with userId field:
 * match /databases/{db}/documents {
 *   match /transactions/{id} {
 *     allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
 *   }
 * }
 *
 * Queries must include where("userId","==",auth.uid) to match rules. [5][2]
 *
 * 2) Alternative structure: /users/{uid}/transactions/{id}
 * match /databases/{db}/documents {
 *   match /users/{userId}/transactions/{id} {
 *     allow read, write: if request.auth != null && request.auth.uid == userId;
 *   }
 * }
 *
 * Either approach is OK. This provider uses the flat collection + userId field. [5]
 */

const TransactionContext = createContext<TransactionContextType | undefined>(
  undefined
);

export const useTransactions = (): TransactionContextType => {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error(
      "useTransactions must be used within a TransactionProvider"
    );
  }
  return context;
};

interface TransactionProviderProps {
  children: ReactNode;
}

export const TransactionProvider: React.FC<TransactionProviderProps> = ({
  children,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [uid, setUid] = useState<string | null>(null);

  // Listen to auth state (anonymous or logged-in) and set UID
  useEffect(() => {
    const unsub = auth().onAuthStateChanged(async (user) => {
      if (!user) {
        // ensure user is signed in anonymously to get a UID
        // const cred = await auth().signInAnonymously();
        // setUid(cred.user.uid);
        setUid(null);
      } else {
        setUid(user.uid);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    mmkvStorage.getItem("autoSync").then((val) => {
      if (val !== null) setAutoSync(val === "true");
    });
  }, []);

  useEffect(() => {
    mmkvStorage.setItem("autoSync", String(autoSync));
  }, [autoSync]);

  // Load pending delete queue on mount
  useEffect(() => {
    mmkvStorage
      .getItem("pendingDeletes")
      .then((val) => {
        if (val) setPendingDeleteIds(JSON.parse(val));
      })
      .catch(() => {});
  }, []);

  // Initialize after uid is available
  useEffect(() => {
    if (!uid) return;
    const initialize = async () => {
      await loadTransactions(uid);
      setLoading(false);
    };
    initialize();

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && !loading && autoSync && !isSyncing) {
        syncAllTransactions();
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, autoSync]);

  // Run sync when autoSync toggles on
  useEffect(() => {
    if (autoSync && !loading && !isSyncing) {
      syncAllTransactions();
    }
  }, [autoSync, loading]);

  const saveTransactions = async (arr: Transaction[]) => {
    await mmkvStorage.setItem("transactions", JSON.stringify(arr));
  };

  const savePendingDeletes = async (ids: string[]) => {
    await mmkvStorage.setItem("pendingDeletes", JSON.stringify(ids));
  };

  /**
   * Load transactions for current user from local cache; if empty, fetch from server
   */
  const loadTransactions = async (userId: string): Promise<void> => {
    try {
      const storedTransactions = await mmkvStorage.getItem("transactions");
      if (storedTransactions) {
        const all = JSON.parse(storedTransactions) as Transaction[];
        // Filter to current user only in case previous sessions cached other users (defensive)
        const mine = all.filter((t) => t.userId === userId);
        setTransactions(mine);
        // Optional: also hydrate from server to refresh
        if (mine.length === 0) {
          const lastSyncTime = await getLastSyncTime(userId);
          const serverTransactions = await fetchServerTransactions(
            userId,
            lastSyncTime
          );
          setTransactions(serverTransactions);
          await saveTransactions(serverTransactions);
          await updateLastSyncTime(userId, new Date().toISOString());
        }
      } else {
        // No local transactions → fetch from server
        const lastSyncTime = new Date(0).toISOString(); // fetch all
        const serverTransactions = await fetchServerTransactions(
          userId,
          lastSyncTime
        );
        setTransactions(serverTransactions);
        await saveTransactions(serverTransactions);
        await updateLastSyncTime(userId, new Date().toISOString());
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load transactions.",
      });
    }
  };

  /**
   * Add a new transaction (for current user only)
   */
  const addTransaction = async (
    newTransaction: Omit<Transaction, "id" | "synced" | "userId">
  ): Promise<void> => {
    try {
      if (!uid) throw new Error("No user");
      const transactionWithId: Transaction = {
        ...newTransaction,
        id: uuidv4(),
        synced: false,
        userId: uid,
      };

      const updatedTransactions = [...transactions, transactionWithId];

      await saveTransactions(updatedTransactions);

      setTransactions((prevTransactions) => [
        ...prevTransactions,
        transactionWithId,
      ]);

      // Attempt to sync after adding
      await syncSingleTransaction(transactionWithId);
    } catch (error) {
      console.error("Error adding transaction:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to add transaction.",
      });
    }
  };

  /**
   * Update an existing transaction (offline-first, mark unsynced)
   */
  const updateTransaction = async (next: Transaction): Promise<void> => {
    try {
      if (!uid) throw new Error("No user");
      if (next.userId !== uid) {
        Toast.show({
          type: "error",
          text1: "Not allowed",
          text2: "Cannot edit another user's transaction.",
        });
        return;
      }

      const exists = transactions.some((t) => t.id === next.id);
      if (!exists) {
        Toast.show({
          type: "error",
          text1: "Not found",
          text2: "Transaction does not exist.",
        });
        return;
      }

      const updated: Transaction = { ...next, userId: uid, synced: false };

      setTransactions((prev) => {
        const arr = prev.map((t) => (t.id === updated.id ? updated : t));
        saveTransactions(arr).catch(() => {});
        return arr;
      });

      // Try remote update (best-effort)
      await attemptUpdateTransaction(updated.id, {
        amount: updated.amount,
        category: updated.category,
        date: updated.date,
        notes: updated.notes,
        type: updated.type,
        userId: uid,
        timestamp: firestore.Timestamp.fromDate(new Date(updated.date)),
      });

      await markTransactionAsSynced(updated.id);
      Toast.show({
        type: "success",
        text1: "Updated",
        text2: "Changes saved.",
      });
    } catch (err) {
      console.error("Error updating transaction:", err);
      Toast.show({
        type: "error",
        text1: "Update failed",
        text2: "Saved locally. Will retry when online.",
      });
    }
  };

  /**
   * Delete a transaction locally first; try remote delete; on failure queue for retry.
   */
  const deleteTransaction = async (id: string): Promise<void> => {
    try {
      if (!uid) throw new Error("No user");
      const existing = transactions.find((t) => t.id === id);
      if (!existing) {
        Toast.show({
          type: "info",
          text1: "Not found",
          text2: "Transaction already removed.",
        });
        return;
      }
      if (existing.userId !== uid) {
        Toast.show({
          type: "error",
          text1: "Not allowed",
          text2: "Cannot delete another user's transaction.",
        });
        return;
      }

      // Optimistic local removal
      const remaining = transactions.filter((t) => t.id !== id);
      setTransactions(remaining);
      await saveTransactions(remaining);

      // Try remote delete
      await attemptDeleteTransaction(id);
      Toast.show({
        type: "success",
        text1: "Deleted",
        text2: "Transaction removed.",
      });
    } catch (err) {
      // Queue for retry
      setPendingDeleteIds((prev) => {
        const next = prev.includes(id) ? prev : [...prev, id];
        savePendingDeletes(next).catch(() => {});
        return next;
      });
      Toast.show({
        type: "error",
        text1: "Delete failed",
        text2: "Will retry when online.",
      });
    }
  };

  /**
   * Attempt Firestore delete with connectivity check + backoff
   */
  const attemptDeleteTransaction = async (id: string): Promise<void> => {
    const net = await NetInfo.fetch();
    if (!net.isConnected) throw new Error("Offline");

    const MAX_RETRIES = 5;
    let attempt = 0;
    let delay = 1000;

    while (attempt < MAX_RETRIES) {
      try {
        await firestore().collection("transactions").doc(id).delete();
        // On success, remove from pending queue if present
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
  };

  /**
   * Attempt Firestore update with retry and connectivity check
   */
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
        // If doc may not exist, you can use set({ ...patch }, { merge: true })
        await firestore()
          .collection("transactions")
          .doc(id)
          .update(patch as any);
        return;
      } catch (e: any) {
        attempt += 1;
        if (attempt >= MAX_RETRIES) throw e;
        await sleep(delay);
        delay *= 2;
      }
    }
  };

  /**
   * Get unsynced transactions (current user only)
   */
  const getUnsyncedTransactions = (): Transaction[] => {
    return transactions.filter((tx) => !tx.synced && tx.userId === uid);
  };

  /**
   * Fetch new transactions from the server for current user
   */
  const fetchServerTransactions = async (
    userId: string,
    lastSyncTime: string
  ): Promise<Transaction[]> => {
    try {
      // Query constrained by userId to satisfy rules and limit result set to the user. [5]
      const querySnapshot = await firestore()
        .collection("transactions")
        .where("userId", "==", userId)
        .where(
          "timestamp",
          ">",
          firestore.Timestamp.fromDate(new Date(lastSyncTime))
        )
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
  };

  /**
   * Get the last synchronization timestamp per user
   */
  const getLastSyncTime = async (userId: string): Promise<string> => {
    try {
      const lastSync = await mmkvStorage.getItem(`lastSyncTime:${userId}`);
      return lastSync || new Date(0).toISOString();
    } catch (error) {
      console.error("Error getting last sync time:", error);
      return new Date(0).toISOString();
    }
  };

  /**
   * Update the last synchronization timestamp per user
   */
  const updateLastSyncTime = async (
    userId: string,
    timestamp: string
  ): Promise<void> => {
    try {
      await mmkvStorage.setItem(`lastSyncTime:${userId}`, timestamp);
    } catch (error) {
      console.error("Error updating last sync time:", error);
    }
  };

  /**
   * Merge server transactions into local transactions (current user scope)
   */
  const mergeTransactions = async (serverTransactions: Transaction[]) => {
    try {
      setTransactions((prevTransactions) => {
        const localMap = new Map(prevTransactions.map((tx) => [tx.id, tx]));
        const merged = [...prevTransactions];

        serverTransactions.forEach((serverTx) => {
          if (!localMap.has(serverTx.id)) {
            merged.push({ ...serverTx, synced: true });
          }
        });

        // Also keep only current user's transactions in cache
        const onlyMine = uid ? merged.filter((t) => t.userId === uid) : merged;

        saveTransactions(onlyMine).catch(() => {});
        return onlyMine;
      });
    } catch (error) {
      console.error("Error merging transactions:", error);
      throw error;
    }
  };

  /**
   * Sync a single transaction with the server
   */
  const syncSingleTransaction = async (
    transaction: Transaction
  ): Promise<void> => {
    if (isSyncing) {
      console.log("Currently syncing. Queuing transaction for later sync.");
      return;
    }

    setIsSyncing(true);
    console.log("Starting sync for transaction:", transaction.id);

    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        console.log(
          "No internet connection. Transaction will sync when online."
        );
        Toast.show({
          type: "info",
          text1: "Offline Mode",
          text2: "Using local data. Will sync when online.",
        });
        return;
      }

      await attemptSyncTransaction(transaction);
    } catch (error) {
      console.error("Sync failed for transaction:", transaction.id, error);
      Toast.show({
        type: "error",
        text1: "Sync Failed",
        text2: "Will retry when online.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Attempt to sync a single transaction with retry logic
   */
  const attemptSyncTransaction = async (
    transaction: Transaction
  ): Promise<void> => {
    const MAX_RETRIES = 5;
    let attempt = 0;
    let success = false;
    let delay = 1000;

    while (attempt < MAX_RETRIES && !success) {
      try {
        await uploadTransaction(transaction);
        await markTransactionAsSynced(transaction.id);
        success = true;
        Toast.show({
          type: "success",
          text1: "Upload Successful",
          text2: `Transaction ${transaction.id} synced.`,
        });
      } catch (error) {
        attempt += 1;
        console.warn(
          `Retrying upload for transaction ${transaction.id} (Attempt ${attempt})`
        );
        if (attempt < MAX_RETRIES) {
          await sleep(delay);
          delay *= 2;
        } else {
          console.error(
            `Failed to upload transaction ${transaction.id} after ${MAX_RETRIES} attempts`
          );
          Toast.show({
            type: "error",
            text1: "Sync Error",
            text2: `Failed to sync transaction ${transaction.id}.`,
          });
        }
      }
    }
  };

  /**
   * Mark a single transaction as synced
   */
  const markTransactionAsSynced = async (id: string): Promise<void> => {
    try {
      setTransactions((prevTransactions) => {
        const updatedTransactions = prevTransactions.map((tx) =>
          tx.id === id ? { ...tx, synced: true } : tx
        );
        saveTransactions(updatedTransactions).catch((error) => {
          console.error("Error saving to mmkvStorage:", error);
        });
        return updatedTransactions;
      });
    } catch (error) {
      console.error("Error marking transaction as synced:", error);
    }
  };

  /**
   * Upload a single transaction to Firestore (includes userId)
   */
  const uploadTransaction = async (transaction: Transaction): Promise<void> => {
    try {
      await firestore()
        .collection("transactions")
        .doc(transaction.id)
        .set(
          {
            amount: transaction.amount,
            category: transaction.category,
            date: transaction.date,
            notes: transaction.notes,
            type: transaction.type,
            userId: transaction.userId, // critical for per-user scoping [5]
            timestamp: firestore.Timestamp.fromDate(new Date(transaction.date)),
          },
          { merge: true }
        );
      console.log("Uploaded transaction to Firestore:", transaction.id);
    } catch (error) {
      console.error("Error uploading transaction:", error);
      throw error;
    }
  };

  /**
   * Sync all unsynced transactions with the server
   */
  const syncAllTransactions = async (): Promise<void> => {
    if (isSyncing) {
      console.log("Currently syncing. Please wait.");
      return;
    }
    if (!uid) return;

    setIsSyncing(true);
    console.log("Starting bulk sync process...");

    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        console.log("No internet connection. Using offline data.");
        Toast.show({
          type: "info",
          text1: "Offline Mode",
          text2: "Using local data. Will sync when online.",
        });
        return;
      }

      // 1) Process deletions first
      if (pendingDeleteIds.length > 0) {
        const toDelete = [...pendingDeleteIds];
        for (const id of toDelete) {
          try {
            await attemptDeleteTransaction(id);
            // If item still exists locally for some reason, remove it
            setTransactions((prev) => {
              const next = prev.filter((t) => t.id !== id);
              saveTransactions(next).catch(() => {});
              return next;
            });
          } catch (e) {
            console.warn("Delete retry pending for id:", id);
          }
        }
      }

      // 2) Upload unsynced transactions for current user
      const unsyncedTransactions = getUnsyncedTransactions();
      console.log(`Found ${unsyncedTransactions.length} unsynced transactions`);

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

      // 3) After uploading, fetch and merge server transactions
      await fetchAndMergeServerTransactions();
    } catch (error) {
      console.error("Bulk sync process failed:", error);
      Toast.show({
        type: "error",
        text1: "Sync Failed",
        text2: "Changes saved locally. Will retry when online.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Fetch and merge server transactions for current user
   */
  const fetchAndMergeServerTransactions = async (): Promise<void> => {
    try {
      if (!uid) return;
      const lastSyncTime = await getLastSyncTime(uid);
      const serverTransactions = await fetchServerTransactions(
        uid,
        lastSyncTime
      );

      if (serverTransactions.length > 0) {
        await mergeTransactions(serverTransactions);
        const newSyncTime = new Date().toISOString();
        await updateLastSyncTime(uid, newSyncTime);
        Toast.show({
          type: "success",
          text1: "Sync Complete",
          text2: `Updated with ${serverTransactions.length} new transactions.`,
        });
      }
    } catch (error) {
      console.error("Error during server sync:", error);
      Toast.show({
        type: "error",
        text1: "Sync Error",
        text2: "Failed to sync with server. Local data preserved.",
      });
    }
  };

  /**
   * Utility function to pause execution for a given time
   */
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

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
    </TransactionContext.Provider>
  );
};
