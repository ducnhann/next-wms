import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPermissionQueryKey,
  type PermissionsInput,
} from "@wms/backend/lib/permissions";
import { useCallback } from "react";
import { authClient, useSession } from "@/lib/auth/client";

// Re-export types for convenience
export type {
  Permissions,
  PermissionsInput,
} from "@wms/backend/lib/permissions";
export { getPermissionQueryKey } from "@wms/backend/lib/permissions";

/**
 * Hook to check permissions with TanStack Query caching.
 *
 * @param permissions - Object mapping resources to arrays of actions
 * @returns Query result with boolean (true if user has ALL permissions)
 *
 * @example
 * ```tsx
 * const { data: canAccess } = useHasPermission({ settings: ["admin"] });
 * ```
 */
export function useHasPermission(permissions: PermissionsInput) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: getPermissionQueryKey(userId ?? "", permissions),
    queryFn: async () => {
      const result = await authClient.organization.hasPermission({
        permission: permissions,
      });
      return result.data?.success === true;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to check multiple permission sets at once.
 */
export function useHasPermissions(permissionSets: PermissionsInput[]) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const combinedKey = permissionSets
    .map((p) =>
      Object.keys(p)
        .sort()
        .map((r) => `${r}:${p[r].sort().join(",")}`)
        .join("|"),
    )
    .join("||");

  return useQuery({
    queryKey: [userId, "hasPerms", "batch", combinedKey],
    queryFn: () =>
      Promise.all(
        permissionSets.map(async (permissions) => {
          try {
            const result = await authClient.organization.hasPermission({
              permission: permissions,
            });
            return result.data?.success === true;
          } catch {
            return false;
          }
        }),
      ),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to prefetch permissions before navigation.
 */
export function usePrefetchPermissions() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  return useCallback(
    async (permissionSets: PermissionsInput[]) => {
      if (!userId) return;

      await Promise.all(
        permissionSets.map((permissions) =>
          queryClient.prefetchQuery({
            queryKey: getPermissionQueryKey(userId, permissions),
            queryFn: async () => {
              const result = await authClient.organization.hasPermission({
                permission: permissions,
              });
              return result.data?.success === true;
            },
            staleTime: 5 * 60 * 1000,
          }),
        ),
      );
    },
    [queryClient, userId],
  );
}
