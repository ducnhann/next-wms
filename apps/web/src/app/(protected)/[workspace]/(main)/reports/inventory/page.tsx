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
  AlertTriangle,
  Boxes,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Package,
  PackageX,
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
import type { InventoryReportItem } from "@/lib/types";
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

type InventoryFilter = "all" | "low-stock" | "expiring" | "expired";

export default function InventoryReportPage() {
  const { organizationId } = useCurrentUser();
  const { currentBranch } = useBranches({
    organizationId: organizationId as Id<"organizations"> | undefined,
    includeDeleted: false,
  });

  // Date range state
  const dateRange = useDateFilterStore((state) => state.dateRange);
  const updateFromPicker = useDateFilterStore(
    (state) => state.updateFromPicker,
  );

  // Filter state
  const [filter, setFilter] = React.useState<InventoryFilter>("all");

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
      api.reports.getInventoryReportSummary,
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

  // Fetch detailed items (always fetch all, filter client-side)
  const { data: items, isPending: isItemsPending } = useQuery({
    ...convexQuery(
      api.reports.getInventoryReportItems,
      currentBranch
        ? {
            branchId: currentBranch._id,
            endDate,
          }
        : "skip",
    ),
    enabled: !!currentBranch,
  });

  // Client-side filtering for better performance
  const filteredItems = React.useMemo(() => {
    if (!items) return [];
    if (filter === "all") return items;

    return items.filter((item) => {
      switch (filter) {
        case "low-stock":
          return item.isLowStock;
        case "expiring":
          return item.isExpiringSoon && !item.isExpired;
        case "expired":
          return item.isExpired;
        default:
          return true;
      }
    });
  }, [items, filter]);

  // Table state
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  const columns: ColumnDef<InventoryReportItem>[] = React.useMemo(
    () => [
      {
        accessorKey: "skuCode",
        header: () => <div className="ml-1">SKU</div>,
        cell: ({ row }) => (
          <TableCellFirst className="font-medium">
            {row.getValue("skuCode")}
          </TableCellFirst>
        ),
      },
      {
        accessorKey: "productName",
        header: "Product",
        cell: ({ row }) => (
          <div className="max-w-50 truncate">{row.getValue("productName")}</div>
        ),
      },
      {
        accessorKey: "categoryName",
        header: ({ column }) => {
          const categories = items
            ? Array.from(new Set(items.map((item) => item.categoryName))).map(
                (name) => ({
                  label: name,
                  value: name,
                }),
              )
            : [];

          const currentFilter = column.getFilterValue() as string[] | undefined;

          return (
            <FilterPopover
              label="Category"
              options={categories}
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
        cell: ({ row }) => <div>{row.getValue("categoryName")}</div>,
      },
      {
        accessorKey: "zoneName",
        header: ({ column }) => {
          const zones = items
            ? Array.from(new Set(items.map((item) => item.zoneName))).map(
                (name) => ({
                  label: name,
                  value: name,
                }),
              )
            : [];

          const currentFilter = column.getFilterValue() as string[] | undefined;

          return (
            <FilterPopover
              label="Zone"
              options={zones}
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
        cell: ({ row }) => <div>{row.getValue("zoneName")}</div>,
      },
      {
        accessorKey: "quantity",
        header: () => <div className="text-center">Qty</div>,
        cell: ({ row }) => {
          const quantity = row.getValue("quantity") as number;
          const isLowStock = row.original.isLowStock;
          return (
            <div
              className={cn(
                "text-center font-medium",
                isLowStock && "text-orange-600",
              )}
            >
              {quantity}
              {isLowStock && <AlertTriangle className="ml-1 inline h-3 w-3" />}
            </div>
          );
        },
      },
      {
        accessorKey: "expiresAt",
        header: () => <div className="text-center">Expires</div>,
        cell: ({ row }) => {
          const expiresAt = row.getValue("expiresAt") as number | undefined;
          const isExpiringSoon = row.original.isExpiringSoon;
          const isExpired = row.original.isExpired;

          if (!expiresAt) {
            return <div className="text-center text-muted-foreground">N/A</div>;
          }

          return (
            <div
              className={cn(
                isExpired
                  ? "font-medium text-red-600"
                  : isExpiringSoon
                    ? "font-medium text-orange-600"
                    : "",
                "text-center",
              )}
            >
              {new Date(expiresAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              {isExpired && <span className="ml-1">(Expired)</span>}
              {isExpiringSoon && !isExpired && (
                <span className="ml-1">(Soon)</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.getValue("status") as string;

          return (
            <Badge className={getBadgeStyleByStatus(status)}>{status}</Badge>
          );
        },
      },
    ],
    [items],
  );

  const table = useReactTable({
    data: filteredItems,
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
  const categoryChartData = React.useMemo(() => {
    if (!summary?.categoryBreakdown) return [];
    return summary.categoryBreakdown.map((item) => ({
      name: item.category,
      quantity: item.quantity,
    }));
  }, [summary]);

  const zoneChartData = React.useMemo(() => {
    if (!summary?.zoneBreakdown) return [];
    return summary.zoneBreakdown.map((item) => ({
      name: item.zone,
      quantity: item.quantity,
    }));
  }, [summary]);

  return (
    <PageWrapper>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">
            Inventory Report
          </h1>
          <p className="text-muted-foreground">
            Monitor stock levels, values, and inventory health
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
              if (filteredItems.length === 0) return;
              exportReportToPDF({
                title: "Inventory Report",
                subtitle: "Stock Levels & Inventory Health",
                dateRange: formatDateRange(dateRange.from, dateRange.to),
                branchName: currentBranch?.name,
                kpis: [
                  { label: "Total SKUs", value: summary?.kpis.totalSKUs ?? 0 },
                  {
                    label: "Total Quantity",
                    value: summary?.kpis.totalQuantity?.toLocaleString() ?? "0",
                  },
                  {
                    label: "Low Stock",
                    value: summary?.kpis.lowStockCount ?? 0,
                  },
                  {
                    label: "Expiring Soon",
                    value: summary?.kpis.expiringSoonCount ?? 0,
                  },
                  { label: "Expired", value: summary?.kpis.expiredCount ?? 0 },
                ],
                pieChart:
                  categoryChartData.length > 0
                    ? {
                        title: "Inventory by Category",
                        data: categoryChartData.map((item) => ({
                          name: item.name,
                          value: item.quantity,
                        })),
                      }
                    : undefined,
                barChart:
                  zoneChartData.length > 0
                    ? {
                        title: "Inventory by Zone",
                        data: zoneChartData.map((item) => ({
                          name: item.name,
                          value: item.quantity,
                        })),
                        valueLabel: "Quantity",
                      }
                    : undefined,
                tableHeaders: [
                  "SKU",
                  "Product",
                  "Category",
                  "Zone",
                  "Quantity",
                  "Expires",
                  "Status",
                ],
                tableData: filteredItems.map((item) => [
                  item.skuCode,
                  item.productName,
                  item.categoryName,
                  item.zoneName,
                  item.quantity,
                  item.expiresAt
                    ? new Date(item.expiresAt).toLocaleDateString()
                    : "N/A",
                  item.status,
                ]),
                fileName: `inventory-report-${new Date().toISOString().split("T")[0]}`,
              });
            }}
            disabled={filteredItems.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Total SKUs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isSummaryPending ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="font-bold text-2xl">
                  {summary?.kpis.totalSKUs ?? 0}
                </div>
                <p className="text-muted-foreground text-xs">unique products</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">
              Total Quantity
            </CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isSummaryPending ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="font-bold text-2xl">
                  {summary?.kpis.totalQuantity?.toLocaleString() ?? 0}
                </div>
                <p className="text-muted-foreground text-xs">units in stock</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {isSummaryPending ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="font-bold text-2xl text-orange-600">
                  {summary?.kpis.lowStockCount ?? 0}
                </div>
                <p className="text-muted-foreground text-xs">
                  items need reorder
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Expiring Soon</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {isSummaryPending ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="font-bold text-2xl text-yellow-600">
                  {summary?.kpis.expiringSoonCount ?? 0}
                </div>
                <p className="text-muted-foreground text-xs">within 30 days</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Expired</CardTitle>
            <PackageX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {isSummaryPending ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="font-bold text-2xl text-red-600">
                  {summary?.kpis.expiredCount ?? 0}
                </div>
                <p className="text-muted-foreground text-xs">
                  items to dispose
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Category Quantity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Quantity by Category</CardTitle>
            <CardDescription>
              Inventory quantity distribution across categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSummaryPending ? (
              <div className="flex h-[300px] items-center justify-center">
                <Skeleton className="h-[200px] w-[200px] rounded-full" />
              </div>
            ) : categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: PieSectorData) =>
                      `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="quantity"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
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

        {/* Zone Utilization Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Stock by Zone</CardTitle>
            <CardDescription>
              Inventory distribution across warehouse zones
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSummaryPending ? (
              <div className="flex h-[300px] items-center justify-center">
                <Skeleton className="h-[250px] w-full" />
              </div>
            ) : zoneChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={zoneChartData}
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
                    dataKey="quantity"
                    fill="#2563eb"
                    name="Quantity"
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
              <CardTitle>Inventory Items</CardTitle>
              <CardDescription>
                Detailed list of all inventory items
              </CardDescription>
            </div>
            <Tabs
              value={filter}
              onValueChange={(v) => setFilter(v as InventoryFilter)}
            >
              <TabsList>
                <TabsTrigger value="all">All Items</TabsTrigger>
                <TabsTrigger value="low-stock">
                  Low Stock
                  {summary?.kpis.lowStockCount ? (
                    <Badge variant="secondary" className="ml-1">
                      {summary.kpis.lowStockCount}
                    </Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="expiring">
                  Expiring
                  {summary?.kpis.expiringSoonCount ? (
                    <Badge variant="secondary" className="ml-1">
                      {summary.kpis.expiringSoonCount}
                    </Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="expired">
                  Expired
                  {summary?.kpis.expiredCount ? (
                    <Badge variant="destructive" className="ml-1">
                      {summary.kpis.expiredCount}
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
                {isItemsPending ? (
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
                      No inventory items found.
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
              of {table.getFilteredRowModel().rows.length} items
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
