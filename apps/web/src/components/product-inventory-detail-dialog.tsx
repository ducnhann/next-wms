"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import {
  AlertTriangle,
  Barcode,
  Box,
  Calendar,
  Layers,
  MapPin,
  Package,
  PackageX,
  Scale,
  Tag,
  Thermometer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBranches } from "@/hooks/use-branches";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";

// --- Components ---

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  subValue?: string;
}

function InfoItem({ icon, label, value, subValue }: InfoItemProps) {
  return (
    <div className="flex items-start gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all hover:bg-accent/5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
          {label}
        </p>
        <p
          className="truncate font-semibold text-base leading-tight"
          title={String(value)}
        >
          {value ?? "-"}
        </p>
        {subValue && (
          <p className="mt-1 text-muted-foreground text-xs">{subValue}</p>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  className?: string;
  valueClassName?: string;
}

function StatCard({ label, value, className, valueClassName }: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <p className="mb-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
          {label}
        </p>
        <p className={cn("font-bold text-3xl tracking-tight", valueClassName)}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

// --- Main Dialog Component ---

interface ProductInventoryDetailDialogProps {
  productId: Id<"products">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductInventoryDetailDialog({
  productId,
  open,
  onOpenChange,
}: ProductInventoryDetailDialogProps) {
  const { organizationId } = useCurrentUser();
  const { currentBranch } = useBranches({ organizationId });

  const { data: productDetail, isLoading } = useQuery({
    ...convexQuery(api.products.getProductInventoryDetail, {
      productId,
      branchId: currentBranch?._id as Id<"branches"> | undefined,
    }),
    enabled: open && !!productId,
  });

  const getStockStatusBadge = (qty: number, reorderPoint: number) => {
    if (qty === 0) {
      return (
        <Badge
          variant="outline"
          className="h-7 gap-1.5 border-red-200 bg-red-500/10 px-3 text-red-600"
        >
          <PackageX className="h-3.5 w-3.5" />
          Out of Stock
        </Badge>
      );
    }
    if (qty <= reorderPoint) {
      return (
        <Badge
          variant="outline"
          className="h-7 gap-1.5 border-yellow-200 bg-yellow-500/10 px-3 text-yellow-600"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Low Stock
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="h-7 gap-1.5 border-green-200 bg-green-500/10 px-3 text-green-600"
      >
        <Package className="h-3.5 w-3.5" />
        In Stock
      </Badge>
    );
  };

  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-6xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="z-10 shrink-0 border-b bg-background px-8 py-5">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Package className="h-5 w-5 text-muted-foreground" />
              Product Inventory Details
            </DialogTitle>
            {/* Header Status Badges (Always visible) */}
            {productDetail && (
              <div className="flex items-center gap-3">
                <div className="mr-2 hidden items-center gap-2 text-muted-foreground text-sm sm:flex">
                  <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-primary text-xs">
                    ID: {productDetail.product._id.slice(-6)}
                  </span>
                </div>
                {getStockStatusBadge(
                  productDetail.summary.totalQuantity,
                  productDetail.product.reorderPoint ?? 10,
                )}
                {productDetail.product.isActive ? (
                  <Badge
                    variant="secondary"
                    className="h-7 bg-green-100 px-3 text-green-700"
                  >
                    Active
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="h-7 bg-gray-100 px-3 text-gray-700"
                  >
                    Inactive
                  </Badge>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="animate-pulse text-muted-foreground">
                Loading product details...
              </p>
            </div>
          </div>
        ) : !productDetail ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-lg text-muted-foreground">Product not found.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto bg-muted/5">
            <div className="space-y-8 p-8">
              {/* SECTION 1: Header Info & Attributes */}
              <div className="space-y-6">
                <div className="flex flex-col items-start justify-between gap-6 md:flex-row">
                  <div className="max-w-3xl space-y-2">
                    <h2 className="font-bold text-3xl text-foreground tracking-tight">
                      {productDetail.product.name}
                    </h2>
                    {productDetail.product.description ? (
                      <p className="text-base text-muted-foreground leading-relaxed">
                        {productDetail.product.description}
                      </p>
                    ) : (
                      <p className="text-muted-foreground italic">
                        No description available.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <InfoItem
                    icon={<Tag className="h-5 w-5" />}
                    label="Category"
                    value={productDetail.product.categoryName}
                  />
                  <InfoItem
                    icon={<Box className="h-5 w-5" />}
                    label="Brand"
                    value={productDetail.product.brandName}
                  />
                  <InfoItem
                    icon={<Calendar className="h-5 w-5" />}
                    label="Shelf Life"
                    value={
                      productDetail.product.shelfLifeDays
                        ? `${productDetail.product.shelfLifeDays} days`
                        : "N/A"
                    }
                  />
                  <InfoItem
                    icon={<AlertTriangle className="h-5 w-5" />}
                    label="Reorder Point"
                    value={productDetail.product.reorderPoint ?? "Not Set"}
                    subValue={
                      productDetail.product.reorderPoint
                        ? "Min quantity alert"
                        : undefined
                    }
                  />
                </div>
              </div>

              <Separator />

              {/* SECTION 2: Summary Statistics */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                  label="Total Quantity"
                  value={productDetail.summary.totalQuantity.toLocaleString()}
                  className="border-blue-100 bg-blue-50/50"
                  valueClassName="text-blue-700"
                />
                <StatCard
                  label="Active Variants"
                  value={productDetail.summary.totalVariants}
                />
                <StatCard
                  label="Total Batches"
                  value={productDetail.summary.totalBatches}
                />
                <StatCard
                  label="Total Value"
                  value={formatCurrency(productDetail.summary.totalValue)}
                  className="border-green-100 bg-green-50/50"
                  valueClassName="text-green-700"
                />
              </div>

              {/* SECTION 3: Detailed Tables (Tabs) */}
              <div className="rounded-xl border bg-background shadow-sm">
                <Tabs defaultValue="variants" className="w-full">
                  <div className="flex items-center justify-between border-b bg-muted/20 px-6 py-4">
                    <TabsList className="h-9">
                      <TabsTrigger value="variants" className="px-4">
                        Variants ({productDetail.variants.length})
                      </TabsTrigger>
                      <TabsTrigger value="batches" className="px-4">
                        Batches ({productDetail.batches.length})
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="variants" className="m-0 p-0">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="pl-6">SKU Code</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead>Properties</TableHead>
                          <TableHead className="pr-6">Barcodes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productDetail.variants.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="h-32 text-center text-muted-foreground"
                            >
                              No variants found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          productDetail.variants.map((variant) => (
                            <TableRow
                              key={variant._id}
                              className="hover:bg-muted/5"
                            >
                              <TableCell className="pl-6 font-medium font-mono text-primary">
                                {variant.skuCode}
                              </TableCell>
                              <TableCell className="max-w-60">
                                <p
                                  className="truncate"
                                  title={variant.description}
                                >
                                  {variant.description}
                                </p>
                              </TableCell>
                              <TableCell className="text-right">
                                <span
                                  className={cn(
                                    "inline-block min-w-7.5 font-bold",
                                    variant.totalQuantity === 0
                                      ? "text-red-600"
                                      : variant.totalQuantity <=
                                          (productDetail.product.reorderPoint ??
                                            10)
                                        ? "text-yellow-600"
                                        : "text-foreground",
                                  )}
                                >
                                  {variant.totalQuantity.toLocaleString()}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {formatCurrency(variant.costPrice)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(variant.sellingPrice)}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1.5">
                                  {variant.weightKg && (
                                    <Badge
                                      variant="outline"
                                      className="h-5 gap-1 text-[10px]"
                                    >
                                      <Scale className="h-3 w-3" />
                                      {variant.weightKg}kg
                                    </Badge>
                                  )}
                                  {variant.temperatureSensitive && (
                                    <Badge
                                      variant="secondary"
                                      className="h-5 gap-1 border-blue-100 bg-blue-50 text-[10px] text-blue-700"
                                    >
                                      <Thermometer className="h-3 w-3" />
                                      Cold
                                    </Badge>
                                  )}
                                  {variant.stackingLimit && (
                                    <Badge
                                      variant="outline"
                                      className="h-5 gap-1 text-[10px]"
                                    >
                                      <Layers className="h-3 w-3" />
                                      Max: {variant.stackingLimit}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="pr-6">
                                {variant.barcodes.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {variant.barcodes
                                      .slice(0, 2)
                                      .map((barcode) => (
                                        <Badge
                                          key={barcode}
                                          variant="secondary"
                                          className="h-5 font-mono text-[10px]"
                                        >
                                          <Barcode className="mr-1 h-3 w-3" />
                                          {barcode}
                                        </Badge>
                                      ))}
                                    {variant.barcodes.length > 2 && (
                                      <Badge
                                        variant="secondary"
                                        className="h-5 text-[10px]"
                                      >
                                        +{variant.barcodes.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">
                                    -
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  <TabsContent value="batches" className="m-0 p-0">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="pl-6">SKU / Batch</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead>Received Date</TableHead>
                          <TableHead className="pr-6">Expiry Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productDetail.batches.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="h-32 text-center text-muted-foreground"
                            >
                              No active batches found in inventory.
                            </TableCell>
                          </TableRow>
                        ) : (
                          productDetail.batches.map((batch) => {
                            const isExpiringSoon =
                              batch.expiresAt &&
                              batch.expiresAt <
                                Date.now() + 30 * 24 * 60 * 60 * 1000;
                            const isExpired =
                              batch.expiresAt && batch.expiresAt < Date.now();

                            return (
                              <TableRow
                                key={batch._id}
                                className="hover:bg-muted/5"
                              >
                                <TableCell className="pl-6">
                                  <div className="flex flex-col">
                                    <span className="font-medium font-mono text-primary">
                                      {batch.skuCode}
                                    </span>
                                    <span className="mt-0.5 font-mono text-muted-foreground text-xs">
                                      #
                                      {batch.supplierBatchNumber ||
                                        batch.internalBatchNumber ||
                                        "N/A"}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="font-medium text-sm">
                                      {batch.branchName}
                                    </span>
                                    <div className="mt-0.5 flex items-center gap-1 text-muted-foreground text-xs">
                                      <MapPin className="h-3 w-3" />
                                      {batch.zoneName}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className="font-bold">
                                    {batch.quantity.toLocaleString()}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm">
                                    {formatDate(batch.receivedAt)}
                                  </span>
                                </TableCell>
                                <TableCell className="pr-6">
                                  {batch.expiresAt ? (
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={cn(
                                          "text-sm",
                                          isExpired
                                            ? "font-medium text-red-600"
                                            : isExpiringSoon
                                              ? "font-medium text-yellow-600"
                                              : "",
                                        )}
                                      >
                                        {formatDate(batch.expiresAt)}
                                      </span>
                                      {isExpired && (
                                        <Badge
                                          variant="destructive"
                                          className="h-5 text-[10px]"
                                        >
                                          Expired
                                        </Badge>
                                      )}
                                      {isExpiringSoon && !isExpired && (
                                        <Badge
                                          variant="outline"
                                          className="h-5 border-yellow-500 bg-yellow-50 text-[10px] text-yellow-600"
                                        >
                                          Expiring
                                        </Badge>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-sm italic">
                                      No Expiry
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
