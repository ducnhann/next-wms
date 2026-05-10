"use client";

import { ArrowRightLeft, Boxes, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface NewAdjustmentRequestDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelectType?: (type: "quantity" | "location") => void;
}

export function NewAdjustmentRequestDialog({
  open,
  onOpenChange,
  onSelectType,
}: NewAdjustmentRequestDialogProps) {
  const handleClose = () => {
    onOpenChange?.(false);
  };

  const handleSelectQuantityAdjustment = () => {
    onSelectType?.("quantity");
    handleClose();
  };

  const handleSelectLocationTransfer = () => {
    onSelectType?.("location");
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader className="relative">
          <DialogTitle>New Adjustment Request</DialogTitle>
          <button
            type="button"
            onClick={handleClose}
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
              onClick={handleSelectQuantityAdjustment}
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
              onClick={handleSelectLocationTransfer}
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
          <Button variant="outline" onClick={handleClose} className="w-full">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
