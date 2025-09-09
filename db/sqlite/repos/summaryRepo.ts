import { db } from "@/db/sqlite/client";

export type SummaryData = {
  totalIncome: number;
  totalExpense: number;
  totalBalance: number;
  expensesByCategory: Record<string, number>;
  monthlyExpenses: number[];
};

// fetch summary for a user
export async function getUserSummaryChart(
  userId: string
): Promise<SummaryData> {
  const database = await db();

  // 1. Get totals grouped by type
  const totals = await database.getAllAsync<{
    type: "income" | "expense";
    sum: number;
  }>(
    `SELECT type, SUM(amount) as sum 
     FROM transactions 
     WHERE user_id=? AND deleted=0
     GROUP BY type`,
    [userId]
  );

  let totalIncome = 0;
  let totalExpense = 0;

  totals.forEach((row) => {
    if (row.type === "income") totalIncome = row.sum ?? 0;
    if (row.type === "expense") totalExpense = row.sum ?? 0;
  });

  // 2. Get expenses grouped by category
  const categories = await database.getAllAsync<{
    category: string;
    sum: number;
  }>(
    `SELECT category, SUM(amount) as sum
     FROM transactions
     WHERE user_id=? AND deleted=0 AND type='expense'
     GROUP BY category`,
    [userId]
  );

  const expensesByCategory: Record<string, number> = {};
  categories.forEach((row) => {
    expensesByCategory[row.category] = row.sum ?? 0;
  });

  // 3. Get monthly expenses (current year)
  const year = new Date().getFullYear();
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  const monthlyRaw = await database.getAllAsync<{
    month: number;
    sum: number;
  }>(
    `SELECT CAST(strftime('%m', date_iso) AS INTEGER) as month, 
            SUM(amount) as sum
     FROM transactions
     WHERE user_id=? AND deleted=0 AND type='expense'
       AND date_iso BETWEEN ? AND ?
     GROUP BY month`,
    [userId, start, end]
  );

  const monthlyExpenses = Array(12).fill(0);
  monthlyRaw.forEach((row) => {
    if (row.month >= 1 && row.month <= 12) {
      monthlyExpenses[row.month - 1] = row.sum ?? 0;
    }
  });

  return {
    totalIncome,
    totalExpense,
    totalBalance: totalIncome - totalExpense,
    expensesByCategory,
    monthlyExpenses,
  };
}
