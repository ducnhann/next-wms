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
import { useCurrentUser } from "@/hooks/use-current-user";
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

interface OutboundOrderDetailDialogProps {
  orderId: Id<"outbound_orders"> | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function OutboundOrderDetailDialog({
  orderId,
  open: controlledOpen,
  onOpenChange,
  trigger,
}: OutboundOrderDetailDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const { userId } = useCurrentUser();

  const { data: orderDetail, isPending } = useQuery({
    ...convexQuery(
      api.outboundOrders.getOutboundOrderDetailed,
      userId && open && orderId
        ? {
            orderId,
            userId: userId as Id<"users">,
          }
        : "skip",
    ),
    enabled: !!userId && open && !!orderId,
  });

  const formatDate = React.useCallback((timestamp: number) => {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }).format(new Date(timestamp));
  }, []);

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
        <DialogTitle className="sr-only">Outbound Order Details</DialogTitle>
        {isPending || !orderDetail ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-bold text-2xl">
                {orderDetail.orderCode}
              </DialogTitle>
            </DialogHeader>

            {/* Order Information Card */}
            <Card className="flex py-4">
              <CardContent className="px-6 py-0">
                <div className="grid grid-cols-3 gap-x-8 gap-y-4">
                  {/* Column 1: User & Status */}
                  <div className="space-y-4">
                    <InfoItem
                      label="Created By"
                      value={orderDetail.createdByUser?.fullName ?? "Unknown"}
                    />
                    <InfoItem
                      label="Status"
                      value={
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-medium",
                            getBadgeStyleByStatus(
                              orderDetail.outboundStatus?.lookupValue ?? "",
                            ),
                          )}
                        >
                          {orderDetail.outboundStatus?.lookupValue ?? "Unknown"}
                        </Badge>
                      }
                    />
                  </div>

                  {/* Column 2: Tracking Info */}
                  <div className="space-y-4">
                    <InfoItem
                      label="Tracking Number"
                      value={orderDetail.trackingNumber ?? "-"}
                    />
                    <InfoItem
                      label="Requested Ship Date"
                      value={
                        orderDetail.requestedShipDate
                          ? formatDate(orderDetail.requestedShipDate)
                          : "-"
                      }
                    />
                  </div>

                  {/* Column 3: Dates */}
                  <div className="space-y-4">
                    <InfoItem
                      label="Order Date"
                      value={
                        <span>
                          {formatDateTime(orderDetail.orderDate).dateStr}{" "}
                          <span className="text-muted-foreground">
                            {formatDateTime(orderDetail.orderDate).timeStr}
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
                Detailed Item Info
              </h3>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-30">SKU</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead className="w-20 text-center">
                        Requested
                      </TableHead>
                      <TableHead className="w-20 text-center">Picked</TableHead>
                      <TableHead className="w-20 text-center">Packed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderDetail.items.length > 0 ? (
                      orderDetail.items.map((item) => (
                        <TableRow key={item._id}>
                          <TableCell className="font-medium text-blue-600">
                            {item.skuCode}
                          </TableCell>
                          <TableCell>{item.productName ?? "-"}</TableCell>
                          <TableCell className="text-center font-medium">
                            {item.quantityRequested}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {item.quantityPicked}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {item.quantityPacked}
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
                      Items:
                    </span>
                    <span className="font-semibold text-sm">
                      {orderDetail.totalItems}
                    </span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">
                      Requested:
                    </span>
                    <span className="font-bold text-blue-600 text-sm">
                      {orderDetail.totalQuantityRequested}
                    </span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">
                      Picked:
                    </span>
                    <span className="font-medium text-sm">
                      {orderDetail.totalQuantityPicked}
                    </span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">
                      Packed:
                    </span>
                    <span className="font-medium text-sm">
                      {orderDetail.totalQuantityPacked}
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
