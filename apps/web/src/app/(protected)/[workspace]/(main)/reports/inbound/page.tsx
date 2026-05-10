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
  Target,
  TrendingUp,
} from "lucide-react";
import * as React from "react";
import {
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
import type { PieSectorData } from "recharts/types/polar/Pie";
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
import type { InboundReportSession } from "@/lib/types";
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
  IN_PROGRESS: "#2563eb", // Blue
  PENDING: "#f59e0b", // Amber
  DRAFT: "#6b7280", // Gray
  CANCELLED: "#dc2626", // Red
};

type InboundFilter = "all" | "completed" | "pending" | "in-progress";

export default function InboundReportPage() {
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
  const [filter, setFilter] = React.useState<InboundFilter>("all");

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
      api.reports.getInboundReportSummary,
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

  // Fetch detailed sessions
  const { data: sessions, isPending: isSessionsPending } = useQuery({
    ...convexQuery(
      api.reports.getInboundReportSessions,
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
  const filteredSessions = React.useMemo(() => {
    if (!sessions) return [];
    if (filter === "all") return sessions;

    return sessions.filter((session) => {
      const statusCode = session.statusCode.toUpperCase();
      switch (filter) {
        case "completed":
          return statusCode === "COMPLETED";
        case "pending":
          return statusCode === "PENDING" || statusCode === "DRAFT";
        case "in-progress":
          return statusCode === "IN_PROGRESS" || statusCode === "RECEIVING";
        default:
          return true;
      }
    });
  }, [sessions, filter]);

  // Table state
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  const columns: ColumnDef<InboundReportSession>[] = React.useMemo(
    () => [
      {
        accessorKey: "receiveSessionCode",
        header: "Session ID",
        cell: ({ row }) => (
          <TableCellFirst className="font-medium">
            {row.getValue("receiveSessionCode")}
          </TableCellFirst>
        ),
      },
      {
        accessorKey: "purchaseOrderCode",
        header: "PO Code",
        cell: ({ row }) => <div>{row.getValue("purchaseOrderCode")}</div>,
      },
      {
        accessorKey: "supplierName",
        header: ({ column }) => {
          const suppliers = sessions
            ? Array.from(new Set(sessions.map((s) => s.supplierName))).map(
                (name) => ({
                  label: name,
                  value: name,
                }),
              )
            : [];

          const currentFilter = column.getFilterValue() as string[] | undefined;

          return (
            <FilterPopover
              label="Supplier"
              options={suppliers}
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
        cell: ({ row }) => <div>{row.getValue("supplierName")}</div>,
      },
      {
        accessorKey: "receivedAt",
        header: "Received Date",
        cell: ({ row }) => (
          <div>
            {new Date(row.getValue("receivedAt")).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => {
          const statuses = sessions
            ? Array.from(new Set(sessions.map((s) => s.status))).map(
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
        accessorKey: "totalReceived",
        header: () => <div className="text-right">Received</div>,
        cell: ({ row }) => (
          <div className="text-right font-medium">
            {row.getValue("totalReceived")}
          </div>
        ),
      },
      {
        accessorKey: "totalExpected",
        header: () => <div className="text-right">Expected</div>,
        cell: ({ row }) => (
          <div className="text-right">{row.getValue("totalExpected")}</div>
        ),
      },
      {
        accessorKey: "variance",
        header: () => <div className="text-right">Variance</div>,
        cell: ({ row }) => {
          const variance = row.getValue("variance") as number;
          return (
            <div
              className={cn(
                "text-right font-medium",
                variance > 0
                  ? "text-green-600"
                  : variance < 0
                    ? "text-red-600"
                    : "",
              )}
            >
              {variance > 0 ? `+${variance}` : variance}
            </div>
          );
        },
      },
      {
        accessorKey: "accuracyRate",
        header: () => <div className="text-right">Accuracy</div>,
        cell: ({ row }) => {
          const accuracy = row.getValue("accuracyRate") as number;
          return (
            <div
              className={cn(
                "text-right font-medium",
                accuracy >= 100
                  ? "text-green-600"
                  : accuracy >= 95
                    ? "text-yellow-600"
                    : "text-red-600",
              )}
            >
              {accuracy}%
            </div>
          );
        },
      },
    ],
    [sessions],
  );

  const table = useReactTable({
    data: filteredSessions,
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

  const supplierChartData = React.useMemo(() => {
    if (!summary?.supplierBreakdown) return [];
    return summary.supplierBreakdown.map((item) => ({
      name: item.supplier,
      sessions: item.sessions,
      items: item.itemsReceived,
    }));
  }, [summary]);

  return (
    <PageWrapper>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">Inbound Report</h1>
          <p className="text-muted-foreground">
            Analyze receiving operations and supplier performance
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
              if (filteredSessions.length === 0) return;
              exportReportToPDF({
                title: "Inbound Report",
                subtitle: "Receiving Operations & Supplier Performance",
                dateRange: formatDateRange(dateRange.from, dateRange.to),
                branchName: currentBranch?.name,
                kpis: [
                  {
                    label: "Total Sessions",
                    value: summary?.kpis.totalSessions ?? 0,
                  },
                  {
                    label: "Items Received",
                    value:
                      summary?.kpis.totalItemsReceived?.toLocaleString() ?? "0",
                  },
                  {
                    label: "Avg Items/Session",
                    value: summary?.kpis.avgItemsPerSession ?? 0,
                  },
                  {
                    label: "Accuracy Rate",
                    value: `${summary?.kpis.overallAccuracyRate ?? 100}%`,
                  },
                ],
                pieChart:
                  statusChartData.length > 0
                    ? {
                        title: "Status Breakdown",
                        data: statusChartData.map((item) => ({
                          name: item.name,
                          value: item.value,
                          color: STATUS_COLORS[item.code] || undefined,
                        })),
                      }
                    : undefined,
                barChart:
                  supplierChartData.length > 0
                    ? {
                        title: "Top Suppliers by Items Received",
                        data: supplierChartData.map((item) => ({
                          name: item.name,
                          value: item.items,
                        })),
                        valueLabel: "Items Received",
                      }
                    : undefined,
                tableHeaders: [
                  "Session ID",
                  "PO Code",
                  "Supplier",
                  "Received Date",
                  "Status",
                  "SKUs",
                  "Received",
                  "Expected",
                  "Variance",
                  "Accuracy",
                ],
                tableData: filteredSessions.map((s) => [
                  s.receiveSessionCode,
                  s.purchaseOrderCode,
                  s.supplierName,
                  new Date(s.receivedAt).toLocaleDateString(),
                  s.status,
                  s.itemCount,
                  s.totalReceived,
                  s.totalExpected,
                  s.variance > 0 ? `+${s.variance}` : s.variance,
                  `${s.accuracyRate}%`,
                ]),
                fileName: `inbound-report-${new Date().toISOString().split("T")[0]}`,
              });
            }}
            disabled={filteredSessions.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">
              Total Sessions
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isSummaryPending ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="font-bold text-2xl">
                  {summary?.kpis.totalSessions ?? 0}
                </div>
                <p className="text-muted-foreground text-xs">{periodLabel}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">
              Items Received
            </CardTitle>
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isSummaryPending ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="font-bold text-2xl">
                  {summary?.kpis.totalItemsReceived?.toLocaleString() ?? 0}
                </div>
                <p className="text-muted-foreground text-xs">
                  {summary?.kpis.avgItemsPerSession ?? 0} avg per session
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">
              Avg Items/Session
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isSummaryPending ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="font-bold text-2xl">
                  {summary?.kpis.avgItemsPerSession ?? 0}
                </div>
                <p className="text-muted-foreground text-xs">
                  items per session
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">
              Receiving Accuracy
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
                    {summary?.kpis.overallAccuracyRate ?? 100}%
                  </span>
                  {(summary?.kpis.overallAccuracyRate ?? 100) >= 100 ? (
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <p className="text-muted-foreground text-xs">
                  received vs expected
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
            <CardTitle>Sessions by Status</CardTitle>
            <CardDescription>
              Distribution of receive sessions by status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSummaryPending ? (
              <div className="flex h-75 items-center justify-center">
                <Skeleton className="h-50 w-50 rounded-full" />
              </div>
            ) : statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: PieSectorData) =>
                      `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                    }
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

        {/* Supplier Performance Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Suppliers by Volume</CardTitle>
            <CardDescription>Items received from top suppliers</CardDescription>
          </CardHeader>
          <CardContent>
            {isSummaryPending ? (
              <div className="flex h-[300px] items-center justify-center">
                <Skeleton className="h-[250px] w-full" />
              </div>
            ) : supplierChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={supplierChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="items"
                    fill="#2563eb"
                    name="Items Received"
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar
                    dataKey="sessions"
                    fill="#16a34a"
                    name="Sessions"
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
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Receive Sessions</CardTitle>
              <CardDescription>
                Detailed list of all receive sessions in the selected period
              </CardDescription>
            </div>
            <Tabs
              value={filter}
              onValueChange={(v) => setFilter(v as InboundFilter)}
            >
              <TabsList>
                <TabsTrigger value="all">All Sessions</TabsTrigger>
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
                <TabsTrigger value="in-progress">
                  In Progress
                  {summary?.statusBreakdown.find(
                    (s) =>
                      s.statusCode === "IN_PROGRESS" ||
                      s.statusCode === "RECEIVING",
                  )?.count ? (
                    <Badge variant="secondary" className="ml-1">
                      {summary.statusBreakdown
                        .filter(
                          (s) =>
                            s.statusCode === "IN_PROGRESS" ||
                            s.statusCode === "RECEIVING",
                        )
                        .reduce((sum, s) => sum + s.count, 0)}
                    </Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending
                  {summary?.statusBreakdown.find(
                    (s) =>
                      s.statusCode === "PENDING" || s.statusCode === "DRAFT",
                  )?.count ? (
                    <Badge variant="secondary" className="ml-1">
                      {summary.statusBreakdown
                        .filter(
                          (s) =>
                            s.statusCode === "PENDING" ||
                            s.statusCode === "DRAFT",
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
                {isSessionsPending ? (
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
                      No receive sessions found for this period.
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
              of {table.getFilteredRowModel().rows.length} sessions
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
