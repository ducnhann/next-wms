"use client";

import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { ArrowRightLeft, Boxes, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Textarea } from "@/components/ui/textarea";
import { useBranches } from "@/hooks/use-branches";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";

interface CycleCountSessionDetailDialogProps {
  sessionId: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Type for line items from the API
type LineItemFromApi = {
  _id: string;
  skuId: string;
  skuCode: string;
  productName: string;
  zoneId: string | null;
  batchId: string | null;
  expectedQuantity: number;
  actualQuantity: number;
  variance: number;
  scannedAt?: number;
  notes?: string;
};

// Type for selected items with zone info
type SelectedItemWithZone = LineItemFromApi & {
  zoneName: string;
  sourceZoneId: string;
};

export function CycleCountSessionDetailDialog({
  sessionId,
  open,
  onOpenChange,
}: CycleCountSessionDetailDialogProps) {
  const { user, organizationId } = useCurrentUser();
  const { currentBranch } = useBranches({ organizationId });
  const queryClient = useQueryClient();

  // Fetch session details from the backend
  const { data: session, isLoading } = useQuery({
    ...convexQuery(
      api.cycleCount.getSessionDetailForDialog,
      sessionId ? { sessionId } : "skip",
    ),
    enabled: !!sessionId && open,
  });

  // Fetch zones for location transfer - use the same query as LocationTransferDialog
  const { data: zones, isLoading: isLoadingZones } = useQuery({
    ...convexQuery(
      api.cycleCount.getStorageZones,
      open && currentBranch?._id
        ? { branchId: currentBranch._id as Id<"branches"> }
        : "skip",
    ),
    enabled: open && !!currentBranch?._id,
  });

  // Fetch adjustment lookups (reasons, statuses, types) - same as working dialogs
  const { data: lookups, isLoading: isLoadingLookups } = useQuery({
    ...convexQuery(api.cycleCount.getAdjustmentLookups, open ? {} : "skip"),
    enabled: open,
  });

  // Create adjustment request mutation - use the same mutation as working dialogs
  const createAdjustmentFn = useConvexMutation(
    api.cycleCount.createNewAdjustmentRequest,
  );
  const createAdjustmentMutation = useMutation({
    mutationFn: createAdjustmentFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycleCount"] });
      queryClient.invalidateQueries({ queryKey: ["adjustmentRequests"] });
    },
  });

  const [activeZoneIndex, setActiveZoneIndex] = useState(0);
  const [selectedItems, setSelectedItems] = useState<
    Map<string, SelectedItemWithZone>
  >(new Map());
  const [adjustmentTypeDialogOpen, setAdjustmentTypeDialogOpen] =
    useState(false);
  const [quantityAdjustmentDialogOpen, setQuantityAdjustmentDialogOpen] =
    useState(false);
  const [locationTransferDialogOpen, setLocationTransferDialogOpen] =
    useState(false);
  const [selectedDestinationZone, setSelectedDestinationZone] = useState<
    string | null
  >(null);
  const [_adjustmentReason, setAdjustmentReason] = useState("");
  const [reasonId, setReasonId] = useState<string>("");
  const [comments, setComments] = useState<string>("");

  const handleClose = () => {
    setActiveZoneIndex(0);
    setSelectedItems(new Map());
    setAdjustmentTypeDialogOpen(false);
    setQuantityAdjustmentDialogOpen(false);
    setLocationTransferDialogOpen(false);
    setSelectedDestinationZone(null);
    setAdjustmentReason("");
    setReasonId("");
    setComments("");
    onOpenChange?.(false);
  };

  const handleItemToggle = (
    item: LineItemFromApi,
    zoneName: string,
    zoneId: string,
  ) => {
    const key = `${item._id}-${zoneId}`;
    const newSelected = new Map(selectedItems);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.set(key, { ...item, zoneName, sourceZoneId: zoneId });
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAllInZone = (
    lineItems: LineItemFromApi[],
    zoneName: string,
    zoneId: string,
    checked: boolean,
  ) => {
    const newSelected = new Map(selectedItems);
    for (const item of lineItems) {
      const key = `${item._id}-${zoneId}`;
      if (checked) {
        newSelected.set(key, { ...item, zoneName, sourceZoneId: zoneId });
      } else {
        newSelected.delete(key);
      }
    }
    setSelectedItems(newSelected);
  };

  const handleCreateAdjustmentClick = () => {
    if (selectedItems.size === 0) {
      toast.error("Please select at least one item");
      return;
    }
    setAdjustmentTypeDialogOpen(true);
  };

  const handleAdjustmentTypeSelect = (type: "quantity" | "location") => {
    setAdjustmentTypeDialogOpen(false);
    if (type === "quantity") {
      setQuantityAdjustmentDialogOpen(true);
    } else {
      setLocationTransferDialogOpen(true);
    }
  };

  // Generate adjustment request code like ADJ-2026-001
  const generateRequestCode = (): string => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `ADJ-${year}-${random}`;
  };

