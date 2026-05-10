import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth/client";

export type UseMembersOptions = {
  organizationId?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
};

export function useMembers(options: UseMembersOptions = {}) {
  const {
    organizationId,
    limit = 100,
    offset = 0,
    sortBy,
    sortDirection,
  } = options;

  return useQuery({
    queryKey: [
      "members",
      organizationId,
      { limit, offset, sortBy, sortDirection },
    ],
    queryFn: async () => {
      const { data, error } = await authClient.organization.listMembers({
        query: {
          organizationId,
          limit,
          offset,
          sortBy,
          sortDirection,
        },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
