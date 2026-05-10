"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import {
  Activity,
  ArrowRight,
  Boxes,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  ListTodo,
  MoreHorizontal,
  Package,
  PackageCheck,
  RotateCcw,
  Truck,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  ChartDataCard,
  type ChartDataPoint,
} from "@/components/chart-data-card";
import TableCellFirst from "@/components/table/table-cell-first";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBranches } from "@/hooks/use-branches";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getBadgeStyleByStatus } from "@/lib/utils";
import { useChartStore } from "@/store/chart";
import { useDateFilterStore } from "@/store/date-filter";

// Types for dashboard data
type RecentOrder = {
  _id: string;
  code: string;
  type: "Inbound" | "Outbound";
  status: string;
  statusCode: string;
  itemCount: number;
  createdAt: number;
  supplierName?: string;
  trackingNumber?: string;
};

type RecentActivity = {
  _id: string;
  entityType: string;
  entityId?: string;
  action: string;
  userName: string;
  notes?: string;
  timestamp: number;
};

export default function DashboardPage() {
  const { organizationId } = useCurrentUser();
  const params = useParams();
  const workspace = params.workspace as string;

  const { currentBranch } = useBranches({
    organizationId: organizationId as Id<"organizations"> | undefined,
    includeDeleted: false,
  });

  // Chart controls
  const lineType = useChartStore((state) => state.lineType);
  const setLineType = useChartStore((state) => state.setLineType);
  const projectionStyle = useChartStore((state) => state.projectionStyle);
  const setProjectionStyle = useChartStore((state) => state.setProjectionStyle);

  // Date range state - use local state for stable API calls
  const periodLabel = useDateFilterStore((state) => state.periodLabel);
  const dateRange = useDateFilterStore((state) => state.dateRange);
  const updateFromPicker = useDateFilterStore(
    (state) => state.updateFromPicker,
  );

  // Calculate date range (default to last 7 days) - memoize to prevent re-renders
  const { startDate, endDate } = useMemo(() => {
    const end = dateRange.to?.getTime() ?? Date.now();
    const start =
      dateRange.from?.getTime() ?? Date.now() - 7 * 24 * 60 * 60 * 1000;
    return { startDate: start, endDate: end };
  }, [dateRange.from, dateRange.to]);

  // Fetch dashboard summary
  const { data: dashboardData, isPending } = useQuery({
    ...convexQuery(
      api.reports.getDashboardSummary,
      currentBranch
        ? {
            branchId: currentBranch._id,
            startDate,
            endDate,
          }
        : "skip",
    ),
    enabled: !!currentBranch,
    staleTime: 30000, // Cache for 30 seconds to prevent excessive refetches
  });

  // Format relative time
  const formatRelativeTime = useCallback((timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }, []);

  // Get icon for entity type
  const getActivityIcon = (entityType: string) => {
    const cn = "size-5 text-gray-500";

    switch (entityType.toLowerCase()) {
      case "purchase_orders":
        return <Package className={cn} />;
      case "outbound_orders":
        return <Truck className={cn} />;
      case "receive_sessions":
        return <PackageCheck className={cn} />;
      case "inventory_batches":
        return <Boxes className={cn} />;
      case "return_requests":
        return <RotateCcw className={cn} />;
      default:
        return <ClipboardList className={cn} />;
    }
  };

  // Generate chart data for cards - memoize for performance
  const cardsData = useMemo(() => {
    const emptyChartData: ChartDataPoint[] = [];

    if (!dashboardData) {
      return [
        {
          title: "Total Inventory",
          value: 0,
          changePercent: 0,
          isPositive: true,
          color: "var(--chart-1)",
          data: emptyChartData,
        },
        {
          title: "Pending Inbound",
          value: 0,
          changePercent: 0,
          isPositive: true,
          color: "var(--chart-2)",
          data: emptyChartData,
        },
        {
          title: "Outbound Ready",
          value: 0,
          changePercent: 0,
          isPositive: true,
          color: "var(--chart-3)",
          data: emptyChartData,
        },
        {
          title: "Low Stock Alerts",
          value: 0,
          changePercent: 0,
          isPositive: true,
          color: "var(--chart-4)",
          data: emptyChartData,
        },
      ];
    }

    // Create trend data from orderActivityTrend
    const trendData: ChartDataPoint[] =
      dashboardData.orderActivityTrend?.map(
        (item: { date: string; inbound: number; outbound: number }) => ({
          label: new Date(item.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          value: item.inbound + item.outbound,
          isProjected: false,
        }),
      ) ?? [];

    return [
      {
        title: "Total Inventory",
        value: dashboardData.kpis.totalInventory ?? 0,
        changePercent: 0,
        isPositive: true,
        color: "var(--chart-1)",
        data: trendData,
      },
      {
        title: "Pending Inbound",
        value: dashboardData.kpis.pendingInboundCount ?? 0,
        changePercent: 0,
        isPositive: true,
        color: "var(--chart-2)",
        data: trendData,
      },
      {
        title: "Outbound Ready",
        value:
          (dashboardData.kpis.outboundReadyCount ?? 0) +
          (dashboardData.kpis.outboundPendingCount ?? 0),
        changePercent: 0,
        isPositive: true,
        color: "var(--chart-3)",
        data: trendData,
      },
      {
        title: "Low Stock Alerts",
        value: dashboardData.kpis.lowStockCount ?? 0,
        changePercent: 0,
        isPositive: dashboardData.kpis.lowStockCount === 0,
        color: "var(--chart-4)",
        data: trendData,
      },
    ];
  }, [dashboardData]);

  // Recent orders table columns
  const columns: ColumnDef<RecentOrder>[] = useMemo(
    () => [
      {
        accessorKey: "code",
        header: "Order Code",
        cell: ({ row }) => (
          <TableCellFirst className="font-medium">
            {row.getValue("code")}
          </TableCellFirst>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => {
          const type = row.getValue("type") as string;
          return (
            <Badge variant="outline" className={getBadgeStyleByStatus(type)}>
              {type}
            </Badge>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          return (
            <Badge variant="outline" className={getBadgeStyleByStatus(status)}>
              {status}
            </Badge>
          );
        },
      },
      {
        accessorKey: "itemCount",
        header: () => <div className="text-center">Items</div>,
        cell: ({ row }) => (
          <div className="text-center">{row.getValue("itemCount")}</div>
        ),
      },
      {
        accessorKey: "createdAt",
        header: () => <div className="text-center">Created</div>,
        cell: ({ row }) => {
          const timestamp = row.getValue("createdAt") as number;
          return (
            <div className="text-center text-muted-foreground">
              {formatRelativeTime(timestamp)}
            </div>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const order = row.original;
          const viewUrl =
            order.type === "Inbound"
              ? `/${workspace}/inbound-orders`
              : `/${workspace}/orders`;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="mr-0">
                  <MoreHorizontal className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={viewUrl as Route}>View details</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [workspace, formatRelativeTime],
  );

  const table = useReactTable({
    data: (dashboardData?.recentOrders as RecentOrder[]) ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
  });

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

      {/* Dashboard Cards - 4 cards with charts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isPending
          ? [1, 2, 3, 4].map((i) => (
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        {/* Recent Activity */}
        <Card className="shadow-none">
          <CardHeader className="gap-0">
            <CardTitle className="flex items-center gap-4">
              <div className="rounded-sm border-2 bg-secondary/80 p-1.5">
                <Activity className="size-5" />
              </div>
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isPending ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : (dashboardData?.recentActivity as RecentActivity[])?.length >
              0 ? (
              <ScrollArea className="h-80 overflow-y-auto">
                {(dashboardData?.recentActivity as RecentActivity[]).map(
                  (activity) => (
                    <Item
                      key={activity._id}
                      className="mb-3"
                      variant={"outline"}
                    >
                      <ItemMedia variant={"icon"}>
                        {getActivityIcon(activity.entityType)}
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle className="text-sm">
                          <span className="font-medium">
                            {activity.userName}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            {activity.action.toLowerCase()}
                          </span>{" "}
                          <span className="font-medium">
                            {activity.entityType.replace(/_/g, " ")}
                          </span>
                        </ItemTitle>
                        {activity.notes && (
                          <ItemDescription className="text-xs">
                            {activity.notes}
                          </ItemDescription>
                        )}
                      </ItemContent>
                      <ItemActions>
                        <div className="flex items-center gap-1 text-muted-foreground text-xs">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(activity.timestamp)}
                        </div>
                      </ItemActions>
                    </Item>
                  ),
                )}
              </ScrollArea>
            ) : (
              <div className="flex h-80 items-center justify-center text-muted-foreground">
                No recent activity
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-none">
          <CardHeader className="gap-0">
            <CardTitle className="flex items-center gap-4">
              <div className="rounded-sm border-2 bg-muted p-1.5">
                <ListTodo className="size-5" />
              </div>
              Pending Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-rows-3">
            <Link
              href={`/${workspace}/receiving-sessions`}
              className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-purple-500/20 p-2">
                  <PackageCheck className="h-5 w-5 text-purple-500/80" />
                </div>
                <div>
                  <p className="font-medium">Receive Sessions</p>
                  <p className="text-muted-foreground text-sm">
                    Pending verification
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {dashboardData?.pendingActions?.receiveSessions ?? 0}
                </Badge>
                <ArrowRight className="size-5 text-muted-foreground" />
              </div>
            </Link>

            <Link
              href={`/${workspace}/orders`}
              className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-500/20 p-2">
                  <Truck className="h-5 w-5 text-green-500/80" />
                </div>
                <div>
                  <p className="font-medium">Outbound Orders</p>
                  <p className="text-muted-foreground text-sm">
                    Ready for picking
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {dashboardData?.pendingActions?.outboundOrders ?? 0}
                </Badge>
                <ArrowRight className="size-5 text-muted-foreground" />
              </div>
            </Link>

            <Link
              href={`/${workspace}/return-requests`}
              className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-red-500/20 p-2">
                  <RotateCcw className="h-5 w-5 text-red-500/80" />
                </div>
                <div>
                  <p className="font-medium">Return Requests</p>
                  <p className="text-muted-foreground text-sm">
                    Awaiting review
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {dashboardData?.pendingActions?.returnRequests ?? 0}
                </Badge>
                <ArrowRight className="size-5 text-muted-foreground" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
      {/* Recent Orders Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-4">
            <div className="rounded-sm border-2 bg-muted p-1.5">
              <ListTodo className="size-5" />
            </div>
            Recent Orders
          </CardTitle>
          <Link href={`/${workspace}/inbound-orders`}>
            <Button variant="outline" size="sm">
              View All
              <ArrowRight className="ml-2 size-5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isPending ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skeleton-row-${i.toString()}`}>
                      {columns.map((_, j) => (
                        <TableCell key={`skeleton-cell-${j.toString()}`}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No orders in this period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="size-5" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="size-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
