"use client";

import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL ?? "", {
  verbose: false,
});

// Create ConvexQueryClient once at module level
const convexQueryClient = new ConvexQueryClient(convex);

// Create QueryClient once at module level and connect immediately
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Use Convex query client for all queries by default
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
      // Stale time for non-Convex queries (Convex handles its own reactivity)
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false, // Convex handles real-time updates
      retry: 2,
    },
  },
});

// Connect once at module level
convexQueryClient.connect(queryClient);

/**
 * Combined Convex and TanStack Query provider.
 *
 * All Convex queries should use the convexQuery() helper from
 * @convex-dev/react-query instead of useQuery from convex/react.
 *
 * @example
 * ```tsx
 * import { convexQuery } from "@convex-dev/react-query";
 * import { useQuery } from "@tanstack/react-query";
 *
 * const { data } = useQuery(convexQuery(api.myQuery, { arg: "value" }));
 * ```
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <QueryClientProvider client={queryClient}>
        {children}
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools
            initialIsOpen={false}
            buttonPosition="bottom-left"
          />
        )}
      </QueryClientProvider>
    </ConvexProvider>
  );
}
