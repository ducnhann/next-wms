/**
 * Mock data for picking session verifying page
 */

export type PickingSessionLocation = {
  zoneId: string;
  zoneName: string;
  zonePath: string;
  zoneType: string;
};

export type VerifyingPickingSessionItem = {
  id: string;
  skuCode: string;
  productName: string;
  expectedQty: number;
  pickedQty: number;
  location: PickingSessionLocation | null;
};

export type VerifyingPickingSession = {
  id: string;
  sessionId: string;
  linkedOrder: string;
  status: "SESSION STARTED" | "IN PROGRESS" | "COMPLETED";
  items: VerifyingPickingSessionItem[];
};

// Mock data matching the design reference
export const MOCK_VERIFYING_PICKING_SESSION: VerifyingPickingSession = {
  id: "ps-001",
  sessionId: "PS-20260117-0001",
  linkedOrder: "OUT-2026-0001",
  status: "SESSION STARTED",
  items: [
    {
      id: "item-1",
      skuCode: "SKU-C789",
      productName: "Product C - Premium Widget",
      expectedQty: 10,
      pickedQty: 0,
      location: {
        zoneId: "zone-1",
        zoneName: "Storage Zone A",
        zonePath: "Warehouse > Building 1 > Floor 1 > Zone A",
        zoneType: "STORAGE",
      },
    },
    {
      id: "item-2",
      skuCode: "SKU-A123",
      productName: "Product A - Standard Widget",
      expectedQty: 1,
      pickedQty: 0,
      location: {
        zoneId: "zone-2",
        zoneName: "Storage Zone B",
        zonePath: "Warehouse > Building 1 > Floor 1 > Zone B",
        zoneType: "STORAGE",
      },
    },
    {
      id: "item-3",
      skuCode: "SKU-B456",
      productName: "Product B - Deluxe Widget",
      expectedQty: 4,
      pickedQty: 0,
      location: {
        zoneId: "zone-3",
        zoneName: "Cold Storage",
        zonePath: "Warehouse > Building 2 > Cold Section",
        zoneType: "COLD_STORAGE",
      },
    },
  ],
};

// Helper to get session by ID (for future use)
export const getVerifyingPickingSessionById = (
  id: string,
): VerifyingPickingSession | undefined => {
  // For now, return the mock data for any ID
  return { ...MOCK_VERIFYING_PICKING_SESSION, id };
};

// Get total expected quantity
export const getTotalExpectedPicking = (
  session: VerifyingPickingSession,
): number => {
  return session.items.reduce((sum, item) => sum + item.expectedQty, 0);
};

// Get total picked quantity
export const getTotalPickedPicking = (
  session: VerifyingPickingSession,
): number => {
  return session.items.reduce((sum, item) => sum + item.pickedQty, 0);
};
