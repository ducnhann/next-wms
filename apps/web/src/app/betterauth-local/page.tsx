"use client";

import { toast } from "sonner";
import {
  authClient,
  useActiveOrganization,
  useListOrganizations,
  useSession,
} from "@/lib/auth/client";

/**
 * Debug page for auth state
 * Shows React Query cached auth data
 */
export default function BetterAuthLocalPage() {
  const {
    data: session,
    isPending: sessionPending,
    refetch: refetchSession,
  } = useSession();
  const {
    data: organizations,
    isPending: orgsPending,
    refetch: refetchOrganizations,
  } = useListOrganizations();
  const {
    data: activeOrg,
    isPending: activeOrgPending,
    refetch: refetchActiveOrg,
  } = useActiveOrganization();

  const handleRefetch = () => {
    refetchSession();
    refetchOrganizations();
    refetchActiveOrg();
  };

  const handleSetActiveOrg = async (orgId: string) => {
    const { data, error } = await authClient.organization.setActive({
      organizationId: orgId,
    });

    if (error) {
      toast.error(`Failed to set active organization: ${error.message}`);
      return;
    }

    toast.success(`Active organization set to: ${data.name}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 dark:bg-gray-900">
      <div className="mx-auto max-w-4xl space-y-8">
        <h1 className="font-bold text-3xl">Auth Debug (React Query)</h1>

        <div className="space-y-6">
          {/* Status */}
          <div className="rounded-lg border bg-white p-4 dark:bg-gray-800">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="font-medium">Query Status</h3>
              <StatusBadge
                status={sessionPending ? "loading" : "success"}
                label="session"
              />
              <StatusBadge
                status={orgsPending ? "loading" : "success"}
                label="orgs"
              />
              <StatusBadge
                status={activeOrgPending ? "loading" : "success"}
                label="activeOrg"
              />
            </div>
          </div>

          {/* Session */}
          <DebugBlock
            title="useSession()"
            isPending={sessionPending}
            data={session}
          />

          {/* Organizations */}
          <DebugBlock
            title="useOrganizations()"
            isPending={orgsPending}
            data={organizations}
          />

          {/* Active Organization */}
          <DebugBlock
            title="useActiveOrganization()"
            isPending={activeOrgPending}
            data={activeOrg}
          />

          {/* Actions */}
          <div className="rounded-lg border bg-white p-4 dark:bg-gray-800">
            <h3 className="mb-3 font-medium">Actions</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleRefetch()}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
              >
                Invalidate All (Refetch)
              </button>
            </div>
          </div>

          {/* Switch Org */}
          {organizations && organizations.length > 0 && (
            <div className="rounded-lg border bg-white p-4 dark:bg-gray-800">
              <h3 className="mb-3 font-medium">Switch Organization</h3>
              <div className="flex flex-wrap gap-2">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => handleSetActiveOrg(org.id)}
                    className={`rounded px-3 py-1.5 text-sm transition ${
                      activeOrg?.id === org.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                    }`}
                  >
                    {org.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function DebugBlock({
  title,
  data,
  isPending,
}: {
  title: string;
  data: unknown;
  isPending?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-white p-4 dark:bg-gray-800">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="font-medium">{title}</h3>
        {isPending && (
          <span className="rounded bg-yellow-200 px-2 py-0.5 text-xs text-yellow-800">
            Loading...
          </span>
        )}
      </div>
      <pre className="max-h-64 overflow-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-900">
        {JSON.stringify(data, null, 2) ?? "null"}
      </pre>
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label?: string }) {
  const colors: Record<string, string> = {
    idle: "bg-gray-200 text-gray-800",
    loading: "bg-yellow-200 text-yellow-800",
    success: "bg-green-200 text-green-800",
    error: "bg-red-200 text-red-800",
  };

  return (
    <span
      className={`rounded px-2 py-0.5 text-xs ${colors[status] ?? colors.idle}`}
    >
      {label ? `${label}: ${status}` : status}
    </span>
  );
}
