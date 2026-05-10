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
} from "@tanstack/react-table";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
} from "lucide-react";
import * as React from "react";
import { FilterPopover } from "@/components/table/filter-popover";
import TableCellFirst from "@/components/table/table-cell-first";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedInput } from "@/hooks/use-debounced-input";
import { cn } from "@/lib/utils";

type InventoryTransactionItem = {
  _id: string;
  timestamp: number;
  transactionId: string;
  skuCode: string;
  batchNumber: string;
  skuBatch: string;
  transactionType: string;
  transactionTypeCode: string;
  quantityChange: number;
  quantityAfter: number;
  sourceDoc: string;
  userName: string;
  notes: string;
};

const EMPTY_ARRAY: InventoryTransactionItem[] = [];

interface InventoryTransactionsTableProps {
  organizationId: Id<"organizations"> | undefined;
  dateFrom?: number;
  dateTo?: number;
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
}

export function InventoryTransactionsTable({
  organizationId,
  dateFrom,
  dateTo,
  globalFilter,
  onGlobalFilterChange,
}: InventoryTransactionsTableProps) {
  // Local debounced input for global filter
  const [setLocalFilter, instantFilterValue, debouncedFilterValue] =
    useDebouncedInput(globalFilter, 300);

  // Sync debounced value to parent
  React.useEffect(() => {
    onGlobalFilterChange(debouncedFilterValue);
  }, [debouncedFilterValue, onGlobalFilterChange]);

  const { data: transactions, isPending } = useQuery({
    ...convexQuery(
      api.traceability.listInventoryTransactions,
      organizationId
        ? {
            organizationId,
            dateFrom,
            dateTo,
          }
        : "skip",
    ),
    enabled: !!organizationId,
  });

  const columns: ColumnDef<InventoryTransactionItem>[] = React.useMemo(
    () => [
      {
        accessorKey: "timestamp",
        header: ({ column }) => {
          const sortOptions = [
            { label: "Default", value: "default" },
            { label: "Ascending", value: "asc" },
            { label: "Descending", value: "desc" },
          ];

          const currentSort = column.getIsSorted();
          const currentValue = currentSort ? String(currentSort) : "default";

          return (
            <div className="flex items-center">
              <FilterPopover
                label="Timestamp"
                options={sortOptions}
                currentValue={currentValue}
                onChange={(value) => {
                  if (value === "default" || !value) {
                    column.clearSorting();
                  } else {
                    column.toggleSorting(value === "desc", false);
                  }
                }}
                isSort
              />
            </div>
          );
        },
        cell: ({ row }) => {
          const timestamp = row.getValue("timestamp") as number;
          const formatted = new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(timestamp));

          return (
            <TableCellFirst className="font-mono text-muted-foreground text-xs">
              {formatted}
            </TableCellFirst>
          );
        },
      },
      {
        accessorKey: "transactionId",
        header: "Transaction ID",
        cell: ({ row }) => (
          <div className="font-mono text-blue-600 text-sm">
            {row.getValue("transactionId")}
          </div>
        ),
      },
      {
        accessorKey: "skuBatch",
        header: "SKU/Batch",
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue("skuBatch") || "-"}</div>
        ),
      },
      {
        accessorKey: "transactionType",
        header: ({ column }) => {
          const filterOptions = [
            { label: "All", value: "All" },
            { label: "RECEIVING", value: "RECEIVING" },
            { label: "PICKING", value: "PICKING" },
            { label: "ADJUSTMENT", value: "ADJUSTMENT" },
            { label: "TRANSFER", value: "TRANSFER" },
          ];

          const currentFilter = column.getFilterValue() as string | undefined;

          return (
            <div className="flex items-center">
              <FilterPopover
                label="Type"
                options={filterOptions}
                currentValue={currentFilter}
                onChange={(value) => column.setFilterValue(value)}
              />
            </div>
          );
        },
        filterFn: (row, id, value) => {
          // Handle "All" or undefined - show all rows
          if (!value || value === "All") return true;
          const rowValue = row.getValue(id) as string;
          return rowValue?.toUpperCase() === value?.toUpperCase();
        },
        cell: ({ row }) => {
          const txType = row.getValue("transactionType") as string;
          const getBadgeStyle = (type: string) => {
            switch (type?.toUpperCase()) {
              case "RECEIVING":
                return "bg-green-500/10 text-green-600 border-green-500/60";
              case "PICKING":
                return "bg-orange-500/10 text-orange-600 border-orange-500/60";
              case "ADJUSTMENT":
                return "bg-yellow-500/10 text-yellow-600 border-yellow-500/60";
              case "TRANSFER":
                return "bg-purple-500/10 text-purple-600 border-purple-500/60";
              default:
                return "bg-muted text-muted-foreground";
            }
          };
          return (
            <Badge
              className={cn("text-xs", getBadgeStyle(txType))}
              variant="outline"
            >
              {txType}
            </Badge>
          );
        },
      },
      {
        accessorKey: "quantityChange",
        header: () => <div className="text-center">Qty Change</div>,
        cell: ({ row }) => {
          const change = row.getValue("quantityChange") as number;
          const isPositive = change >= 0;
          return (
            <div
              className={cn(
                "text-center font-medium",
                isPositive ? "text-green-600" : "text-red-600",
              )}
            >
              {isPositive ? `+${change}` : change}
            </div>
          );
        },
      },
      {
        accessorKey: "quantityAfter",
        header: () => <div className="text-center">Qty After</div>,
        cell: ({ row }) => (
          <div className="text-center font-medium">
            {row.getValue("quantityAfter")}
          </div>
        ),
      },
    ],
    [],
  );

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );

  const table = useReactTable({
    data: transactions ?? EMPTY_ARRAY,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onGlobalFilterChange: onGlobalFilterChange,
  });

  const activeFiltersCount =
    sorting.length + columnFilters.length + (globalFilter ? 1 : 0);

  const handleClearAllFilters = () => {
    table.resetColumnFilters();
    table.resetSorting();
    onGlobalFilterChange("");
  };

  if (isPending) {
    return (
      <div className="w-full space-y-4">
        <div className="overflow-hidden rounded-md border">
          <div className="bg-card p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="mb-2 h-12 w-full animate-pulse rounded bg-muted"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-row justify-between pb-4">
        <InputGroup className="max-w-60">
          <InputGroupInput
            placeholder="Filter transactions..."
            value={instantFilterValue}
            onChange={(event) => setLocalFilter(event.target.value)}
          />
          <InputGroupAddon>
            <Filter />
          </InputGroupAddon>
        </InputGroup>
        {activeFiltersCount >= 2 && (
          <Button variant="default" onClick={handleClearAllFilters}>
            Clear filters ({activeFiltersCount})
          </Button>
        )}
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table className="bg-card">
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
            {table.getRowModel().rows?.length ? (
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
                  No inventory transactions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="hidden items-center gap-2 lg:flex">
          <Label htmlFor="rows-per-page" className="font-medium text-sm">
            Showing
          </Label>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger size="sm" className="w-20" id="rows-per-page">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label htmlFor="rows-per-page" className="font-medium text-sm">
            per page
          </Label>
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="flex w-fit items-center justify-center font-medium text-sm">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.firstPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.lastPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
