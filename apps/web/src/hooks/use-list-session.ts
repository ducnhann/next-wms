"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth/client";

export function useListSessions(userId?: string) {
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["sessions", userId],
    queryFn: async () => {
      const response = await authClient.listSessions();
      return (response.data || []).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    },
    enabled: !!userId,
  });

  const revokeMutation = useMutation({
    mutationFn: (token: string) => authClient.revokeSession({ token }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["sessions", userId],
      });
    },
  });

  const sessionsWithRevoke = sessions.map((session) => ({
    ...session,
    revoke: async () => {
      await revokeMutation.mutateAsync(session.token);
    },
  }));

  return {
    sessions: sessionsWithRevoke,
    isLoading,
  };
}
