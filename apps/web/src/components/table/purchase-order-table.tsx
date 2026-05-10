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
import { useMutation } from "convex/react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  MoreHorizontal,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { AddPurchaseOrderDialog } from "@/components/add-purchase-order-dialog";
import { ProceedReceivingDialog } from "@/components/proceed-receiving-dialog";
import { PurchaseOrderDetailDialog } from "@/components/purchase-order-detail-dialog";
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
import type { PurchaseOrderListItem } from "@/lib/types";
import { cn, getBadgeStyleByStatus } from "@/lib/utils";

// Stable empty array to prevent new reference on each render
const EMPTY_ARRAY: PurchaseOrderListItem[] = [];

export function PurchaseOrdersTable() {
  const { userId, organizationId } = useCurrentUser();

  const { currentBranch } = useBranches({
    organizationId: organizationId as Id<"organizations"> | undefined,
    includeDeleted: false,
  });

  const { data: purchaseOrders, isPending } = useQuery({
    ...convexQuery(
      api.purchaseOrders.listPurchaseOrders,
      userId && currentBranch
        ? {
            branchId: currentBranch._id,
            userId: userId as Id<"users">,
          }
        : "skip",
    ),
    enabled: !!userId && !!currentBranch,
  });

  const [selectedOrderId, setSelectedOrderId] =
    React.useState<Id<"purchase_orders"> | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false);

  // Mutation for cancelling purchase order
  const cancelPurchaseOrder = useMutation(
    api.purchaseOrders.cancelPurchaseOrder,
  );

  // State for cancel confirmation dialog
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [orderToCancel, setOrderToCancel] = React.useState<{
    id: Id<"purchase_orders">;
    code: string;
  } | null>(null);

  const handleCancelOrder = async () => {
    if (!orderToCancel || !userId) return;
    try {
      await cancelPurchaseOrder({
        purchaseOrderId: orderToCancel.id,
        userId: userId as Id<"users">,
      });
      toast.success(
        `Purchase order ${orderToCancel.code} cancelled successfully`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to cancel purchase order",
      );
    } finally {
      setCancelDialogOpen(false);
      setOrderToCancel(null);
    }
  };

  const columns: ColumnDef<PurchaseOrderListItem>[] = React.useMemo(
    () => [
      {
        accessorKey: "code",
        header: "PO-ID",
        cell: ({ row }) => (
          <TableCellFirst className="capitalize">
            {row.getValue("code")}
          </TableCellFirst>
        ),
      },
      {
        id: "supplier.name",
        accessorFn: (row) => row.supplier?.name,
        header: ({ column }) => {
          const suppliers = purchaseOrders
            ? Array.from(
                new Set(
                  purchaseOrders.map((po) => po.supplier?.name).filter(Boolean),
                ),
              ).map((name) => ({
                label: name as string,
                value: name as string,
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
        cell: ({ row }) => (
          <div className="">{row.getValue("supplier.name") ?? "-"}</div>
        ),
      },
      {
        accessorKey: "orderedAt",
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
                label="Ordered at"
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
          const timestamp = row.getValue("orderedAt") as number;
          const formatted = new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date(timestamp));

          return <div className="text-right font-medium">{formatted}</div>;
        },
      },
      {
        accessorKey: "expectedDeliveryAt",
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
                label="Expected at"
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
          const expectedTimestamp = row.getValue("expectedDeliveryAt") as
            | number
            | null;

          if (!expectedTimestamp) {
            return <div className="text-right font-medium">-</div>;
          }

          const formatted = new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date(expectedTimestamp));

          return <div className="text-right font-medium">{formatted}</div>;
        },
      },
      {
        id: "purchaseOrderStatus.lookupValue",
        accessorFn: (row) => row.purchaseOrderStatus?.lookupValue,
        header: ({ column }) => {
          const statusFilterOptions = [
            { label: "All", value: "All" },
            { label: "Pending", value: "pending" },
            { label: "Approved", value: "approved" },
            { label: "Received", value: "received" },
            { label: "Cancelled", value: "cancelled" },
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
          const rowValue = row.getValue(id) as string;
          return rowValue?.toLowerCase() === value?.toLowerCase();
        },
        cell: ({ row }) => {
          const status = row.getValue(
            "purchaseOrderStatus.lookupValue",
          ) as string;
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
          const purchaseOrder = row.original;

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
                    navigator.clipboard.writeText(purchaseOrder.code)
                  }
                >
                  Copy PO-ID
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedOrderId(purchaseOrder._id);
                    setDetailDialogOpen(true);
                  }}
                >
                  View details
                </DropdownMenuItem>
                {purchaseOrder.purchaseOrderStatus?.lookupCode ===
                  "PENDING" && (
                  <>
                    <ProceedReceivingDialog
                      purchaseOrder={purchaseOrder}
                      trigger={
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          Proceed receiving
                        </DropdownMenuItem>
                      }
                    />
                    <DropdownMenuItem
                      onClick={() => {
                        setOrderToCancel({
                          id: purchaseOrder._id,
                          code: purchaseOrder.code,
                        });
                        setCancelDialogOpen(true);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      Cancel order
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [purchaseOrders],
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
    data: purchaseOrders ?? EMPTY_ARRAY,
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
    table.getColumn("code")?.setFilterValue(debouncedFilterValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            placeholder="Filter PO-ID..."
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
          <AddPurchaseOrderDialog />
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
                  No purchase orders found.
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
      <PurchaseOrderDetailDialog
        orderId={selectedOrderId}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        trigger={<span className="hidden" />}
      />
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Purchase Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel purchase order{" "}
              <strong>{orderToCancel?.code}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, cancel order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
