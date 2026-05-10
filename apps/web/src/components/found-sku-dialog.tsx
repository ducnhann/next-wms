"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { Loader2 } from "lucide-react";
import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Generic item type that works with both mock data and API data
export interface FoundSkuDialogItem {
  id: string;
  skuCode: string;
  productName: string;
  expectedQty: number;
  recordedQty: number;
}

interface FoundSkuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: FoundSkuDialogItem;
  onClose: () => void;
  onConfirm: (amount: number, note: string) => void | Promise<void>;
  onReturn: (
    returnTypeId: Id<"system_lookups">,
    note?: string,
  ) => void | Promise<void>;
}

export function FoundSkuDialog({
  open,
  onOpenChange,
  item,
  onClose,
  onConfirm,
  onReturn,
}: FoundSkuDialogProps) {
  const remainingQty = item.expectedQty - item.recordedQty;
  const [amount, setAmount] = React.useState(Math.max(0, remainingQty));
  const [note, setNote] = React.useState("");
  const [returnReasonId, setReturnReasonId] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showReturnConfirm, setShowReturnConfirm] = React.useState(false);
  const [returnError, setReturnError] = React.useState("");

  // Fetch return reasons
  const { data: returnReasons, isLoading: isLoadingReasons } = useQuery({
    ...convexQuery(api.receiveSessions.getReturnReasons, {}),
    enabled: open,
  });

  // Get the selected return reason display name
  const selectedReasonName = returnReasons?.find(
    (r) => r._id === returnReasonId,
  )?.lookupValue;

  // Reset form when item changes
  React.useEffect(() => {
    const remaining = item.expectedQty - item.recordedQty;
    setAmount(Math.max(0, remaining));
    setNote("");
    setReturnReasonId("");
    setReturnError("");
  }, [item]);

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm(amount, note);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnClick = () => {
    // Validate that return reason is selected
    if (!returnReasonId) {
      setReturnError("Please select a return reason");
      return;
    }
    setReturnError("");
    setShowReturnConfirm(true);
  };

  const handleReturnConfirm = async () => {
    try {
      setIsSubmitting(true);
      setShowReturnConfirm(false);
      await onReturn(returnReasonId as Id<"system_lookups">, note || undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Found SKU: {item.skuCode}
            </DialogTitle>
            <p className="text-muted-foreground text-sm">{item.productName}</p>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Progress Info */}
            <div className="text-muted-foreground text-sm">
              <p>
                Expected: {item.expectedQty} | Recorded: {item.recordedQty} |
                Remaining: {remainingQty}
              </p>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setAmount(Math.min(value, remainingQty));
                }}
                min={0}
                max={remainingQty}
                disabled={isSubmitting}
              />
            </div>

            {/* Return Reason */}
            <div className="space-y-2">
              <Label htmlFor="return-reason">
                Return Reason{" "}
                <span className="text-muted-foreground text-xs">
                  (required for return)
                </span>
              </Label>
              <Select
                value={returnReasonId}
                onValueChange={(value) => {
                  setReturnReasonId(value);
                  if (returnError) {
                    setReturnError("");
                  }
                }}
                disabled={isSubmitting || isLoadingReasons}
              >
                <SelectTrigger id="return-reason">
                  <SelectValue
                    placeholder={
                      isLoadingReasons ? "Loading..." : "Select return reason"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingReasons ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="size-4 animate-spin" />
                    </div>
                  ) : (
                    returnReasons?.map((reason) => (
                      <SelectItem key={reason._id} value={reason._id}>
                        {reason.lookupValue}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {returnError && (
                <p className="text-destructive text-sm">{returnError}</p>
              )}
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="note">
                Additional Notes{" "}
                <span className="text-muted-foreground text-xs">
                  (optional)
                </span>
              </Label>
              <Input
                id="note"
                placeholder="Enter additional notes..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label>Attachments</Label>
              <div className="flex min-h-20 items-center justify-center rounded-md border p-4 text-muted-foreground">
                Add attachment
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-row justify-between gap-2 sm:justify-between">
            <DialogClose asChild>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Close
              </Button>
            </DialogClose>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleReturnClick}
                disabled={isSubmitting}
              >
                Return
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isSubmitting || amount <= 0}
              >
                {isSubmitting ? "Processing..." : "Confirm"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Confirmation Dialog */}
      <AlertDialog open={showReturnConfirm} onOpenChange={setShowReturnConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Return Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark <strong>{item.skuCode}</strong> as
              return requested?
              <br />
              <br />
              <strong>Reason:</strong> {selectedReasonName}
              {note && (
                <>
                  <br />
                  <strong>Notes:</strong> {note}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReturnConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processing..." : "Confirm Return"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
