/**
 * Custom hooks for System Lookups API
 *
 * Provides hooks for accessing system lookup values
 */

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/use-current-user";

// Lookup type constants (matching backend)
export const LOOKUP_TYPES = {
  // Product related
  STORAGE_REQUIREMENT: "StorageRequirement",
  TRACKING_METHOD: "TrackingMethod",
  UNIT_OF_MEASURE: "UnitOfMeasure",
  BARCODE_TYPE: "BarcodeType",

  // Order statuses
  PURCHASE_ORDER_STATUS: "PurchaseOrderStatus",
  OUTBOUND_ORDER_STATUS: "OutboundOrderStatus",
  TRANSFER_ORDER_STATUS: "TransferOrderStatus",
  RETURN_STATUS: "ReturnStatus",

  // Session related
  SESSION_TYPE: "SessionType",
  SESSION_STATUS: "SessionStatus",
  CYCLE_COUNT_TYPE: "CycleCountType",
  RECEIVE_SESSION_STATUS: "ReceiveSessionStatus",
  RECEIVE_SESSION_ITEM_STATUS: "ReceiveSessionItemStatus",

  // Inventory related
  BATCH_STATUS: "BatchStatus",
  SERIAL_STATUS: "SerialStatus",
  INVENTORY_TRANSACTION_TYPE: "InventoryTransactionType",

  // Adjustment related
  ADJUSTMENT_STATUS: "AdjustmentStatus",
  ADJUSTMENT_TYPE: "AdjustmentType",
  ADJUSTMENT_REASON: "AdjustmentReason",

  // Other
  ZONE_TYPE: "ZoneType",
  NOTIFICATION_CATEGORY: "NotificationCategory",
  PRIORITY: "Priority",
  FORECAST_TYPE: "ForecastType",
  SHARING_SCOPE: "SharingScope",
  AUDIT_ACTION: "AuditAction",
  INVITATION_STATUS: "InvitationStatus",
  ASSIGNMENT_STATUS: "AssignmentStatus",
  RETURN_REASON: "ReturnReason",
} as const;

export type LookupType = (typeof LOOKUP_TYPES)[keyof typeof LOOKUP_TYPES];

export type SystemLookup = {
  _id: Id<"system_lookups">;
  _creationTime: number;
  lookupType: string;
  lookupCode: string;
  lookupValue: string;
  description: string;
  sortOrder: number;
};

/**
 * Get all lookups of a specific type
 */
export function useSystemLookups(lookupType: LookupType) {
  const { organizationId } = useCurrentUser();

  const queryResult = useQuery({
    ...convexQuery(
      api.systemLookups.getByType,
      organizationId
        ? { organizationId: organizationId as Id<"organizations">, lookupType }
        : "skip",
    ),
    enabled: !!organizationId,
  });

  return {
    lookups: (queryResult.data ?? []) as SystemLookup[],
    ...queryResult,
  };
}

/**
 * Get multiple lookup types at once
 * Useful for forms that need multiple dropdowns
 */
export function useMultipleSystemLookups(lookupTypes: LookupType[]) {
  const { organizationId } = useCurrentUser();

  const queryResult = useQuery({
    ...convexQuery(
      api.systemLookups.getMultipleTypes,
      organizationId
        ? { organizationId: organizationId as Id<"organizations">, lookupTypes }
        : "skip",
    ),
    enabled: !!organizationId,
  });

  return {
    lookupsByType: (queryResult.data ?? {}) as Record<string, SystemLookup[]>,
    ...queryResult,
  };
}

/**
 * Get a specific lookup by type and code
 */
export function useSystemLookupByCode(
  lookupType: LookupType,
  lookupCode: string,
) {
  const { organizationId } = useCurrentUser();

  const queryResult = useQuery({
    ...convexQuery(
      api.systemLookups.getByTypeAndCode,
      organizationId
        ? {
            organizationId: organizationId as Id<"organizations">,
            lookupType,
            lookupCode,
          }
        : "skip",
    ),
    enabled: !!organizationId,
  });

  return {
    lookup: queryResult.data as SystemLookup | null,
    ...queryResult,
  };
}

// ============================================================================
// Convenience hooks for common lookup types
// ============================================================================

export function useStorageRequirements() {
  return useSystemLookups(LOOKUP_TYPES.STORAGE_REQUIREMENT);
}

export function useTrackingMethods() {
  return useSystemLookups(LOOKUP_TYPES.TRACKING_METHOD);
}

export function useUnitsOfMeasure() {
  return useSystemLookups(LOOKUP_TYPES.UNIT_OF_MEASURE);
}

export function useBarcodeTypes() {
  return useSystemLookups(LOOKUP_TYPES.BARCODE_TYPE);
}

export function useZoneTypes() {
  return useSystemLookups(LOOKUP_TYPES.ZONE_TYPE);
}
