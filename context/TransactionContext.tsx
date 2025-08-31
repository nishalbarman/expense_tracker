// import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import firestore from "@react-native-firebase/firestore";
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
// import { sampleTransactions } from "../data/transactionCategories";
import type { Transaction, TransactionContextType } from "../types";
import { mmkvStorage } from "@/mmkv/mmkvStorage";

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

  useEffect(() => {
    const initialize = async () => {
      await loadTransactions();
      setLoading(false);
    };
    initialize();

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && !loading && autoSync) {
        syncAllTransactions();
      }
    });

    return unsubscribe;
  }, [loading, autoSync]);

  // And also run sync when autoSync toggles on
  useEffect(() => {
    if (autoSync && !loading) {
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
   * Load transactions from mmkvStorage or initialize with sample data
   */
  const loadTransactions = async (): Promise<void> => {
    try {
      const storedTransactions = await mmkvStorage.getItem("transactions");

      if (storedTransactions) {
        setTransactions(JSON.parse(storedTransactions));
      } else {
        // No local transactions → fetch from server
        const lastSyncTime = new Date(0).toISOString(); // fetch all
        const serverTransactions = await fetchServerTransactions(lastSyncTime);
        setTransactions(serverTransactions);
        await saveTransactions(serverTransactions);
        await updateLastSyncTime(new Date().toISOString());
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
   * Add a new transaction
   */
  const addTransaction = async (
    newTransaction: Omit<Transaction, "id" | "synced">
  ): Promise<void> => {
    try {
      const transactionWithId: Transaction = {
        ...newTransaction,
        id: uuidv4(),
        synced: false,
      };

      const updatedTransactions = [...transactions, transactionWithId];

      await saveTransactions(updatedTransactions);

      setTransactions((prevTransactions) => [
        ...prevTransactions,
        transactionWithId,
      ]);

      /**
       * Attempt to sync after adding
       */
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
   * Delete a transaction locally first; try remote delete; on failure queue for retry.
   */
  const deleteTransaction = async (id: string): Promise<void> => {
    try {
      const existing = transactions.find((t) => t.id === id);
      if (!existing) {
        Toast.show({
          type: "info",
          text1: "Not found",
          text2: "Transaction already removed.",
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
   * Get unsynced transactions
   */
  const getUnsyncedTransactions = (): Transaction[] => {
    return transactions.filter((tx) => !tx.synced);
  };

  /**
   * Fetch new transactions from the server
   */
  const fetchServerTransactions = async (
    lastSyncTime: string
  ): Promise<Transaction[]> => {
    try {
      const querySnapshot = await firestore()
        .collection("transactions")
        .where(
          "timestamp",
          ">",
          firestore.Timestamp.fromDate(new Date(lastSyncTime))
        )
        .get();

      const serverTransactions: Transaction[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        serverTransactions.push({
          id: doc.id,
          amount: data.amount,
          category: data.category,
          date: data.date,
          notes: data.notes,
          type: data.type,
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
   * Get the last synchronization timestamp
   */
  const getLastSyncTime = async (): Promise<string> => {
    try {
      const lastSync = await mmkvStorage.getItem("lastSyncTime");
      return lastSync || new Date(0).toISOString();
    } catch (error) {
      console.error("Error getting last sync time:", error);
      return new Date(0).toISOString();
    }
  };

  /**
   * Update the last synchronization timestamp
   */
  const updateLastSyncTime = async (timestamp: string): Promise<void> => {
    try {
      await mmkvStorage.setItem("lastSyncTime", timestamp);
    } catch (error) {
      console.error("Error updating last sync time:", error);
    }
  };

  /**
   * Merge server transactions into local transactions
   */
  const mergeTransactions = async (serverTransactions: Transaction[]) => {
    try {
      setTransactions((prevTransactions) => {
        const localTransactionsMap = new Map(
          prevTransactions.map((tx) => [tx.id, tx])
        );
        const merged = [...prevTransactions];

        serverTransactions.forEach((serverTx) => {
          if (!localTransactionsMap.has(serverTx.id)) {
            merged.push({ ...serverTx, synced: true });
          }
        });

        saveTransactions(merged).catch(() => {});
        return merged;
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

      /**
       *  Attempt to sync the single transaction
       */
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
   * Upload a single transaction to Firestore
   */
  const uploadTransaction = async (transaction: Transaction): Promise<void> => {
    try {
      await firestore()
        .collection("transactions")
        .doc(transaction.id)
        .set({
          amount: transaction.amount,
          category: transaction.category,
          date: transaction.date,
          notes: transaction.notes,
          type: transaction.type,
          timestamp: firestore.Timestamp.fromDate(new Date(transaction.date)),
        });
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

      // 2) Upload unsynced transactions
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
   * Fetch and merge server transactions
   */
  const fetchAndMergeServerTransactions = async (): Promise<void> => {
    try {
      const lastSyncTime = await getLastSyncTime();
      const serverTransactions = await fetchServerTransactions(lastSyncTime);

      if (serverTransactions.length > 0) {
        /**
         * Merge with local transactions
         */
        await mergeTransactions(serverTransactions);

        /**
         *  Update last sync time
         */
        const newSyncTime = new Date().toISOString();
        await updateLastSyncTime(newSyncTime);

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
        isSyncing,
        autoSync,
        setAutoSync: (value: boolean) => setAutoSync(value),
      }}>
      {children}
    </TransactionContext.Provider>
  );
};
