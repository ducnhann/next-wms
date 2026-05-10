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
import { AddPickingSessionDialog } from "@/components/add-picking-session-dialog";
import { PickingSessionDetailDialog } from "@/components/picking-session-detail-dialog";
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
import { cn, getBadgeStyleByStatus } from "@/lib/utils";

type PickingSession = {
  _id: Id<"picking_sessions">;
  sessionCode: string;
  outboundOrderCode: string | null;
  assignedUser: { fullName: string } | null;
  status: { lookupValue: string } | null;
  totalRequired: number;
  totalPicked: number;
  createdAt: number;
};

export function PickingSessionsTable() {
  const { organizationId } = useCurrentUser();
  const { currentBranch } = useBranches({
    organizationId: organizationId as Id<"organizations"> | undefined,
    includeDeleted: false,
  });

  const { data: sessions, isLoading } = useQuery({
    ...convexQuery(
      api.pickingSessions.listPickingSessions,
      currentBranch ? { branchId: currentBranch._id } : "skip",
    ),
    enabled: !!currentBranch,
  });

  // Dialog state
  const [selectedSessionId, setSelectedSessionId] =
    React.useState<Id<"picking_sessions"> | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false);

  const columns: ColumnDef<PickingSession>[] = React.useMemo(
    () => [
      {
        accessorKey: "sessionCode",
        header: "Session ID",
        cell: ({ row }) => (
          <TableCellFirst>{row.getValue("sessionCode")}</TableCellFirst>
        ),
      },
      {
        accessorKey: "outboundOrderCode",
        header: "Linked Order",
        cell: ({ row }) => (
          <div className="font-medium text-primary">
            {row.getValue("outboundOrderCode") ?? "-"}
          </div>
        ),
      },
      {
        accessorKey: "assignedUser",
        header: "Assigned To",
        cell: ({ row }) => {
          const user = row.getValue("assignedUser") as {
            fullName: string;
          } | null;
          return <div>{user?.fullName ?? "-"}</div>;
        },
      },
      {
        accessorKey: "progress",
        header: () => <div className="text-center">Progress</div>,
        cell: ({ row }) => {
          const required = row.original.totalRequired;
          const picked = row.original.totalPicked;
          const percent =
            required > 0 ? Math.round((picked / required) * 100) : 0;
          return (
            <div className="text-center">
              <span className="font-medium">
                {picked}/{required}
              </span>
              <span className="ml-1 text-muted-foreground">({percent}%)</span>
            </div>
          );
        },
      },
      {
        accessorKey: "createdAt",
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
                label="Created at"
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
          const timestamp = row.getValue("createdAt") as number;
          const formatted = new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(timestamp));

          return <div className="text-right font-medium">{formatted}</div>;
        },
      },
      {
        accessorKey: "status",
        header: ({ column }) => {
          const statusFilterOptions = [
            { label: "All", value: "all" },
            { label: "Pending", value: "pending" },
            { label: "In Progress", value: "in progress" },
            { label: "Completed", value: "completed" },
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
          const status = row.getValue(id) as { lookupValue: string } | null;
          return status?.lookupValue.toLowerCase() === value.toLowerCase();
        },
        cell: ({ row }) => {
          const status = row.getValue("status") as {
            lookupValue: string;
          } | null;
          const statusValue = status?.lookupValue ?? "Unknown";
          return (
            <div className="text-center">
              <Badge
                className={cn(
                  "w-24 justify-center rounded-sm text-center text-xs",
                  getBadgeStyleByStatus(statusValue),
                )}
                variant={"outline"}
              >
                {statusValue}
              </Badge>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Action",
        enableHiding: false,
        cell: ({ row }) => {
          const session = row.original;
          const status = session.status?.lookupValue?.toLowerCase();

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
                    navigator.clipboard.writeText(session.sessionCode)
                  }
                >
                  Copy Session ID
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
                {(status === "pending" || status === "in progress") && (
                  <DropdownMenuItem asChild>
                    <Link
                      href={
                        `picking-sessions/${session._id}/verifying` as Route
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
    [],
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
    data: sessions ?? [],
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
    table.getColumn("sessionCode")?.setFilterValue(debouncedFilterValue);
  }, [debouncedFilterValue, table]);

  const activeFiltersCount =
    sorting.length + columnFilters.length + (instantFilterValue ? 1 : 0);

  const handleClearAllFilters = () => {
    table.resetColumnFilters();
    table.resetSorting();
    setFilterValue("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading picking sessions...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-row justify-between pb-4">
        <InputGroup className="max-w-50">
          <InputGroupInput
            placeholder="Filter Session ID..."
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
          <AddPickingSessionDialog />
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
                  No picking sessions found.
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
            size="icon"
            onClick={() => table.firstPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.lastPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
      <PickingSessionDetailDialog
        sessionId={selectedSessionId}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </div>
  );
}
