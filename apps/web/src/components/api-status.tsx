"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import { Badge } from "@/components/ui/badge";

type StatusState = "loading" | "operational" | "disconnected";

interface StatusIndicatorProps {
  label: string;
  status: StatusState;
}

function StatusIndicator({ label, status }: StatusIndicatorProps) {
  const statusConfig = {
    loading: {
      color: "bg-yellow-500",
      text: "Checking...",
    },
    operational: {
      color: "bg-green-500",
      text: "Operational",
    },
    disconnected: {
      color: "bg-red-500",
      text: "Disconnected",
    },
  };

  const { color, text } = statusConfig[status];

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <Badge variant="outline">
          <div className={`h-2 w-2 rounded-full ${color}`} />
          {text}
        </Badge>
      </div>
    </div>
  );
}

export function ApiStatus() {
  // Convex health check
  const { data: convexData, isPending: convexPending } = useQuery(
    convexQuery(api.healthCheck.get, {}),
  );

  // Auth service health check
  const { data: authData, isPending: authPending } = useQuery({
    queryKey: ["auth", "health"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/auth/ok");
        if (!response.ok) return { ok: false };
        return { ok: true };
      } catch {
        return { ok: false };
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
  });

  const convexStatus: StatusState = convexPending
    ? "loading"
    : convexData?.message === "OK"
      ? "operational"
      : "disconnected";

  const authStatus: StatusState = authPending
    ? "loading"
    : authData?.ok
      ? "operational"
      : "disconnected";

  return (
    <section className="rounded-lg border p-4">
      <h2 className="mb-3 font-medium">API Status</h2>
      <div className="flex flex-col gap-2">
        <StatusIndicator label="Convex Database" status={convexStatus} />
        <StatusIndicator label="Auth Service" status={authStatus} />
      </div>
    </section>
  );
}
