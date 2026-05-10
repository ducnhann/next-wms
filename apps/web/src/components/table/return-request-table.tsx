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
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Filter,
  MoreHorizontal,
  XCircle,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { ReturnRequestDetailDialog } from "@/components/return-request-detail-dialog";
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
import type { ReturnRequestListItem } from "@/lib/types";
import { cn, getBadgeStyleByStatus } from "@/lib/utils";

export function ReturnRequestsTable() {
  const { organizationId } = useCurrentUser();
  const { currentBranch } = useBranches({
    organizationId: organizationId as Id<"organizations"> | undefined,
    includeDeleted: false,
  });

  const { data: returnRequests, isLoading } = useQuery({
    ...convexQuery(
      api.returnRequest.listWithDetails,
      organizationId && currentBranch
        ? {
            organizationId: organizationId as string,
            branchId: currentBranch._id as string,
          }
        : "skip",
    ),
  });

  // Mutations for approve and reject
  const { mutate: approveRequest, isPending: isApproving } = useMutation({
    mutationFn: useConvexMutation(api.returnRequest.approveReturnRequest),
  });

  const { mutate: rejectRequest, isPending: isRejecting } = useMutation({
    mutationFn: useConvexMutation(api.returnRequest.rejectReturnRequest),
  });

  // Memoize supplier options separately to avoid recreating columns on data changes
  const supplierOptions = React.useMemo(() => {
    if (!returnRequests) return [];
    return Array.from(
      new Set(returnRequests.map((rr) => rr.supplier?.name).filter(Boolean)),
    ).map((name) => ({
      label: name as string,
      value: name as string,
    }));
  }, [returnRequests]);

  const handleApprove = React.useCallback(
    (returnRequestId: Id<"return_requests">, requestCode: string) => {
      // console.log("Approving return request:", returnRequestId, requestCode);
      approveRequest(
        { returnRequestId },
        {
          onSuccess: () => {
            // console.log("Approval successful");
            toast.success(`Return request ${requestCode} has been approved`);
          },
          onError: (error) => {
            console.error("Approval failed:", error);
            toast.error(`Failed to approve return request: ${error.message}`);
          },
        },
      );
    },
    [approveRequest],
  );

  const handleReject = React.useCallback(
    (returnRequestId: Id<"return_requests">, requestCode: string) => {
      // console.log("Rejecting return request:", returnRequestId, requestCode);
      rejectRequest(
        { returnRequestId },
        {
          onSuccess: () => {
            // console.log("Rejection successful");
            toast.success(`Return request ${requestCode} has been rejected`);
          },
          onError: (error) => {
            console.error("Rejection failed:", error);
            toast.error(`Failed to reject return request: ${error.message}`);
          },
        },
      );
    },
    [rejectRequest],
  );

  const columns: ColumnDef<ReturnRequestListItem>[] = React.useMemo(
    () => [
      {
        accessorKey: "requestCode",
        header: "Request ID",
        cell: ({ row }) => (
          <TableCellFirst>{row.getValue("requestCode")}</TableCellFirst>
        ),
      },
      {
        id: "supplier.name",
        accessorFn: (row) => row.supplier?.name,
        header: ({ column }) => {
          const currentFilter = column.getFilterValue() as string[] | undefined;

          return (
            <FilterPopover
              label="Supplier"
              options={supplierOptions}
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
        cell: ({ row }) => (
          <div className="">{row.getValue("supplier.name") ?? "-"}</div>
        ),
      },
      {
        accessorKey: "totalSKUs",
        header: "Total SKUs",
        cell: ({ row }) => (
          <div className="text-center">{row.getValue("totalSKUs")}</div>
        ),
      },
      {
        accessorKey: "totalItems",
        header: "Total Items",
        cell: ({ row }) => (
          <div className="text-center">{row.getValue("totalItems")}</div>
        ),
      },
      {
        accessorKey: "requestedAt",
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
                label="Requested at"
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
          const timestamp = row.getValue("requestedAt") as number;
          const formatted = new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date(timestamp));

          return <div className="text-right font-medium">{formatted}</div>;
        },
      },
      {
        id: "returnStatus.lookupValue",
        accessorFn: (row) => row.returnStatus?.lookupValue,
        header: ({ column }) => {
          const statusFilterOptions = [
            { label: "All", value: "all" },
            { label: "Waiting", value: "waiting" },
            { label: "Approved", value: "approved" },
            { label: "Returned", value: "returned" },
            { label: "Rejected", value: "rejected" },
          ];

          const currentFilter = column.getFilterValue() as string | undefined;

          return (
            <div className="flex items-center justify-center">
              <FilterPopover
                label="Status"
                options={statusFilterOptions}
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
          const status = row.getValue("returnStatus.lookupValue") as string;
          return (
            <div className="text-center">
              <Badge
                className={cn(
                  "w-20 rounded-sm text-center",
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
        id: "actions",
        header: "Action",
        enableHiding: false,
        cell: ({ row }) => {
          const returnRequest = row.original;
          const status = returnRequest.returnStatus?.lookupValue?.toLowerCase();
          const isPending = status === "pending" || status === "waiting";

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
                    navigator.clipboard.writeText(returnRequest.requestCode)
                  }
                >
                  Copy Request ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <ReturnRequestDetailDialog
                  returnRequestId={returnRequest._id as Id<"return_requests">}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Eye className="mr-2 h-4 w-4" />
                      View details
                    </DropdownMenuItem>
                  }
                />
                {isPending && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        handleApprove(
                          returnRequest._id as Id<"return_requests">,
                          returnRequest.requestCode,
                        );
                      }}
                      disabled={isApproving}
                    >
                      <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                      Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        handleReject(
                          returnRequest._id as Id<"return_requests">,
                          returnRequest.requestCode,
                        );
                      }}
                      disabled={isRejecting}
                    >
                      <XCircle className="mr-2 h-4 w-4 text-red-600" />
                      Reject
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [supplierOptions, handleApprove, handleReject, isApproving, isRejecting],
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
  const tableData = React.useMemo(() => returnRequests ?? [], [returnRequests]);

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
      .getColumn("requestCode")
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
      <div className="flex h-40 items-center justify-center">
        <p className="text-muted-foreground">Loading return requests...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-row justify-between pb-4">
        <InputGroup className="max-w-50">
          <InputGroupInput
            placeholder="Filter Request ID..."
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
                  No return requests found.
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
    </div>
  );
}
