"use client";

import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useBranches } from "@/hooks/use-branches";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";

export function AddPickingSessionDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [orderPopoverOpen, setOrderPopoverOpen] = React.useState(false);
  const [selectedOrderId, setSelectedOrderId] =
    React.useState<Id<"outbound_orders"> | null>(null);

  const { userId, organizationId } = useCurrentUser();
  const { currentBranch } = useBranches({
    organizationId: organizationId as Id<"organizations"> | undefined,
    includeDeleted: false,
  });

  // Get orders ready for picking
  const { data: availableOrders, isLoading: isLoadingOrders } = useQuery({
    ...convexQuery(
      api.pickingSessions.getProcessingOutboundOrdersByBranch,
      currentBranch ? { branchId: currentBranch._id } : "skip",
    ),
    enabled: !!currentBranch && open,
  });

  // Create picking session mutation
  const createPickingSessionMutation = useMutation({
    mutationFn: useConvexMutation(api.pickingSessions.createPickingSession),
  });

  const selectedOrder = availableOrders?.find(
    (order) => order._id === selectedOrderId,
  );

  const handleSubmit = async () => {
    if (!selectedOrderId || !userId) return;

    try {
      const result = await createPickingSessionMutation.mutateAsync({
        outboundOrderId: selectedOrderId,
        userId: userId as Id<"users">,
      });

      if (result.isExisting) {
        toast.info(`Continuing picking session ${result.sessionCode}`);
      } else {
        toast.success(`Picking session ${result.sessionCode} created`);
      }
      setOpen(false);
      setSelectedOrderId(null);

      // Navigate to the verifying page
      router.push(`picking-sessions/${result.sessionId}/verifying` as Route);
    } catch (error) {
      console.error("Failed to create picking session:", error);
      toast.error("Failed to create picking session");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSelectedOrderId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add New
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Picking Session</DialogTitle>
          <DialogDescription>
            Select an outbound order to start picking. Only orders with
            "Processing" or "Pending" status are available.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Order Selection */}
          <div className="space-y-2">
            <Label className="font-medium text-sm">Outbound Order</Label>
            <Popover open={orderPopoverOpen} onOpenChange={setOrderPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={orderPopoverOpen}
                  className="w-full justify-between"
                >
                  {selectedOrder
                    ? selectedOrder.orderCode
                    : "Select an order..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search orders..." />
                  <CommandList>
                    <CommandEmpty>
                      {isLoadingOrders
                        ? "Loading..."
                        : "No orders available for picking."}
                    </CommandEmpty>
                    <CommandGroup>
                      {availableOrders?.map((order) => (
                        <CommandItem
                          key={order._id}
                          value={order.orderCode}
                          onSelect={() => {
                            setSelectedOrderId(order._id);
                            setOrderPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedOrderId === order._id
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {order.orderCode}
                            </span>
                            {order.requestedShipDate && (
                              <span className="text-muted-foreground text-xs">
                                Ship by:{" "}
                                {new Date(
                                  order.requestedShipDate,
                                ).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Info */}
          {availableOrders?.length === 0 && !isLoadingOrders && (
            <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground text-sm">
              <p>No orders available for picking.</p>
              <p className="mt-1">
                Orders must have "Processing" status to create a picking
                session.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !selectedOrderId || createPickingSessionMutation.isPending
            }
          >
            {createPickingSessionMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Start Picking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
