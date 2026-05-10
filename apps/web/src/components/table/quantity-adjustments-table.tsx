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
  Loader2,
  MoreHorizontal,
  Plus,
  XCircle,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { AdjustmentRequestDetailDialog } from "@/components/adjustment-request-detail-dialog";
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
import { cn, getBadgeStyleByStatus } from "@/lib/utils";

// Type for quantity adjustment request from Convex
type QuantityAdjustmentRequest = {
  _id: Id<"adjustment_requests">;
  requestCode: string;
  productName: string;
  currentQty: number;
  adjustedQty: number;
  reason: string;
  status: string;
  requestedBy: { fullName: string } | null;
  createdAt: number;
};

// Status filter options
const statusFilterOptions = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

interface QuantityAdjustmentsTableProps {
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onNewRequest: () => void;
}

export function QuantityAdjustmentsTable({
  onApprove,
  onReject,
  onNewRequest,
}: QuantityAdjustmentsTableProps) {
  const { organizationId } = useCurrentUser();
  const { currentBranch } = useBranches({ organizationId });

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);

  // Mutations for approve and reject
  const { mutate: approveRequest, isPending: isApproving } = useMutation({
    mutationFn: useConvexMutation(api.cycleCount.approveAdjustmentRequest),
  });

  const { mutate: rejectRequest, isPending: isRejecting } = useMutation({
    mutationFn: useConvexMutation(api.cycleCount.rejectAdjustmentRequest),
  });

  const handleApprove = React.useCallback(
    (adjustmentRequestId: Id<"adjustment_requests">, requestCode: string) => {
      approveRequest(
        { adjustmentRequestId },
        {
          onSuccess: () => {
            toast.success(
              `Adjustment request ${requestCode} has been approved`,
            );
            onApprove?.(adjustmentRequestId as string);
          },
          onError: (error) => {
            toast.error(
              `Failed to approve adjustment request: ${error.message}`,
            );
          },
        },
      );
    },
    [approveRequest, onApprove],
  );

  const handleReject = React.useCallback(
    (adjustmentRequestId: Id<"adjustment_requests">, requestCode: string) => {
      rejectRequest(
        { adjustmentRequestId },
        {
          onSuccess: () => {
            toast.success(
              `Adjustment request ${requestCode} has been rejected`,
            );
            onReject?.(adjustmentRequestId as string);
          },
          onError: (error) => {
            toast.error(
              `Failed to reject adjustment request: ${error.message}`,
            );
          },
        },
      );
    },
    [rejectRequest, onReject],
  );

  // Fetch real data from Convex
  const { data: adjustments, isLoading } = useQuery({
    ...convexQuery(
      api.cycleCount.getQuantityAdjustmentsForTable,
      organizationId && currentBranch?._id
        ? {
            organizationId: organizationId as Id<"organizations">,
            branchId: currentBranch._id as Id<"branches">,
          }
        : "skip",
    ),
    enabled: !!organizationId && !!currentBranch?._id,
  });

  const data = adjustments ?? [];

  const columns: ColumnDef<QuantityAdjustmentRequest>[] = [
    {
      accessorKey: "requestCode",
      header: "Request ID",
      cell: ({ row }) => (
        <TableCellFirst className="text-primary">
          {row.getValue("requestCode")}
        </TableCellFirst>
      ),
    },
    {
      accessorKey: "productName",
      header: "Product",
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue("productName")}</span>
      ),
    },
    {
      accessorKey: "currentQty",
      header: "Current QTY",
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue("currentQty")}</span>
      ),
    },
    {
      accessorKey: "adjustedQty",
      header: "Adjusted QTY",
      cell: ({ row }) => {
        const current = row.original.currentQty;
        const adjusted = row.getValue("adjustedQty") as number;
        const isDecrease = adjusted < current;
        return (
          <span
            className={cn(
              "font-medium text-sm",
              isDecrease ? "text-red-600" : "text-green-600",
            )}
          >
            {adjusted}
          </span>
        );
      },
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.getValue("reason")}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge
            variant="outline"
            className={cn("capitalize", getBadgeStyleByStatus(status))}
          >
            {status}
          </Badge>
        );
      },
      filterFn: (row, id, filterValue) => {
        if (!filterValue || filterValue.length === 0) return true;
        const status = (row.getValue(id) as string).toLowerCase();
        return filterValue.includes(status);
      },
    },
    {
      accessorKey: "requestedBy",
      header: "Requested By",
      cell: ({ row }) => {
        const requestedBy = row.original.requestedBy;
        return (
          <span className="text-sm">{requestedBy?.fullName ?? "Unknown"}</span>
        );
      },
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => {
        const adjustment = row.original;
        const isPending = adjustment.status?.toLowerCase() === "pending";

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
                  navigator.clipboard.writeText(adjustment.requestCode)
                }
              >
                Copy Request ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AdjustmentRequestDetailDialog
                adjustmentRequestId={adjustment._id}
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
                      handleApprove(adjustment._id, adjustment.requestCode);
                    }}
                    disabled={isApproving}
                  >
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      handleReject(adjustment._id, adjustment.requestCode);
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
  ];

  // Filter data based on status
  const filteredData = React.useMemo(() => {
    if (statusFilter.length === 0) return data;
    return data.filter((item) =>
      statusFilter.includes(item.status.toLowerCase()),
    );
  }, [data, statusFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <InputGroup className="max-w-sm">
          <InputGroupAddon align="inline-start">
            <Filter className="h-4 w-4" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search by product or request ID..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </InputGroup>

        <div className="flex items-center gap-2">
          <FilterPopover
            label="All Status"
            options={statusFilterOptions}
            currentValue={statusFilter}
            onChange={(value) =>
              setStatusFilter(Array.isArray(value) ? value : [])
            }
            variant="multi-select"
          />
          <Button size="sm" onClick={onNewRequest}>
            <Plus className="mr-2 h-4 w-4" />
            New Adjustment
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
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
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading...</span>
                  </div>
                </TableCell>
              </TableRow>
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
                  No adjustment requests found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex items-center space-x-2">
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
    </div>
  );
}
