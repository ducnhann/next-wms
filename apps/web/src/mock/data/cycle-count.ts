import type { Id } from "@wms/backend/convex/_generated/dataModel";
import type {
  CycleCountSessionListItem,
  CycleCountSessionWithDetails,
  CycleCountStats,
} from "@/lib/types";

// Mock stats data for cycle count dashboard
export const MOCK_CYCLE_COUNT_STATS: CycleCountStats = {
  activeSessions: 1,
  totalZones: 5,
  completedSessions: 1,
  verificationRate: 92,
};

// Mock storage zones data
export const MOCK_STORAGE_ZONES = [
  { _id: "zone_001", name: "Zone A - Electronics" },
  { _id: "zone_002", name: "Zone B - Chemicals" },
  { _id: "zone_003", name: "Zone C - Raw Materials" },
  { _id: "zone_004", name: "Zone D - Packaging" },
  { _id: "zone_005", name: "Zone E - Finished Goods" },
  { _id: "zone_006", name: "Zone F - Cold Storage" },
];

// Mock workers data
export const MOCK_WORKERS = [
  { _id: "user_001", fullName: "John Doe" },
  { _id: "user_002", fullName: "Jane Smith" },
  { _id: "user_003", fullName: "Bob Johnson" },
  { _id: "user_004", fullName: "Alice Brown" },
  { _id: "user_005", fullName: "Charlie Davis" },
];

// Mock sections data (by zone)
export const MOCK_SECTIONS: Record<string, { _id: string; name: string }[]> = {
  zone_001: [
    { _id: "sec_001", name: "Section A1" },
    { _id: "sec_002", name: "Section A2" },
    { _id: "sec_003", name: "Section A3" },
  ],
  zone_002: [
    { _id: "sec_004", name: "Section B1" },
    { _id: "sec_005", name: "Section B2" },
  ],
  zone_003: [
    { _id: "sec_006", name: "Section C1" },
    { _id: "sec_007", name: "Section C2" },
    { _id: "sec_008", name: "Section C3" },
  ],
  zone_004: [
    { _id: "sec_009", name: "Section D1" },
    { _id: "sec_010", name: "Section D2" },
  ],
  zone_005: [
    { _id: "sec_011", name: "Section E1" },
    { _id: "sec_012", name: "Section E2" },
    { _id: "sec_013", name: "Section E3" },
  ],
  zone_006: [{ _id: "sec_014", name: "Section F1" }],
};

// Mock products data
export const MOCK_PRODUCTS = [
  { _id: "prod_001", code: "P-0001", name: "Industrial Sealant Kit" },
  { _id: "prod_002", code: "P-0002", name: "Clear Tubing (500m)" },
  { _id: "prod_003", code: "P-0003", name: "Chemical Agent C" },
  { _id: "prod_004", code: "P-0010", name: "Packaged Widget A" },
  { _id: "prod_005", code: "P-0011", name: "Packaged Widget B" },
  { _id: "prod_006", code: "P-0012", name: "Assembly Kit Pro" },
  { _id: "prod_007", code: "P-0013", name: "Finished Component X" },
  { _id: "prod_008", code: "P-0020", name: "Circuit Board Type A" },
  { _id: "prod_009", code: "P-0021", name: "LED Display Panel" },
  { _id: "prod_010", code: "P-0022", name: "Power Supply Unit" },
];

// Mock adjustment reasons
export const MOCK_ADJUSTMENT_REASONS = [
  { _id: "reason_001", value: "Damaged" },
  { _id: "reason_002", value: "Expired" },
  { _id: "reason_003", value: "Lost" },
  { _id: "reason_004", value: "Found" },
  { _id: "reason_005", value: "Miscounted" },
  { _id: "reason_006", value: "Theft" },
  { _id: "reason_007", value: "Return to Supplier" },
  { _id: "reason_008", value: "Quality Issue" },
  { _id: "reason_009", value: "Other" },
];

// Mock transfer items data
export const MOCK_TRANSFER_ITEMS = [
  {
    id: "item_001",
    productId: "P-0001",
    productName: "Industrial Sealant Kit",
    box: "BOX-001",
    quantity: 50,
    expiryDate: "2026-08-15",
  },
  {
    id: "item_002",
    productId: "P-0002",
    productName: "Clear Tubing (500m)",
    box: "BOX-002",
    quantity: 30,
    expiryDate: "2025-12-20",
  },
  {
    id: "item_003",
    productId: "P-0003",
    productName: "Chemical Agent C",
    box: "BOX-003",
    quantity: 25,
    expiryDate: "2026-03-10",
  },
  {
    id: "item_004",
    productId: "P-0010",
    productName: "Packaged Widget A",
    box: "BOX-004",
    quantity: 100,
    expiryDate: "2027-01-01",
  },
];

