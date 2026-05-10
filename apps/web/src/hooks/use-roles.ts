import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth/client";

export function useRoles(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["roles", organizationId],
    queryFn: () =>
      authClient.organization.listRoles({ query: { organizationId } }),
    enabled: !!organizationId,
  });
}

export type UpdateRoleData = {
  roleName?: string;
  roleId?: string;
  organizationId?: string;
  data: {
    permission?: Record<string, string[]>;
    roleName?: string;
  };
};

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data }: { data: UpdateRoleData }) =>
      authClient.organization.updateRole(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
  });
}

export type DeleteRoleData = {
  roleId: string;
  roleName?: string;
  organizationId: string;
};

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DeleteRoleData) =>
      authClient.organization.deleteRole(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
  });
}
