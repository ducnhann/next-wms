"use client";

import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { type IDetectedBarcode, Scanner } from "@yudiel/react-qr-scanner";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight, Check, RotateCcw, ScanLine } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { FoundSkuDialog } from "@/components/found-sku-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { ReceiveSessionProgressItem } from "@/lib/types";

export default function VerifyingPage() {
  const params = useParams();
  const router = useRouter();
  const { userId } = useCurrentUser();
  const receiveSessionId = params.id as Id<"receive_sessions">;

  const [skuInput, setSkuInput] = React.useState("");
  const [foundItem, setFoundItem] =
    React.useState<ReceiveSessionProgressItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Fetch session data from API
  const sessionData = useQuery(
    api.receiveSessions.getReceiveSessionProgress,
    receiveSessionId ? { receiveSessionId } : "skip",
  );

  // Mutations
  const processReceiveItem = useMutation(
    api.receiveSessions.processReceiveItem,
  );
  const setItemReturnRequested = useMutation(
    api.receiveSessions.setItemReturnRequested,
  );
  const saveSessionState = useMutation(
    api.receiveSessions.saveReceiveSessionState,
  );
  const completeSession = useMutation(
    api.receiveSessions.completeReceiveSession,
  );

  // Loading state
  if (!sessionData) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading session...
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if all items are handled (either returned or record >= expected)
  const allItemsHandled = sessionData.items.every(
    (item) =>
      item.statusCode === "RETURN_REQUESTED" ||
      item.quantityReceived >= item.quantityExpected,
  );

  const handleScan = (detectedCodes: IDetectedBarcode[]) => {
    // detectedCodes is an array of IDetectedBarcode objects
    detectedCodes.forEach((code) => {
      // if code.rawValue matches an item SKU, setSkuInput
      const matchedItem = sessionData.items.find(
        (item) => item.skuCode.toLowerCase() === code.rawValue.toLowerCase(),
      );

      if (matchedItem) {
        setFoundItem(matchedItem);
        setIsDialogOpen(true);
      } else {
        toast.error(
          `No item with SKU "${code.rawValue}" found in this session.`,
        );
      }
    });
  };

  const handleSubmitSku = () => {
    if (!skuInput.trim()) return;

    // Find matching item
    const matchedItem = sessionData.items.find(
      (item) => item.skuCode.toLowerCase() === skuInput.toLowerCase(),
    );

    if (matchedItem) {
      setFoundItem(matchedItem);
      setIsDialogOpen(true);
    } else {
      toast.error(`No item with SKU "${skuInput}" found in this session.`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmitSku();
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setFoundItem(null);
    setSkuInput("");
  };

  const handleConfirm = async (amount: number, note: string) => {
    if (!foundItem) return;

    try {
      setIsProcessing(true);
      await processReceiveItem({
        receiveSessionDetailId: foundItem.detailId,
        quantityToAdd: amount,
        notes: note || undefined,
      });

      toast.success(`Recorded ${amount} units of ${foundItem.skuCode}`);
      handleDialogClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to record item",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReturn = async (
    returnTypeId: Id<"system_lookups">,
    note?: string,
  ) => {
    if (!foundItem) return;

    try {
      setIsProcessing(true);
      await setItemReturnRequested({
        receiveSessionDetailId: foundItem.detailId,
        returnTypeId,
        notes: note,
      });

      toast.success(`${foundItem.skuCode} marked as return requested`);
      handleDialogClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to mark item for return",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteSession = async () => {
    try {
      setIsProcessing(true);
      await completeSession({
        receiveSessionId,
        verifiedByUserId: userId,
      });

      toast.success("Receiving session has been completed successfully.");

      // Navigate back to sessions list
      router.push(`/${params.workspace}/receiving-sessions`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to complete session",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveState = async () => {
    try {
      setIsProcessing(true);
      await saveSessionState({
        receiveSessionId,
      });

      toast.success("Session state has been saved.");

      // Navigate back to sessions list
      router.push(`/${params.workspace}/receiving-sessions`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save session state",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper to render item status display
  const renderItemStatus = (item: ReceiveSessionProgressItem) => {
    if (item.statusCode === "RETURN_REQUESTED") {
      return (
        <Badge variant="destructive" className="text-xs">
          Return Requested
        </Badge>
      );
    }

    const isFullyRecorded = item.quantityReceived >= item.quantityExpected;

    return (
      <div
        className={`cursor-pointer rounded-md border px-3 py-1 text-sm transition-colors hover:bg-muted ${
          isFullyRecorded
            ? "border-green-500 bg-green-500/10 text-green-600"
            : "text-muted-foreground"
        }`}
        onClick={() => {
          setFoundItem(item);
          setIsDialogOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setFoundItem(item);
            setIsDialogOpen(true);
          }
        }}
      >
        Record: {item.quantityReceived}
      </div>
    );
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4">
      {/* Total Progress Card */}
      <Card>
        <CardContent className="py-4">
          <p className="font-medium text-lg">
            Total Progress: {sessionData.totalReceivedQuantity} /{" "}
            {sessionData.totalExpectedQuantity}
          </p>
        </CardContent>
      </Card>

      {/* Session Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="space-y-1 py-4">
          <p className="text-sm">
            Session ID:{" "}
            <span className="font-semibold">
              {sessionData.receiveSessionCode}
            </span>
          </p>
          <p className="text-sm">
            Linked PO:{" "}
            <span className="font-semibold">
              {sessionData.purchaseOrderCode}
            </span>
          </p>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-sm">Status:</span>
            <Badge
              variant="outline"
              className="border-primary/60 bg-primary/10 font-medium text-primary"
            >
              {sessionData.status}
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
              paused={isDialogOpen}
              scanDelay={300}
              allowMultiple={true}
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
            disabled={isProcessing}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSubmitSku}
            disabled={!skuInput.trim() || isProcessing}
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
            {sessionData.items.map((item) => (
              <div
                key={item.detailId}
                className="flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{item.skuCode}</p>
                  <p className="text-muted-foreground text-sm">
                    Exp: {item.quantityExpected}
                  </p>
                </div>
                {renderItemStatus(item)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          size="lg"
          onClick={handleSaveState}
          disabled={isProcessing}
        >
          <RotateCcw className="mr-2 h-5 w-5" />
          Save & Exit
        </Button>
        <Button
          className="flex-1"
          size="lg"
          onClick={handleCompleteSession}
          disabled={isProcessing || !allItemsHandled}
          title={
            !allItemsHandled
              ? "All items must be either recorded or marked for return"
              : undefined
          }
        >
          <Check className="mr-2 h-5 w-5" />
          Complete Session
        </Button>
      </div>

      {/* Helper text when Complete is disabled */}
      {!allItemsHandled && (
        <p className="text-center text-muted-foreground text-xs">
          Complete all items (record quantity or mark for return) to complete
          the session
        </p>
      )}

      {/* Found SKU Dialog */}
      {foundItem && (
        <FoundSkuDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          item={{
            id: foundItem.detailId,
            skuCode: foundItem.skuCode,
            productName: foundItem.productName,
            expectedQty: foundItem.quantityExpected,
            recordedQty: foundItem.quantityReceived,
          }}
          onClose={handleDialogClose}
          onConfirm={handleConfirm}
          onReturn={handleReturn}
        />
      )}
    </div>
  );
}
