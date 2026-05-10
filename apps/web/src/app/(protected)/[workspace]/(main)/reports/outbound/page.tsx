"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Package,
  PackageCheck,
  ShoppingCart,
  Target,
  Timer,
  Truck,
} from "lucide-react";
import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FilterPopover } from "@/components/table/filter-popover";
import TableCellFirst from "@/components/table/table-cell-first";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
// Colors for charts
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBranches } from "@/hooks/use-branches";
import { useCurrentUser } from "@/hooks/use-current-user";
import { exportReportToPDF, formatDateRange } from "@/lib/pdf-export";
import type { OutboundReportOrder } from "@/lib/types";
import { cn, getBadgeStyleByStatus } from "@/lib/utils";
import { useDateFilterStore } from "@/store/date-filter";

const CHART_COLORS = [
  "#2563eb", // Blue
  "#16a34a", // Green
  "#ea580c", // Orange
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f59e0b", // Amber
  "#6366f1", // Indigo
];

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "#16a34a", // Green
  SHIPPED: "#059669", // Emerald
  IN_PROGRESS: "#2563eb", // Blue
  PICKING: "#3b82f6", // Light Blue
  PENDING: "#f59e0b", // Amber
  DRAFT: "#6b7280", // Gray
  CANCELLED: "#dc2626", // Red
};

type OutboundFilter =
  | "all"
  | "completed"
  | "shipped"
  | "pending"
  | "in-progress";

