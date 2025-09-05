import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { pageByCursor, searchByTerm } from '@/db/sqlite/repo';

export const localTxApi = createApi({
  reducerPath: 'localTxApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['TxPage'],
  endpoints: (build) => ({
    getTxPage: build.query<{ items: any[]; nextCursor?: any }, { userId: string; pageSize: number; cursor?: any }>({
      async queryFn({ userId, pageSize, cursor }) {
        const { items, nextCursor } = pageByCursor(userId, pageSize, cursor);
        return { data: { items, nextCursor } };
      },
      providesTags: (res, err, arg) => [{ type: 'TxPage', id: arg.userId }],
    }),
    searchTx: build.query<any[], { userId: string; term: string }>({
      async queryFn({ userId, term }) {
        const items = searchByTerm(userId, term);
        return { data: items };
      },
      providesTags: (res, err, arg) => [{ type: 'TxPage', id: arg.userId }],
    }),
  }),
});

export const { useGetTxPageQuery, useLazyGetTxPageQuery, useLazySearchTxQuery } = localTxApi;
