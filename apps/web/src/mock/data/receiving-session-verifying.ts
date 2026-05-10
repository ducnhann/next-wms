/**
 * Mock data for receiving session verifying page
 */

export type VerifyingSessionItem = {
  id: string;
  skuCode: string;
  productName: string;
  expectedQty: number;
  recordedQty: number;
};

export type VerifyingSession = {
  id: string;
  sessionId: string;
  linkedPO: string;
  status: "SESSION STARTED" | "IN PROGRESS" | "COMPLETED";
  items: VerifyingSessionItem[];
};

// Mock data matching the design reference
export const MOCK_VERIFYING_SESSION: VerifyingSession = {
  id: "rs-001",
  sessionId: "S-001234",
  linkedPO: "PO-4590A",
  status: "SESSION STARTED",
  items: [
    {
      id: "item-1",
      skuCode: "SKU-C789",
      productName: "Product C - Premium Widget",
      expectedQty: 10,
      recordedQty: 0,
    },
    {
      id: "item-2",
      skuCode: "SKU-A123",
      productName: "Product A - Standard Widget",
      expectedQty: 1,
      recordedQty: 0,
    },
    {
      id: "item-3",
      skuCode: "SKU-B456",
      productName: "Product B - Deluxe Widget",
      expectedQty: 4,
      recordedQty: 0,
    },
  ],
};

// Helper to get session by ID (for future use)
export const getVerifyingSessionById = (
  id: string,
): VerifyingSession | undefined => {
  // For now, return the mock data for any ID
  return { ...MOCK_VERIFYING_SESSION, id };
};

// Get total expected quantity
export const getTotalExpected = (session: VerifyingSession): number => {
  return session.items.reduce((sum, item) => sum + item.expectedQty, 0);
};

// Get total recorded quantity
export const getTotalRecorded = (session: VerifyingSession): number => {
  return session.items.reduce((sum, item) => sum + item.recordedQty, 0);
};
