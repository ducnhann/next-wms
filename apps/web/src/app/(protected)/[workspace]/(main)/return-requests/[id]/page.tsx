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
  ArrowLeft,
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
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import TableCellFirst from "@/components/table/table-cell-first";
// import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
// import { Skeleton } from "@/components/ui/skeleton";
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
      return <div className="font-medium">{reason ?? "-"}</div>;
    },
  },
  {
    accessorKey: "customReasonNotes",
    header: "Notes",
    cell: ({ row }) => {
      const notes = row.getValue("customReasonNotes") as string | undefined;
      return <div className="max-w-[300px] text-sm">{notes || "-"}</div>;
    },
  },
];

export default function ReturnRequestDetailPage() {
  const params = useParams();
  const workspace = params.workspace as string;
  const returnRequestId = params.id as string;

  const { data: returnRequest, isLoading: isPending } = useQuery({
    ...convexQuery(api.returnRequest.getReturnRequestWithDetails, {
      returnRequestId: returnRequestId as Id<"return_requests">,
    }),
    enabled: !!returnRequestId,
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
        pageSize: 10,
      },
    },
  });

  if (isPending) {
    return (
      <div className="flex flex-col gap-4 p-2">
        <div className="h-8 w-50 animate-pulse rounded bg-muted" />
        <div className="h-50 w-full animate-pulse rounded bg-muted" />
        <div className="h-50 w-full animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!returnRequest) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <h1 className="font-semibold text-xl">Return Request Not Found</h1>
        <p className="text-muted-foreground">
          The return request you're looking for doesn't exist or has been
          deleted.
        </p>
        <Button asChild>
          <Link href={`/${workspace}/return-requests`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Return Requests
          </Link>
        </Button>
      </div>
    );
  }

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(returnRequest.requestedAt));

  const formattedTime = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(returnRequest.requestedAt));

  return (
    <div className="flex flex-col gap-4 p-2">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${workspace}/return-requests`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="font-semibold text-2xl tracking-tight">
            Return Request Details
          </h1>
          <p className="text-muted-foreground text-sm">
            {returnRequest.requestCode}
          </p>
        </div>
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
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Request Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Date</p>
                <p className="font-medium">{formattedDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Time</p>
                <p className="font-medium">{formattedTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Requested by</p>
                <p className="font-medium">
                  {returnRequest.requestedByUser?.fullName ?? "Unknown"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Supplier</p>
                <p className="font-medium">
                  {returnRequest.supplier?.name ?? "Unknown"}
                </p>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4 text-center">
              <p className="font-bold text-2xl">{returnRequest.totalSKUs}</p>
              <p className="text-muted-foreground text-sm">Total SKUs</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="font-bold text-2xl">
                {returnRequest.totalExpectedQuantity}
              </p>
              <p className="text-muted-foreground text-sm">Total Quantity</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Return Items</CardTitle>
            <InputGroup className="max-w-50">
              <InputGroupInput
                placeholder="Filter SKU..."
                value={instantFilterValue}
                onChange={(event) => setFilterValue(event.target.value)}
              />
              <InputGroupAddon>
                <Filter />
              </InputGroupAddon>
            </InputGroup>
          </div>
        </CardHeader>
        <CardContent>
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
          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-muted-foreground text-sm">
              Showing {table.getRowModel().rows.length} of{" "}
              {returnRequest.details.length} item(s).
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
        </CardContent>
      </Card>
    </div>
  );
}
