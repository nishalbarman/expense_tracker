// context/TransactionContext.tsx

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
  useRef,
  useState,
} from "react";
import "react-native-get-random-values";
import Toast from "react-native-toast-message";
import { v4 as uuidv4 } from "uuid";
import type { Transaction, TransactionContextType } from "../types";
import { mmkvStorage } from "@/mmkv/mmkvStorage";

/* ---------------- Utilities: dedup logs and toasts ---------------- */

// Dedup logger: suppress same message within windowMs
const makeDedupLogger = (windowMs = 3000) => {
  const lastMap = new Map<string, number>();
  return {
    info: (msg: string, ...args: any[]) => {
      const now = Date.now();
      const last = lastMap.get(msg) ?? 0;
      if (now - last > windowMs) {
        // eslint-disable-next-line no-console
        console.log(msg, ...args);
        lastMap.set(msg, now);
      }
    },
    warn: (msg: string, ...args: any[]) => {
      const now = Date.now();
      const last = lastMap.get(msg) ?? 0;
      if (now - last > windowMs) {
        // eslint-disable-next-line no-console
        console.warn(msg, ...args);
        lastMap.set(msg, now);
      }
    },
    error: (msg: string, ...args: any[]) => {
      const now = Date.now();
      const last = lastMap.get(msg) ?? 0;
      if (now - last > windowMs) {
        // eslint-disable-next-line no-console
        console.error(msg, ...args);
        lastMap.set(msg, now);
      }
    },
  };
};
const log = makeDedupLogger(4000); // 4s window

// Toast manager to prevent duplicates; uses stable toastIds
const ToastIds = {
  Offline: "toast-offline",
  LoginRequired: "toast-login-required",
  Syncing: "toast-syncing",
  SyncDone: "toast-sync-done",
  SyncFailed: "toast-sync-failed",
};

const showToastOnce = (
  type: "info" | "success" | "error",
  id: string,
  text1: string,
  text2?: string
) => {
  // @ts-ignore react-native-toast-message has isVisible(id) starting v3; if not, emulate via internal store or track locally
  const anyToastVisible = (Toast as any)?.isVisible?.(id);
  if (anyToastVisible) return;
  Toast.show({ type, text1, text2, props: { toastId: id } as any });
}; // Prevent duplicates by id [react-toast libraries use ids to dedupe patterns] [3][4]

/* ---------------- Core code ---------------- */

const LOCAL_UID = "__local__";
type SyncAnchor = { lastDocPath: string | null };

const TransactionContext = createContext<TransactionContextType | undefined>(
  undefined
);
export const useTransactions = (): TransactionContextType => {
  const context = useContext(TransactionContext);
  if (context === undefined)
    throw new Error(
      "useTransactions must be used within a TransactionProvider"
    );
  return context;
};

interface TransactionProviderProps {
  children: ReactNode;
}

const KEY_TX_ALL = "transactions";
const KEY_AUTO_SYNC = "autoSync";
const KEY_PENDING_DELETES = "pendingDeletes";
const keyAnchor = (uid: string) => `syncAnchor:${uid}`;

const userQuery = (uid: string) =>
  firestore()
    .collection("transactions")
    .where("userId", "==", uid)
    .orderBy("timestamp", "asc"); // rule-aligned and stable ordering [11]

