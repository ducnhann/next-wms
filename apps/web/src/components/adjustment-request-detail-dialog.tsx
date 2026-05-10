"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import {
  ArrowRight,
  Calendar,
  Clock,
  FileText,
  MapPin,
  Package,
  TrendingDown,
  TrendingUp,
  User,
} from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn, getBadgeStyleByStatus } from "@/lib/utils";

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

function InfoItem({ icon, label, value }: InfoItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="truncate font-medium text-sm">{value}</p>
      </div>
    </div>
  );
}

interface AdjustmentDetail {
  _id: string;
  batchId?: string;
  skuId?: string;
  skuCode?: string;
  productName?: string;
  fromLocationName?: string;
  toLocationName?: string;
  expectedQuantity?: number;
  actualQuantity?: number;
  currentQuantity?: number;
  adjustedQuantity?: number;
  varianceQuantity?: number;
  quantityToTransfer?: number;
  quantity?: number;
  reasonTypeId?: string;
  customReasonNotes?: string;
}

interface AdjustmentRequestDetailDialogProps {
  adjustmentRequestId: Id<"adjustment_requests">;
  trigger?: React.ReactNode;
}

export function AdjustmentRequestDetailDialog({
  adjustmentRequestId,
  trigger,
}: AdjustmentRequestDetailDialogProps) {
  const [open, setOpen] = React.useState(false);

  const { data: adjustmentRequest, isLoading } = useQuery({
    ...convexQuery(api.cycleCount.getAdjustmentRequestById, {
      adjustmentRequestId,
    }),
    enabled: open && !!adjustmentRequestId,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">View Details</Button>}
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b p-6 pb-4">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Adjustment Request Details
            </DialogTitle>
            {adjustmentRequest && (
              <Badge
                className={cn(
                  "capitalize",
                  getBadgeStyleByStatus(adjustmentRequest.status || ""),
                )}
                variant="outline"
              >
                {adjustmentRequest.status || "Unknown"}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : !adjustmentRequest ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-muted-foreground">
              Adjustment request not found.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 pt-4">
            <div className="space-y-4">
              {/* Request Information Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="font-medium text-sm">
                    Request Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <InfoItem
                      icon={<FileText className="h-4 w-4 text-primary" />}
                      label="Request Code"
                      value={adjustmentRequest.requestCode}
                    />
                    <InfoItem
                      icon={<Package className="h-4 w-4 text-primary" />}
                      label="Type"
                      value={
                        adjustmentRequest.adjustmentType?.lookupValue ||
                        "Unknown"
                      }
                    />
                    <InfoItem
                      icon={<Calendar className="h-4 w-4 text-primary" />}
                      label="Date"
                      value={new Intl.DateTimeFormat("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }).format(
                        new Date(
                          adjustmentRequest.requestedAt ||
                            adjustmentRequest._creationTime,
                        ),
                      )}
                    />
                    <InfoItem
                      icon={<Clock className="h-4 w-4 text-primary" />}
                      label="Time"
                      value={new Intl.DateTimeFormat("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(
                        new Date(
                          adjustmentRequest.requestedAt ||
                            adjustmentRequest._creationTime,
                        ),
                      )}
                    />
                    <InfoItem
                      icon={<User className="h-4 w-4 text-primary" />}
                      label="Requested By"
                      value={
                        adjustmentRequest.requestedBy?.fullName || "Unknown"
                      }
                    />
                    {adjustmentRequest.approvedByUser && (
                      <InfoItem
                        icon={<User className="h-4 w-4 text-primary" />}
                        label="Approved By"
                        value={adjustmentRequest.approvedByUser.fullName}
                      />
                    )}
                  </div>

                  {adjustmentRequest.resolutionNotes && (
                    <>
                      <Separator />
                      <div>
                        <p className="mb-1 font-medium text-muted-foreground text-xs">
                          Resolution Notes
                        </p>
                        <p className="rounded-md bg-muted/50 p-2 text-sm">
                          {adjustmentRequest.resolutionNotes}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Adjustment Items */}
              {adjustmentRequest.details &&
                adjustmentRequest.details.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="font-medium text-sm">
                          Adjustment Items
                        </CardTitle>
                        <Badge variant="secondary">
                          {adjustmentRequest.details.length} item(s)
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {adjustmentRequest.details.map(
                        (detail: AdjustmentDetail, index: number) => {
                          const isLocationTransfer = !!(
                            detail.fromLocationName || detail.toLocationName
                          );
                          const isQuantityAdjustment =
                            detail.currentQuantity !== undefined ||
                            detail.adjustedQuantity !== undefined;
                          const variance =
                            detail.varianceQuantity ??
                            (detail.adjustedQuantity ?? 0) -
                              (detail.currentQuantity ?? 0);

                          return (
                            <div
                              key={detail._id}
                              className="rounded-lg border bg-card p-4"
                            >
                              {/* Product Info Header */}
                              <div className="mb-3 flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                    <Package className="h-5 w-5 text-primary" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium text-sm">
                                      {detail.productName ||
                                        detail.skuId ||
                                        detail.batchId ||
                                        `Item ${index + 1}`}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
                                      {detail.skuCode && (
                                        <span>SKU: {detail.skuCode}</span>
                                      )}
                                      {detail.batchId &&
                                        detail.batchId !== detail.skuId && (
                                          <>
                                            {detail.skuCode && <span>•</span>}
                                            <span>Batch: {detail.batchId}</span>
                                          </>
                                        )}
                                    </div>
                                  </div>
                                </div>
                                {isQuantityAdjustment && variance !== 0 && (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "shrink-0",
                                      variance > 0
                                        ? "border-amber-200 bg-amber-50 text-amber-700"
                                        : "border-red-200 bg-red-50 text-red-700",
                                    )}
                                  >
                                    {variance > 0 ? (
                                      <TrendingUp className="mr-1 h-3 w-3" />
                                    ) : (
                                      <TrendingDown className="mr-1 h-3 w-3" />
                                    )}
                                    {variance > 0 ? `+${variance}` : variance}
                                  </Badge>
                                )}
                              </div>

                              {/* Quantity Adjustment Details */}
                              {isQuantityAdjustment && (
                                <div className="grid grid-cols-3 gap-3 rounded-md bg-muted/30 p-3">
                                  <div className="text-center">
                                    <p className="text-muted-foreground text-xs">
                                      Expected
                                    </p>
                                    <p className="font-semibold text-lg">
                                      {detail.currentQuantity ??
                                        detail.expectedQuantity ??
                                        "-"}
                                    </p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-muted-foreground text-xs">
                                      Counted
                                    </p>
                                    <p
                                      className={cn(
                                        "font-semibold text-lg",
                                        variance > 0 && "text-amber-600",
                                        variance < 0 && "text-red-600",
                                        variance === 0 && "text-green-600",
                                      )}
                                    >
                                      {detail.adjustedQuantity ??
                                        detail.actualQuantity ??
                                        "-"}
                                    </p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-muted-foreground text-xs">
                                      Variance
                                    </p>
                                    <p
                                      className={cn(
                                        "font-semibold text-lg",
                                        variance > 0 && "text-amber-600",
                                        variance < 0 && "text-red-600",
                                        variance === 0 && "text-green-600",
                                      )}
                                    >
                                      {variance > 0 ? `+${variance}` : variance}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Location Transfer Details */}
                              {isLocationTransfer && (
                                <div className="flex items-center gap-3 rounded-md bg-muted/30 p-3">
                                  <div className="flex-1 text-center">
                                    <p className="text-muted-foreground text-xs">
                                      From
                                    </p>
                                    <div className="flex items-center justify-center gap-1">
                                      <MapPin className="h-3 w-3 text-muted-foreground" />
                                      <p className="font-medium text-sm">
                                        {detail.fromLocationName || "-"}
                                      </p>
                                    </div>
                                  </div>
                                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  <div className="flex-1 text-center">
                                    <p className="text-muted-foreground text-xs">
                                      To
                                    </p>
                                    <div className="flex items-center justify-center gap-1">
                                      <MapPin className="h-3 w-3 text-muted-foreground" />
                                      <p className="font-medium text-sm">
                                        {detail.toLocationName || "-"}
                                      </p>
                                    </div>
                                  </div>
                                  {(detail.quantityToTransfer ||
                                    detail.quantity) && (
                                    <>
                                      <Separator
                                        orientation="vertical"
                                        className="h-8"
                                      />
                                      <div className="px-2 text-center">
                                        <p className="text-muted-foreground text-xs">
                                          Qty
                                        </p>
                                        <p className="font-semibold text-lg">
                                          {detail.quantityToTransfer ??
                                            detail.quantity}
                                        </p>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}

                              {/* Reason/Notes */}
                              {detail.customReasonNotes && (
                                <div className="mt-3 rounded-md bg-muted/30 p-2">
                                  <p className="text-muted-foreground text-xs">
                                    Notes
                                  </p>
                                  <p className="text-sm">
                                    {detail.customReasonNotes}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        },
                      )}
                    </CardContent>
                  </Card>
                )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
