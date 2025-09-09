export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  category: string;
  dateIso: string;
  notes?: string;
  type: "income" | "expense";
  synced: boolean;
  updatedAt: number;
  deleted?: boolean;
  [key: string]: any;
}

export interface TransactionContextType {
  transactions: Transaction[];
  addTransaction: (
    transaction: Omit<Transaction, "id" | "synced">
  ) => Promise<void>;
  syncAllTransactions: () => Promise<void>;
  updateTransaction?: (next: Transaction) => Promise<void>;
  deleteTransaction?: (id: string) => Promise<void>; // Add this line
  isSyncing?: boolean;
  autoSync?: boolean;
  setAutoSync?: (value: boolean) => void;
}

export interface SummaryData {
  totalIncome: number;
  totalExpense: number;
  totalBalance: number;
  expensesByCategory: Record<string, number>;
  monthlyExpenses: number[];
}
