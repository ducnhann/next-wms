"use client";

import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
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
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { PurchaseOrderListItem } from "@/lib/types";

interface ProceedReceivingDialogProps {
  purchaseOrder: PurchaseOrderListItem;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function ProceedReceivingDialog({
  purchaseOrder,
  trigger,
  onSuccess,
}: ProceedReceivingDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = React.useState<string>("");
  const { userId, organizationId } = useCurrentUser();

  // Fetch organization users for assigned worker dropdown
  const { data: organizationUsers, isLoading: isLoadingUsers } = useQuery({
    ...convexQuery(
      api.cycleCount.getOrganizationUsers,
      open && organizationId
        ? { organizationId: organizationId as Id<"organizations"> }
        : "skip",
    ),
    enabled: open && !!organizationId,
  });

  // Mutation for creating receive session
  const createReceiveSession = useConvexMutation(
    api.receiveSessions.createReceiveSession,
  );

  const { mutate: handleCreateSession, isPending: isCreating } = useMutation({
    mutationFn: async () => {
      if (!userId) {
        throw new Error("User not authenticated");
      }
      if (!selectedWorkerId) {
        throw new Error("Please select an assigned worker");
      }
      return createReceiveSession({
        purchaseOrderId: purchaseOrder._id as Id<"purchase_orders">,
        userId: userId as Id<"users">,
        assignedWorkerId: selectedWorkerId as Id<"users">,
      });
    },
    onSuccess: (_result) => {
      toast.success("Receive session created successfully");
      setOpen(false);
      setConfirmOpen(false);
      setSelectedWorkerId("");
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create receive session",
      );
      setConfirmOpen(false);
    },
  });

  const handleConfirmClick = () => {
    if (!selectedWorkerId) {
      toast.error("Please select an assigned worker");
      return;
    }
    setConfirmOpen(true);
  };

  const formatDate = (timestamp?: number | null) => {
    if (!timestamp) return "N/A";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(timestamp));
  };

  // Get the selected worker's name for confirmation
  const selectedWorker = organizationUsers?.find(
    (user) => user._id === selectedWorkerId,
  );

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || <Button variant="outline">Proceed Receiving</Button>}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Proceed Receiving</DialogTitle>
            <DialogDescription>
              Create a receive session for this purchase order and assign a
              worker.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Purchase Order Details */}
            <div className="rounded-md border bg-muted/50 p-3">
              <h4 className="mb-2 font-medium text-sm">
                Purchase Order Details
              </h4>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Code:</span>{" "}
                  {purchaseOrder.code}
                </p>
                <p>
                  <span className="text-muted-foreground">Supplier:</span>{" "}
                  {purchaseOrder.supplier?.name ?? "Unknown"}
                </p>
                <p>
                  <span className="text-muted-foreground">Ordered:</span>{" "}
                  {formatDate(purchaseOrder.orderedAt)}
                </p>
                <p>
                  <span className="text-muted-foreground">Expected:</span>{" "}
                  {formatDate(purchaseOrder.expectedDeliveryAt)}
                </p>
              </div>
            </div>

            {/* Worker Selection */}
            <div className="space-y-2">
              <Label htmlFor="assigned-worker">
                Assigned Worker <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedWorkerId}
                onValueChange={setSelectedWorkerId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an assigned worker" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={5}>
                  {isLoadingUsers && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="size-4 animate-spin" />
                      <span className="ml-2">Loading...</span>
                    </div>
                  )}
                  {!isLoadingUsers &&
                    (!organizationUsers || organizationUsers.length === 0) && (
                      <div className="py-4 text-center text-muted-foreground text-sm">
                        No workers available
                      </div>
                    )}
                  {!isLoadingUsers &&
                    organizationUsers &&
                    organizationUsers.length > 0 &&
                    organizationUsers.map((user) => (
                      <SelectItem key={user._id} value={user._id}>
                        {user.fullName}
                        <span className="ml-2 text-muted-foreground text-xs">
                          {user.email}
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmClick} disabled={!selectedWorkerId}>
              Create Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Create Receive Session</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to create a receive session for purchase order{" "}
              <strong>{purchaseOrder.code}</strong> from{" "}
              <strong>{purchaseOrder.supplier?.name ?? "Unknown"}</strong>.
              <br />
              <br />
              Assigned worker:{" "}
              <strong>{selectedWorker?.fullName ?? "Unknown"}</strong>
              <br />
              <br />
              This will create a work session and copy all items from the
              purchase order. The assigned worker will receive a notification.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCreating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCreateSession();
              }}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Confirm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
