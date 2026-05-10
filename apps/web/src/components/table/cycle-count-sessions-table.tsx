"use client";

import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  Eye,
  Filter,
  MoreHorizontal,
  Play,
  Trash2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { CreateCycleCountSessionDialog } from "@/components/create-cycle-count-session-dialog";
import { CycleCountSessionDetailDialog } from "@/components/cycle-count-session-detail-dialog";
import { FilterPopover } from "@/components/table/filter-popover";
import TableCellFirst from "@/components/table/table-cell-first";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import type { CycleCountSessionListItem } from "@/lib/types";
import { cn, getBadgeStyleByStatus } from "@/lib/utils";

export function CycleCountSessionsTable() {
  const { organizationId } = useCurrentUser();
  const router = useRouter();
  const params = useParams();

  const { currentBranch } = useBranches({
    organizationId: organizationId as Id<"organizations"> | undefined,
    includeDeleted: false,
  });

  const { data: cycleCountSessions, isLoading } = useQuery({
    ...convexQuery(
      api.cycleCount.listWithDetails,
      organizationId && currentBranch?._id
        ? {
            organizationId: organizationId as string,
            branchId: currentBranch._id as string,
          }
        : "skip",
    ),
    enabled: !!organizationId && !!currentBranch?._id,
  });

  // Detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false);
  const [selectedSessionId, setSelectedSessionId] = React.useState<
    string | null
  >(null);

  const handleViewDetailsCallback = React.useCallback((sessionId: string) => {
    setSelectedSessionId(sessionId);
    setDetailDialogOpen(true);
  }, []);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [sessionToDelete, setSessionToDelete] = React.useState<string | null>(
    null,
  );

  const { mutate: deleteSession, isPending: isDeleting } = useMutation({
    mutationFn: useConvexMutation(api.cycleCount.cancelCycleCountSession),
    onSuccess: () => {
      toast.success("Session cancelled successfully");
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel session",
      );
    },
  });

  const handleDeleteClick = (sessionId: string) => {
    setSessionToDelete(sessionId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (sessionToDelete) {
      deleteSession({ sessionId: sessionToDelete as Id<"work_sessions"> });
    }
  };

  const columns: ColumnDef<CycleCountSessionListItem>[] = React.useMemo(
    () => [
      {
        accessorKey: "sessionCode",
        header: "Session ID",
        cell: ({ row }) => (
          <TableCellFirst
            onClick={() =>
              handleViewDetailsCallback(row.original._id.toString())
            }
            className="cursor-pointer text-primary hover:underline"
          >
            {row.getValue("sessionCode")}
          </TableCellFirst>
        ),
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="max-w-75 truncate">{row.getValue("name")}</div>
        ),
      },
      {
        id: "cycleCountType.lookupValue",
        accessorFn: (row) => row.cycleCountType?.lookupValue,
        header: ({ column }) => {
          const typeOptions = [
            { label: "All", value: "all" },
            { label: "Daily", value: "daily" },
            { label: "Weekly", value: "weekly" },
            { label: "Monthly", value: "monthly" },
            { label: "Quarterly", value: "quarterly" },
          ];

          const currentFilter = column.getFilterValue() as string | undefined;

          return (
            <FilterPopover
              label="Type"
              options={typeOptions}
              currentValue={currentFilter}
              onChange={(value) =>
                column.setFilterValue(value === "all" ? undefined : value)
              }
            />
          );
        },
        filterFn: (row, id, value) => {
          if (!value || value === "all") return true;
          const rowValue = row.getValue(id) as string;
          return rowValue?.toLowerCase() === value?.toLowerCase();
        },
        cell: ({ row }) => (
          <div className="text-center">
            {row.getValue("cycleCountType.lookupValue") ?? "-"}
          </div>
        ),
      },
      {
        accessorKey: "zonesCount",
        header: "Zones",
        cell: ({ row }) => {
          const count = row.getValue("zonesCount") as number;
          return (
            <div className="text-center">
              {count} {count === 1 ? "zone" : "zones"}
            </div>
          );
        },
      },
      {
        id: "sessionStatus.lookupValue",
        accessorFn: (row) => row.sessionStatus?.lookupValue,
        header: ({ column }) => {
          const statusOptions = [
            { label: "All", value: "all" },
            { label: "Active", value: "active" },
            { label: "In Progress", value: "in progress" },
            { label: "Pending", value: "pending" },
            { label: "Completed", value: "completed" },
            { label: "Cancelled", value: "cancelled" },
          ];

          const currentFilter = column.getFilterValue() as string | undefined;

          return (
            <div className="flex items-center justify-center">
              <FilterPopover
                label="Status"
                options={statusOptions}
                currentValue={currentFilter}
                onChange={(value) =>
                  column.setFilterValue(value === "all" ? undefined : value)
                }
              />
            </div>
          );
        },
        filterFn: (row, id, value) => {
          if (!value || value === "all") return true;
          const rowValue = row.getValue(id) as string;
          return rowValue?.toLowerCase() === value?.toLowerCase();
        },
        cell: ({ row }) => {
          const status = row.getValue("sessionStatus.lookupValue") as string;
          return (
            <div className="text-center">
              <Badge
                className={cn(
                  "rounded-sm text-center",
                  getBadgeStyleByStatus(status ?? ""),
                )}
                variant={"outline"}
              >
                {status ?? "Unknown"}
              </Badge>
            </div>
          );
        },
      },
      {
        id: "createdByUser.fullName",
        accessorFn: (row) => row.createdByUser?.fullName,
        header: "Created By",
        cell: ({ row }) => (
          <div className="">
            {row.getValue("createdByUser.fullName") ?? "-"}
          </div>
        ),
      },
      {
        id: "actions",
        header: "Action",
        enableHiding: false,
        cell: ({ row }) => {
          const session = row.original;
          const status = session.sessionStatus?.lookupValue?.toLowerCase();

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size={"icon-sm"}>
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {status === "active" ||
                status === "pending" ||
                status === "in progress" ? (
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(
                        `/${params.workspace}/inventory/cycle-count/${session._id}/proceed`,
                      )
                    }
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Proceed
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  onClick={() =>
                    handleViewDetailsCallback(session._id.toString())
                  }
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => handleDeleteClick(session._id.toString())}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [handleViewDetailsCallback, router, params.workspace],
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

  // Memoize the data to prevent unnecessary table re-renders
  const tableData = React.useMemo(
    () => cycleCountSessions ?? [],
    [cycleCountSessions],
  );

  const table = useReactTable({
    data: tableData,
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

  // Use a ref to avoid table dependency in useEffect
  const tableRef = React.useRef(table);
  tableRef.current = table;

  React.useEffect(() => {
    tableRef.current
      .getColumn("sessionCode")
      ?.setFilterValue(debouncedFilterValue);
  }, [debouncedFilterValue]);

  const activeFiltersCount =
    sorting.length + columnFilters.length + (instantFilterValue ? 1 : 0);

  const handleClearAllFilters = () => {
    table.resetColumnFilters();
    table.resetSorting();
    setFilterValue("");
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-4">
        <div className="flex flex-row justify-between pb-4">
          <div className="h-10 w-50 animate-pulse rounded bg-muted" />
          <div className="h-10 w-25 animate-pulse rounded bg-muted" />
        </div>
        <div className="overflow-hidden rounded-md border">
          <div className="bg-card p-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={`skeleton-${i.toString()}`}
                className="mb-2 h-12 animate-pulse rounded bg-muted"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Detail Dialog */}
      <CycleCountSessionDetailDialog
        sessionId={selectedSessionId}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will mark the session as cancelled. Only active or
              pending sessions can be cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Cancelling..." : "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-row justify-between pb-4">
        <InputGroup className="max-w-62.5">
          <InputGroupInput
            placeholder="Search by session name or ID..."
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
              variant="ghost"
              size="sm"
              onClick={handleClearAllFilters}
              className="text-muted-foreground"
            >
              Clear all filters
            </Button>
          )}
          <CreateCycleCountSessionDialog />
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
                  No results.
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
    </div>
  );
}
