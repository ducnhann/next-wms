"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { MoreHorizontal } from "lucide-react";
import { useMemo } from "react";
import type { ChartDataPoint } from "@/components/chart-data-card";
import { ChartDataCard } from "@/components/chart-data-card";
import { ReceiveSessionsTable } from "@/components/table/receive-sessions-table";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Separator } from "@/components/ui/separator";
import { useBranches } from "@/hooks/use-branches";
import { useCurrentUser } from "@/hooks/use-current-user";
import { createTimeSeriesData } from "@/lib/utils";
import { useChartStore } from "@/store/chart";
import { useDateFilterStore } from "@/store/date-filter";

export default function Page() {
  const { organizationId } = useCurrentUser();
  const { currentBranch } = useBranches({
    organizationId: organizationId as Id<"organizations"> | undefined,
    includeDeleted: false,
  });

  const lineType = useChartStore((state) => state.lineType);
  const setLineType = useChartStore((state) => state.setLineType);
  const projectionStyle = useChartStore((state) => state.projectionStyle);
  const setProjectionStyle = useChartStore((state) => state.setProjectionStyle);

  const periodLabel = useDateFilterStore((state) => state.periodLabel);
  const dateRange = useDateFilterStore((state) => state.dateRange);
  const updateFromPicker = useDateFilterStore(
    (state) => state.updateFromPicker,
  );

  // Fetch receive sessions for current branch
  const { data: receiveSessions, isPending } = useQuery({
    ...convexQuery(
      api.receiveSessions.listReceiveSessions,
      currentBranch
        ? {
            branchId: currentBranch._id,
          }
        : "skip",
    ),
    enabled: !!currentBranch,
  });

  // Compute card data from receive sessions
  const cardsData = useMemo(() => {
    const emptyChartData: ChartDataPoint[] = [];

    if (!receiveSessions || receiveSessions.length === 0) {
      return [
        {
          title: "In Progress",
          value: 0,
          changePercent: 0,
          isPositive: true,
          color: "var(--chart-1)",
          data: emptyChartData,
        },
        {
          title: "Pending",
          value: 0,
          changePercent: 0,
          isPositive: true,
          color: "var(--chart-4)",
          data: emptyChartData,
        },
        {
          title: "Complete",
          value: 0,
          changePercent: 0,
          isPositive: true,
          color: "var(--chart-2)",
          data: emptyChartData,
        },
      ];
    }

    // Determine date range
    const now = new Date();
    const fromDate =
      dateRange?.from ?? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const toDate = dateRange?.to ?? now;

    // Filter by date range
    const filteredSessions = receiveSessions.filter((session) => {
      const sessionDate = new Date(session.receivedAt);
      return sessionDate >= fromDate && sessionDate <= toDate;
    });

    // Generate date labels for the range
    const dayLabels: string[] = [];
    const dayMs = 24 * 60 * 60 * 1000;
    const diffDays =
      Math.ceil((toDate.getTime() - fromDate.getTime()) / dayMs) + 1;

    for (let i = 0; i < diffDays; i++) {
      const date = new Date(fromDate.getTime() + i * dayMs);
      const label = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      dayLabels.push(label);
    }

    // Count totals by status
    const inProgressCount = filteredSessions.filter(
      (s) => s.statusCode === "IN_PROGRESS",
    ).length;
    const pendingCount = filteredSessions.filter(
      (s) => s.statusCode === "PENDING",
    ).length;
    const completeCount = filteredSessions.filter(
      (s) => s.statusCode === "COMPLETE",
    ).length;

    return [
      {
        title: "In Progress",
        value: inProgressCount,
        changePercent: 0,
        isPositive: true,
        color: "var(--chart-1)",
        data: createTimeSeriesData(
          dayLabels,
          filteredSessions,
          (s) => s.statusCode === "IN_PROGRESS",
          (s) => new Date(s.receivedAt),
        ),
      },
      {
        title: "Pending",
        value: pendingCount,
        changePercent: 0,
        isPositive: true,
        color: "var(--chart-4)",
        data: createTimeSeriesData(
          dayLabels,
          filteredSessions,
          (s) => s.statusCode === "PENDING",
          (s) => new Date(s.receivedAt),
        ),
      },
      {
        title: "Complete",
        value: completeCount,
        changePercent: 0,
        isPositive: true,
        color: "var(--chart-2)",
        data: createTimeSeriesData(
          dayLabels,
          filteredSessions,
          (s) => s.statusCode === "COMPLETE",
          (s) => new Date(s.receivedAt),
        ),
      },
    ];
  }, [receiveSessions, dateRange]);

  return (
    <PageWrapper>
      {/* Header with date picker and chart settings */}
      <div className="flex flex-row items-center justify-between">
        <DateRangePicker
          align="start"
          showCompare={false}
          onUpdate={(data) => {
            // Defer the store update to prevent synchronous re-renders that cause freezing
            setTimeout(() => {
              updateFromPicker({
                range: data.range,
                preset: data.preset,
                periodLabel: data.periodLabel,
              });
            }, 0);
          }}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="size-8">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Line Style</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={lineType === "linear"}
                onCheckedChange={(checked) => {
                  if (checked) setLineType("linear");
                }}
              >
                Linear
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={lineType === "monotone"}
                onCheckedChange={(checked) => {
                  if (checked) setLineType("monotone");
                }}
              >
                Smooth
              </DropdownMenuCheckboxItem>
            </DropdownMenuGroup>
            <Separator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Projection Style</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={projectionStyle === "area"}
                onCheckedChange={(checked) => {
                  if (checked) setProjectionStyle("area");
                }}
              >
                Area (±25%)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={projectionStyle === "line"}
                onCheckedChange={(checked) => {
                  if (checked) setProjectionStyle("line");
                }}
              >
                Line
              </DropdownMenuCheckboxItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Dashboard Cards - 3 cards with real data */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isPending
          ? [1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl border bg-card"
              />
            ))
          : cardsData.map((card) => (
              <ChartDataCard
                key={card.title}
                title={card.title}
                value={card.value}
                changePercent={card.changePercent}
                isPositive={card.isPositive}
                periodLabel={periodLabel}
                data={card.data}
                color={card.color}
              />
            ))}
      </div>
      <ReceiveSessionsTable />
    </PageWrapper>
  );
}
