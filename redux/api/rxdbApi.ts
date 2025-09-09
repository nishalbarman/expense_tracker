import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { getRepository } from '@/db/rxdb/repo';
import type { TxRow } from '@/db/rxdb/repo';
import { Observable } from 'rxjs';

// Custom base query that works with RxDB
const rxdbBaseQuery = fakeBaseQuery<string>();

export const rxdbApi = createApi({
  reducerPath: 'rxdbApi',
  baseQuery: rxdbBaseQuery,
  tagTypes: ['Transaction', 'SyncState', 'Meta'],
  endpoints: (builder) => ({
    // Get transactions with real-time updates
    getTransactions: builder.query<TxRow[], { userId: string; cursor?: { dateIso: string; id: string }; pageSize?: number }>({
      queryFn: async ({ userId, cursor, pageSize = 50 }) => {
        try {
          const repository = getRepository();
          const result = await repository.pageByCursor(userId, pageSize, cursor);
          return { data: result.items };
        } catch (error) {
          return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Transaction' as const, id })),
              { type: 'Transaction', id: 'LIST' },
            ]
          : [{ type: 'Transaction', id: 'LIST' }],
      // Enable real-time updates
      onCacheEntryAdded: async (
        { userId },
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved }
      ) => {
        try {
          await cacheDataLoaded;
          
          const repository = getRepository();
          const observable = repository.observeTransactionsByUser(userId);
          
          const subscription = observable.subscribe({
            next: (docs) => {
              const transactions = docs.map(doc => doc.toJSON());
              updateCachedData(() => transactions);
            }
          });

          await cacheEntryRemoved;
          subscription.unsubscribe();
        } catch (error) {
          console.error('Error setting up real-time updates:', error);
        }
      },
    }),

    // Search transactions
    searchTransactions: builder.query<TxRow[], { userId: string; term: string; limit?: number }>({
      queryFn: async ({ userId, term, limit = 40 }) => {
        try {
          const repository = getRepository();
          const result = await repository.searchByTerm(userId, term, limit);
          return { data: result };
        } catch (error) {
          return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
      },
      providesTags: [{ type: 'Transaction', id: 'SEARCH' }],
    }),

    // Add transaction
    addTransaction: builder.mutation<TxRow, Omit<TxRow, 'updatedAt'>>({
      queryFn: async (transaction) => {
        try {
          const repository = getRepository();
          const doc = await repository.insertTx({
            ...transaction,
            updatedAt: Date.now()
          });
          return { data: doc.toJSON() };
        } catch (error) {
          return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
      },
      invalidatesTags: [{ type: 'Transaction', id: 'LIST' }],
    }),

    // Update transaction
    updateTransaction: builder.mutation<void, { id: string; patch: Partial<Omit<TxRow, 'id' | 'updatedAt'>> }>({
      queryFn: async ({ id, patch }) => {
        try {
          const repository = getRepository();
          await repository.updateTx(id, patch);
          return { data: undefined };
        } catch (error) {
          return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'Transaction', id },
        { type: 'Transaction', id: 'LIST' }
      ],
    }),

    // Delete transaction (soft delete)
    deleteTransaction: builder.mutation<void, { id: string }>({
      queryFn: async ({ id }) => {
        try {
          const repository = getRepository();
          await repository.softDeleteTx(id, Date.now());
          return { data: undefined };
        } catch (error) {
          return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'Transaction', id },
        { type: 'Transaction', id: 'LIST' }
      ],
    }),

    // Get unsynced count
    getUnsyncedCount: builder.query<number, { userId: string }>({
      queryFn: async ({ userId }) => {
        try {
          const repository = getRepository();
          const transactions = await repository.getUnsynced(userId);
          return { data: transactions.length };
        } catch (error) {
          return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
      },
      providesTags: [{ type: 'SyncState', id: 'UNSYNCED_COUNT' }],
      // Real-time unsynced count updates
      onCacheEntryAdded: async (
        { userId },
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved }
      ) => {
        try {
          await cacheDataLoaded;
          
          const repository = getRepository();
          const observable = repository.observeUnsyncedCount(userId);
          
          const subscription = observable.subscribe({
            next: (count) => {
              updateCachedData(() => count);
            }
          });

          await cacheEntryRemoved;
          subscription.unsubscribe();
        } catch (error) {
          console.error('Error setting up unsynced count updates:', error);
        }
      },
    }),
  }),
});

export const {
  useGetTransactionsQuery,
  useSearchTransactionsQuery,
  useAddTransactionMutation,
  useUpdateTransactionMutation,
  useDeleteTransactionMutation,
  useGetUnsyncedCountQuery,
} = rxdbApi;
