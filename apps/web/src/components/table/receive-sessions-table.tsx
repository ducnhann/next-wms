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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  MoreHorizontal,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";
import { AddReceiveSessionDialog } from "@/components/add-receive-session-dialog";
import { ReceiveSessionDetailDialog } from "@/components/receive-session-detail-dialog";
import { FilterPopover } from "@/components/table/filter-popover";
import TableCellFirst from "@/components/table/table-cell-first";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
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
import { useDebouncedInput } from "@/hooks/use-debounced-input";
import type { ReceiveSessionListItem } from "@/lib/types";
import { cn, getBadgeStyleByStatus } from "@/lib/utils";

// Stable empty array to prevent new reference on each render
const EMPTY_ARRAY: ReceiveSessionListItem[] = [];

export function ReceiveSessionsTable() {
  const { userId, organizationId } = useCurrentUser();

  const { currentBranch } = useBranches({
    organizationId: organizationId as Id<"organizations"> | undefined,
    includeDeleted: false,
  });

  const { data: receiveSessions, isPending } = useQuery({
    ...convexQuery(
      api.receiveSessions.listReceiveSessions,
      userId && currentBranch
        ? {
            branchId: currentBranch._id,
          }
        : "skip",
    ),
    enabled: !!userId && !!currentBranch,
  });

  // Dialog state
  const [selectedSessionId, setSelectedSessionId] =
    React.useState<Id<"receive_sessions"> | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false);

  const columns: ColumnDef<ReceiveSessionListItem>[] = React.useMemo(
    () => [
      {
        accessorKey: "receiveSessionCode",
        header: "IO-ID",
        cell: ({ row }) => (
          <TableCellFirst className="capitalize">
            {row.getValue("receiveSessionCode")}
          </TableCellFirst>
        ),
      },
      {
        accessorKey: "supplierName",
        header: ({ column }) => {
          const suppliers = receiveSessions
            ? Array.from(
                new Set(receiveSessions.map((session) => session.supplierName)),
              ).map((name) => ({
                label: name,
                value: name,
              }))
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
        accessorKey: "totalItems",
        header: ({ column }) => {
          const sortOptions = [
            { label: "Default", value: "default" },
            { label: "Ascending", value: "asc" },
            { label: "Descending", value: "desc" },
          ];

          const currentSort = column.getIsSorted();
          const currentValue = currentSort ? String(currentSort) : "default";

          return (
            <div className="flex items-center justify-end">
              <FilterPopover
                label="Total SKUs"
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
        cell: ({ row }) => (
          <div className="text-right font-medium">
            {row.getValue("totalItems")}
          </div>
        ),
      },
      {
        accessorKey: "totalExpected",
        header: ({ column }) => {
          const sortOptions = [
            { label: "Default", value: "default" },
            { label: "Ascending", value: "asc" },
            { label: "Descending", value: "desc" },
          ];

          const currentSort = column.getIsSorted();
          const currentValue = currentSort ? String(currentSort) : "default";

          return (
            <div className="flex items-center justify-end">
              <FilterPopover
                label="Total Items"
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
        cell: ({ row }) => (
          <div className="text-right font-medium">
            {row.getValue("totalExpected")}
          </div>
        ),
      },
      {
        accessorKey: "receivedAt",
        header: ({ column }) => {
          const sortOptions = [
            { label: "Default", value: "default" },
            { label: "Ascending", value: "asc" },
            { label: "Descending", value: "desc" },
          ];

          const currentSort = column.getIsSorted();
          const currentValue = currentSort ? String(currentSort) : "default";

          return (
            <div className="flex items-center justify-end">
              <FilterPopover
                label="Received at"
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
          const timestamp = row.getValue("receivedAt") as number;
          const formatted = new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date(timestamp));

          return <div className="text-right font-medium">{formatted}</div>;
        },
      },
      {
        accessorKey: "status",
        header: ({ column }) => {
          const statusFilterOptions = [
            { label: "All", value: "all" },
            { label: "In Progress", value: "In Progress" },
            { label: "Pending", value: "Pending" },
            { label: "Complete", value: "Complete" },
            { label: "Returned", value: "Returned" },
            { label: "Return Requested", value: "Return Requested" },
          ];

          const currentFilter = column.getFilterValue() as string | undefined;

          return (
            <div className="flex items-center justify-center">
              <FilterPopover
                label="Status"
                options={statusFilterOptions}
                currentValue={currentFilter}
                onChange={(value) => column.setFilterValue(value)}
              />
            </div>
          );
        },
        filterFn: (row, id, value) => {
          if (!value || value === "all") return true;
          const rowValue = row.getValue(id) as string;
          return rowValue?.toLowerCase() === value?.toLowerCase();
        },
        cell: ({ row }) => (
          <div className="text-center">
            <Badge
              className={cn(
                "w-fit min-w-24 justify-center whitespace-nowrap rounded-sm text-center text-xs",
                getBadgeStyleByStatus(row.getValue("status")),
              )}
              variant={"outline"}
            >
              {row.getValue("status")}
            </Badge>
          </div>
        ),
      },
      {
        id: "actions",
        header: "Action",
        enableHiding: false,
        cell: ({ row }) => {
          const session = row.original;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size={"icon-sm"}>
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    navigator.clipboard.writeText(session.receiveSessionCode)
                  }
                >
                  Copy IO-ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedSessionId(session._id);
                    setDetailDialogOpen(true);
                  }}
                >
                  View details
                </DropdownMenuItem>
                {(session.statusCode === "PENDING" ||
                  session.statusCode === "IN_PROGRESS") && (
                  <DropdownMenuItem asChild>
                    <Link
                      href={
                        `receiving-sessions/${session._id}/verifying` as Route
                      }
                    >
                      Proceed
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [receiveSessions],
  );

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const [setFilterValue, instantFilterValue, debouncedFilterValue] =
    useDebouncedInput("", 300);

  const table = useReactTable({
    data: receiveSessions ?? EMPTY_ARRAY,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  React.useEffect(() => {
    table.getColumn("receiveSessionCode")?.setFilterValue(debouncedFilterValue);
  }, [debouncedFilterValue, table.getColumn]);

  const activeFiltersCount =
    sorting.length + columnFilters.length + (instantFilterValue ? 1 : 0);

  const handleClearAllFilters = () => {
    table.resetColumnFilters();
    table.resetSorting();
    setFilterValue("");
  };

  if (isPending) {
    return (
      <div className="w-full space-y-4">
        <div className="flex flex-row justify-between pb-4">
          <div className="h-10 w-50 animate-pulse rounded bg-muted" />
          <div className="h-10 w-25 animate-pulse rounded bg-muted" />
        </div>
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
        <InputGroup className="max-w-50">
          <InputGroupInput
            placeholder="Filter IO-ID..."
            value={instantFilterValue}
            onChange={(event) => setFilterValue(event.target.value)}
          />
          <InputGroupAddon>
            <Filter />
          </InputGroupAddon>
        </InputGroup>
        <div className="flex items-center gap-2">
          {activeFiltersCount >= 2 && (
            <Button
              variant={"default"}
              className=""
              onClick={handleClearAllFilters}
            >
              Clear filters ({activeFiltersCount})
            </Button>
          )}
          <AddReceiveSessionDialog />
        </div>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table className="bg-card">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
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
                  No receive sessions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-muted-foreground text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
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
      <ReceiveSessionDetailDialog
        sessionId={selectedSessionId}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        trigger={<span className="hidden" />}
      />
    </div>
  );
}
