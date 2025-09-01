export interface Transaction {
  id: string;
  amount: number;
  category: string;
  type: "income" | "expense";
  date: string;
  notes: string;
  synced: boolean;
}

export interface TransactionContextType {
  transactions: Transaction[];
  addTransaction: (
    transaction: Omit<Transaction, "id" | "synced">
  ) => Promise<void>;
  syncAllTransactions: () => Promise<void>;
  deleteTransaction?: (id: string) => Promise<void>; // Add this line
  isSyncing?: boolean;
  autoSync?: boolean;
  setAutoSync?: (value: boolean) => void;
}
