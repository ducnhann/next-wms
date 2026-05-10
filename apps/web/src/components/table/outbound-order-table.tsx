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
  Filter,
  MoreHorizontal,
  PackageCheck,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { AddOutboundOrderDialog } from "@/components/add-outbound-order-dialog";
import { OutboundOrderDetailDialog } from "@/components/outbound-order-detail-dialog";
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
import type { OutboundOrderListItem } from "@/lib/types";
import { cn, getBadgeStyleByStatus } from "@/lib/utils";

// Stable empty array to prevent new reference on each render
const EMPTY_ARRAY: OutboundOrderListItem[] = [];

export function OutboundOrdersTable() {
  const router = useRouter();
  const { userId, organizationId } = useCurrentUser();

  const { currentBranch } = useBranches({
    organizationId: organizationId as Id<"organizations"> | undefined,
    includeDeleted: false,
  });

  const { data: outboundOrders, isPending } = useQuery({
    ...convexQuery(
      api.outboundOrders.listOutboundOrders,
      userId && currentBranch
        ? {
            branchId: currentBranch._id,
            userId: userId as Id<"users">,
          }
        : "skip",
    ),
    enabled: !!userId && !!currentBranch,
  });

  // Create picking session mutation
  const createPickingSessionMutation = useMutation({
    mutationFn: useConvexMutation(api.pickingSessions.createPickingSession),
  });

  // Vehicle workflow mutations
  const markVehicleArrivedMutation = useMutation({
    mutationFn: useConvexMutation(api.outboundOrders.markVehicleArrived),
  });

  const startLoadingMutation = useMutation({
    mutationFn: useConvexMutation(api.outboundOrders.startLoading),
  });

  const completeLoadingMutation = useMutation({
    mutationFn: useConvexMutation(api.outboundOrders.completeLoading),
  });

  // Dialog state - must be declared before useMemo since columns reference these
  const [selectedOrderId, setSelectedOrderId] =
    React.useState<Id<"outbound_orders"> | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false);

  // Handler for starting picking session
  const handleStartPicking = React.useCallback(
    async (orderId: Id<"outbound_orders">) => {
      if (!userId) return;

      try {
        const result = await createPickingSessionMutation.mutateAsync({
          outboundOrderId: orderId,
          userId: userId as Id<"users">,
        });

        if (result.isExisting) {
          toast.info(`Continuing picking session ${result.sessionCode}`);
        } else {
          toast.success(`Picking session ${result.sessionCode} created`);
        }
        router.push(`picking-sessions/${result.sessionId}/verifying` as Route);
      } catch (error) {
        console.error("Failed to create picking session:", error);
        toast.error("Failed to create picking session");
      }
    },
    [userId, createPickingSessionMutation, router],
  );

  // Handler for marking vehicle arrived
  const handleVehicleArrived = React.useCallback(
    async (orderId: Id<"outbound_orders">) => {
      try {
        const result = await markVehicleArrivedMutation.mutateAsync({
          orderId,
        });
        if (result.alreadyArrived) {
          toast.info("Vehicle was already marked as arrived");
        } else {
          toast.success("Vehicle marked as arrived");
        }
      } catch (error) {
        console.error("Failed to mark vehicle arrived:", error);
        toast.error("Failed to mark vehicle arrived");
      }
    },
    [markVehicleArrivedMutation],
  );

  // Handler for starting loading
  const handleStartLoading = React.useCallback(
    async (orderId: Id<"outbound_orders">) => {
      try {
        await startLoadingMutation.mutateAsync({ orderId });
        toast.success("Loading started");
      } catch (error) {
        console.error("Failed to start loading:", error);
        toast.error("Failed to start loading");
      }
    },
    [startLoadingMutation],
  );

  // Handler for completing loading
  const handleCompleteLoading = React.useCallback(
    async (orderId: Id<"outbound_orders">) => {
      try {
        await completeLoadingMutation.mutateAsync({ orderId });
        toast.success("Loading completed - Order shipped!");
      } catch (error) {
        console.error("Failed to complete loading:", error);
        toast.error("Failed to complete loading");
      }
    },
    [completeLoadingMutation],
  );

  const columns: ColumnDef<OutboundOrderListItem>[] = React.useMemo(
    () => [
      {
        accessorKey: "orderCode",
        header: "Order ID",
        cell: ({ row }) => (
          <TableCellFirst className="capitalize">
            {row.getValue("orderCode")}
          </TableCellFirst>
        ),
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
        accessorKey: "orderDate",
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
                label="Order Date"
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
          const timestamp = row.getValue("orderDate") as number;
          const formatted = new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date(timestamp));

          return <div className="text-right font-medium">{formatted}</div>;
        },
      },
      {
        accessorKey: "requestedShipDate",
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
                label="Ship Date"
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
          const shipTimestamp = row.getValue("requestedShipDate") as
            | number
            | null;

          if (!shipTimestamp) {
            return <div className="text-right font-medium">-</div>;
          }

          const formatted = new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date(shipTimestamp));

          return <div className="text-right font-medium">{formatted}</div>;
        },
      },
      {
        accessorKey: "trackingNumber",
        header: "Tracking",
        cell: ({ row }) => {
          const tracking = row.getValue("trackingNumber") as string | null;
          return <div className="text-muted-foreground">{tracking || "-"}</div>;
        },
      },
      {
        id: "outboundStatus.lookupValue",
        accessorFn: (row) => row.outboundStatus?.lookupValue,
        header: ({ column }) => {
          const statusFilterOptions = [
            { label: "All", value: "All" },
            { label: "Pending", value: "Pending" },
            { label: "Picking", value: "Picking" },
            { label: "Picked", value: "Picked" },
            { label: "Loading", value: "Loading" },
            { label: "Shipped", value: "Shipped" },
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
          const status = row.getValue("outboundStatus.lookupValue") as string;
          return (
            <div className="text-center">
              <Badge
                className={cn(
                  "w-22 rounded-sm text-center text-xs",
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
      // Vehicle Status Column
      {
        id: "vehicleStatus",
        header: () => <div className="text-center">Vehicle</div>,
        cell: ({ row }) => {
          const vehicleArrived = !!row.original.vehicleArrivedAt;

          if (vehicleArrived) {
            return (
              <div className="text-center">
                <Badge
                  className="border-green-500/60 bg-green-500/10 text-green-600 text-xs"
                  variant={"outline"}
                >
                  Arrived
                </Badge>
              </div>
            );
          }

          return (
            <div className="text-center">
              <Button
                variant="outline"
                size="sm"
                className="h-6 border-yellow-500/60 text-xs text-yellow-600 hover:bg-yellow-500/10"
                onClick={() => handleVehicleArrived(row.original._id)}
              >
                Awaiting Vehicle
              </Button>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Action",
        enableHiding: false,
        cell: ({ row }) => {
          const outboundOrder = row.original;
          const statusCode =
            outboundOrder.outboundStatus?.lookupCode?.toUpperCase();
          const vehicleArrived = !!outboundOrder.vehicleArrivedAt;

          const canStartPicking =
            statusCode === "PENDING" || statusCode === "PICKING";
          const canStartLoading = statusCode === "PICKED" && vehicleArrived;
          const canCompleteLoading = statusCode === "LOADING";
          const isPicked = statusCode === "PICKED";
          const waitingForVehicle = isPicked && !vehicleArrived;

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
                    navigator.clipboard.writeText(outboundOrder.orderCode)
                  }
                >
                  Copy Order ID
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedOrderId(outboundOrder._id);
                    setDetailDialogOpen(true);
                  }}
                >
                  View details
                </DropdownMenuItem>

                {/* Start Picking */}
                {canStartPicking && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleStartPicking(outboundOrder._id)}
                      className="text-blue-600"
                    >
                      <PackageCheck className="mr-2 h-4 w-4" />
                      Start Picking
                    </DropdownMenuItem>
                  </>
                )}

                {/* Waiting for vehicle notice */}
                {waitingForVehicle && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled
                      className="text-muted-foreground"
                    >
                      Waiting for vehicle to arrive
                    </DropdownMenuItem>
                  </>
                )}

                {/* Start Loading - only when picked and vehicle arrived */}
                {canStartLoading && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleStartLoading(outboundOrder._id)}
                      className="text-orange-600"
                    >
                      Load onto vehicle
                    </DropdownMenuItem>
                  </>
                )}

                {/* Complete Loading */}
                {canCompleteLoading && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleCompleteLoading(outboundOrder._id)}
                      className="text-green-600"
                    >
                      Complete loading
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [
      handleStartPicking,
      handleVehicleArrived,
      handleStartLoading,
      handleCompleteLoading,
    ],
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
    data: outboundOrders ?? EMPTY_ARRAY,
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
    table.getColumn("orderCode")?.setFilterValue(debouncedFilterValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFilterValue, table]);

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
            placeholder="Filter Order ID..."
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
          <AddOutboundOrderDialog />
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
                  No outbound orders found.
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
      <OutboundOrderDetailDialog
        orderId={selectedOrderId}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </div>
  );
}