export const TransactionProvider: React.FC<TransactionProviderProps> = ({
  children,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [uid, setUid] = useState<string | null>(null);

  const [pendingIntent, setPendingIntent] = useState<"sync_all" | null>(null);

  const queuedUploadsRef = useRef<Set<string>>(new Set());
  const lastSyncTriggeredAtRef = useRef<number>(0); // throttle sync triggers
  const SYNC_COOLDOWN_MS = 4000;

  // Persisted items
  useEffect(() => {
    let mounted = true;
    mmkvStorage.getItem(KEY_AUTO_SYNC).then((val) => {
      if (!mounted) return;
      if (val !== null) setAutoSync(val === "true");
    });
    mmkvStorage
      .getItem(KEY_PENDING_DELETES)
      .then((val) => {
        if (!mounted) return;
        if (val) setPendingDeleteIds(JSON.parse(val));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    mmkvStorage.setItem(KEY_AUTO_SYNC, String(autoSync));
  }, [autoSync]);

  const liveUnsubRef = { current: null as null | (() => void) };

  // Auth listener (subscribe once)
  useEffect(() => {
    const unsub = auth().onAuthStateChanged(async (user) => {
      const nextUid = user?.uid ?? null;
      setUid(nextUid);

      // Tear down any previous live listener
      if (liveUnsubRef.current) {
        liveUnsubRef.current();
        liveUnsubRef.current = null;
      }

      if (nextUid) {
        await migrateLocalTransactionsToUid(nextUid);
        await loadTransactions(nextUid);
        setLoading(false);

        // Start live subscription for this user's changes
        try {
          const q = userQuery(nextUid);
          const liveUnsub = q.onSnapshot(
            { includeMetadataChanges: true }, // deliver cached first, then server
            async (snap) => {
              // Apply only incremental changes
              const changes = snap.docChanges();
              if (changes.length > 0) {
                await applyLiveChanges(nextUid, changes);
              }
            },
            (err) => {
              log.error("Live listener error:", err);
            }
          );
          liveUnsubRef.current = liveUnsub;
        } catch (e) {
          log.error("Failed to start live listener:", e);
        }

        if (pendingIntent === "sync_all") {
          setPendingIntent(null);
          requestSyncWithCooldown();
        } else if (autoSync) {
          requestSyncWithCooldown();
        }
      } else {
        const stored = await mmkvStorage.getItem(KEY_TX_ALL);
        if (stored) {
          const all = JSON.parse(stored) as Transaction[];
          setTransactions(all);
        }
        setLoading(false);
      }
    });
    return unsub;
  }, [autoSync, pendingIntent]);

  // Connectivity listener (subscribe once)
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && autoSync && auth().currentUser?.uid) {
        requestSyncWithCooldown();
      }
    });
    return unsubscribe;
  }, [autoSync]);

  const requestSyncWithCooldown = () => {
    const now = Date.now();
    if (now - lastSyncTriggeredAtRef.current < SYNC_COOLDOWN_MS) {
      log.info("Sync skipped due to cooldown");
      return;
    }
    lastSyncTriggeredAtRef.current = now;
    if (!isSyncing) void syncAllTransactions();
  };

  // Storage helpers
  const saveAllTransactions = async (arr: Transaction[]) => {
    await mmkvStorage.setItem(KEY_TX_ALL, JSON.stringify(arr));
  };
  const savePendingDeletes = async (ids: string[]) => {
    await mmkvStorage.setItem(KEY_PENDING_DELETES, JSON.stringify(ids));
  };
  const getSyncAnchor = async (userId: string): Promise<SyncAnchor> => {
    const raw = await mmkvStorage.getItem(keyAnchor(userId));
    return raw ? (JSON.parse(raw) as SyncAnchor) : { lastDocPath: null };
    // Snapshot-based anchor avoids startAfter arity errors. [11]
  };
  const setSyncAnchor = async (userId: string, anchor: SyncAnchor) => {
    await mmkvStorage.setItem(keyAnchor(userId), JSON.stringify(anchor));
  };

  // Migration
  const migrateLocalTransactionsToUid = async (newUid: string) => {
    try {
      const stored = await mmkvStorage.getItem(KEY_TX_ALL);
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
        await saveAllTransactions(migrated);
      }
    } catch (e) {
      log.warn("Migration skipped:", e);
    }
  };

  // Load
  const loadTransactions = async (userId: string): Promise<void> => {
    try {
      const storedTransactions = await mmkvStorage.getItem(KEY_TX_ALL);
      if (storedTransactions) {
        const all = JSON.parse(storedTransactions) as Transaction[];
        const mine = all.filter((t) => t.userId === userId);
        setTransactions(mine);
        if (mine.length === 0) {
          const anchor = await getSyncAnchor(userId);
          const { items, newAnchor } = await fetchServerTransactions(
            userId,
            anchor
          );
          const mergedAll = mergeIntoAllCache(all, items);
          await saveAllTransactions(mergedAll);
          await setSyncAnchor(userId, newAnchor);
          setTransactions(mergedAll.filter((t) => t.userId === userId));
        }
      } else {
        const anchor0: SyncAnchor = { lastDocPath: null };
        const { items, newAnchor } = await fetchServerTransactions(
          userId,
          anchor0
        );
        await saveAllTransactions(items);
        await setSyncAnchor(userId, newAnchor);
        setTransactions(items.filter((t) => t.userId === userId));
      }
    } catch (error) {
      log.error("Error loading transactions:", error);
      showToastOnce(
        "error",
        ToastIds.SyncFailed,
        "Error",
        "Failed to load transactions."
      );
    }
  };

  // CRUD
  const addTransaction = async (
    newTx: Omit<Transaction, "id" | "synced" | "userId">
  ) => {
    const user = auth().currentUser;
    const effectiveUid = user?.uid ?? LOCAL_UID;
    const tx: Transaction = {
      ...newTx,
      id: uuidv4(),
      synced: !!user,
      userId: effectiveUid,
    };
    const stored = await mmkvStorage.getItem(KEY_TX_ALL);
    const all = stored ? (JSON.parse(stored) as Transaction[]) : [];
    const nextAll = [...all, tx];
    await saveAllTransactions(nextAll);
    setTransactions(nextAll.filter((t) => t.userId === effectiveUid));
    if (user?.uid) {
      await syncSingleTransaction({ ...tx, userId: user.uid });
    }
  };

  const updateTransaction = async (next: Transaction) => {
    const updated = { ...next, synced: false };
    setTransactions((prev) => {
      const visibleUpdated = prev.map((t) =>
        t.id === updated.id ? updated : t
      );
      mmkvStorage.getItem(KEY_TX_ALL).then((stored) => {
        const all = stored ? (JSON.parse(stored) as Transaction[]) : [];
        const allUpdated = all.map((t) => (t.id === updated.id ? updated : t));
        saveAllTransactions(allUpdated).catch(() => {});
      });
      return visibleUpdated;
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
      });
      await markTransactionAsSynced(updated.id);
    }
  };

  const deleteTransaction = async (id: string) => {
    const stored = await mmkvStorage.getItem(KEY_TX_ALL);
    const all = stored ? (JSON.parse(stored) as Transaction[]) : [];
    const tx = all.find((t) => t.id === id);
    const nextAll = all.filter((t) => t.id !== id);
    await saveAllTransactions(nextAll);
    setTransactions(nextAll.filter((t) => (uid ? t.userId === uid : true)));

    const user = auth().currentUser;
    if (user?.uid && tx?.synced) {
      try {
        await attemptDeleteTransaction(id);
      } catch {
        queuePendingDelete(id);
      }
    } else if (tx?.synced) {
      queuePendingDelete(id);
    }
  };

  const queuePendingDelete = (id: string) =>
    setPendingDeleteIds((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      savePendingDeletes(next).catch(() => {});
      return next;
    });

  // Remote ops (quiet retries)
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
      } catch (e: any) {
        if (e?.code === "firestore/not-found" || e?.code === "not-found") {
          setPendingDeleteIds((prev) => {
            const next = prev.filter((x) => x !== id);
            savePendingDeletes(next).catch(() => {});
            return next;
          });
          return;
        }
        attempt += 1;
        if (attempt >= MAX_RETRIES) throw e;
        await sleep(delay + Math.floor(Math.random() * 250));
        delay *= 2;
      }
    }
  };

  const attemptUpdateTransaction = async (
    id: string,
    patch: {
      amount: number;
      category: string;
      date: string;
      notes?: string;
      type: Transaction["type"];
      userId: string;
    }
  ): Promise<void> => {
    const net = await NetInfo.fetch();
    if (!net.isConnected) throw new Error("Offline");
    const MAX_RETRIES = 5;
    let attempt = 0;
    let delay = 1000;
    while (attempt < MAX_RETRIES) {
      try {
        await firestore()
          .collection("transactions")
          .doc(id)
          .set(
            {
              ...patch,
              timestamp: firestore.FieldValue.serverTimestamp(),
            } as any,
            { merge: true }
          );
        return;
      } catch (e: any) {
        attempt += 1;
        if (attempt >= MAX_RETRIES) throw e;
        await sleep(delay + Math.floor(Math.random() * 250));
        delay *= 2;
      }
    }
  };

  const getUnsyncedTransactions = (): Transaction[] => {
    const uidNow = auth().currentUser?.uid;
    if (!uidNow) return [];
    return transactions.filter((tx) => !tx.synced && tx.userId === uidNow);
  };

  // Snapshot-based pagination (no duplicate logs, no arity issues)
  const fetchServerTransactions = async (
    userId: string,
    anchor: SyncAnchor
  ): Promise<{ items: Transaction[]; newAnchor: SyncAnchor }> => {
    let q = userQuery(userId);

    if (anchor.lastDocPath) {
      try {
        const lastDocSnap = await firestore().doc(anchor.lastDocPath).get();
        if (lastDocSnap.exists) {
          q = q.startAfter(lastDocSnap);
        }
      } catch {
        // ignore; will fetch from start
      }
    }

    const snap = await q.limit(500).get();
    const items: Transaction[] = [];
    let newAnchor: SyncAnchor = anchor;

    snap.forEach((doc) => {
      const data = doc.data() as any;
      items.push({
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

    if (!snap.empty) {
      const lastDoc = snap.docs[snap.docs.length - 1];
      newAnchor = { lastDocPath: lastDoc.ref.path };
    }

    return { items, newAnchor };
  };

  const mergeIntoAllCache = (
    all: Transaction[],
    serverTransactions: Transaction[]
  ): Transaction[] => {
    const byId = new Map(all.map((tx) => [tx.id, tx]));
    for (const s of serverTransactions) {
      if (!byId.has(s.id)) {
        byId.set(s.id, s);
        all.push({ ...s, synced: true });
      } else {
        const existing = byId.get(s.id)!;
        const merged = { ...existing, ...s, synced: true };
        byId.set(s.id, merged);
        const idx = all.findIndex((x) => x.id === s.id);
        if (idx >= 0) all[idx] = merged;
      }
    }
    return all;
  };

  const syncSingleTransaction = async (
    transaction: Transaction
  ): Promise<void> => {
    if (isSyncing) {
      queuedUploadsRef.current.add(transaction.id);
      return;
    }
    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        showToastOnce(
          "info",
          ToastIds.Offline,
          "Offline Mode",
          "Using local data. Will sync when online."
        );
        return;
      }
      await attemptSyncTransaction(transaction);
    } catch (error) {
      log.error("Sync failed for transaction:", transaction.id, error);
      showToastOnce(
        "error",
        ToastIds.SyncFailed,
        "Sync Failed",
        "Will retry when online."
      );
    }
  };

  const attemptSyncTransaction = async (
    transaction: Transaction
  ): Promise<void> => {
    const MAX_RETRIES = 5;
    let attempt = 0;
    let success = false;
    let delay = 1000;
    while (attempt < MAX_RETRIES && !success) {
      try {
        const uidNow = auth().currentUser?.uid;
        if (!uidNow) throw new Error("No auth user");
        await firestore().collection("transactions").doc(transaction.id).set(
          {
            amount: transaction.amount,
            category: transaction.category,
            date: transaction.date,
            notes: transaction.notes,
            type: transaction.type,
            userId: uidNow,
            timestamp: firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        await markTransactionAsSynced(transaction.id);
        success = true;
        // Don’t spam per-item success toasts
      } catch (error) {
        attempt += 1;
        if (attempt < MAX_RETRIES) {
          await sleep(delay + Math.floor(Math.random() * 250));
          delay *= 2;
        } else {
          log.error(
            `Failed to upload transaction ${transaction.id} after ${MAX_RETRIES} attempts`
          );
          showToastOnce(
            "error",
            ToastIds.SyncFailed,
            "Sync Error",
            `Failed to sync transaction.`
          );
        }
      }
    }
  };

  const markTransactionAsSynced = async (id: string): Promise<void> => {
    try {
      setTransactions((prev) => {
        const updatedVisible = prev.map((tx) =>
          tx.id === id ? { ...tx, synced: true } : tx
        );
        mmkvStorage.getItem(KEY_TX_ALL).then((stored) => {
          const all = stored ? (JSON.parse(stored) as Transaction[]) : [];
          const updatedAll = all.map((tx) =>
            tx.id === id ? { ...tx, synced: true } : tx
          );
          saveAllTransactions(updatedAll).catch((error) => {
            log.error("Error saving to mmkvStorage:", error);
          });
        });
        return updatedVisible;
      });
    } catch (error) {
      log.error("Error marking transaction as synced:", error);
    }
  };

  const requireLogin = async () => {
    if (auth().currentUser?.uid) return true;
    // One toast only
    showToastOnce(
      "info",
      ToastIds.LoginRequired,
      "Login required",
      "Sign in to sync & back up."
    );
    return false;
  };

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
        showToastOnce(
          "info",
          ToastIds.Offline,
          "Offline Mode",
          "Using local data. Will sync when online."
        );
        return;
      }

      // Single “Syncing…” toast
      showToastOnce("info", ToastIds.Syncing, "Syncing", "Please wait...");

      // Drain queued uploads
      const queuedIds = Array.from(queuedUploadsRef.current);
      queuedUploadsRef.current.clear();
      if (queuedIds.length > 0) {
        const toUpload = transactions.filter((t) => queuedIds.includes(t.id));
        for (const t of toUpload) await attemptSyncTransaction(t);
      }

      // Process queued deletions
      if (pendingDeleteIds.length > 0) {
        const toDelete = [...pendingDeleteIds];
        for (const id of toDelete) {
          try {
            await attemptDeleteTransaction(id);
            const stored = await mmkvStorage.getItem(KEY_TX_ALL);
            const all = stored ? (JSON.parse(stored) as Transaction[]) : [];
            setTransactions(all.filter((t) => (uid ? t.userId === uid : true)));
          } catch {
            log.warn("Delete retry pending for id:", id);
          }
        }
      }

      // Upload unsynced
      const unsyncedTransactions = getUnsyncedTransactions();
      if (unsyncedTransactions.length > 0) {
        log.info(`Uploading ${unsyncedTransactions.length} transactions...`);
        for (const transaction of unsyncedTransactions) {
          await attemptSyncTransaction(transaction);
        }
      }

      // Fetch and merge
      await fetchAndMergeServerTransactions();

      // Single “Sync Done” toast
      showToastOnce(
        "success",
        ToastIds.SyncDone,
        "Sync Complete",
        "Data is up to date."
      );
    } catch (error) {
      log.error("Bulk sync process failed:", error);
      showToastOnce(
        "error",
        ToastIds.SyncFailed,
        "Sync Failed",
        "Changes saved locally. Will retry when online."
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchAndMergeServerTransactions = async (): Promise<void> => {
    const uidNow = auth().currentUser?.uid;
    if (!uidNow) return;
    const anchor = await getSyncAnchor(uidNow);
    const { items, newAnchor } = await fetchServerTransactions(uidNow, anchor);
    if (items.length > 0) {
      const stored = await mmkvStorage.getItem(KEY_TX_ALL);
      const all = stored ? (JSON.parse(stored) as Transaction[]) : [];
      const mergedAll = mergeIntoAllCache(all, items);
      await saveAllTransactions(mergedAll);
      await setSyncAnchor(uidNow, newAnchor);
      setTransactions(mergedAll.filter((t) => t.userId === uidNow));
    }
  };

  const applyLiveChanges = async (
    userId: string,
    changes: FirebaseFirestoreTypes.DocumentChange[]
  ) => {
    // Load current full cache
    const stored = await mmkvStorage.getItem(KEY_TX_ALL);
    const all = stored ? (JSON.parse(stored) as Transaction[]) : [];

    // Index for fast lookups and in-place updates
    const indexById = new Map(all.map((t, i) => [t.id, i]));

    let mutated = false;

    for (const change of changes) {
      const doc = change.doc;
      const id = doc.id;
      const data = doc.data() as any;

      if (change.type === "removed") {
        if (indexById.has(id)) {
          const removeIdx = indexById.get(id)!;
          all.splice(removeIdx, 1);
          indexById.delete(id);
          // Rebuild index after splice
          for (let i = removeIdx; i < all.length; i++)
            indexById.set(all[i].id, i);
          mutated = true;
        }
        continue;
      }

      // added or modified: build normalized Transaction
      const normalized: Transaction = {
        id,
        amount: data.amount,
        category: data.category,
        date: data.date,
        notes: data.notes,
        type: data.type,
        userId: data.userId,
        synced: true,
      };

      if (indexById.has(id)) {
        // merge existing and new, mark synced
        const idx = indexById.get(id)!;
        const merged = { ...all[idx], ...normalized, synced: true };
        all[idx] = merged;
        mutated = true;
      } else {
        // push new
        all.push(normalized);
        indexById.set(id, all.length - 1);
        mutated = true;
      }
    }

    if (mutated) {
      // Optional: keep local ordering aligned with server ordering key
      all.sort((a, b) => {
        // timestamp is server-side; fall back to date string if needed
        // If date is ISO yyyy-mm-dd, string compare works; otherwise parse to number
        return (a.date || "").localeCompare(b.date || "");
      });

      await saveAllTransactions(all);
      setTransactions(all.filter((t) => t.userId === userId));
    }
  };

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
