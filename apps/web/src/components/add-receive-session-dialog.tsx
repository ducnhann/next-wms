"use client";

import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { Loader2, Plus } from "lucide-react";
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
import { useBranches } from "@/hooks/use-branches";
import { useCurrentUser } from "@/hooks/use-current-user";

interface AddReceiveSessionDialogProps {
  trigger?: React.ReactNode;
}

export function AddReceiveSessionDialog({
  trigger,
}: AddReceiveSessionDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [selectedPOId, setSelectedPOId] = React.useState<string>("");
  const [selectedWorkerId, setSelectedWorkerId] = React.useState<string>("");
  const { userId, organizationId } = useCurrentUser();

  const { currentBranch } = useBranches({
    organizationId: organizationId as Id<"organizations"> | undefined,
    includeDeleted: false,
  });

  // Fetch pending purchase orders for the dropdown
  const {
    data: pendingPOs,
    isLoading: isLoadingPOs,
    // error: queryError,
    // isError,
    // status,
  } = useQuery({
    ...convexQuery(
      api.receiveSessions.getPendingPurchaseOrdersByBranch,
      open && currentBranch?._id
        ? { branchId: currentBranch._id as Id<"branches"> }
        : "skip",
    ),
    enabled: open && !!currentBranch?._id,
  });

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

  // Debug log
  // React.useEffect(() => {
  //   if (open) {
  // console.log("Query Status:", status);
  // console.log("Is Loading:", isLoadingPOs);
  // console.log("Is Error:", isError);
  // console.log("Error:", queryError);
  // console.log("Branch ID:", currentBranch?._id);
  // console.log("Pending POs data:", pendingPOs);
  // console.log("Is array:", Array.isArray(pendingPOs));
  // console.log("Length:", pendingPOs?.length);
  //   }
  // }, [
  //   open,
  //   isLoadingPOs,
  //   pendingPOs,
  //   status,
  //   isError,
  //   queryError,
  //   currentBranch?._id,
  // ]);

  // Mutation for creating receive session
  const createReceiveSession = useConvexMutation(
    api.receiveSessions.createReceiveSession,
  );

  const { mutate: handleCreateSession, isPending: isCreating } = useMutation({
    mutationFn: async () => {
      if (!selectedPOId || !userId) {
        throw new Error("Please select a purchase order");
      }
      if (!selectedWorkerId) {
        throw new Error("Please select an assigned worker");
      }
      return createReceiveSession({
        purchaseOrderId: selectedPOId as Id<"purchase_orders">,
        userId: userId as Id<"users">,
        assignedWorkerId: selectedWorkerId as Id<"users">,
      });
    },
    onSuccess: (_result) => {
      toast.success("Receive session created successfully");
      setOpen(false);
      setConfirmOpen(false);
      setSelectedPOId("");
      setSelectedWorkerId("");
    },
    onError: (_error) => {
      toast.error("Failed to create receive session");
      setConfirmOpen(false);
    },
  });

  const selectedPO = pendingPOs?.find(
    (po) => po.purchaseOrderId === selectedPOId,
  );

  const handleConfirmClick = () => {
    if (!selectedPOId) {
      toast.error("Please select a purchase order");
      return;
    }
    if (!selectedWorkerId) {
      toast.error("Please select an assigned worker");
      return;
    }
    setConfirmOpen(true);
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "N/A";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(timestamp));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button>
              <Plus className="mr-1 size-4" />
              Add New
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Receive Session</DialogTitle>
            <DialogDescription>
              Select a pending purchase order to start a new receiving session.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="purchase-order">
                Purchase Order <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedPOId} onValueChange={setSelectedPOId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a purchase order" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={5}>
                  {isLoadingPOs && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="size-4 animate-spin" />
                      <span className="ml-2">Loading...</span>
                    </div>
                  )}
                  {!isLoadingPOs && !pendingPOs && (
                    <div className="py-4 text-center text-muted-foreground text-sm">
                      No pending purchase orders available
                    </div>
                  )}
                  {!isLoadingPOs &&
                    pendingPOs &&
                    pendingPOs.length > 0 &&
                    pendingPOs.map((po) => (
                      <SelectItem
                        key={po.purchaseOrderId}
                        value={po.purchaseOrderId}
                      >
                        {po.code}
                        <span className="ml-2 text-muted-foreground">
                          — {po.supplierName}
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPO && (
              <div className="rounded-md border bg-muted/50 p-3">
                <h4 className="mb-2 font-medium text-sm">
                  Selected Order Details
                </h4>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Code:</span>{" "}
                    {selectedPO.code}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Supplier:</span>{" "}
                    {selectedPO.supplierName}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Ordered:</span>{" "}
                    {formatDate(selectedPO.orderedAt)}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Expected:</span>{" "}
                    {formatDate(selectedPO.expectedDeliveryAt)}
                  </p>
                </div>
              </div>
            )}

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
            <Button
              onClick={handleConfirmClick}
              disabled={!selectedPOId || !selectedWorkerId}
            >
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
              You are about to create a new receive session for purchase order{" "}
              <strong>{selectedPO?.code}</strong> from{" "}
              <strong>{selectedPO?.supplierName}</strong>.
              <br />
              <br />
              This will create a work session and copy all items from the
              purchase order. This action cannot be undone.
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