// Mock data for cycle count sessions list
export const MOCK_CYCLE_COUNT_SESSIONS: CycleCountSessionListItem[] = [
  {
    _id: "cc_001" as Id<"work_sessions">,
    sessionCode: "CC-001",
    name: "Daily Cycle Count - Zone B & E",
    cycleCountType: { lookupValue: "Daily" },
    sessionStatus: { lookupValue: "Active" },
    createdByUser: { fullName: "John Doe" },
    zonesCount: 2,
    createdAt: 1736640000000, // Jan 12, 2026
  },
  {
    _id: "cc_002" as Id<"work_sessions">,
    sessionCode: "CC-002",
    name: "Weekly Cycle Count - Full Warehouse",
    cycleCountType: { lookupValue: "Weekly" },
    sessionStatus: { lookupValue: "Completed" },
    createdByUser: { fullName: "Jane Smith" },
    zonesCount: 3,
    createdAt: 1736553600000, // Jan 11, 2026
  },
  {
    _id: "cc_003" as Id<"work_sessions">,
    sessionCode: "CC-003",
    name: "Daily Cycle Count - Zone A",
    cycleCountType: { lookupValue: "Daily" },
    sessionStatus: { lookupValue: "Pending" },
    createdByUser: { fullName: "Bob Johnson" },
    zonesCount: 1,
    createdAt: 1736467200000, // Jan 10, 2026
  },
  {
    _id: "cc_004" as Id<"work_sessions">,
    sessionCode: "CC-004",
    name: "Monthly Cycle Count - High Value Items",
    cycleCountType: { lookupValue: "Monthly" },
    sessionStatus: { lookupValue: "In Progress" },
    createdByUser: { fullName: "Alice Brown" },
    zonesCount: 4,
    createdAt: 1736380800000, // Jan 9, 2026
  },
  {
    _id: "cc_005" as Id<"work_sessions">,
    sessionCode: "CC-005",
    name: "Weekly Cycle Count - Zone C & D",
    cycleCountType: { lookupValue: "Weekly" },
    sessionStatus: { lookupValue: "Completed" },
    createdByUser: { fullName: "Charlie Davis" },
    zonesCount: 2,
    createdAt: 1736294400000, // Jan 8, 2026
  },
  {
    _id: "cc_006" as Id<"work_sessions">,
    sessionCode: "CC-006",
    name: "Daily Cycle Count - Receiving Area",
    cycleCountType: { lookupValue: "Daily" },
    sessionStatus: { lookupValue: "Cancelled" },
    createdByUser: { fullName: "Diana Wilson" },
    zonesCount: 1,
    createdAt: 1736208000000, // Jan 7, 2026
  },
  {
    _id: "cc_007" as Id<"work_sessions">,
    sessionCode: "CC-007",
    name: "Quarterly Cycle Count - All Zones",
    cycleCountType: { lookupValue: "Quarterly" },
    sessionStatus: { lookupValue: "Active" },
    createdByUser: { fullName: "Edward Martinez" },
    zonesCount: 6,
    createdAt: 1736121600000, // Jan 6, 2026
  },
  {
    _id: "cc_008" as Id<"work_sessions">,
    sessionCode: "CC-008",
    name: "Daily Cycle Count - Zone F",
    cycleCountType: { lookupValue: "Daily" },
    sessionStatus: { lookupValue: "Completed" },
    createdByUser: { fullName: "Fiona Garcia" },
    zonesCount: 1,
    createdAt: 1736035200000, // Jan 5, 2026
  },
];

// Mock session details data - for the view details dialog
export const MOCK_CYCLE_COUNT_SESSION_DETAILS: Record<
  string,
  CycleCountSessionWithDetails