  const handleQuantityAdjustmentSubmit = async () => {
    if (
      !organizationId ||
      !currentBranch?._id ||
      !user?._id ||
      !lookups?.quantityTypeId ||
      !lookups?.defaultStatusId
    ) {
      console.error("Missing required data for quantity adjustment", {
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

    const items = Array.from(selectedItems.values());

    // Find "Count Discrepancy" as the reason for cycle count adjustments
    const countDiscrepancyReason = lookups.adjustmentReasons.find(
      (r) => r.lookupCode === "COUNT_DISCREPANCY",
    );

    try {
      await createAdjustmentMutation.mutateAsync({
        organizationId: organizationId as string,
        branchId: currentBranch._id as string,
        requestCode: generateRequestCode(),
        adjustmentTypeId: lookups.quantityTypeId as string,
        requestedByUserId: user._id as string,
        adjustmentStatusTypeId: lookups.defaultStatusId as string,
        details: items.map((item) => ({
          batchId: item.batchId || "unknown",
          skuId: item.skuId || item.skuCode || "unknown",
          expectedQuantity: item.expectedQuantity,
          actualQuantity: item.actualQuantity,
          varianceQuantity: item.actualQuantity - item.expectedQuantity,
          costImpact: 0,
          reasonTypeId:
            reasonId ||
            (countDiscrepancyReason?._id ??
              lookups.adjustmentReasons[0]?._id ??
              ""),
          customReasonNotes: comments || "Cycle count variance adjustment",
        })),
      });
      toast.success("Quantity adjustment request created successfully");
      setQuantityAdjustmentDialogOpen(false);
      setSelectedItems(new Map());
      setAdjustmentReason("");
      setReasonId("");
      setComments("");
    } catch (error) {
      toast.error("Failed to create adjustment request");
      console.error(error);
    }
  };

  const handleLocationTransferSubmit = async () => {
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

    if (!selectedDestinationZone) {
      toast.error("Please select a destination zone");
      return;
    }

    const items = Array.from(selectedItems.values());

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
        details: items.map((item) => ({
          batchId: item.batchId || "unknown",
          skuId: item.skuId || item.skuCode || "unknown",
          fromZoneId: item.sourceZoneId,
          toZoneId: selectedDestinationZone,
          quantity: item.expectedQuantity,
          // For location transfers, qty fields are 0 (no variance)
          expectedQuantity: 0,
          actualQuantity: 0,
          varianceQuantity: 0,
          costImpact: 0,
          reasonTypeId:
            reasonId ||
            (locationTransferReason?._id ??
              lookups.adjustmentReasons[0]?._id ??
              ""),
          customReasonNotes: comments || "Cycle count location transfer",
        })),
      });
      toast.success("Location transfer request created successfully");
      setLocationTransferDialogOpen(false);
      setSelectedItems(new Map());
      setSelectedDestinationZone(null);
      setAdjustmentReason("");
      setReasonId("");
      setComments("");
    } catch (error) {
      toast.error("Failed to create transfer request");
      console.error(error);
    }
  };

  const selectedItemsArray = Array.from(selectedItems.values());

