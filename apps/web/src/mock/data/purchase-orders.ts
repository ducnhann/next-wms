import type { Id } from "@wms/backend/convex/_generated/dataModel";
import type { PurchaseOrderListItem } from "@/lib/types";

// This file is kept for reference/testing but is no longer used in the app
// The app now fetches real data from the Convex API

export const MOCK_PO: PurchaseOrderListItem[] = [
  {
    _id: "mock-po-001" as Id<"purchase_orders">,
    code: "PO-001",
    orderedAt: 1685577600000,
    expectedDeliveryAt: 1686009600000,
    purchaseOrderStatus: {
      lookupValue: "Pending",
    },
    supplier: {
      name: "Acme Supplies",
    },
  },
  {
    _id: "mock-po-002" as Id<"purchase_orders">,
    code: "PO-002",
    orderedAt: 1685664000000,
    expectedDeliveryAt: 1686528000000,
    purchaseOrderStatus: {
      lookupValue: "Approved",
    },
    supplier: {
      name: "Global Parts Inc",
    },
  },
  {
    _id: "mock-po-003" as Id<"purchase_orders">,
    code: "PO-003",
    orderedAt: 1685750400000,
    expectedDeliveryAt: 1686009600000,
    purchaseOrderStatus: {
      lookupValue: "Received",
    },
    supplier: {
      name: "Tech Distributors",
    },
  },
];
