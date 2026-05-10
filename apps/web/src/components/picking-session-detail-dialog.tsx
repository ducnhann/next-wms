"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, getBadgeStyleByStatus } from "@/lib/utils";

interface InfoItemProps {
  label: string;
  value: React.ReactNode;
}

function InfoItem({ label, value }: InfoItemProps) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </p>
      <div className="font-medium text-foreground text-sm">{value}</div>
    </div>
  );
}

interface PickingSessionDetailDialogProps {
  sessionId: Id<"picking_sessions"> | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function PickingSessionDetailDialog({
  sessionId,
  open: controlledOpen,
  onOpenChange,
  trigger,
}: PickingSessionDetailDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const { data: sessionDetail, isPending } = useQuery({
    ...convexQuery(
      api.pickingSessions.getPickingSessionDetailed,
      open && sessionId ? { pickingSessionId: sessionId } : "skip",
    ),
    enabled: open && !!sessionId,
  });

  const formatDateTime = React.useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    const dateStr = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }).format(date);
    const timeStr = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
    return { dateStr, timeStr };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-2xl">
        <DialogTitle className="sr-only">Picking Session Details</DialogTitle>
        {isPending || !sessionDetail ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-bold text-2xl">
                {sessionDetail.sessionCode}
              </DialogTitle>
            </DialogHeader>

            {/* Session Information Card */}
            <Card className="flex py-4">
              <CardContent className="px-6 py-0">
                <div className="grid grid-cols-3 gap-x-8 gap-y-4">
                  {/* Column 1: User & Status */}
                  <div className="space-y-4">
                    <InfoItem
                      label="Assigned To"
                      value={
                        sessionDetail.assignedUser?.fullName ?? "Unassigned"
                      }
                    />
                    <InfoItem
                      label="Status"
                      value={
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-medium",
                            getBadgeStyleByStatus(
                              sessionDetail.status?.lookupValue ?? "",
                            ),
                          )}
                        >
                          {sessionDetail.status?.lookupValue ?? "Unknown"}
                        </Badge>
                      }
                    />
                  </div>

                  {/* Column 2: Order Info */}
                  <div className="space-y-4">
                    <InfoItem
                      label="Linked Order"
                      value={
                        <span className="text-primary">
                          {sessionDetail.outboundOrderCode ?? "-"}
                        </span>
                      }
                    />
                    <InfoItem
                      label="Total Items"
                      value={sessionDetail.totalItems}
                    />
                  </div>

                  {/* Column 3: Date */}
                  <div className="space-y-4">
                    <InfoItem
                      label="Created At"
                      value={
                        <span>
                          {formatDateTime(sessionDetail.createdAt).dateStr}{" "}
                          <span className="text-muted-foreground">
                            {formatDateTime(sessionDetail.createdAt).timeStr}
                          </span>
                        </span>
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Item Info Section */}
            <div className="space-y-3">
              <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">
                Picking Items
              </h3>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-30">SKU</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead className="w-40">Location</TableHead>
                      <TableHead className="w-24 text-center">
                        Required
                      </TableHead>
                      <TableHead className="w-24 text-center">Picked</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionDetail.items.length > 0 ? (
                      sessionDetail.items.map((item) => (
                        <TableRow key={item._id}>
                          <TableCell className="font-medium text-blue-600">
                            {item.skuCode}
                          </TableCell>
                          <TableCell>{item.productName ?? "-"}</TableCell>
                          <TableCell className="text-sm">
                            {item.location ? (
                              <span className="text-muted-foreground">
                                {item.location.zoneName}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {item.quantityRequired}
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={cn(
                                "font-medium",
                                item.quantityPicked >= item.quantityRequired
                                  ? "text-green-600"
                                  : "text-muted-foreground",
                              )}
                            >
                              {item.quantityPicked}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          No items found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end">
                <div className="inline-flex items-center gap-4 rounded-lg border bg-card px-4 py-2.5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">
                      Total Items:
                    </span>
                    <span className="font-semibold text-sm">
                      {sessionDetail.totalItems}
                    </span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">
                      Required:
                    </span>
                    <span className="font-bold text-blue-600 text-sm">
                      {sessionDetail.totalQuantityRequired}
                    </span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">
                      Picked:
                    </span>
                    <span
                      className={cn(
                        "font-bold text-sm",
                        sessionDetail.totalQuantityPicked >=
                          sessionDetail.totalQuantityRequired
                          ? "text-green-600"
                          : "text-orange-600",
                      )}
                    >
                      {sessionDetail.totalQuantityPicked}
                    </span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">
                      Progress:
                    </span>
                    <span className="font-bold text-sm">
                      {sessionDetail.totalQuantityRequired > 0
                        ? Math.round(
                            (sessionDetail.totalQuantityPicked /
                              sessionDetail.totalQuantityRequired) *
                              100,
                          )
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
