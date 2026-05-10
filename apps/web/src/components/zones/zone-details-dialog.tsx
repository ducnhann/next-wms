"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Type for the inventory batch data returned by getInventoryBatchesByZone
interface InventoryBatchItem {
  _id: Id<"inventory_batches">;
  batchCode: string;
  productId: string;
  productName: string;
  productCode: string;
  currentQuantity: number;
  expiresAt?: number;
  zoneId: Id<"storage_zones">;
}

interface ZoneDetailsDialogProps {
  zoneId: Id<"storage_zones"> | null;
  zoneName: string;
  branchId: Id<"branches"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Format date helper
function formatDate(timestamp: number | undefined) {
  if (!timestamp) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

// Column definitions for the inventory batches table
const columns: ColumnDef<InventoryBatchItem>[] = [
  {
    accessorKey: "productName",
    header: "Product Name",
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("productName")}</span>
    ),
  },
  {
    accessorKey: "productCode",
    header: "SKU Code",
    cell: ({ row }) => (
      <span className="font-mono text-blue-600 text-sm">
        {row.getValue("productCode")}
      </span>
    ),
  },
  {
    accessorKey: "batchCode",
    header: "Batch",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.getValue("batchCode")}
      </span>
    ),
  },
  {
    accessorKey: "currentQuantity",
    header: () => <div className="text-right">Qty</div>,
    cell: ({ row }) => (
      <div className="text-right font-semibold">
        {row.getValue("currentQuantity")}
      </div>
    ),
  },
  {
    accessorKey: "expiresAt",
    header: () => <div className="text-right">Expires</div>,
    cell: ({ row }) => (
      <div className="text-right text-muted-foreground text-sm">
        {formatDate(row.getValue("expiresAt"))}
      </div>
    ),
  },
];

// Stable empty array to prevent new reference on each render
const EMPTY_ARRAY: InventoryBatchItem[] = [];

export function ZoneDetailsDialog({
  zoneId,
  zoneName,
  branchId,
  open,
  onOpenChange,
}: ZoneDetailsDialogProps) {
  // Query inventory batches for this zone
  const { data: batches, isLoading } = useQuery({
    ...convexQuery(
      api.cycleCount.getInventoryBatchesByZone,
      open && zoneId && branchId
        ? {
            zoneId: zoneId,
            branchId: branchId,
          }
        : "skip",
    ),
    enabled: open && !!zoneId && !!branchId,
  });

  // Setup TanStack Table
  const table = useReactTable({
    data: (batches as InventoryBatchItem[] | undefined) ?? EMPTY_ARRAY,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-bold text-xl">
            {zoneName} - Inventory Details
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          // Loading skeleton
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !batches || batches.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h4 className="font-medium text-sm">No inventory in this zone</h4>
              <p className="text-muted-foreground text-xs">
                This zone does not contain any inventory batches.
              </p>
            </div>
          </div>
        ) : (
          // Inventory table
          <div className="rounded-md border">
            <Table>
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
                {table.getRowModel().rows.map((row) => (
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
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Footer with count */}
        {batches && batches.length > 0 && (
          <div className="flex justify-end">
            <div className="inline-flex items-center gap-4 rounded-lg border bg-card px-4 py-2 text-sm shadow-sm">
              <span className="text-muted-foreground">Total Items:</span>
              <span className="font-semibold">{batches.length}</span>
              <div className="h-4 w-px bg-border" />
              <span className="text-muted-foreground">Total Qty:</span>
              <span className="font-bold text-blue-600">
                {batches.reduce((sum, batch) => sum + batch.currentQuantity, 0)}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
