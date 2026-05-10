"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { ChartDataCard } from "@/components/chart-data-card";
import { CycleCountSessionsTable } from "@/components/table/cycle-count-sessions-table";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useBranches } from "@/hooks/use-branches";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useDateFilterStore } from "@/store/date-filter";

export default function Page() {
  const { organizationId } = useCurrentUser();

  const { currentBranch } = useBranches({
    organizationId: organizationId as Id<"organizations"> | undefined,
    includeDeleted: false,
  });

  const dateRange = useDateFilterStore((state) => state.dateRange);
  const periodLabel = useDateFilterStore((state) => state.periodLabel);
  const updateFromPicker = useDateFilterStore(
    (state) => state.updateFromPicker,
  );

  const { data: stats } = useQuery({
    ...convexQuery(
      api.cycleCount.getStatsWithChartData,
      organizationId && currentBranch?._id
        ? {
            organizationId: organizationId as Id<"organizations">,
            branchId: currentBranch._id as Id<"branches">,
            startDate: dateRange.from.getTime(),
            endDate: dateRange.to?.getTime() ?? dateRange.from.getTime(),
          }
        : "skip",
    ),
    enabled: !!organizationId && !!currentBranch?._id,
  });

  return (
    <PageWrapper>
      {/* Header with date picker */}
      <div className="flex flex-row items-center justify-between">
        <DateRangePicker
          align="start"
          showCompare={false}
          onUpdate={(data) => {
            updateFromPicker({
              range: data.range,
              preset: data.preset,
              periodLabel: data.periodLabel,
            });
          }}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ChartDataCard
          title="Active Sessions"
          value={stats?.activeSessions?.value ?? 0}
          changePercent={stats?.activeSessions?.changePercent ?? 0}
          periodLabel={periodLabel}
          data={stats?.activeSessions?.data ?? []}
          color="var(--chart-1)"
        />
        <ChartDataCard
          title="Total Zones"
          value={stats?.totalZones?.value ?? 0}
          changePercent={stats?.totalZones?.changePercent ?? 0}
          periodLabel={periodLabel}
          data={stats?.totalZones?.data ?? []}
          color="var(--chart-2)"
        />
        <ChartDataCard
          title="Completed"
          value={stats?.completedSessions?.value ?? 0}
          changePercent={stats?.completedSessions?.changePercent ?? 0}
          periodLabel={periodLabel}
          data={stats?.completedSessions?.data ?? []}
          color="var(--chart-3)"
        />
        <ChartDataCard
          title="Verification Rate"
          value={`${stats?.verificationRate?.value ?? 0}%`}
          changePercent={stats?.verificationRate?.changePercent ?? 0}
          periodLabel={periodLabel}
          data={stats?.verificationRate?.data ?? []}
          color="var(--chart-4)"
        />
      </div>

      {/* Sessions Table */}
      <CycleCountSessionsTable />
    </PageWrapper>
  );
}
