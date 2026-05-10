"use client";

import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { toast } from "sonner";
import { springTransition } from "@/components/easing";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useBranches } from "@/hooks/use-branches";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";

interface LocationTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // When opened from cycle count, source zone is pre-filled
  initialData?: {
    zoneId?: string;
    zoneName?: string;
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

export function LocationTransferDialog({
  open,
  onOpenChange,
  initialData,
  onSuccess,
}: LocationTransferDialogProps) {
  const { user, organizationId } = useCurrentUser();
  const { currentBranch } = useBranches({ organizationId });

  // Track if opened from cycle count (source is pre-determined)
  const isFromCycleCount = !!initialData?.zoneId;

  // For cycle count flow: Step 1 = destination, Step 2 = items
  // For standalone flow: Step 1 = source, Step 2 = destination, Step 3 = items
  const totalSteps = isFromCycleCount ? 2 : 3;
  const [step, setStep] = React.useState(1);

  // Source Location
  const [fromZone, setFromZone] = React.useState<string>("");
  const [fromZoneName, setFromZoneName] = React.useState<string>("");

  // Destination Location
  const [toZone, setToZone] = React.useState<string>("");

  // Item Selection
  const [selectedBatches, setSelectedBatches] = React.useState<string[]>([]);

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

  // Fetch inventory batches from source zone
  const { data: batches, isLoading: isLoadingBatches } = useQuery({
    ...convexQuery(
      api.cycleCount.getInventoryBatchesByZone,
      open && fromZone && currentBranch?._id
        ? {
            zoneId: fromZone as Id<"storage_zones">,
            branchId: currentBranch._id as Id<"branches">,
          }
        : "skip",
    ),
    enabled: open && !!fromZone && !!currentBranch?._id,
  });

  // Fetch adjustment lookups
  const { data: lookups } = useQuery({
    ...convexQuery(api.cycleCount.getAdjustmentLookups, open ? {} : "skip"),
    enabled: open,
  });

  // Debug logging for zones
  React.useEffect(() => {
    if (open) {
      console.log("Location Transfer Dialog - Data Status:", {
        zones: zones?.length ?? 0,
        isLoadingZones,
        fromZone,
        currentBranch: !!currentBranch?._id,
        organizationId: !!organizationId,
      });
    }
  }, [
    open,
    zones,
    isLoadingZones,
    fromZone,
    currentBranch?._id,
    organizationId,
  ]);

  // Create adjustment request mutation - extract hook to top level
  const createAdjustmentFn = useConvexMutation(
    api.cycleCount.createNewAdjustmentRequest,
  );
  const createAdjustmentMutation = useMutation({
    mutationFn: createAdjustmentFn,
  });

  // Initialize form when dialog opens
  React.useEffect(() => {
    if (open && initialData?.zoneId) {
      setFromZone(initialData.zoneId);
      setFromZoneName(initialData.zoneName ?? "");
    }
  }, [open, initialData]);

  const handleClose = React.useCallback(() => {
    setStep(1);
    setFromZone("");
    setFromZoneName("");
    setToZone("");
    setSelectedBatches([]);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleNext = () => {
    if (step < totalSteps) {
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  const handleBatchToggle = (batchId: string) => {
    setSelectedBatches((prev) =>
      prev.includes(batchId)
        ? prev.filter((id) => id !== batchId)
        : [...prev, batchId],
    );
  };

  const handleSubmit = async () => {
    if (
      !organizationId ||
      !currentBranch?._id ||
      !user?._id ||
      !lookups?.locationTypeId ||
      !lookups?.defaultStatusId
    ) {
      console.error("Missing required data for location transfer", {
        organizationId: !!organizationId,
        branchId: !!currentBranch?._id,
        userId: !!user?._id,
        locationTypeId: !!lookups?.locationTypeId,
        defaultStatusId: !!lookups?.defaultStatusId,
      });
      toast.error(
        "Missing required information. Please ensure you're logged in and try again.",
      );
      return;
    }

    // Build detail records for each selected batch
    const selectedBatchData = batches?.filter((b) =>
      selectedBatches.includes(b._id),
    );

    if (!selectedBatchData || selectedBatchData.length === 0) {
      console.error("No items selected for transfer");
      toast.error("Please select at least one item to transfer.");
      return;
    }

    // Find "Location Transfer" as the reason
    const locationTransferReason = lookups.adjustmentReasons.find(
      (r) => r.lookupCode === "LOCATION_TRANSFER",
    );

    try {
      await createAdjustmentMutation.mutateAsync({
        organizationId: organizationId as string,
        branchId: currentBranch._id as string,
        requestCode: generateRequestCode(),
        adjustmentTypeId: lookups.locationTypeId as string,
        requestedByUserId: user._id as string,
        adjustmentStatusTypeId: lookups.defaultStatusId as string,
        details: selectedBatchData.map((batch) => ({
          batchId: batch._id,
          skuId: batch.productCode,
          fromZoneId: fromZone,
          toZoneId: toZone,
          quantity: batch.currentQuantity,
          // For location transfers, qty fields are 0 (no variance)
          expectedQuantity: 0,
          actualQuantity: 0,
          varianceQuantity: 0,
          costImpact: 0,
          reasonTypeId:
            locationTransferReason?._id ??
            lookups.adjustmentReasons[0]?._id ??
            "",
        })),
      });

      toast.success("Location transfer request created successfully");
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error("Failed to create location transfer:", error);
      toast.error("Failed to create location transfer. Please try again.");
    }
  };

  // Get zone name helper
  const getZoneName = React.useCallback(
    (zoneId: string) => {
      if (zoneId === fromZone && fromZoneName) return fromZoneName;
      return zones?.find((z) => z._id === zoneId)?.name ?? "Unknown Zone";
    },
    [zones, fromZone, fromZoneName],
  );

  // Calculate totals
  const getTotalQuantity = React.useCallback(() => {
    if (!batches) return 0;
    return batches
      .filter((b) => selectedBatches.includes(b._id))
      .reduce((sum, b) => sum + b.currentQuantity, 0);
  }, [batches, selectedBatches]);

  // Can proceed validation
  const canProceedStep1 = isFromCycleCount ? !!toZone : !!fromZone;
  const canProceedStep2 = isFromCycleCount
    ? selectedBatches.length > 0
    : !!toZone;
  const canSubmit = isFromCycleCount
    ? selectedBatches.length > 0
    : selectedBatches.length > 0;

  const isSubmitting = createAdjustmentMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>Transfer Items to New Location</DialogTitle>
        </DialogHeader>

        <Separator className="mt-4" />

        <div className="min-h-0 flex-1 overflow-y-auto px-6">
          <AnimatePresence mode="popLayout">
            {/* Simplified flow when from cycle count - Step 1: Select Destination */}
            {isFromCycleCount && step === 1 && (
              <motion.div
                key="cc-step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={springTransition}
                className="space-y-6 py-4"
              >
                <h3 className="font-medium text-sm">
                  Step 1: Select Destination
                </h3>

                {/* Source Zone (read-only) */}
                <div className="space-y-2">
                  <Label className="font-medium text-muted-foreground text-xs uppercase">
                    FROM (Source)
                  </Label>
                  <div className="rounded-md bg-muted px-3 py-2 text-sm">
                    {getZoneName(fromZone)}
                  </div>
                </div>

                {/* Destination Zone */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">
                    To Zone
                  </Label>
                  <Select value={toZone} onValueChange={setToZone}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingZones ? (
                        <SelectItem value="_loading" disabled>
                          Loading...
                        </SelectItem>
                      ) : zones && zones.length > 0 ? (
                        zones
                          .filter((z) => z._id !== fromZone)
                          .map((zone) => (
                            <SelectItem key={zone._id} value={zone._id}>
                              {zone.name}
                            </SelectItem>
                          ))
                      ) : (
                        <SelectItem value="_empty" disabled>
                          No zones available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}

            {/* Simplified flow when from cycle count - Step 2: Select Items */}
            {isFromCycleCount && step === 2 && (
              <motion.div
                key="cc-step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={springTransition}
                className="space-y-4 py-4"
              >
                <h3 className="font-medium text-sm">
                  Step 2: Select Items to Transfer
                </h3>

                {/* From/To Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-md border bg-muted/50 p-3">
                    <span className="font-medium text-muted-foreground text-xs uppercase">
                      FROM
                    </span>
                    <p className="mt-1 font-medium text-primary text-sm">
                      {getZoneName(fromZone)}
                    </p>
                  </div>
                  <div className="rounded-md border bg-primary/5 p-3">
                    <span className="font-medium text-muted-foreground text-xs uppercase">
                      TO
                    </span>
                    <p className="mt-1 font-medium text-primary text-sm">
                      {getZoneName(toZone)}
                    </p>
                  </div>
                </div>

                {/* Available Items */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">
                    Available Items in {getZoneName(fromZone)}
                  </Label>
                  <div className="max-h-60 space-y-2 overflow-y-auto">
                    {isLoadingBatches ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : batches && batches.length > 0 ? (
                      batches.map((batch) => {
                        const isSelected = selectedBatches.includes(batch._id);
                        return (
                          <div
                            key={batch._id}
                            className={cn(
                              "cursor-pointer rounded-lg border p-3 transition-colors",
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "hover:border-muted-foreground/30",
                            )}
                            onClick={() => handleBatchToggle(batch._id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleBatchToggle(batch._id);
                              }
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() =>
                                  handleBatchToggle(batch._id)
                                }
                                className="mt-0.5"
                              />
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">
                                    {batch.productName}
                                  </span>
                                </div>
                                <p className="text-muted-foreground text-xs">
                                  {batch.productCode} • {batch.batchCode}
                                </p>
                                <div className="flex gap-4 text-muted-foreground text-xs">
                                  <span>
                                    <span className="font-medium text-foreground">
                                      Quantity
                                    </span>{" "}
                                    {batch.currentQuantity} units
                                  </span>
                                  {batch.expiresAt && (
                                    <span>
                                      <span className="font-medium text-foreground">
                                        Expires
                                      </span>{" "}
                                      {new Date(
                                        batch.expiresAt,
                                      ).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="py-4 text-center text-muted-foreground text-sm">
                        No items available in this zone
                      </p>
                    )}
                  </div>
                </div>

                {/* Selection Summary */}
                <div className="rounded-md bg-muted px-3 py-2">
                  <p className="font-medium text-primary text-sm">
                    {selectedBatches.length} item(s) selected
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Total quantity: {getTotalQuantity()} units
                  </p>
                </div>
              </motion.div>
            )}

            {/* Standard flow (when not from cycle count) - Step 1: Select Source */}
            {!isFromCycleCount && step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={springTransition}
                className="space-y-6 py-4"
              >
                <h3 className="font-medium text-sm">
                  Step 1: Select Source Location
                </h3>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">
                    From Zone
                  </Label>
                  <Select value={fromZone} onValueChange={setFromZone}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingZones ? (
                        <SelectItem value="_loading" disabled>
                          Loading...
                        </SelectItem>
                      ) : zones && zones.length > 0 ? (
                        zones.map((zone) => (
                          <SelectItem key={zone._id} value={zone._id}>
                            {zone.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="_empty" disabled>
                          No zones available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}

            {/* Standard flow - Step 2: Select Destination */}
            {!isFromCycleCount && step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={springTransition}
                className="space-y-6 py-4"
              >
                <h3 className="font-medium text-sm">
                  Step 2: Select Destination Location
                </h3>

                {/* From Location Display */}
                <div className="space-y-2">
                  <Label className="font-medium text-muted-foreground text-xs uppercase">
                    FROM
                  </Label>
                  <div className="rounded-md bg-muted px-3 py-2 text-sm">
                    {getZoneName(fromZone)}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">
                    To Zone
                  </Label>
                  <Select value={toZone} onValueChange={setToZone}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingZones ? (
                        <SelectItem value="_loading" disabled>
                          Loading...
                        </SelectItem>
                      ) : zones && zones.length > 0 ? (
                        zones
                          .filter((z) => z._id !== fromZone)
                          .map((zone) => (
                            <SelectItem key={zone._id} value={zone._id}>
                              {zone.name}
                            </SelectItem>
                          ))
                      ) : (
                        <SelectItem value="_empty" disabled>
                          No zones available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}

            {/* Standard flow - Step 3: Select Items */}
            {!isFromCycleCount && step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={springTransition}
                className="space-y-4 py-4"
              >
                <h3 className="font-medium text-sm">
                  Step 3: Select Items to Transfer
                </h3>

                {/* From/To Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-md border bg-muted/50 p-3">
                    <span className="font-medium text-muted-foreground text-xs uppercase">
                      FROM
                    </span>
                    <p className="mt-1 font-medium text-primary text-sm">
                      {getZoneName(fromZone)}
                    </p>
                  </div>
                  <div className="rounded-md border bg-primary/5 p-3">
                    <span className="font-medium text-muted-foreground text-xs uppercase">
                      TO
                    </span>
                    <p className="mt-1 font-medium text-primary text-sm">
                      {getZoneName(toZone)}
                    </p>
                  </div>
                </div>

                {/* Available Items */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">
                    Available Items in {getZoneName(fromZone)}
                  </Label>
                  <div className="max-h-60 space-y-2 overflow-y-auto">
                    {isLoadingBatches ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : batches && batches.length > 0 ? (
                      batches.map((batch) => {
                        const isSelected = selectedBatches.includes(batch._id);
                        return (
                          <div
                            key={batch._id}
                            className={cn(
                              "cursor-pointer rounded-lg border p-3 transition-colors",
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "hover:border-muted-foreground/30",
                            )}
                            onClick={() => handleBatchToggle(batch._id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleBatchToggle(batch._id);
                              }
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() =>
                                  handleBatchToggle(batch._id)
                                }
                                className="mt-0.5"
                              />
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">
                                    {batch.productName}
                                  </span>
                                </div>
                                <p className="text-muted-foreground text-xs">
                                  {batch.productCode} • {batch.batchCode}
                                </p>
                                <div className="flex gap-4 text-muted-foreground text-xs">
                                  <span>
                                    <span className="font-medium text-foreground">
                                      Quantity
                                    </span>{" "}
                                    {batch.currentQuantity} units
                                  </span>
                                  {batch.expiresAt && (
                                    <span>
                                      <span className="font-medium text-foreground">
                                        Expires
                                      </span>{" "}
                                      {new Date(
                                        batch.expiresAt,
                                      ).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="py-4 text-center text-muted-foreground text-sm">
                        No items available in this zone
                      </p>
                    )}
                  </div>
                </div>

                {/* Selection Summary */}
                <div className="rounded-md bg-muted px-3 py-2">
                  <p className="font-medium text-primary text-sm">
                    {selectedBatches.length} item(s) selected
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Total quantity: {getTotalQuantity()} units
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="shrink-0 flex-row gap-2 border-t px-6 py-4 sm:justify-between">
          {step === 1 ? (
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1"
              disabled={isSubmitting}
            >
              Back
            </Button>
          )}

          {step < totalSteps ? (
            <Button
              onClick={handleNext}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
              className="flex-1"
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Submit Transfer
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
