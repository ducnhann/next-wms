import type { Id } from "@wms/backend/convex/_generated/dataModel";

// ============================================================================
// ADJUSTMENT TYPES
// ============================================================================

export type AdjustmentStatus = "Pending" | "Approved" | "Rejected";
export type AdjustmentType = "quantity" | "location";

export type QuantityAdjustmentRequest = {
  _id: Id<"adjustment_requests">;
  requestCode: string;
  productName: string;
  currentQty: number;
  adjustedQty: number;
  reason: string;
  status: AdjustmentStatus;
  requestedBy: { fullName: string } | null;
  createdAt: number;
};

export type LocationAdjustmentRequest = {
  _id: Id<"adjustment_requests">;
  requestCode: string;
  productName: string;
  fromLocation: string;
  toLocation: string;
  quantity: number;
  reason: string;
  status: AdjustmentStatus;
  requestedBy: { fullName: string } | null;
  createdAt: number;
};

export type AdjustmentStats = {
  totalQuantityRequests: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
};

// ============================================================================
// MOCK DATA
// ============================================================================

export const MOCK_ADJUSTMENT_STATS: AdjustmentStats = {
  totalQuantityRequests: 3,
  pendingApproval: 1,
  approved: 1,
  rejected: 1,
};

export const MOCK_QUANTITY_ADJUSTMENTS: QuantityAdjustmentRequest[] = [
  {
    _id: "adj_001" as unknown as Id<"adjustment_requests">,
    requestCode: "ADJ-001",
    productName: "Precision Bearing 3mm",
    currentQty: 95,
    adjustedQty: 92,
    reason: "Physical count discrepancy",
    status: "Pending",
    requestedBy: { fullName: "John Doe" },
    createdAt: 1736726400000, // Jan 13, 2026
  },
  {
    _id: "adj_002" as unknown as Id<"adjustment_requests">,
    requestCode: "ADJ-002",
    productName: "High-Flow Cooling Fan",
    currentQty: 50,
    adjustedQty: 48,
    reason: "Damaged units during inventory",
    status: "Approved",
    requestedBy: { fullName: "Jane Smith" },
    createdAt: 1736640000000, // Jan 12, 2026
  },
  {
    _id: "adj_003" as unknown as Id<"adjustment_requests">,
    requestCode: "ADJ-003",
    productName: "Bulk Chemical Agent C",
    currentQty: 2500,
    adjustedQty: 2420,
    reason: "Spillage reported",
    status: "Rejected",
    requestedBy: { fullName: "Mike Johnson" },
    createdAt: 1736553600000, // Jan 11, 2026
  },
  {
    _id: "adj_004" as unknown as Id<"adjustment_requests">,
    requestCode: "ADJ-004",
    productName: "Circuit Board Type A",
    currentQty: 200,
    adjustedQty: 195,
    reason: "Quality check failure",
    status: "Pending",
    requestedBy: { fullName: "Sarah Wilson" },
    createdAt: 1736467200000, // Jan 10, 2026
  },
  {
    _id: "adj_005" as unknown as Id<"adjustment_requests">,
    requestCode: "ADJ-005",
    productName: "LED Display Panel",
    currentQty: 75,
    adjustedQty: 80,
    reason: "Found additional stock",
    status: "Approved",
    requestedBy: { fullName: "Robert Brown" },
    createdAt: 1736380800000, // Jan 9, 2026
  },
  {
    _id: "adj_006" as unknown as Id<"adjustment_requests">,
    requestCode: "ADJ-006",
    productName: "Industrial Sealant Kit",
    currentQty: 120,
    adjustedQty: 115,
    reason: "Expired products removed",
    status: "Approved",
    requestedBy: { fullName: "Emily Davis" },
    createdAt: 1736294400000, // Jan 8, 2026
  },
];

export const MOCK_LOCATION_ADJUSTMENTS: LocationAdjustmentRequest[] = [
  {
    _id: "loc_001" as unknown as Id<"adjustment_requests">,
    requestCode: "LOC-001",
    productName: "Packaged Widget A",
    fromLocation: "Zone A - Section 1",
    toLocation: "Zone B - Section 3",
    quantity: 50,
    reason: "Reorganization",
    status: "Pending",
    requestedBy: { fullName: "John Doe" },
    createdAt: 1736726400000, // Jan 13, 2026
  },
  {
    _id: "loc_002" as unknown as Id<"adjustment_requests">,
    requestCode: "LOC-002",
    productName: "Assembly Kit Pro",
    fromLocation: "Zone C - Section 2",
    toLocation: "Zone D - Section 1",
    quantity: 30,
    reason: "Zone consolidation",
    status: "Approved",
    requestedBy: { fullName: "Jane Smith" },
    createdAt: 1736640000000, // Jan 12, 2026
  },
  {
    _id: "loc_003" as unknown as Id<"adjustment_requests">,
    requestCode: "LOC-003",
    productName: "Power Supply Unit",
    fromLocation: "Zone B - Section 1",
    toLocation: "Zone A - Section 2",
    quantity: 25,
    reason: "Customer request",
    status: "Rejected",
    requestedBy: { fullName: "Mike Johnson" },
    createdAt: 1736553600000, // Jan 11, 2026
  },
  {
    _id: "loc_004" as unknown as Id<"adjustment_requests">,
    requestCode: "LOC-004",
    productName: "Clear Tubing (500m)",
    fromLocation: "Zone D - Section 3",
    toLocation: "Zone E - Section 1",
    quantity: 100,
    reason: "Space optimization",
    status: "Approved",
    requestedBy: { fullName: "Sarah Wilson" },
    createdAt: 1736467200000, // Jan 10, 2026
  },
];
