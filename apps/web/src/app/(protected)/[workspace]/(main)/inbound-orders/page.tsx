"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { MoreHorizontal } from "lucide-react";
import { useMemo } from "react";
import type { ChartDataPoint } from "@/components/chart-data-card";
import { ChartDataCard } from "@/components/chart-data-card";
import { PurchaseOrdersTable } from "@/components/table/purchase-order-table";
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
  const { userId, organizationId } = useCurrentUser();
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

  // Fetch purchase orders for current branch
  const { data: purchaseOrders, isPending } = useQuery({
    ...convexQuery(
      api.purchaseOrders.listPurchaseOrders,
      userId && currentBranch
        ? {
            branchId: currentBranch._id,
            userId: userId as Id<"users">,
          }
        : "skip",
    ),
    enabled: !!userId && !!currentBranch,
  });

  // Compute card data from purchase orders
  const cardsData = useMemo(() => {
    const emptyChartData: ChartDataPoint[] = [];

    if (!purchaseOrders || purchaseOrders.length === 0) {
      return [
        {
          title: "Received Orders",
          value: 0,
          changePercent: 0,
          isPositive: true,
          color: "var(--chart-2)",
          data: emptyChartData,
        },
        {
          title: "Pending Orders",
          value: 0,
          changePercent: 0,
          isPositive: true,
          color: "var(--chart-4)",
          data: emptyChartData,
        },
        {
          title: "Cancelled Orders",
          value: 0,
          changePercent: 0,
          isPositive: true,
          color: "var(--chart-5)",
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
    const filteredOrders = purchaseOrders.filter((order) => {
      const orderDate = new Date(order.orderedAt);
      return orderDate >= fromDate && orderDate <= toDate;
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
    const receivedCount = filteredOrders.filter(
      (o) => o.purchaseOrderStatus?.lookupCode === "RECEIVED",
    ).length;
    const pendingCount = filteredOrders.filter(
      (o) => o.purchaseOrderStatus?.lookupCode === "PENDING",
    ).length;
    const cancelledCount = filteredOrders.filter(
      (o) => o.purchaseOrderStatus?.lookupCode === "CANCELLED",
    ).length;

    return [
      {
        title: "Received Orders",
        value: receivedCount,
        changePercent: 0,
        isPositive: true,
        color: "var(--chart-2)",
        data: createTimeSeriesData(
          dayLabels,
          filteredOrders,
          (o) => o.purchaseOrderStatus?.lookupCode === "RECEIVED",
          (o) => new Date(o.orderedAt),
        ),
      },
      {
        title: "Pending Orders",
        value: pendingCount,
        changePercent: 0,
        isPositive: true,
        color: "var(--chart-4)",
        data: createTimeSeriesData(
          dayLabels,
          filteredOrders,
          (o) => o.purchaseOrderStatus?.lookupCode === "PENDING",
          (o) => new Date(o.orderedAt),
        ),
      },
      {
        title: "Cancelled Orders",
        value: cancelledCount,
        changePercent: 0,
        isPositive: true,
        color: "var(--chart-5)",
        data: createTimeSeriesData(
          dayLabels,
          filteredOrders,
          (o) => o.purchaseOrderStatus?.lookupCode === "CANCELLED",
          (o) => new Date(o.orderedAt),
        ),
      },
    ];
  }, [purchaseOrders, dateRange]);

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
      <PurchaseOrdersTable />
    </PageWrapper>
  );
}
