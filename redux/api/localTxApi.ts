import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import {
  insertTx,
  updateTx,
  softDeleteTx,
  pageByCursor,
  searchByTerm,
  getUnsynced,
  getSyncState,
  upsertSyncState,
  getUserSummary,
} from "@/db/sqlite/repos/transactionRepo";
import { SummaryData, Transaction } from "@/types";
import { getUserSummaryChart } from "@/db/sqlite/repos/summaryRepo";

export const localTxApi = createApi({
  reducerPath: "localTxApi",
  baseQuery: fakeBaseQuery(),
  tagTypes: ["Transactions", "UserSummary", "ChartData"],
  endpoints: (builder) => ({
    // 1. Fetch a page of transactions by cursor
    fetchTxPage: builder.query<
      { items: Transaction[]; nextCursor?: { dateIso: string; id: string } },
      {
        userId: string;
        pageSize: number;
        cursor?: { dateIso: string; id: string };
      }
    >({
      queryFn: async ({ userId, pageSize, cursor }) => {
        try {
          const result = await pageByCursor(userId, pageSize, cursor);
          return { data: result };
        } catch (error: any) {
          return { error: { status: "CUSTOM_ERROR", error: error.message } };
        }
      },
      providesTags: ["Transactions"],
    }),

    fetchRecentTx: builder.query<
      { items: Transaction[]; nextCursor?: { dateIso: string; id: string } },
      {
        userId: string;
        pageSize: number;
        cursor?: { dateIso: string; id: string };
      }
    >({
      queryFn: async ({ userId, pageSize, cursor }) => {
        try {
          const result = await pageByCursor(userId, pageSize, cursor);
          return { data: result };
        } catch (error: any) {
          return { error: { status: "CUSTOM_ERROR", error: error.message } };
        }
      },
      providesTags: ["Transactions"],
    }),

    // 2. Search transactions by term
    searchTx: builder.query<Transaction[], { userId: string; term: string }>({
      queryFn: async ({ userId, term }) => {
        try {
          const rows = await searchByTerm(userId, term);
          return { data: rows };
        } catch (error: any) {
          return { error: { status: "CUSTOM_ERROR", error: error.message } };
        }
      },
      providesTags: ["Transactions"]
    }),

    // 3. Get all unsynced transactions
    fetchUnsynced: builder.query<Transaction[], string>({
      queryFn: async (userId) => {
        try {
          const rows = await getUnsynced(userId);
          return { data: rows };
        } catch (error: any) {
          return { error: { status: "CUSTOM_ERROR", error: error.message } };
        }
      },
      providesTags: ["Transactions"],
    }),

    // 4. Get sync state
    fetchSyncState: builder.query<
      {
        userId: string;
        lastPullCursor: string | null;
        lastPullMs: number | null;
        lastPushMs: number | null;
      } | null,
      string
    >({
      queryFn: async (userId) => {
        try {
          const state = await getSyncState(userId);
          return { data: state };
        } catch (error: any) {
          return { error: { status: "CUSTOM_ERROR", error: error.message } };
        }
      },
    }),

    // 5. Upsert sync state
    upsertSync: builder.mutation<
      void,
      {
        userId: string;
        patch: Partial<{
          lastPullCursor: string | null;
          lastPullMs: number | null;
          lastPushMs: number | null;
        }>;
      }
    >({
      queryFn: async ({ userId, patch }) => {
        try {
          await upsertSyncState(userId, patch);
          return { data: undefined };
        } catch (error: any) {
          return { error: { status: "CUSTOM_ERROR", error: error.message } };
        }
      },
    }),

    // 6. Add a transaction
    addTransaction: builder.mutation<Transaction, Transaction>({
      queryFn: async (tx) => {
        try {
          await insertTx(tx);
          return { data: tx };
        } catch (error: any) {
          return { error: { status: "CUSTOM_ERROR", error: error.message } };
        }
      },
      invalidatesTags: ["Transactions", "UserSummary", "ChartData"],
    }),

    // 7. Update an existing transaction
    updateTransaction: builder.mutation<
      Transaction,
      { id: string; patch: Partial<Omit<Transaction, "id">> }
    >({
      queryFn: async ({ id, patch }) => {
        try {
          await updateTx(id, patch);
          // You may want to refetch the updated record or pages
          return { data: { id, ...patch } as Transaction };
        } catch (error: any) {
          return { error: { status: "CUSTOM_ERROR", error: error.message } };
        }
      },
      invalidatesTags: ["Transactions", "UserSummary", "ChartData"],
    }),

    // 8. Soft-delete a transaction
    deleteTransaction: builder.mutation<
      { id: string },
      { id: string; userId: string }
    >({
      queryFn: async ({ id, userId }) => {
        try {
          await softDeleteTx(id, userId);
          return { data: { id } };
        } catch (error: any) {
          return { error: { status: "CUSTOM_ERROR", error: error.message } };
        }
      },
      invalidatesTags: ["Transactions", "UserSummary", "ChartData"],
    }),

    getUserSummary: builder.query({
      queryFn: async ({ userId }) => {
        try {
          const userSummary = await getUserSummary(userId);
          return { data: { ...userSummary } };
        } catch (error: any) {
          return { error: { status: "CUSTOM_ERROR", error: error.message } };
        }
      },
      providesTags: ["UserSummary"],
    }),

    fetchUserSummaryChart: builder.query<
      SummaryData,
      {
        userId: string;
      }
    >({
      queryFn: async ({ userId }) => {
        try {
          const result = await getUserSummaryChart(userId);
          return { data: result };
        } catch (error: any) {
          return { error: { status: "CUSTOM_ERROR", error: error.message } };
        }
      },
      providesTags: ["ChartData"],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useFetchTxPageQuery,
  useFetchRecentTxQuery,
  useSearchTxQuery,
  useFetchUnsyncedQuery,
  useFetchSyncStateQuery,
  useUpsertSyncMutation,
  useAddTransactionMutation,
  useUpdateTransactionMutation,
  useDeleteTransactionMutation,

  // user summary
  useGetUserSummaryQuery,
  useFetchUserSummaryChartQuery,
} = localTxApi;
