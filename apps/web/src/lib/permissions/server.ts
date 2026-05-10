import { dehydrate, QueryClient } from "@tanstack/react-query";
import { auth } from "@wms/backend/auth";
import {
  getPermissionQueryKey,
  type PermissionsInput,
} from "@wms/backend/lib/permissions";
import { headers } from "next/headers";

// Re-export types for convenience
export type {
  Permissions,
  PermissionsInput,
} from "@wms/backend/lib/permissions";
export { getPermissionQueryKey } from "@wms/backend/lib/permissions";

/**
 * Creates a new QueryClient for server-side permission fetching.
 * Each request should create a fresh instance to avoid cache pollution.
 */
export function createServerQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
      },
    },
  });
}

/**
 * Prefetch permissions into a QueryClient and return dehydrated state.
 * Use with HydrationBoundary to sync server cache to client.
 *
 * @example
 * ```tsx
 * // In server component
 * const { dehydratedState, results } = await prefetchPermissions([
 *   { settings: ["admin"] },
 * ]);
 *
 * return (
 *   <HydrationBoundary state={dehydratedState}>
 *     <ClientComponent canAccess={results[0]} />
 *   </HydrationBoundary>
 * );
 * ```
 */
export async function prefetchPermissions(permissionSets: PermissionsInput[]) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const userId = session?.user?.id;

  if (!userId) {
    return {
      dehydratedState: dehydrate(createServerQueryClient()),
      results: permissionSets.map(() => false),
    };
  }

  const queryClient = createServerQueryClient();
  const results: boolean[] = [];

  await Promise.all(
    permissionSets.map(async (permissions, index) => {
      const result = await queryClient.fetchQuery({
        queryKey: getPermissionQueryKey(userId, permissions),
        queryFn: async () => {
          try {
            const permResult = await auth.api.hasPermission({
              headers: requestHeaders,
              body: { permissions },
            });
            return permResult.success === true;
          } catch (error) {
            console.error("Failed to check permissions:", error);
            return false;
          }
        },
      });
      results[index] = result;
    }),
  );

  return {
    dehydratedState: dehydrate(queryClient),
    results,
  };
}

/**
 * Check a single permission set and return dehydrated state.
 * Convenience wrapper around prefetchPermissions for single checks.
 */
export async function checkPermission(permissions: PermissionsInput) {
  const { dehydratedState, results } = await prefetchPermissions([permissions]);
  return {
    dehydratedState,
    result: results[0],
  };
}