> = {
  cc_001: {
    _id: "cc_001" as Id<"work_sessions">,
    sessionCode: "CC-001",
    name: "Daily Cycle Count - Zone B & E",
    cycleCountType: { lookupValue: "Daily" },
    sessionStatus: { lookupValue: "Active" },
    createdByUser: { fullName: "John Doe" },
    createdAt: 1732060800000, // Nov 20, 2025
    zones: [
      {
        zoneId: "zone_002",
        zoneName: "Zone B - Chemicals",
        assignedWorker: { fullName: "John Smith" },
        matchedCount: 1,
        totalCount: 3,
        lineItems: [
          {
            _id: "li_001" as Id<"session_line_items">,
            productId: "P-0001",
            productName: "Industrial Sealant Kit",
            expectedQuantity: 50,
            actualQuantity: 50,
            variance: 0,
          },
          {
            _id: "li_002" as Id<"session_line_items">,
            productId: "P-0002",
            productName: "Clear Tubing (500m)",
            expectedQuantity: 30,
            actualQuantity: 29,
            variance: -1,
          },
          {
            _id: "li_003" as Id<"session_line_items">,
            productId: "P-0003",
            productName: "Chemical Agent C",
            expectedQuantity: 100,
            actualQuantity: 96,
            variance: -4,
          },
        ],
      },
      {
        zoneId: "zone_005",
        zoneName: "Zone E - Finished Goods",
        assignedWorker: { fullName: "Jane Smith" },
        matchedCount: 2,
        totalCount: 4,
        lineItems: [
          {
            _id: "li_004" as Id<"session_line_items">,
            productId: "P-0010",
            productName: "Packaged Widget A",
            expectedQuantity: 200,
            actualQuantity: 200,
            variance: 0,
          },
          {
            _id: "li_005" as Id<"session_line_items">,
            productId: "P-0011",
            productName: "Packaged Widget B",
            expectedQuantity: 150,
            actualQuantity: 150,
            variance: 0,
          },
          {
            _id: "li_006" as Id<"session_line_items">,
            productId: "P-0012",
            productName: "Assembly Kit Pro",
            expectedQuantity: 75,
            actualQuantity: 72,
            variance: -3,
          },
          {
            _id: "li_007" as Id<"session_line_items">,
            productId: "P-0013",
            productName: "Finished Component X",
            expectedQuantity: 40,
            actualQuantity: 45,
            variance: 5,
          },
        ],
      },
    ],
  },
  cc_002: {
    _id: "cc_002" as Id<"work_sessions">,
    sessionCode: "CC-002",
    name: "Weekly Cycle Count - Full Warehouse",
    cycleCountType: { lookupValue: "Weekly" },
    sessionStatus: { lookupValue: "Completed" },
    createdByUser: { fullName: "Jane Smith" },
    createdAt: 1736553600000,
    zones: [
      {
        zoneId: "zone_001",
        zoneName: "Zone A - Electronics",
        assignedWorker: { fullName: "Bob Johnson" },
        matchedCount: 5,
        totalCount: 5,
        lineItems: [
          {
            _id: "li_010" as Id<"session_line_items">,
            productId: "P-0020",
            productName: "Circuit Board Type A",
            expectedQuantity: 100,
            actualQuantity: 100,
            variance: 0,
          },
          {
            _id: "li_011" as Id<"session_line_items">,
            productId: "P-0021",
            productName: "LED Display Panel",
            expectedQuantity: 50,
            actualQuantity: 50,
            variance: 0,
          },
          {
            _id: "li_012" as Id<"session_line_items">,
            productId: "P-0022",
            productName: "Power Supply Unit",
            expectedQuantity: 30,
            actualQuantity: 30,
            variance: 0,
          },
          {
            _id: "li_013" as Id<"session_line_items">,
            productId: "P-0023",
            productName: "USB Cable 2m",
            expectedQuantity: 200,
            actualQuantity: 200,
            variance: 0,
          },
          {
            _id: "li_014" as Id<"session_line_items">,
            productId: "P-0024",
            productName: "Wireless Module",
            expectedQuantity: 80,
            actualQuantity: 80,
            variance: 0,
          },
        ],
      },
      {
        zoneId: "zone_003",
        zoneName: "Zone C - Raw Materials",
        assignedWorker: { fullName: "Alice Brown" },
        matchedCount: 3,
        totalCount: 3,
        lineItems: [
          {
            _id: "li_015" as Id<"session_line_items">,
            productId: "P-0030",
            productName: "Steel Sheet 1mm",
            expectedQuantity: 500,
            actualQuantity: 500,
            variance: 0,
          },
          {
            _id: "li_016" as Id<"session_line_items">,
            productId: "P-0031",
            productName: "Aluminum Rod 10mm",
            expectedQuantity: 300,
            actualQuantity: 300,
            variance: 0,
          },
          {
            _id: "li_017" as Id<"session_line_items">,
            productId: "P-0032",
            productName: "Copper Wire 2mm",
            expectedQuantity: 1000,
            actualQuantity: 1000,
            variance: 0,
          },
        ],
      },
      {
        zoneId: "zone_004",
        zoneName: "Zone D - Packaging",
        assignedWorker: { fullName: "Charlie Davis" },
        matchedCount: 2,
        totalCount: 2,
        lineItems: [
          {
            _id: "li_018" as Id<"session_line_items">,
            productId: "P-0040",
            productName: "Cardboard Box Large",
            expectedQuantity: 400,
            actualQuantity: 400,
            variance: 0,
          },
          {
            _id: "li_019" as Id<"session_line_items">,
            productId: "P-0041",
            productName: "Bubble Wrap Roll",
            expectedQuantity: 50,
            actualQuantity: 50,
            variance: 0,
          },
        ],
      },
    ],
  },
};

// Helper function to get session details by ID
export function getMockSessionDetails(
  sessionId: string,
): CycleCountSessionWithDetails | null {
  return MOCK_CYCLE_COUNT_SESSION_DETAILS[sessionId] ?? null;
}