export default function OutboundReportPage() {
  const { organizationId } = useCurrentUser();
  const { currentBranch } = useBranches({
    organizationId: organizationId as Id<"organizations"> | undefined,
    includeDeleted: false,
  });

  // Date range state
  const dateRange = useDateFilterStore((state) => state.dateRange);
  const periodLabel = useDateFilterStore((state) => state.periodLabel);
  const updateFromPicker = useDateFilterStore(
    (state) => state.updateFromPicker,
  );

  // Filter state
  const [filter, setFilter] = React.useState<OutboundFilter>("all");

  // Calculate date range timestamps - memoize to prevent query key instability
  const { startDate, endDate } = React.useMemo(() => {
    const end = dateRange.to?.getTime() ?? Date.now();
    const start =
      dateRange.from?.getTime() ?? Date.now() - 30 * 24 * 60 * 60 * 1000;
    return { startDate: start, endDate: end };
  }, [dateRange.from, dateRange.to]);

  // Fetch report summary
  const { data: summary, isPending: isSummaryPending } = useQuery({
    ...convexQuery(
      api.reports.getOutboundReportSummary,
      currentBranch
        ? {
            branchId: currentBranch._id,
            startDate,
            endDate,
          }
        : "skip",
    ),
    enabled: !!currentBranch,
  });

  // Fetch detailed orders
  const { data: orders, isPending: isOrdersPending } = useQuery({
    ...convexQuery(
      api.reports.getOutboundReportOrders,
      currentBranch
        ? {
            branchId: currentBranch._id,
            startDate,
            endDate,
          }
        : "skip",
    ),
    enabled: !!currentBranch,
  });

  // Client-side filtering for better performance
  const filteredOrders = React.useMemo(() => {
    if (!orders) return [];
    if (filter === "all") return orders;

    return orders.filter((order) => {
      const statusCode = order.statusCode.toUpperCase();
      switch (filter) {
        case "completed":
          return statusCode === "COMPLETED";
        case "shipped":
          return statusCode === "SHIPPED";
        case "pending":
          return statusCode === "PENDING" || statusCode === "DRAFT";
        case "in-progress":
          return (
            statusCode === "IN_PROGRESS" ||
            statusCode === "PICKING" ||
            statusCode === "PACKING"
          );
        default:
          return true;
      }
    });
  }, [orders, filter]);

  // Table state
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  const columns: ColumnDef<OutboundReportOrder>[] = React.useMemo(
    () => [
      {
        accessorKey: "orderCode",
        header: "Order ID",
        cell: ({ row }) => (
          <TableCellFirst className="font-medium">
            {row.getValue("orderCode")}
          </TableCellFirst>
        ),
      },
      {
        accessorKey: "orderDate",
        header: "Order Date",
        cell: ({ row }) => (
          <div>
            {new Date(row.getValue("orderDate")).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        ),
      },
      {
        accessorKey: "createdByName",
        header: "Created By",
        cell: ({ row }) => <div>{row.getValue("createdByName")}</div>,
      },
      {
        accessorKey: "status",
        header: ({ column }) => {
          const statuses = orders
            ? Array.from(new Set(orders.map((o) => o.status))).map(
                (status) => ({
                  label: status,
                  value: status,
                }),
              )
            : [];

          const currentFilter = column.getFilterValue() as string[] | undefined;

          return (
            <FilterPopover
              label="Status"
              options={statuses}
              currentValue={currentFilter}
              onChange={(value) => column.setFilterValue(value)}
              variant="multi-select"
            />
          );
        },
        filterFn: (row, id, value) => {
          if (!value || (Array.isArray(value) && value.length === 0))
            return true;
          const rowValue = row.getValue(id) as string;
          return Array.isArray(value)
            ? value.includes(rowValue)
            : rowValue === value;
        },
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          const statusCode = row.original.statusCode;
          return (
            <Badge className={cn(getBadgeStyleByStatus(statusCode))}>
              {status}
            </Badge>
          );
        },
      },
      {
        accessorKey: "itemCount",
        header: () => <div className="text-right">SKUs</div>,
        cell: ({ row }) => (
          <div className="text-right">{row.getValue("itemCount")}</div>
        ),
      },
      {
        accessorKey: "totalRequested",
        header: () => <div className="text-right">Requested</div>,
        cell: ({ row }) => (
          <div className="text-right">{row.getValue("totalRequested")}</div>
        ),
      },
      {
        accessorKey: "totalPicked",
        header: () => <div className="text-right">Picked</div>,
        cell: ({ row }) => (
          <div className="text-right">{row.getValue("totalPicked")}</div>
        ),
      },
      {
        accessorKey: "totalPacked",
        header: () => <div className="text-right">Packed</div>,
        cell: ({ row }) => (
          <div className="text-right font-medium">
            {row.getValue("totalPacked")}
          </div>
        ),
      },
      {
        accessorKey: "fulfillmentRate",
        header: () => <div className="text-right">Fulfillment</div>,
        cell: ({ row }) => {
          const rate = row.getValue("fulfillmentRate") as number;
          return (
            <div
              className={cn(
                "text-right font-medium",
                rate >= 100
                  ? "text-green-600"
                  : rate >= 80
                    ? "text-yellow-600"
                    : "text-red-600",
              )}
            >
              {rate}%
            </div>
          );
        },
      },
      {
        accessorKey: "trackingNumber",
        header: "Tracking",
        cell: ({ row }) => {
          const tracking = row.getValue("trackingNumber") as string | undefined;
          return tracking ? (
            <div className="font-mono text-xs">{tracking}</div>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
    ],
    [orders],
  );

  const table = useReactTable({
    data: filteredOrders,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  // Prepare chart data
  const statusChartData = React.useMemo(() => {
    if (!summary?.statusBreakdown) return [];
    return summary.statusBreakdown.map((item) => ({
      name: item.status,
      value: item.count,
      code: item.statusCode,
    }));
  }, [summary]);

  const dailyTrendData = React.useMemo(() => {
    if (!summary?.dailyTrend) return [];
    return summary.dailyTrend.map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      value: item.value,
    }));
  }, [summary]);

  const topProductsData = React.useMemo(() => {
    if (!summary?.topProducts) return [];
    return summary.topProducts.slice(0, 8);
  }, [summary]);

  return (
    <PageWrapper>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">Outbound Report</h1>
          <p className="text-muted-foreground">
            Track order fulfillment and shipping performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker
            align="end"
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (filteredOrders.length === 0) return;
              exportReportToPDF({
                title: "Outbound Report",
                subtitle: "Order Fulfillment & Shipping Performance",
                dateRange: formatDateRange(dateRange.from, dateRange.to),
                branchName: currentBranch?.name,
                kpis: [
                  {
                    label: "Total Orders",
                    value: summary?.kpis.totalOrders ?? 0,
                  },
                  {
                    label: "Items Shipped",
                    value:
                      summary?.kpis.totalItemsShipped?.toLocaleString() ?? "0",
                  },
                  {
                    label: "Avg Items/Order",
                    value: summary?.kpis.avgItemsPerOrder ?? 0,
                  },
                  {
                    label: "Fulfillment Rate",
                    value: `${summary?.kpis.overallFulfillmentRate ?? 0}%`,
                  },
                  {
                    label: "Pick Sessions",
                    value: summary?.kpis.totalPickingSessions ?? 0,
                  },
                ],
                pieChart:
                  statusChartData.length > 0
                    ? {
                        title: "Order Status Breakdown",
                        data: statusChartData.map((item) => ({
                          name: item.name,
                          value: item.value,
                          color: STATUS_COLORS[item.code] || undefined,
                        })),
                      }
                    : undefined,
                barChart:
                  topProductsData.length > 0
                    ? {
                        title: "Top Products Shipped",
                        data: topProductsData.map((item) => ({
                          name: item.productName,
                          value: item.quantity,
                        })),
                        valueLabel: "Quantity Shipped",
                      }
                    : undefined,
                tableHeaders: [
                  "Order ID",
                  "Order Date",
                  "Created By",
                  "Status",
                  "SKUs",
                  "Requested",
                  "Picked",
                  "Packed",
                  "Fulfillment",
                  "Tracking",
                ],
                tableData: filteredOrders.map((o) => [
                  o.orderCode,
                  new Date(o.orderDate).toLocaleDateString(),
                  o.createdByName,
                  o.status,
                  o.itemCount,
                  o.totalRequested,
                  o.totalPicked,
                  o.totalPacked,
                  `${o.fulfillmentRate}%`,
                  o.trackingNumber || "-",
                ]),
                fileName: `outbound-report-${new Date().toISOString().split("T")[0]}`,
              });
            }}
            disabled={filteredOrders.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isSummaryPending ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="font-bold text-2xl">
                  {summary?.kpis.totalOrders ?? 0}
                </div>
                <p className="text-muted-foreground text-xs">{periodLabel}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Items Shipped</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isSummaryPending ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="font-bold text-2xl">
                  {summary?.kpis.totalItemsShipped?.toLocaleString() ?? 0}
                </div>
                <p className="text-muted-foreground text-xs">
                  {summary?.kpis.avgItemsPerOrder ?? 0} avg per order
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">
              Avg Items/Order
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isSummaryPending ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="font-bold text-2xl">
                  {summary?.kpis.avgItemsPerOrder ?? 0}
                </div>
                <p className="text-muted-foreground text-xs">items per order</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">
              Fulfillment Rate
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isSummaryPending ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-2xl">
                    {summary?.kpis.overallFulfillmentRate ?? 100}%
                  </span>
                  {(summary?.kpis.overallFulfillmentRate ?? 100) >= 95 ? (
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <p className="text-muted-foreground text-xs">
                  packed vs requested
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">
              Picking Sessions
            </CardTitle>
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isSummaryPending ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="font-bold text-2xl">
                  {summary?.kpis.totalPickingSessions ?? 0}
                </div>
                <p className="text-muted-foreground text-xs">
                  total pick sessions
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Avg Pick Time</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isSummaryPending ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="font-bold text-2xl">
                  {summary?.kpis.avgPickingTimeMinutes ?? 0}
                  <span className="font-normal text-muted-foreground text-sm">
                    {" "}
                    min
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">
                  per picking session
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Status Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
            <CardDescription>
              Distribution of outbound orders by status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSummaryPending ? (
              <div className="flex h-[300px] items-center justify-center">
                <Skeleton className="h-[200px] w-[200px] rounded-full" />
              </div>
            ) : statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({
                      name,
                      percent,
                    }: {
                      name: string;
                      percent: number;
                    }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index.toString()}`}
                        fill={
                          STATUS_COLORS[entry.code] ??
                          CHART_COLORS[index % CHART_COLORS.length]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Trend Area Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Shipment Trend</CardTitle>
            <CardDescription>Orders shipped per day over time</CardDescription>
          </CardHeader>
          <CardContent>
            {isSummaryPending ? (
              <div className="flex h-[300px] items-center justify-center">
                <Skeleton className="h-[250px] w-full" />
              </div>
            ) : dailyTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={dailyTrendData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="colorShipped"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#2563eb"
                    fillOpacity={1}
                    fill="url(#colorShipped)"
                    name="Orders Shipped"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Top Products Shipped</CardTitle>
          <CardDescription>
            Most frequently shipped products in the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSummaryPending ? (
            <div className="flex h-[300px] items-center justify-center">
              <Skeleton className="h-[250px] w-full" />
            </div>
          ) : topProductsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={topProductsData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  dataKey="skuCode"
                  type="category"
                  width={120}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="font-medium">{data.skuCode}</div>
                          <div className="text-muted-foreground text-sm">
                            {data.productName}
                          </div>
                          <div className="mt-1 font-medium">
                            {data.quantity} units shipped
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="quantity"
                  fill="#8b5cf6"
                  name="Quantity Shipped"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Outbound Orders</CardTitle>
              <CardDescription>
                Detailed list of all outbound orders in the selected period
              </CardDescription>
            </div>
            <Tabs
              value={filter}
              onValueChange={(v) => setFilter(v as OutboundFilter)}
            >
              <TabsList>
                <TabsTrigger value="all">All Orders</TabsTrigger>
                <TabsTrigger value="completed">
                  Completed
                  {summary?.statusBreakdown.find(
                    (s) => s.statusCode === "COMPLETED",
                  )?.count ? (
                    <Badge variant="secondary" className="ml-1">
                      {
                        summary.statusBreakdown.find(
                          (s) => s.statusCode === "COMPLETED",
                        )?.count
                      }
                    </Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="shipped">
                  Shipped
                  {summary?.statusBreakdown.find(
                    (s) => s.statusCode === "SHIPPED",
                  )?.count ? (
                    <Badge variant="secondary" className="ml-1">
                      {
                        summary.statusBreakdown.find(
                          (s) => s.statusCode === "SHIPPED",
                        )?.count
                      }
                    </Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="in-progress">
                  In Progress
                  {summary?.statusBreakdown &&
                  summary.statusBreakdown
                    .filter((s) =>
                      ["IN_PROGRESS", "PICKING", "PACKING"].includes(
                        s.statusCode,
                      ),
                    )
                    .reduce((sum, s) => sum + s.count, 0) > 0 ? (
                    <Badge variant="secondary" className="ml-1">
                      {summary.statusBreakdown
                        .filter((s) =>
                          ["IN_PROGRESS", "PICKING", "PACKING"].includes(
                            s.statusCode,
                          ),
                        )
                        .reduce((sum, s) => sum + s.count, 0)}
                    </Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending
                  {summary?.statusBreakdown &&
                  summary.statusBreakdown
                    .filter((s) => ["PENDING", "DRAFT"].includes(s.statusCode))
                    .reduce((sum, s) => sum + s.count, 0) > 0 ? (
                    <Badge variant="secondary" className="ml-1">
                      {summary.statusBreakdown
                        .filter((s) =>
                          ["PENDING", "DRAFT"].includes(s.statusCode),
                        )
                        .reduce((sum, s) => sum + s.count, 0)}
                    </Badge>
                  ) : null}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
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
                {isOrdersPending ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i.toString()}>
                      {columns.map((_, j) => (
                        <TableCell key={j.toString()}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
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
                      No outbound orders found for this period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between py-4">
            <div className="text-muted-foreground text-sm">
              Showing{" "}
              {table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
                1}{" "}
              to{" "}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) *
                  table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length,
              )}{" "}
              of {table.getFilteredRowModel().rows.length} orders
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
