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

type AuditLogItem = {
  _id: string;
  timestamp: number;
  userName: string;
  actionType: string;
  actionTypeCode: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string;
  notes: string;
};

const EMPTY_ARRAY: AuditLogItem[] = [];

interface AuditLogsTableProps {
  organizationId: Id<"organizations"> | undefined;
  dateFrom?: number;
  dateTo?: number;
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
}

export function AuditLogsTable({
  organizationId,
  dateFrom,
  dateTo,
  globalFilter,
  onGlobalFilterChange,
}: AuditLogsTableProps) {
  // Local debounced input for global filter
  const [setLocalFilter, instantFilterValue, debouncedFilterValue] =
    useDebouncedInput(globalFilter, 300);

  // Sync debounced value to parent
  React.useEffect(() => {
    onGlobalFilterChange(debouncedFilterValue);
  }, [debouncedFilterValue, onGlobalFilterChange]);

  const { data: auditLogs, isPending } = useQuery({
    ...convexQuery(
      api.traceability.listAuditLogs,
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

  const columns: ColumnDef<AuditLogItem>[] = React.useMemo(
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
        accessorKey: "userName",
        header: "User",
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue("userName")}</div>
        ),
      },
      {
        accessorKey: "actionType",
        header: ({ column }) => {
          const filterOptions = [
            { label: "All", value: "All" },
            { label: "CREATE", value: "CREATE" },
            { label: "UPDATE", value: "UPDATE" },
            { label: "DELETE", value: "DELETE" },
          ];

          const currentFilter = column.getFilterValue() as string | undefined;

          return (
            <div className="flex items-center">
              <FilterPopover
                label="Action Type"
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
          const actionType = row.getValue("actionType") as string;
          const getBadgeStyle = (type: string) => {
            switch (type?.toUpperCase()) {
              case "CREATE":
                return "bg-green-500/10 text-green-600 border-green-500/60";
              case "UPDATE":
                return "bg-blue-500/10 text-blue-600 border-blue-500/60";
              case "DELETE":
                return "bg-red-500/10 text-red-600 border-red-500/60";
              default:
                return "bg-muted text-muted-foreground";
            }
          };
          return (
            <Badge
              className={cn("text-xs", getBadgeStyle(actionType))}
              variant="outline"
            >
              {actionType}
            </Badge>
          );
        },
      },
      {
        id: "entityInfo",
        accessorFn: (row) => `${row.entityType}: ${row.entityId}`,
        header: "Entity & ID",
        cell: ({ row }) => (
          <div>
            <span className="font-medium">{row.original.entityType}</span>
            {row.original.entityId && (
              <span className="text-muted-foreground">
                : {row.original.entityId}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "fieldName",
        header: "Field Name",
        cell: ({ row }) => (
          <div className="text-muted-foreground">
            {row.getValue("fieldName") || "-"}
          </div>
        ),
      },
      {
        id: "changeDetails",
        header: "Change Details",
        cell: ({ row }) => {
          const oldValue = row.original.oldValue;
          const newValue = row.original.newValue;

          if (oldValue === undefined && newValue === undefined) {
            return <div className="text-muted-foreground">-</div>;
          }

          const formatValue = (val: unknown) => {
            if (val === null || val === undefined) return "-";
            if (typeof val === "object") return JSON.stringify(val);
            return String(val);
          };

          const truncateValue = (val: string, maxLength = 30) => {
            if (val.length <= maxLength) return val;
            return `${val.substring(0, maxLength)}...`;
          };

          const formattedOld = formatValue(oldValue);
          const formattedNew = formatValue(newValue);

          return (
            <div className="flex items-center gap-1 max-w-[300px]">
              <span
                className="text-red-500 line-through truncate"
                title={formattedOld}
              >
                {truncateValue(formattedOld)}
              </span>
              <span className="text-muted-foreground shrink-0">→</span>
              <span className="text-green-500 truncate" title={formattedNew}>
                {truncateValue(formattedNew)}
              </span>
            </div>
          );
        },
      },
    ],
    [],
  );

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );

  const table = useReactTable({
    data: auditLogs ?? EMPTY_ARRAY,
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
            placeholder="Filter audit logs..."
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
                  No audit logs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="hidden items-center gap-2 lg:flex">
          <Label htmlFor="audit-rows-per-page" className="font-medium text-sm">
            Showing
          </Label>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger size="sm" className="w-20" id="audit-rows-per-page">
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
          <Label htmlFor="audit-rows-per-page" className="font-medium text-sm">
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
