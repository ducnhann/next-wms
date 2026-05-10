"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import {
  AlertTriangle,
  ArrowLeft,
  Barcode,
  Box,
  Calendar,
  Layers,
  MapPin,
  Tag,
  Thermometer,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { cn, getBadgeStyleByStatus } from "@/lib/utils";

// --- Components ---

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  subValue?: string;
}

function InfoItem({ icon, label, value, subValue }: InfoItemProps) {
  return (
    <div className="group flex items-start gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:border-primary/20 hover:shadow-md">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary/10 to-primary/5 text-primary transition-transform duration-200 group-hover:scale-105">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
          {label}
        </p>
        <div className="flex items-baseline gap-2">
          <p
            className="truncate font-semibold text-base text-foreground leading-tight"
            title={String(value)}
          >
            {value ?? "-"}
          </p>
          {subValue && (
            <p className="shrink-0 text-muted-foreground text-xs">{subValue}</p>
          )}
        </div>
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
    <Card
      className={cn(
        "overflow-hidden border shadow-sm transition-all duration-200 hover:shadow-md",
        className,
      )}
    >
      <CardContent>
        <p className="mb-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
          {label}
        </p>
        <p className={cn("font-bold text-4xl tracking-tight", valueClassName)}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

// --- Main Page Component ---

export default function ProductInventoryDetailPage() {
  const params = useParams();
  const productId = params.productId as Id<"products">;
  const workspace = params.workspace as string;

  const { organizationId } = useCurrentUser();
  const { currentBranch } = useBranches({ organizationId });

  const { data: productDetail, isLoading } = useQuery({
    ...convexQuery(api.products.getProductInventoryDetail, {
      productId,
      branchId: currentBranch?._id as Id<"branches"> | undefined,
    }),
    enabled: !!productId,
  });

  const getStockStatusBadge = (qty: number, reorderPoint: number) => {
    if (qty === 0) {
      return (
        <Badge
          variant="outline"
          className={cn("h-7 px-3", getBadgeStyleByStatus("cancelled"))}
        >
          Out of Stock
        </Badge>
      );
    }
    if (qty <= reorderPoint) {
      return (
        <Badge
          variant="outline"
          className={cn("h-7 px-3", getBadgeStyleByStatus("pending"))}
        >
          Low Stock
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className={cn("h-7 px-3", getBadgeStyleByStatus("completed"))}
      >
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

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="animate-pulse text-muted-foreground">
            Loading product details...
          </p>
        </div>
      </div>
    );
  }

  if (!productDetail) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-lg text-muted-foreground">Product not found.</p>
        <Button variant="outline" asChild>
          <Link href={`/${workspace}/inventory/products` as Route}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col">
      {/* Page Header */}
      <div className="shrink-0 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              asChild
              aria-label="Go back to products list"
            >
              <Link href={`/${workspace}/inventory/products` as Route}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold">Back</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="mr-2 hidden items-center gap-2 text-sm sm:flex">
              <Badge variant="outline" className="h-7 px-3 font-mono text-xs">
                ID: {productDetail.product._id.slice(-6)}
              </Badge>
            </div>
            {getStockStatusBadge(
              productDetail.summary.totalQuantity,
              productDetail.product.reorderPoint ?? 10,
            )}
            {productDetail.product.isActive ? (
              <Badge
                variant="outline"
                className={cn("h-7 px-3", getBadgeStyleByStatus("active"))}
              >
                Active
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className={cn("h-7 px-3", getBadgeStyleByStatus("default"))}
              >
                Inactive
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="flex-1 overflow-y-auto bg-muted/5">
        <div className="mx-auto max-w-400 space-y-8 p-6 lg:p-8">
          {/* SECTION 1: Header Info & Attributes */}
          <div className="space-y-6">
            <div className="flex flex-col items-start justify-between gap-0 md:flex-row">
              <div className="max-w-4xl space-y-2">
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
          {/* SECTION 2: Summary Statistics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Total Quantity"
              value={productDetail.summary.totalQuantity.toLocaleString()}
              className="bg-card"
              valueClassName="text-blue-600"
            />
            <StatCard
              label="Active Variants"
              value={productDetail.summary.totalVariants}
              className="bg-card"
              valueClassName="text-purple-600"
            />
            <StatCard
              label="Total Batches"
              value={productDetail.summary.totalBatches}
              className="bg-card"
              valueClassName="text-amber-600"
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
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Properties</TableHead>
                      <TableHead className="pr-6">Barcodes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productDetail.variants.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
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
                          <TableCell className="max-w-70">
                            <p className="truncate" title={variant.description}>
                              {variant.description}
                            </p>
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={cn(
                                "inline-flex min-w-12 items-center justify-center rounded-md px-2 py-1 font-bold text-sm",
                                variant.totalQuantity === 0
                                  ? "bg-red-500/10 text-red-500/70"
                                  : variant.totalQuantity <=
                                      (productDetail.product.reorderPoint ?? 10)
                                    ? "bg-amber-500/10 text-amber-500/70"
                                    : "bg-emerald-500/10 text-emerald-500/70",
                              )}
                            >
                              {variant.totalQuantity.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1.5">
                              {variant.weightKg && (
                                <Badge
                                  variant="outline"
                                  className="h-5 gap-1 text-[10px]"
                                >
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
                                {variant.barcodes.slice(0, 2).map((barcode) => (
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
                              <span className="inline-flex min-w-12 items-center justify-center rounded-md bg-blue-100 px-2 py-1 font-bold text-blue-700 text-sm">
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
                                      variant="outline"
                                      className={cn(
                                        "h-5 text-[10px]",
                                        getBadgeStyleByStatus("cancelled"),
                                      )}
                                    >
                                      Expired
                                    </Badge>
                                  )}
                                  {isExpiringSoon && !isExpired && (
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "h-5 text-[10px]",
                                        getBadgeStyleByStatus("pending"),
                                      )}
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
    </div>
  );
}