  // Show loading state
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="flex h-96 items-center justify-center sm:max-w-3xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Loading Session Details</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              Loading session details...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!session) {
    return null;
  }

  // const activeZone = session.zones[activeZoneIndex];
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(session.createdAt));

  const getVarianceDisplay = (variance: number) => {
    if (variance === 0) {
      return <span className="font-medium text-green-600">0</span>;
    }
    if (variance > 0) {
      return <span className="font-medium text-amber-600">+{variance}</span>;
    }
    return <span className="font-medium text-amber-600">{variance}</span>;
  };

  const isItemSelected = (itemId: string, zoneId: string) => {
    return selectedItems.has(`${itemId}-${zoneId}`);
  };

  const areAllItemsInZoneSelected = (
    lineItems: LineItemFromApi[],
    zoneId: string,
  ) => {
    if (lineItems.length === 0) return false;
    return lineItems.every((item) => isItemSelected(item._id, zoneId));
  };

  return (
    <>
      {/* Adjustment Type Selection Dialog */}
      <Dialog
        open={adjustmentTypeDialogOpen}
        onOpenChange={setAdjustmentTypeDialogOpen}
      >
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader className="relative">
            <DialogTitle>New Adjustment Request</DialogTitle>
            <button
              type="button"
              onClick={() => setAdjustmentTypeDialogOpen(false)}
              className="absolute top-0 right-0 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <p className="text-muted-foreground text-sm">
              Select the type of adjustment you want to make:
            </p>

            {/* Adjustment Type Options */}
            <div className="space-y-3">
              {/* Quantity Adjustment */}
              <button
                type="button"
                onClick={() => handleAdjustmentTypeSelect("quantity")}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent",
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-primary/5">
                  <Boxes className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold">Quantity Adjustment</span>
                  <span className="text-muted-foreground text-sm">
                    Adjust item quantities due to discrepancies, damage, or
                    inventory corrections
                  </span>
                </div>
              </button>

              {/* Location Transfer */}
              <button
                type="button"
                onClick={() => handleAdjustmentTypeSelect("location")}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent",
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-green-500/5">
                  <ArrowRightLeft className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold">Location Transfer</span>
                  <span className="text-muted-foreground text-sm">
                    Move items from one zone/section to another
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Cancel Button */}
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => setAdjustmentTypeDialogOpen(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quantity Adjustment Dialog */}
      <Dialog
        open={quantityAdjustmentDialogOpen}
        onOpenChange={setQuantityAdjustmentDialogOpen}
      >
        <DialogContent showCloseButton={false} className="sm:max-w-2xl">
          <DialogHeader className="relative">
            <DialogTitle>Create Quantity Adjustment</DialogTitle>
            <button
              type="button"
              onClick={() => setQuantityAdjustmentDialogOpen(false)}
              className="absolute top-0 right-0 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </DialogHeader>

          <Separator />

          <div className="mt-2 space-y-4">
            {/* Items Summary */}
            <Field>
              <FieldLabel>Items to Adjust ({selectedItems.size})</FieldLabel>
              <div className="max-h-48 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold text-xs uppercase">
                        SKU
                      </TableHead>
                      <TableHead className="font-semibold text-xs uppercase">
                        Product
                      </TableHead>
                      <TableHead className="font-semibold text-xs uppercase">
                        Zone
                      </TableHead>
                      <TableHead className="text-center font-semibold text-xs uppercase">
                        Expected
                      </TableHead>
                      <TableHead className="text-center font-semibold text-xs uppercase">
                        Counted
                      </TableHead>
                      <TableHead className="text-center font-semibold text-xs uppercase">
                        Variance
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedItemsArray.map((item) => (
                      <TableRow key={`${item._id}-${item.sourceZoneId}`}>
                        <TableCell className="font-medium">
                          {item.skuCode}
                        </TableCell>
                        <TableCell className="max-w-32 truncate">
                          {item.productName}
                        </TableCell>
                        <TableCell>{item.zoneName}</TableCell>
                        <TableCell className="text-center">
                          {item.expectedQuantity}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {item.actualQuantity}
                        </TableCell>
                        <TableCell className="text-center">
                          {getVarianceDisplay(item.variance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Field>

            {/* Total Variance Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-md border bg-muted/50 p-3">
                <span className="font-medium text-muted-foreground text-xs uppercase">
                  Total Expected
                </span>
                <p className="mt-1 font-semibold text-lg">
                  {selectedItemsArray.reduce(
                    (sum, item) => sum + item.expectedQuantity,
                    0,
                  )}
                </p>
              </div>
              <div className="rounded-md border bg-muted/50 p-3">
                <span className="font-medium text-muted-foreground text-xs uppercase">
                  Total Counted
                </span>
                <p className="mt-1 font-semibold text-lg">
                  {selectedItemsArray.reduce(
                    (sum, item) => sum + item.actualQuantity,
                    0,
                  )}
                </p>
              </div>
              <div
                className={cn(
                  "rounded-md border p-3",
                  selectedItemsArray.reduce(
                    (sum, item) => sum + item.variance,
                    0,
                  ) === 0
                    ? "border-green-500/60 bg-green-500/10"
                    : "border-amber-500/60 bg-amber-500/10",
                )}
              >
                <span className="font-medium text-muted-foreground text-xs uppercase">
                  Total Variance
                </span>
                <p
                  className={cn(
                    "mt-1 font-semibold text-lg",
                    selectedItemsArray.reduce(
                      (sum, item) => sum + item.variance,
                      0,
                    ) === 0
                      ? "text-green-600"
                      : "text-amber-600",
                  )}
                >
                  {selectedItemsArray.reduce(
                    (sum, item) => sum + item.variance,
                    0,
                  ) > 0 && "+"}
                  {selectedItemsArray.reduce(
                    (sum, item) => sum + item.variance,
                    0,
                  )}
                </p>
              </div>
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
                placeholder="Add any additional notes about this adjustment..."
                className="min-h-20 resize-none"
              />
            </Field>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setQuantityAdjustmentDialogOpen(false)}
              className="flex-1"
              disabled={createAdjustmentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleQuantityAdjustmentSubmit}
              disabled={!reasonId || createAdjustmentMutation.isPending}
              className="flex-1"
            >
              {createAdjustmentMutation.isPending ? (
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

      {/* Location Transfer Dialog */}
      <Dialog
        open={locationTransferDialogOpen}
        onOpenChange={setLocationTransferDialogOpen}
      >
        <DialogContent showCloseButton={false} className="sm:max-w-2xl">
          <DialogHeader className="relative">
            <DialogTitle>Transfer Items to New Location</DialogTitle>
            <button
              type="button"
              onClick={() => setLocationTransferDialogOpen(false)}
              className="absolute top-0 right-0 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </DialogHeader>

          <Separator />

          <div className="mt-2 space-y-4">
            {/* From/To Zone Selection */}
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>From Zone (Source)</FieldLabel>
                <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                  {selectedItemsArray.length > 0
                    ? [
                        ...new Set(
                          selectedItemsArray.map((item) => item.zoneName),
                        ),
                      ].join(", ")
                    : "Multiple zones"}
                </div>
              </Field>
              <Field>
                <FieldLabel>To Zone (Destination)</FieldLabel>
                <Select
                  value={selectedDestinationZone ?? ""}
                  onValueChange={setSelectedDestinationZone}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination zone..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingZones ? (
                      <SelectItem value="_loading" disabled>
                        Loading zones...
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
              </Field>
            </div>

            {/* Items to Transfer */}
            <Field>
              <FieldLabel>Items to Transfer ({selectedItems.size})</FieldLabel>
              <div className="max-h-48 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold text-xs uppercase">
                        SKU
                      </TableHead>
                      <TableHead className="font-semibold text-xs uppercase">
                        Product
                      </TableHead>
                      <TableHead className="font-semibold text-xs uppercase">
                        From Zone
                      </TableHead>
                      <TableHead className="font-semibold text-xs uppercase">
                        To Zone
                      </TableHead>
                      <TableHead className="text-center font-semibold text-xs uppercase">
                        Qty
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedItemsArray.map((item) => (
                      <TableRow key={`${item._id}-${item.sourceZoneId}`}>
                        <TableCell className="font-medium">
                          {item.skuCode}
                        </TableCell>
                        <TableCell className="max-w-32 truncate">
                          {item.productName}
                        </TableCell>
                        <TableCell>{item.zoneName}</TableCell>
                        <TableCell>
                          {selectedDestinationZone ? (
                            <Badge
                              variant="outline"
                              className="border-green-500/60 bg-green-500/10 text-green-600"
                            >
                              {zones?.find(
                                (z) => z._id === selectedDestinationZone,
                              )?.name ?? "—"}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">
                              Select zone...
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {item.expectedQuantity}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Field>

            {/* Transfer Summary */}
            <div className="rounded-md border bg-muted/50 p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground text-sm">
                  Total Items to Transfer
                </span>
                <span className="font-semibold text-primary">
                  {selectedItems.size} item(s) •{" "}
                  {selectedItemsArray.reduce(
                    (sum, item) => sum + item.expectedQuantity,
                    0,
                  )}{" "}
                  units
                </span>
              </div>
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
                placeholder="Add any additional notes about this transfer..."
                className="min-h-20 resize-none"
              />
            </Field>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setLocationTransferDialogOpen(false)}
              className="flex-1"
              disabled={createAdjustmentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLocationTransferSubmit}
              disabled={
                !selectedDestinationZone ||
                !reasonId ||
                createAdjustmentMutation.isPending
              }
              className="flex-1"
            >
              {createAdjustmentMutation.isPending ? (
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

      {/* Main Session Detail Dialog */}
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          showCloseButton={false}
          className="max-h-[90vh] overflow-hidden sm:max-w-3xl"
        >
          {/* Header */}
          <DialogHeader className="relative">
            <div className="flex items-center justify-between pr-8">
              <DialogTitle>
                {session.sessionCode} - {session.name}
              </DialogTitle>
              {selectedItems.size > 0 && (
                <Button size="sm" onClick={handleCreateAdjustmentClick}>
                  Create Adjustment ({selectedItems.size})
                </Button>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              Created by {session.createdByUser?.fullName ?? "Unknown"} on{" "}
              {formattedDate}
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-0 right-0 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </DialogHeader>

          {/* Show message if no zones */}
          {session.zones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">
                No zones or items found for this session.
              </p>
            </div>
          ) : (
            /* Zone Tabs */
            <Tabs
              value={String(activeZoneIndex)}
              onValueChange={(v) => setActiveZoneIndex(Number(v))}
              className="w-full"
            >
              <TabsList className="w-full justify-start overflow-x-auto">
                {session.zones.map((zone, index) => (
                  <TabsTrigger
                    key={zone.zoneId?.toString() ?? index}
                    value={String(index)}
                    className="shrink-0"
                  >
                    {zone.zoneName}
                  </TabsTrigger>
                ))}
              </TabsList>

              {session.zones.map((zone, index) => (
                <TabsContent
                  key={zone.zoneId?.toString() ?? index}
                  value={String(index)}
                  className="mt-4 space-y-4"
                >
                  {/* Info Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Assigned Worker */}
                    <div className="rounded-lg border bg-card p-3">
                      <p className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                        Assigned Worker
                      </p>
                      <p className="font-medium text-sm">
                        {zone.assignedWorker?.fullName ?? "Unassigned"}
                      </p>
                    </div>

                    {/* Verification Status */}
                    <div className="rounded-lg border bg-card p-3">
                      <p className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                        Verification Status
                      </p>
                      <p className="font-medium text-sm">
                        {zone.matchedCount} of {zone.totalCount} matched
                      </p>
                    </div>

                    {/* Count Type */}
                    <div className="rounded-lg border bg-card p-3">
                      <p className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                        Count Type
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "mt-0.5 rounded-sm font-semibold uppercase",
                          session.cycleCountType?.lookupValue?.toLowerCase() ===
                            "daily"
                            ? "border-green-500/60 bg-green-500/10 text-green-600"
                            : session.cycleCountType?.lookupValue?.toLowerCase() ===
                                "weekly"
                              ? "border-blue-500/60 bg-blue-500/10 text-blue-600"
                              : "border-purple-500/60 bg-purple-500/10 text-purple-600",
                        )}
                      >
                        {session.cycleCountType?.lookupValue ?? "Unknown"}
                      </Badge>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="max-h-80 overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-10">
                            <Checkbox
                              checked={areAllItemsInZoneSelected(
                                zone.lineItems as LineItemFromApi[],
                                zone.zoneId?.toString() ?? "",
                              )}
                              onCheckedChange={(checked) =>
                                handleSelectAllInZone(
                                  zone.lineItems as LineItemFromApi[],
                                  zone.zoneName,
                                  zone.zoneId?.toString() ?? "",
                                  !!checked,
                                )
                              }
                            />
                          </TableHead>
                          <TableHead className="w-25 font-semibold text-xs uppercase">
                            SKU Code
                          </TableHead>
                          <TableHead className="font-semibold text-xs uppercase">
                            Product Name
                          </TableHead>
                          <TableHead className="w-30 text-center font-semibold text-xs uppercase">
                            Expected Qty
                          </TableHead>
                          <TableHead className="w-30 text-center font-semibold text-xs uppercase">
                            Counted Qty
                          </TableHead>
                          <TableHead className="w-25 text-center font-semibold text-xs uppercase">
                            Variance
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {zone.lineItems.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="h-24 text-center text-muted-foreground"
                            >
                              No items in this zone
                            </TableCell>
                          </TableRow>
                        ) : (
                          (zone.lineItems as LineItemFromApi[]).map((item) => (
                            <TableRow
                              key={item._id?.toString()}
                              className={cn(
                                isItemSelected(
                                  item._id,
                                  zone.zoneId?.toString() ?? "",
                                ) && "bg-muted/50",
                              )}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={isItemSelected(
                                    item._id,
                                    zone.zoneId?.toString() ?? "",
                                  )}
                                  onCheckedChange={() =>
                                    handleItemToggle(
                                      item as LineItemFromApi,
                                      zone.zoneName,
                                      zone.zoneId?.toString() ?? "",
                                    )
                                  }
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {item.skuCode}
                              </TableCell>
                              <TableCell>{item.productName}</TableCell>
                              <TableCell className="text-center">
                                {item.expectedQuantity}
                              </TableCell>
                              <TableCell className="text-center">
                                {item.actualQuantity}
                              </TableCell>
                              <TableCell className="text-center">
                                {getVarianceDisplay(item.variance)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
