import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";

import { SummaryData, Transaction } from "@/types";
import { getUserSummaryChart } from "@/db/sqlite/repos/summaryRepo";

export const summaryTxApi = createApi({
  reducerPath: "summaryTxApi",
  baseQuery: fakeBaseQuery(),
  tagTypes: ["ChartData"],
  endpoints: (builder) => ({
    // 1. Fetch a page of transactions by cursor
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
export const { useFetchUserSummaryChartQuery } = summaryTxApi;
