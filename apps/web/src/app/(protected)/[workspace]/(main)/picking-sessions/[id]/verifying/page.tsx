"use client";

import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { type IDetectedBarcode, Scanner } from "@yudiel/react-qr-scanner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  Loader2,
  ScanLine,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

type PickingSessionItem = {
  _id: Id<"picking_session_details">;
  skuCode: string;
  productName: string | null;
  quantityRequired: number;
  quantityPicked: number;
  batchId?: Id<"inventory_batches">;
  location: {
    zoneId: Id<"storage_zones">;
    zoneName: string;
    zonePath: string;
    zoneType: string;
  } | null;
};

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { ViewLocationDialog } from "@/components/view-location-dialog";
// import { useCurrentUser } from "@/hooks/use-current-user";

export default function PickingVerifyingPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as Id<"picking_sessions">;
  // const { userId } = useCurrentUser();

  const [skuInput, setSkuInput] = React.useState("");
  const [isPickDialogOpen, setIsPickDialogOpen] = React.useState(false);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] =
    React.useState<PickingSessionItem | null>(null);
  const [pickAmount, setPickAmount] = React.useState(0);
  const [pickNote, setPickNote] = React.useState("");

  // Fetch session details from API
  const {
    data: sessionData,
    isPending,
    refetch,
  } = useQuery({
    ...convexQuery(
      api.pickingSessions.getPickingSessionDetailed,
      sessionId ? { pickingSessionId: sessionId } : "skip",
    ),
    enabled: !!sessionId,
  });

  // Process pick item mutation
  const processPickMutation = useMutation({
    mutationFn: useConvexMutation(api.pickingSessions.processPickItem),
  });

  // Complete session mutation
  const completeSessionMutation = useMutation({
    mutationFn: useConvexMutation(api.pickingSessions.completePickingSession),
  });

  // Start session mutation
  const startSessionMutation = useMutation({
    mutationFn: useConvexMutation(api.pickingSessions.startPickingSession),
  });

  // Start session when page loads if status is Pending
  React.useEffect(() => {
    if (sessionData?.status?.lookupValue === "Pending") {
      startSessionMutation.mutate(
        { pickingSessionId: sessionId },
        {
          onSuccess: () => refetch(),
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sessionData?.status?.lookupValue,
    startSessionMutation.mutate,
    refetch,
    sessionId,
  ]);

  const handleScan = (detectedCodes: IDetectedBarcode[]) => {
    // detectedCodes is an array of IDetectedBarcode objects
    detectedCodes.forEach((code) => {
      if (!sessionData) {
        toast.error("No active picking session data");
        return;
      }

      // if code.rawValue matches an item SKU, setSkuInput
      const matchedItem = sessionData.items.find(
        (item) => item.skuCode.toLowerCase() === code.rawValue.toLowerCase(),
      );

      if (matchedItem) {
        setSelectedItem(matchedItem);
        setIsPickDialogOpen(true);
      } else {
        toast.error(
          `No item with SKU "${code.rawValue}" found in this session.`,
        );
      }
    });
  };

  const handleSubmitSku = () => {
    if (!skuInput.trim() || !sessionData) return;

    // Find matching item
    const matchedItem = sessionData.items.find(
      (item) => item.skuCode.toLowerCase() === skuInput.toLowerCase(),
    );

    if (matchedItem) {
      setSelectedItem(matchedItem);
      setPickAmount(matchedItem.quantityRequired - matchedItem.quantityPicked);
      setIsPickDialogOpen(true);
    } else {
      toast.error("SKU not found in this picking session");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmitSku();
    }
  };

  const handlePickDialogClose = () => {
    setIsPickDialogOpen(false);
    setSelectedItem(null);
    setPickAmount(0);
    setPickNote("");
    setSkuInput("");
  };

  const handlePickConfirm = async () => {
    if (!selectedItem) return;

    try {
      await processPickMutation.mutateAsync({
        pickingSessionDetailId: selectedItem._id,
        quantityPicked: selectedItem.quantityPicked + pickAmount,
      });

      toast.success(`Picked ${pickAmount} units of ${selectedItem.skuCode}`);
      handlePickDialogClose();
      refetch();
    } catch (error) {
      console.error("Failed to process pick:", error);
      toast.error("Failed to record pick");
    }
  };

  const handleViewLocation = (item: PickingSessionItem) => {
    setSelectedItem(item);
    setIsLocationDialogOpen(true);
  };

  const handleRecordClick = (item: PickingSessionItem) => {
    setSelectedItem(item);
    setPickAmount(item.quantityRequired - item.quantityPicked);
    setIsPickDialogOpen(true);
  };

  const handleCompleteSession = async () => {
    try {
      const result = await completeSessionMutation.mutateAsync({
        pickingSessionId: sessionId,
      });

      if (result.allPicked) {
        toast.success("Picking session completed successfully!");
      } else {
        toast.warning("Session completed with partially picked items");
      }

      router.back();
    } catch (error) {
      console.error("Failed to complete session:", error);
      toast.error("Failed to complete picking session");
    }
  };

  if (isPending) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Picking session not found</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  const totalExpected = sessionData.totalQuantityRequired;
  const totalPicked = sessionData.totalQuantityPicked;
  const allComplete = totalPicked >= totalExpected && totalExpected > 0;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4">
      {/* Total Progress Card */}
      <Card>
        <CardContent className="py-4">
          <p className="font-medium text-lg">
            Total Progress: {totalPicked} / {totalExpected}
          </p>
          {allComplete && (
            <p className="mt-1 text-green-600 text-sm">✓ All items picked!</p>
          )}
        </CardContent>
      </Card>

      {/* Session Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="space-y-1 py-4">
          <p className="text-sm">
            Session ID:{" "}
            <span className="font-semibold">{sessionData.sessionCode}</span>
          </p>
          <p className="text-sm">
            Linked Order:{" "}
            <span className="font-semibold">
              {sessionData.outboundOrderCode ?? "-"}
            </span>
          </p>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-sm">Status:</span>
            <Badge
              variant="outline"
              className="border-primary/60 bg-primary/10 font-medium text-primary"
            >
              {sessionData.status?.lookupValue ?? "Unknown"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Scan Item or SKU Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ScanLine className="h-5 w-5" />
          <span className="font-medium">Scan Item or SKU</span>
        </div>

        {/* Scanner Placeholder */}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-0 text-muted-foreground">
            <Scanner
              paused={isPickDialogOpen}
              scanDelay={300}
              allowMultiple={false}
              sound={true}
              onScan={handleScan}
              onError={(error) => console.error(error)}
            />
          </CardContent>
        </Card>

        {/* SKU Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter SKU code..."
            value={skuInput}
            onChange={(e) => setSkuInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSubmitSku}
            disabled={!skuInput.trim()}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Expected Items Card */}
      <Card>
        <CardContent className="py-4">
          <h3 className="mb-4 font-semibold">Expected Items</h3>
          <div className="space-y-4">
            {sessionData.items.map((item) => {
              const isComplete = item.quantityPicked >= item.quantityRequired;
              return (
                <div
                  key={item._id}
                  className="flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        className={`font-medium ${isComplete ? "text-green-600" : ""}`}
                      >
                        {item.skuCode}
                      </p>
                      {isComplete && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Exp: {item.quantityRequired}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* View Location Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => handleViewLocation(item)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Button>
                    {/* Record Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className={`min-w-20 ${isComplete ? "border-green-500 text-green-600" : ""}`}
                      onClick={() => handleRecordClick(item)}
                      disabled={isComplete}
                    >
                      Record: {item.quantityPicked}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Complete Picking Session Button */}
      <Button
        className="w-full"
        size="lg"
        disabled={!allComplete || completeSessionMutation.isPending}
        onClick={handleCompleteSession}
      >
        {completeSessionMutation.isPending ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <Check className="mr-2 h-5 w-5" />
        )}
        Complete Picking Session
      </Button>

      {/* Pick Item Dialog */}
      {selectedItem && (
        <Dialog open={isPickDialogOpen} onOpenChange={setIsPickDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">
                Pick SKU: {selectedItem.skuCode}
              </DialogTitle>
              <p className="text-muted-foreground text-sm">
                {selectedItem.productName}
              </p>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Progress Info */}
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="flex justify-between text-sm">
                  <span>Expected:</span>
                  <span className="font-medium">
                    {selectedItem.quantityRequired}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Already Picked:</span>
                  <span className="font-medium">
                    {selectedItem.quantityPicked}
                  </span>
                </div>
                <div className="flex justify-between font-medium text-primary text-sm">
                  <span>Remaining:</span>
                  <span>
                    {selectedItem.quantityRequired -
                      selectedItem.quantityPicked}
                  </span>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Quantity to Pick</Label>
                <Input
                  id="amount"
                  type="number"
                  value={pickAmount}
                  onChange={(e) => setPickAmount(Number(e.target.value))}
                  min={0}
                  max={
                    selectedItem.quantityRequired - selectedItem.quantityPicked
                  }
                />
              </div>

              {/* Note */}
              <div className="space-y-2">
                <Label htmlFor="note">Note (optional)</Label>
                <Input
                  id="note"
                  placeholder="Enter note..."
                  value={pickNote}
                  onChange={(e) => setPickNote(e.target.value)}
                />
              </div>

              {/* Location reminder */}
              {selectedItem.location && (
                <div className="rounded-lg border border-dashed p-3 text-sm">
                  <p className="text-muted-foreground">
                    <span className="font-medium">Location:</span>{" "}
                    {selectedItem.location.zoneName}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-row justify-between gap-2 sm:justify-between">
              <DialogClose asChild>
                <Button variant="outline" onClick={handlePickDialogClose}>
                  Cancel
                </Button>
              </DialogClose>
              <Button
                onClick={handlePickConfirm}
                disabled={
                  pickAmount <= 0 ||
                  pickAmount >
                    selectedItem.quantityRequired -
                      selectedItem.quantityPicked ||
                  processPickMutation.isPending
                }
              >
                {processPickMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirm Pick
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* View Location Dialog */}
      {selectedItem && (
        <ViewLocationDialog
          open={isLocationDialogOpen}
          onOpenChange={setIsLocationDialogOpen}
          skuCode={selectedItem.skuCode}
          productName={selectedItem.productName ?? ""}
          location={selectedItem.location}
          quantityRequired={
            selectedItem.quantityRequired - selectedItem.quantityPicked
          }
        />
      )}
    </div>
  );
}
