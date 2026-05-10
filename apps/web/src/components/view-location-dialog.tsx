"use client";

import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LocationInfo {
  zoneId?: string;
  zoneName: string;
  zonePath?: string;
  zoneType?: string;
}

interface ViewLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skuCode: string;
  productName: string;
  location: LocationInfo | null;
  quantityRequired: number;
}

const getZoneTypeBadgeStyle = (zoneType: string) => {
  switch (zoneType?.toUpperCase()) {
    case "STORAGE":
      return "bg-blue-500/10 text-blue-600 border-blue-500/60";
    case "COLD_STORAGE":
    case "COLD":
      return "bg-cyan-500/10 text-cyan-600 border-cyan-500/60";
    case "FREEZER":
      return "bg-indigo-500/10 text-indigo-600 border-indigo-500/60";
    case "PICKING":
      return "bg-orange-500/10 text-orange-600 border-orange-500/60";
    case "RECEIVING":
      return "bg-green-500/10 text-green-600 border-green-500/60";
    case "SHIPPING":
      return "bg-purple-500/10 text-purple-600 border-purple-500/60";
    default:
      return "bg-gray-500/10 text-gray-600 border-gray-500/60";
  }
};

export function ViewLocationDialog({
  open,
  onOpenChange,
  skuCode,
  productName,
  location,
  quantityRequired,
}: ViewLocationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MapPin className="h-5 w-5 text-primary" />
            Pick Location
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* SKU Info */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="space-y-1">
              <p className="font-semibold text-primary">{skuCode}</p>
              <p className="text-muted-foreground text-sm">{productName}</p>
              <p className="text-sm">
                Quantity to pick:{" "}
                <span className="font-semibold">{quantityRequired}</span>
              </p>
            </div>
          </div>

          {/* Location Info */}
          {location ? (
            <div className="space-y-3">
              <h4 className="font-medium">Go to this location:</h4>

              <div className="space-y-3 rounded-lg border p-4">
                {/* Zone Name */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Zone:</span>
                  <span className="font-semibold text-lg">
                    {location.zoneName}
                  </span>
                </div>

                {/* Zone Type */}
                {location.zoneType && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Type:</span>
                    <Badge
                      variant="outline"
                      className={getZoneTypeBadgeStyle(location.zoneType)}
                    >
                      {location.zoneType.replace(/_/g, " ")}
                    </Badge>
                  </div>
                )}

                {/* Zone Path */}
                {location.zonePath && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-sm">Path:</span>
                    <p className="rounded bg-muted/50 px-2 py-1 font-medium text-sm">
                      {location.zonePath}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground">
              <MapPin className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>Location information not available</p>
              <p className="text-sm">
                This item may not have an assigned storage location
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="default">Got it</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
