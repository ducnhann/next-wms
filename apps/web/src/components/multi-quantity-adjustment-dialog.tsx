"use client";

import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Loader2,
  Minus,
  Package,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { toast } from "sonner";
import { springTransition } from "@/components/easing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useBranches } from "@/hooks/use-branches";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";

interface MultiQuantityAdjustmentDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

// Type for zone with items
// type ZoneWithItems = {
//   _id: string;
//   name: string;
// };

// Type for inventory batch/item
type InventoryItem = {
  _id: string;
  batchCode: string;
  productId: string;
  productName: string;
  productCode: string;
  currentQuantity: number;
  expiresAt?: number;
  zoneId: string;
};

// Type for adjustment line item
type AdjustmentLineItem = {
  id: string;
  zoneId: string;
  zoneName: string;
  batchId: string;
  productName: string;
  productCode: string;
  expectedQuantity: number;
  countedQuantity: number;
};

// Generate adjustment request code like ADJ-2026-001
function generateRequestCode(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `ADJ-${year}-${random}`;
}

// Steps for the wizard
const STEPS = {
  SELECT_ZONES: 1,
  SELECT_ITEMS: 2,
  ENTER_QUANTITIES: 3,
  REVIEW: 4,
} as const;

export function MultiQuantityAdjustmentDialog({
  open,
  onOpenChange,
  onSuccess,
}: MultiQuantityAdjustmentDialogProps) {
  const { user, organizationId } = useCurrentUser();
  const { currentBranch } = useBranches({ organizationId });

  // Step management
  const [step, setStep] = React.useState<number>(STEPS.SELECT_ZONES);

  // Step 1: Zone selection
  const [selectedZoneIds, setSelectedZoneIds] = React.useState<string[]>([]);

  // Step 2: Item selection (per zone) - store full item data
  const [currentZoneIndex, setCurrentZoneIndex] = React.useState(0);
  const [selectedItemsByZone, setSelectedItemsByZone] = React.useState<
    Map<string, string[]>
  >(new Map());
  // Cache item data for all selected items across zones
  const [itemDataCache, setItemDataCache] = React.useState<
    Map<string, InventoryItem>
  >(new Map());

  // Step 3: Adjustment line items with quantities
  const [adjustmentItems, setAdjustmentItems] = React.useState<
    AdjustmentLineItem[]
  >([]);

  // Step 4: Reason and comments
  const [reasonId, setReasonId] = React.useState<string>("");
  const [comments, setComments] = React.useState<string>("");

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

  // Fetch inventory batches for current zone (only when selecting items)
  const currentZoneId = selectedZoneIds[currentZoneIndex];
  const { data: currentZoneItems, isLoading: isLoadingItems } = useQuery({
    ...convexQuery(
      api.cycleCount.getInventoryBatchesByZone,
      open && currentZoneId && currentBranch?._id && step === STEPS.SELECT_ITEMS
        ? {
            zoneId: currentZoneId as Id<"storage_zones">,
            branchId: currentBranch._id as Id<"branches">,
          }
        : "skip",
    ),
    enabled:
      open &&
      !!currentZoneId &&
      !!currentBranch?._id &&
      step === STEPS.SELECT_ITEMS,
  });

  // Fetch adjustment lookups
  const { data: lookups, isLoading: isLoadingLookups } = useQuery({
    ...convexQuery(api.cycleCount.getAdjustmentLookups, open ? {} : "skip"),
    enabled: open,
  });

  // Create adjustment request mutation
  const createAdjustmentFn = useConvexMutation(
    api.cycleCount.createNewAdjustmentRequest,
  );
  const createAdjustmentMutation = useMutation({
    mutationFn: createAdjustmentFn,
  });

  // Reset state when dialog closes
  const resetState = React.useCallback(() => {
    setStep(STEPS.SELECT_ZONES);
    setSelectedZoneIds([]);
    setCurrentZoneIndex(0);
    setSelectedItemsByZone(new Map());
    setItemDataCache(new Map());
    setAdjustmentItems([]);
    setReasonId("");
    setComments("");
  }, []);

  const handleClose = React.useCallback(() => {
    resetState();
    onOpenChange?.(false);
  }, [onOpenChange, resetState]);

  // Zone selection handlers
  const handleZoneToggle = React.useCallback((zoneId: string) => {
    setSelectedZoneIds((prev) =>
      prev.includes(zoneId)
        ? prev.filter((id) => id !== zoneId)
        : [...prev, zoneId],
    );
  }, []);

  // Item selection handlers
  const handleItemToggle = React.useCallback(
    (itemId: string) => {
      if (!currentZoneId || !currentZoneItems) return;

      // Update selected items
      setSelectedItemsByZone((prev) => {
        const newMap = new Map(prev);
        const currentItems = newMap.get(currentZoneId) ?? [];
        const updatedItems = currentItems.includes(itemId)
          ? currentItems.filter((id) => id !== itemId)
          : [...currentItems, itemId];
        newMap.set(currentZoneId, updatedItems);
        return newMap;
      });

      // Cache item data when selecting
      const item = currentZoneItems.find((i) => i._id === itemId);
      if (item) {
        setItemDataCache((prev) => {
          const newCache = new Map(prev);
          newCache.set(itemId, item);
          return newCache;
        });
      }
    },
    [currentZoneId, currentZoneItems],
  );

  const handleSelectAllItems = React.useCallback(() => {
    if (!currentZoneId || !currentZoneItems) return;
    setSelectedItemsByZone((prev) => {
      const newMap = new Map(prev);
      newMap.set(
        currentZoneId,
        currentZoneItems.map((item) => item._id),
      );
      return newMap;
    });
    // Cache all items data
    setItemDataCache((prev) => {
      const newCache = new Map(prev);
      currentZoneItems.forEach((item) => {
        newCache.set(item._id, item);
      });
      return newCache;
    });
  }, [currentZoneId, currentZoneItems]);

  const handleDeselectAllItems = React.useCallback(() => {
    if (!currentZoneId) return;
    setSelectedItemsByZone((prev) => {
      const newMap = new Map(prev);
      newMap.set(currentZoneId, []);
      return newMap;
    });
  }, [currentZoneId]);

  // Build adjustment items from selections using cached data
  const buildAdjustmentItems = React.useCallback(() => {
    const items: AdjustmentLineItem[] = [];
    selectedZoneIds.forEach((zoneId) => {
      const zone = zones?.find((z) => z._id === zoneId);
      const selectedItemIds = selectedItemsByZone.get(zoneId) ?? [];

      selectedItemIds.forEach((itemId) => {
        // Use cached item data
        const item = itemDataCache.get(itemId);

        if (item) {
          items.push({
            id: `${zoneId}-${itemId}`,
            zoneId,
            zoneName: zone?.name ?? "Unknown Zone",
            batchId: itemId,
            productName: item.productName,
            productCode: item.productCode,
            expectedQuantity: item.currentQuantity,
            countedQuantity: item.currentQuantity,
          });
        }
      });
    });
    return items;
  }, [selectedZoneIds, selectedItemsByZone, zones, itemDataCache]);

  // Navigation handlers
  const handleNextFromZones = React.useCallback(() => {
    if (selectedZoneIds.length === 0) {
      toast.error("Please select at least one zone");
      return;
    }
    setCurrentZoneIndex(0);
    setStep(STEPS.SELECT_ITEMS);
  }, [selectedZoneIds]);

  // Check if current zone has no items (allow skipping)
  const currentZoneHasNoItems =
    !isLoadingItems && currentZoneItems && currentZoneItems.length === 0;

  const handleNextZone = React.useCallback(() => {
    const currentSelectedItems = selectedItemsByZone.get(currentZoneId) ?? [];

    // Allow skipping if zone has no items, otherwise require selection
    if (currentSelectedItems.length === 0 && !currentZoneHasNoItems) {
      toast.error("Please select at least one item from this zone");
      return;
    }

    if (currentZoneIndex < selectedZoneIds.length - 1) {
      // Move to next zone
      setCurrentZoneIndex((prev) => prev + 1);
    } else {
      // All zones done, check if any items were selected across all zones
      const totalItems = Array.from(selectedItemsByZone.values()).reduce(
        (sum, items) => sum + items.length,
        0,
      );

      if (totalItems === 0) {
        toast.error("Please select at least one item from any zone");
        return;
      }

      // Proceed to quantities
      setStep(STEPS.ENTER_QUANTITIES);
      // Build initial adjustment items
      const items = buildAdjustmentItems();
      setAdjustmentItems(items);
    }
  }, [
    currentZoneId,
    currentZoneIndex,
    selectedZoneIds.length,
    selectedItemsByZone,
    buildAdjustmentItems,
    currentZoneHasNoItems,
  ]);

  const handlePreviousZone = React.useCallback(() => {
    if (currentZoneIndex > 0) {
      setCurrentZoneIndex((prev) => prev - 1);
    } else {
      setStep(STEPS.SELECT_ZONES);
    }
  }, [currentZoneIndex]);

  // Quantity update handler
  const handleQuantityChange = React.useCallback(
    (itemId: string, countedQuantity: number) => {
      setAdjustmentItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, countedQuantity: Math.max(0, countedQuantity) }
            : item,
        ),
      );
    },
    [],
  );

  // Remove item from adjustment
  const handleRemoveItem = React.useCallback((itemId: string) => {
    setAdjustmentItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  // Submit handler
  const handleSubmit = React.useCallback(async () => {
    if (
      !organizationId ||
      !currentBranch?._id ||
      !user?._id ||
      !lookups?.quantityTypeId ||
      !lookups?.defaultStatusId
    ) {
      toast.error("Missing required information. Please try again.");
      return;
    }

    if (!reasonId) {
      toast.error("Please select a reason for the adjustment");
      return;
    }

    // Filter items that have actual variance
    const itemsWithVariance = adjustmentItems.filter(
      (item) => item.countedQuantity !== item.expectedQuantity,
    );

    if (itemsWithVariance.length === 0) {
      toast.error(
        "No items have quantity changes. Please update at least one item's counted quantity.",
      );
      return;
    }

    try {
      await createAdjustmentMutation.mutateAsync({
        organizationId: organizationId as string,
        branchId: currentBranch._id as string,
        requestCode: generateRequestCode(),
        adjustmentTypeId: lookups.quantityTypeId as string,
        requestedByUserId: user._id as string,
        adjustmentStatusTypeId: lookups.defaultStatusId as string,
        details: itemsWithVariance.map((item) => ({
          batchId: item.batchId,
          skuId: item.productCode || item.productName,
          expectedQuantity: item.expectedQuantity,
          actualQuantity: item.countedQuantity,
          varianceQuantity: item.countedQuantity - item.expectedQuantity,
          costImpact: 0,
          reasonTypeId: reasonId,
          customReasonNotes: comments || undefined,
        })),
      });

      toast.success(
        `Quantity adjustment request created for ${itemsWithVariance.length} item(s)`,
      );
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error("Failed to create adjustment request:", error);
      toast.error("Failed to create adjustment request. Please try again.");
    }
  }, [
    organizationId,
    currentBranch?._id,
    user?._id,
    lookups,
    reasonId,
    comments,
    adjustmentItems,
    createAdjustmentMutation,
    onSuccess,
    handleClose,
  ]);

  // Get helper data
  // const selectedZones = React.useMemo(
  //   () => zones?.filter((z) => selectedZoneIds.includes(z._id)) ?? [],
  //   [zones, selectedZoneIds],
  // );

  const currentZone = zones?.find((z) => z._id === currentZoneId);
  const currentSelectedItems = selectedItemsByZone.get(currentZoneId) ?? [];

  // const totalSelectedItems = React.useMemo(() => {
  //   let count = 0;
  //   selectedItemsByZone.forEach((items) => {
  //     count += items.length;
  //   });
  //   return count;
  // }, [selectedItemsByZone]);

  const itemsWithVariance = adjustmentItems.filter(
    (item) => item.countedQuantity !== item.expectedQuantity,
  );

  const isSubmitting = createAdjustmentMutation.isPending;

  // Step title
  const getStepTitle = () => {
    switch (step) {
      case STEPS.SELECT_ZONES:
        return "Step 1: Select Zones";
      case STEPS.SELECT_ITEMS:
        return `Step 2: Select Items (Zone ${currentZoneIndex + 1}/${selectedZoneIds.length})`;
      case STEPS.ENTER_QUANTITIES:
        return "Step 3: Enter Counted Quantities";
      case STEPS.REVIEW:
        return "Step 4: Review & Submit";
      default:
        return "Create Quantity Adjustment";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <DialogHeader className="relative shrink-0 px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            {step > STEPS.SELECT_ZONES && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  if (step === STEPS.SELECT_ITEMS) handlePreviousZone();
                  else if (step === STEPS.ENTER_QUANTITIES)
                    setStep(STEPS.SELECT_ITEMS);
                  else if (step === STEPS.REVIEW)
                    setStep(STEPS.ENTER_QUANTITIES);
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {getStepTitle()}
          </DialogTitle>
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-0 right-0 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex gap-1 px-6 py-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                s <= step ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>

        <Separator />

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait">
            {/* Step 1: Select Zones */}
            {step === STEPS.SELECT_ZONES && (
              <motion.div
                key="step-zones"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={springTransition}
                className="flex flex-1 flex-col space-y-4"
              >
                <p className="shrink-0 text-muted-foreground text-sm">
                  Select one or more zones to adjust inventory quantities.
                </p>

                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="space-y-2">
                    {isLoadingZones ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : zones && zones.length > 0 ? (
                      zones.map((zone) => {
                        const isSelected = selectedZoneIds.includes(zone._id);
                        return (
                          <div
                            key={zone._id}
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors",
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "hover:border-muted-foreground/30",
                            )}
                            onClick={() => handleZoneToggle(zone._id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                handleZoneToggle(zone._id);
                              }
                            }}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleZoneToggle(zone._id)}
                            />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{zone.name}</p>
                            </div>
                            {isSelected && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center text-muted-foreground">
                        No zones available
                      </div>
                    )}
                  </div>
                </div>

                {selectedZoneIds.length > 0 && (
                  <div className="shrink-0 text-muted-foreground text-sm">
                    {selectedZoneIds.length} zone(s) selected
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Select Items per Zone */}
            {step === STEPS.SELECT_ITEMS && (
              <motion.div
                key={`step-items-${currentZoneId}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={springTransition}
                className="flex flex-1 flex-col space-y-4"
              >
                <div className="flex shrink-0 items-center justify-between">
                  <div>
                    <p className="font-medium">{currentZone?.name}</p>
                    <p className="text-muted-foreground text-sm">
                      Select items to adjust from this zone
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllItems}
                      disabled={isLoadingItems}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAllItems}
                      disabled={currentSelectedItems.length === 0}
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="space-y-2">
                    {isLoadingItems ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : currentZoneItems && currentZoneItems.length > 0 ? (
                      currentZoneItems.map((item) => {
                        const isSelected = currentSelectedItems.includes(
                          item._id,
                        );
                        return (
                          <div
                            key={item._id}
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "hover:border-muted-foreground/30",
                            )}
                            onClick={() => handleItemToggle(item._id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                handleItemToggle(item._id);
                              }
                            }}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleItemToggle(item._id)}
                            />
                            <Package className="h-8 w-8 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                {item.productName}
                              </p>
                              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                <span>SKU: {item.productCode}</span>
                                {item.batchCode && (
                                  <>
                                    <span>•</span>
                                    <span>Batch: {item.batchCode}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-sm">
                                {item.currentQuantity}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                qty
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Package className="mb-2 h-10 w-10 text-muted-foreground/50" />
                        <p className="text-muted-foreground">
                          No items in this zone
                        </p>
                        <p className="mt-1 text-muted-foreground/70 text-xs">
                          You can skip this zone and continue
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {currentSelectedItems.length > 0 && (
                  <div className="shrink-0 text-muted-foreground text-sm">
                    {currentSelectedItems.length} item(s) selected from this
                    zone
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3: Enter Quantities */}
            {step === STEPS.ENTER_QUANTITIES && (
              <motion.div
                key="step-quantities"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={springTransition}
                className="flex flex-1 flex-col space-y-4"
              >
                <p className="shrink-0 text-muted-foreground text-sm">
                  Enter the actual counted quantity for each item.
                </p>

                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="space-y-3">
                    {adjustmentItems.map((item) => {
                      const variance =
                        item.countedQuantity - item.expectedQuantity;
                      return (
                        <div
                          key={item.id}
                          className="rounded-lg border bg-card p-3"
                        >
                          <div className="mb-2 flex items-start justify-between">
                            <div>
                              <p className="font-medium text-sm">
                                {item.productName}
                              </p>
                              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                <Badge variant="outline" className="text-xs">
                                  {item.zoneName}
                                </Badge>
                                {item.productCode && (
                                  <span>SKU: {item.productCode}</span>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label className="text-muted-foreground text-xs">
                                Expected
                              </Label>
                              <div className="mt-1 rounded-md border bg-muted/50 px-3 py-2 text-sm">
                                {item.expectedQuantity}
                              </div>
                            </div>
                            <div>
                              <Label className="text-muted-foreground text-xs">
                                Counted
                              </Label>
                              <div className="mt-1 flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="icon-sm"
                                  onClick={() =>
                                    handleQuantityChange(
                                      item.id,
                                      item.countedQuantity - 1,
                                    )
                                  }
                                  disabled={item.countedQuantity <= 0}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  value={item.countedQuantity}
                                  onChange={(e) =>
                                    handleQuantityChange(
                                      item.id,
                                      Number.parseInt(e.target.value, 10) || 0,
                                    )
                                  }
                                  className="h-9 w-16 text-center"
                                />
                                <Button
                                  variant="outline"
                                  size="icon-sm"
                                  onClick={() =>
                                    handleQuantityChange(
                                      item.id,
                                      item.countedQuantity + 1,
                                    )
                                  }
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div>
                              <Label className="text-muted-foreground text-xs">
                                Variance
                              </Label>
                              <div
                                className={cn(
                                  "mt-1 rounded-md border bg-muted/50 px-3 py-2 text-center font-medium text-sm",
                                  variance > 0 && "text-amber-600",
                                  variance < 0 && "text-red-600",
                                  variance === 0 && "text-green-600",
                                )}
                              >
                                {variance > 0 ? `+${variance}` : variance}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="shrink-0 text-muted-foreground text-sm">
                  {itemsWithVariance.length} item(s) with variance
                </div>
              </motion.div>
            )}

            {/* Step 4: Review */}
            {step === STEPS.REVIEW && (
              <motion.div
                key="step-review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={springTransition}
                className="flex flex-1 flex-col"
              >
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
                  {/* Summary */}
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <h4 className="mb-2 font-medium text-sm">Summary</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Total Items
                        </span>
                        <p className="font-medium">{adjustmentItems.length}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Items with Variance
                        </span>
                        <p className="font-medium">
                          {itemsWithVariance.length}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Zones</span>
                        <p className="font-medium">{selectedZoneIds.length}</p>
                      </div>
                    </div>
                  </div>

                  {/* Reason */}
                  <Field>
                    <FieldLabel>Reason *</FieldLabel>
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
                      className="min-h-20 resize-none"
                    />
                  </Field>

                  {/* Items with variance */}
                  {itemsWithVariance.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground text-sm">
                        Items to be adjusted:
                      </Label>
                      <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
                        {itemsWithVariance.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between rounded border bg-card px-3 py-2 text-sm"
                          >
                            <span className="truncate">{item.productName}</span>
                            <span
                              className={cn(
                                "ml-2 font-medium",
                                item.countedQuantity - item.expectedQuantity > 0
                                  ? "text-amber-600"
                                  : "text-red-600",
                              )}
                            >
                              {item.expectedQuantity} → {item.countedQuantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          {step === STEPS.SELECT_ZONES && (
            <Button
              onClick={handleNextFromZones}
              disabled={selectedZoneIds.length === 0}
            >
              Continue
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}

          {step === STEPS.SELECT_ITEMS && (
            <Button
              onClick={handleNextZone}
              disabled={
                isLoadingItems ||
                (currentSelectedItems.length === 0 && !currentZoneHasNoItems)
              }
            >
              {currentZoneHasNoItems
                ? currentZoneIndex < selectedZoneIds.length - 1
                  ? "Skip Zone"
                  : "Continue"
                : currentZoneIndex < selectedZoneIds.length - 1
                  ? "Next Zone"
                  : "Continue"}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}

          {step === STEPS.ENTER_QUANTITIES && (
            <Button
              onClick={() => setStep(STEPS.REVIEW)}
              disabled={itemsWithVariance.length === 0}
            >
              Review
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}

          {step === STEPS.REVIEW && (
            <Button
              onClick={handleSubmit}
              disabled={
                isSubmitting || !reasonId || itemsWithVariance.length === 0
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                `Submit (${itemsWithVariance.length} items)`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
