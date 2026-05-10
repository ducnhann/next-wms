"use client";

import * as React from "react";
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
import type { VerifyingPickingSessionItem } from "@/mock/data/picking-session-verifying";

interface PickItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: VerifyingPickingSessionItem;
  onClose: () => void;
  onConfirm: (amount: number, note: string) => void;
}

export function PickItemDialog({
  open,
  onOpenChange,
  item,
  onClose,
  onConfirm,
}: PickItemDialogProps) {
  const [amount, setAmount] = React.useState(item.expectedQty);
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setAmount(item.expectedQty - item.pickedQty);
      setNote("");
    }
  }, [open, item.expectedQty, item.pickedQty]);

  const handleConfirm = () => {
    onConfirm(amount, note);
  };

  const remainingQty = item.expectedQty - item.pickedQty;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Pick SKU: {item.skuCode}
          </DialogTitle>
          <p className="text-muted-foreground text-sm">{item.productName}</p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Progress Info */}
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex justify-between text-sm">
              <span>Expected:</span>
              <span className="font-medium">{item.expectedQty}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Already Picked:</span>
              <span className="font-medium">{item.pickedQty}</span>
            </div>
            <div className="flex justify-between font-medium text-primary text-sm">
              <span>Remaining:</span>
              <span>{remainingQty}</span>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Quantity to Pick</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={0}
              max={remainingQty}
            />
            {amount > remainingQty && (
              <p className="text-destructive text-sm">
                Cannot pick more than remaining quantity ({remainingQty})
              </p>
            )}
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Input
              id="note"
              placeholder="Enter note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Location reminder */}
          {item.location && (
            <div className="rounded-lg border border-dashed p-3 text-sm">
              <p className="text-muted-foreground">
                <span className="font-medium">Location:</span>{" "}
                {item.location.zoneName}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row justify-between gap-2 sm:justify-between">
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleConfirm}
            disabled={amount <= 0 || amount > remainingQty}
          >
            Confirm Pick
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
