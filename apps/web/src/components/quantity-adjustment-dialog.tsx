"use client";

import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBranches } from "@/hooks/use-branches";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useFileUpload } from "@/hooks/use-file-upload";
import { cn } from "@/lib/utils";

interface QuantityAdjustmentDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Pre-fill data from cycle count line item
  initialData?: {
    productId?: string;
    productName?: string;
    zoneId?: string;
    zoneName?: string;
    batchId?: string;
    skuId?: string;
    currentQty?: number;
    countedQty?: number;
  };
  onSuccess?: () => void;
}

// Generate adjustment request code like ADJ-2026-001
function generateRequestCode(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `ADJ-${year}-${random}`;
}

export function QuantityAdjustmentDialog({
  open,
  onOpenChange,
  initialData,
  onSuccess,
}: QuantityAdjustmentDialogProps) {
  const { user, organizationId } = useCurrentUser();
  const { currentBranch } = useBranches({ organizationId });

  // Form state
  const [zoneId, setZoneId] = React.useState<string>("");
  const [productName, setProductName] = React.useState<string>("");
  const [batchId, setBatchId] = React.useState<string>("");
  const [skuId, setSkuId] = React.useState<string>("");
  const [currentQty, setCurrentQty] = React.useState<string>("");
  const [countedQty, setCountedQty] = React.useState<string>("");
  const [reasonId, setReasonId] = React.useState<string>("");
  const [comments, setComments] = React.useState<string>("");

  // File upload
  const [
    { files, isDragging },
    { removeFile, openFileDialog, getInputProps, clearFiles },
  ] = useFileUpload({
    maxFiles: 5,
    maxSize: 5 * 1024 * 1024, // 5MB
    accept: "image/*",
    multiple: true,
  });

  // Fetch storage zones for this branch (only rack-type zones)
  const { data: zones, isLoading: isLoadingZones } = useQuery({
    ...convexQuery(
      api.storageZones.getRackByBranch,
      open && currentBranch?._id
        ? { branchId: currentBranch._id as Id<"branches"> }
        : "skip",
    ),
    enabled: open && !!currentBranch?._id,
  });

  // Fetch adjustment lookups (reasons, statuses, types)
  const { data: lookups, isLoading: isLoadingLookups } = useQuery({
    ...convexQuery(api.cycleCount.getAdjustmentLookups, open ? {} : "skip"),
    enabled: open,
  });

  // Create adjustment request mutation - extract hook to top level
  const createAdjustmentFn = useConvexMutation(
    api.cycleCount.createNewAdjustmentRequest,
  );
  const createAdjustmentMutation = useMutation({
    mutationFn: createAdjustmentFn,
  });

  // Cleanup file previews on unmount to prevent memory leaks
  React.useEffect(() => {
    return () => {
      clearFiles();
    };
  }, [clearFiles]);

  // Debug logging
  React.useEffect(() => {
    if (open) {
      console.log("Quantity Adjustment Dialog - Data Status:", {
        zones: zones?.length ?? 0,
        isLoadingZones,
        adjustmentReasons: lookups?.adjustmentReasons?.length ?? 0,
        isLoadingLookups,
        quantityTypeId: !!lookups?.quantityTypeId,
        defaultStatusId: !!lookups?.defaultStatusId,
        organizationId: !!organizationId,
        currentBranch: !!currentBranch?._id,
        user: !!user?._id,
      });
    }
  }, [
    open,
    zones,
    isLoadingZones,
    lookups,
    isLoadingLookups,
    organizationId,
    currentBranch?._id,
    user?._id,
  ]);

  // Initialize form when dialog opens with initial data
  React.useEffect(() => {
    if (open && initialData) {
      setZoneId(initialData.zoneId ?? "");
      setProductName(initialData.productName ?? "");
      setBatchId(initialData.batchId ?? "");
      setSkuId(initialData.skuId ?? "");
      setCurrentQty(initialData.currentQty?.toString() ?? "");
      setCountedQty(initialData.countedQty?.toString() ?? "");
    }
  }, [open, initialData]);

  const handleClose = React.useCallback(() => {
    // Reset form state
    setZoneId("");
    setProductName("");
    setBatchId("");
    setSkuId("");
    setCurrentQty("");
    setCountedQty("");
    setReasonId("");
    setComments("");
    // Clear files to revoke object URLs and prevent memory leaks
    clearFiles();
    onOpenChange?.(false);
  }, [onOpenChange, clearFiles]);

  const handleSubmit = async () => {
    if (
      !organizationId ||
      !currentBranch?._id ||
      !user?._id ||
      !lookups?.quantityTypeId ||
      !lookups?.defaultStatusId
    ) {
      console.error("Missing required data for adjustment request", {
        organizationId: !!organizationId,
        branchId: !!currentBranch?._id,
        userId: !!user?._id,
        quantityTypeId: !!lookups?.quantityTypeId,
        defaultStatusId: !!lookups?.defaultStatusId,
      });
      toast.error(
        "Missing required information. Please ensure you're logged in and try again.",
      );
      return;
    }

    const expectedQty = Number.parseInt(currentQty, 10) || 0;
    const actualQty = Number.parseInt(countedQty, 10) || 0;
    const varianceQty = actualQty - expectedQty;

    try {
      await createAdjustmentMutation.mutateAsync({
        organizationId: organizationId as string,
        branchId: currentBranch._id as string,
        requestCode: generateRequestCode(),
        adjustmentTypeId: lookups.quantityTypeId as string,
        requestedByUserId: user._id as string,
        adjustmentStatusTypeId: lookups.defaultStatusId as string,
        details: [
          {
            batchId: batchId || "unknown",
            skuId: skuId || productName || "unknown",
            expectedQuantity: expectedQty,
            actualQuantity: actualQty,
            varianceQuantity: varianceQty,
            costImpact: 0,
            reasonTypeId: reasonId,
            customReasonNotes: comments || undefined,
          },
        ],
      });

      toast.success("Quantity adjustment request created successfully");
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error("Failed to create adjustment request:", error);
      toast.error("Failed to create adjustment request. Please try again.");
    }
  };

  // Get current zone name for display
  const currentZoneName = React.useMemo(() => {
    if (initialData?.zoneName) return initialData.zoneName;
    return zones?.find((z) => z._id === zoneId)?.name ?? "Unknown Zone";
  }, [zones, zoneId, initialData?.zoneName]);

  // Check if opened from cycle count (pre-filled data)
  const isFromCycleCount = !!initialData?.zoneId;

  const isFormValid =
    zoneId !== "" &&
    (productName !== "" || skuId !== "") &&
    currentQty !== "" &&
    countedQty !== "" &&
    reasonId !== "" &&
    !isLoadingLookups &&
    !isLoadingZones &&
    !!lookups?.quantityTypeId &&
    !!lookups?.defaultStatusId;

  const isSubmitting = createAdjustmentMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogHeader className="relative shrink-0 px-6 pt-6">
          <DialogTitle>Create Quantity Adjustment</DialogTitle>
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-0 right-0 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {/* Location Info (read-only when from cycle count) */}
          {isFromCycleCount ? (
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Zone</FieldLabel>
                <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                  {currentZoneName}
                </div>
              </Field>
              <Field>
                <FieldLabel>Product</FieldLabel>
                <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                  {productName || skuId || "N/A"}
                </div>
              </Field>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Zone</FieldLabel>
                <Select value={zoneId} onValueChange={setZoneId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select zone..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingZones ? (
                      <SelectItem value="_loading" disabled>
                        Loading...
                      </SelectItem>
                    ) : (
                      zones?.map((zone) => (
                        <SelectItem key={zone._id} value={zone._id}>
                          {zone.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Product/SKU</FieldLabel>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Enter product name..."
                />
              </Field>
            </div>
          )}

          {/* Current Qty, Counted Qty, Variance Row */}
          <div className="grid grid-cols-3 gap-4">
            <Field>
              <FieldLabel>Expected Qty</FieldLabel>
              <Input
                type="number"
                value={currentQty}
                onChange={(e) => setCurrentQty(e.target.value)}
                placeholder="0"
                readOnly={isFromCycleCount}
                className={cn(isFromCycleCount && "bg-muted/50")}
              />
            </Field>

            <Field>
              <FieldLabel>Counted Qty</FieldLabel>
              <Input
                type="number"
                value={countedQty}
                onChange={(e) => setCountedQty(e.target.value)}
                placeholder="0"
                readOnly={isFromCycleCount}
                className={cn(isFromCycleCount && "bg-muted/50")}
              />
            </Field>

            <Field>
              <FieldLabel>Variance</FieldLabel>
              <div
                className={cn(
                  "flex h-9 items-center rounded-md border bg-muted/50 px-3 font-medium text-sm",
                  Number(countedQty) - Number(currentQty) > 0 &&
                    "text-amber-600",
                  Number(countedQty) - Number(currentQty) < 0 && "text-red-600",
                  Number(countedQty) - Number(currentQty) === 0 &&
                    "text-green-600",
                )}
              >
                {currentQty && countedQty
                  ? Number(countedQty) - Number(currentQty) > 0
                    ? `+${Number(countedQty) - Number(currentQty)}`
                    : Number(countedQty) - Number(currentQty)
                  : "—"}
              </div>
            </Field>
          </div>

          {/* Reason */}
          <Field>
            <FieldLabel>Reason</FieldLabel>
            <Select value={reasonId} onValueChange={setReasonId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {isLoadingLookups ? (
                  <SelectItem value="_loading" disabled>
                    Loading...
                  </SelectItem>
                ) : (
                  lookups?.adjustmentReasons.map((reason) => (
                    <SelectItem key={reason._id} value={reason._id}>
                      {reason.lookupValue}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </Field>

          {/* Comments */}
          <Field>
            <FieldLabel>Comments (Optional)</FieldLabel>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add any additional notes..."
              className="min-h-16 resize-none"
            />
          </Field>

          {/* Images (Optional) */}
          <Field>
            <FieldLabel>Images (Optional)</FieldLabel>
            <div
              onClick={openFileDialog}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  openFileDialog();
                }
              }}
              className={cn(
                "flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-4 transition-colors hover:bg-accent/50",
                isDragging && "border-primary bg-primary/5",
              )}
            >
              <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
              <span className="text-muted-foreground text-sm">
                Click to upload
              </span>
              <input {...getInputProps()} className="sr-only" />
            </div>

            {/* Image Previews */}
            {files.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {files.map((fileWithPreview) => (
                  <div
                    key={fileWithPreview.id}
                    className="group relative h-16 w-16 overflow-hidden rounded-md border"
                  >
                    {/* Use native img for blob URLs - next/image doesn't optimize them anyway */}
                    <Image
                      src={fileWithPreview.preview ?? ""}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(fileWithPreview.id);
                      }}
                      className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Field>
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
