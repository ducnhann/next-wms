"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Filter,
  Package,
  User,
} from "lucide-react";
import * as React from "react";
import TableCellFirst from "@/components/table/table-cell-first";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedInput } from "@/hooks/use-debounced-input";
import { cn, getBadgeStyleByStatus } from "@/lib/utils";

// Define the detail item type based on what the API returns
type DetailItem = {
  _id: Id<"return_request_details">;
  skuCode: string;
  productName: string | null;
  quantityToReturn: number;
  expectedCreditAmount: number;
  reason: { lookupValue: string } | null;
  customReasonNotes?: string;
  batchId: string;
};

const columns: ColumnDef<DetailItem>[] = [
  {
    accessorKey: "skuCode",
    header: "SKU",
    cell: ({ row }) => (
      <TableCellFirst>{row.getValue("skuCode")}</TableCellFirst>
    ),
  },
  {
    accessorKey: "productName",
    header: "Name",
    cell: ({ row }) => (
      <div className="">{row.getValue("productName") ?? "-"}</div>
    ),
  },
  {
    accessorKey: "quantityToReturn",
    header: "Qty to Return",
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("quantityToReturn")}</div>
    ),
  },
  {
    id: "reason.lookupValue",
    accessorFn: (row) => row.reason?.lookupValue,
    header: "Reason",
    cell: ({ row }) => {
      const reason = row.getValue("reason.lookupValue") as string;
      const notes = row.original.customReasonNotes;
      return (
        <div className="max-w-50">
          <div className="font-medium">{reason ?? "-"}</div>
          {notes && (
            <div className="truncate text-muted-foreground text-xs">
              {notes}
            </div>
          )}
        </div>
      );
    },
  },
];

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

function InfoItem({ icon, label, value }: InfoItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="truncate font-medium">{value}</p>
      </div>
    </div>
  );
}

interface ReturnRequestDetailDialogProps {
  returnRequestId: Id<"return_requests">;
  trigger?: React.ReactNode;
}

export function ReturnRequestDetailDialog({
  returnRequestId,
  trigger,
}: ReturnRequestDetailDialogProps) {
  const [open, setOpen] = React.useState(false);

  const { data: returnRequest, isLoading: isPending } = useQuery({
    ...convexQuery(api.returnRequest.getReturnRequestWithDetails, {
      returnRequestId,
    }),
    enabled: open && !!returnRequestId,
  });

  const [setFilterValue, instantFilterValue, debouncedFilterValue] =
    useDebouncedInput("", 300);

  const filteredDetails = React.useMemo(() => {
    if (!returnRequest?.details) return [];
    if (!debouncedFilterValue) return returnRequest.details;

    return returnRequest.details.filter(
      (detail) =>
        detail.skuCode
          .toLowerCase()
          .includes(debouncedFilterValue.toLowerCase()) ||
        detail.productName
          ?.toLowerCase()
          .includes(debouncedFilterValue.toLowerCase()),
    );
  }, [returnRequest?.details, debouncedFilterValue]);

  const table = useReactTable({
    data: filteredDetails as DetailItem[],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
  });

  const formattedDate = returnRequest
    ? new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(returnRequest.requestedAt))
    : "-";

  const formattedTime = returnRequest
    ? new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(returnRequest.requestedAt))
    : "-";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <span className="cursor-pointer text-sm hover:underline">
            View details
          </span>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="font-semibold text-xl">
                {isPending
                  ? "Loading..."
                  : !returnRequest
                    ? "Return Request Not Found"
                    : "Return Request Details"}
              </DialogTitle>
              {returnRequest && (
                <p className="text-muted-foreground text-sm">
                  {returnRequest.requestCode}
                </p>
              )}
            </div>
            {returnRequest && (
              <Badge
                className={cn(
                  "h-8 px-3 text-sm",
                  getBadgeStyleByStatus(
                    returnRequest.returnStatus?.lookupValue ?? "",
                  ),
                )}
                variant={"outline"}
              >
                {returnRequest.returnStatus?.lookupValue ?? "Unknown"}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {isPending ? (
          <div className="flex flex-col gap-4 py-4">
            <div className="h-32 w-full animate-pulse rounded bg-muted" />
            <div className="h-48 w-full animate-pulse rounded bg-muted" />
          </div>
        ) : !returnRequest ? (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <p className="text-muted-foreground">
              The return request you're looking for doesn't exist or has been
              deleted.
            </p>
          </div>
        ) : (
          <>
            {/* Summary Card */}
            <Card className="py-4">
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem
                    icon={<Calendar className="h-5 w-5 text-primary" />}
                    label="Date"
                    value={formattedDate}
                  />
                  <InfoItem
                    icon={<Clock className="h-5 w-5 text-primary" />}
                    label="Time"
                    value={formattedTime}
                  />
                  <InfoItem
                    icon={<User className="h-5 w-5 text-primary" />}
                    label="Requested by"
                    value={returnRequest.requestedByUser?.fullName ?? "Unknown"}
                  />
                  <InfoItem
                    icon={<Package className="h-5 w-5 text-primary" />}
                    label="Supplier"
                    value={returnRequest.supplier?.name ?? "Unknown"}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="font-bold text-xl">
                      {returnRequest.totalSKUs}
                    </p>
                    <p className="text-muted-foreground text-sm">Total SKUs</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="font-bold text-xl">
                      {returnRequest.totalExpectedQuantity}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Total Quantity
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Details Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">
                  Return Items
                </h3>
                <InputGroup className="max-w-40">
                  <InputGroupInput
                    placeholder="Filter SKU..."
                    value={instantFilterValue}
                    onChange={(event) => setFilterValue(event.target.value)}
                  />
                  <InputGroupAddon>
                    <Filter className="h-4 w-4" />
                  </InputGroupAddon>
                </InputGroup>
              </div>

              <div className="overflow-hidden rounded-md border">
                <Table>
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
                          No items found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground text-sm">
                  Showing {table.getRowModel().rows.length} of{" "}
                  {returnRequest.details.length} item(s).
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => table.firstPage()}
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
                    onClick={() => table.lastPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
