/**
 * SYSTEM LOOKUPS API
 *
 * Provides access to system lookup values used across the application.
 * All lookups are organization-scoped.
 * 
 * Lookup types include:
 * - StorageRequirement (NORMAL, COLD, FREEZER)
 * - TrackingMethod (FIFO, FEFO, SERIAL)
 * - UnitOfMeasure (PCS, BOX, KG)
 * - BarcodeType (EAN13, QR)
 * - And many more...
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * LIST ALL - Get all system lookups for an organization
 */
export const list = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const lookups = await ctx.db
      .query("system_lookups")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return lookups.sort((a, b) => {
      if (a.lookupType !== b.lookupType) {
        return a.lookupType.localeCompare(b.lookupType);
      }
      return a.sortOrder - b.sortOrder;
    });
  },
});

/**
 * GET BY TYPE - Get all lookups of a specific type for an organization
 */
export const getByType = query({
  args: {
    organizationId: v.id("organizations"),
    lookupType: v.string(),
  },
  handler: async (ctx, args) => {
    const lookups = await ctx.db
      .query("system_lookups")
      .withIndex("by_organization_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("lookupType", args.lookupType)
      )
      .collect();

    return lookups.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

/**
 * GET BY TYPE AND CODE - Get a specific lookup by type and code
 */
export const getByTypeAndCode = query({
  args: {
    organizationId: v.id("organizations"),
    lookupType: v.string(),
    lookupCode: v.string(),
  },
  handler: async (ctx, args) => {
    const lookup = await ctx.db
      .query("system_lookups")
      .withIndex("by_organization_type_code", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("lookupType", args.lookupType)
          .eq("lookupCode", args.lookupCode)
      )
      .first();

    return lookup;
  },
});

/**
 * GET BY ID - Get a lookup by its ID
 */
export const get = query({
  args: {
    id: v.id("system_lookups"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * GET MULTIPLE BY TYPE - Get multiple lookup types at once
 * Useful for loading form dropdowns in one query
 */
export const getMultipleTypes = query({
  args: {
    organizationId: v.id("organizations"),
    lookupTypes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const results: Record<
      string,
      Array<{
        _id: string;
        lookupType: string;
        lookupCode: string;
        lookupValue: string;
        description: string;
        sortOrder: number;
      }>
    > = {};

    for (const lookupType of args.lookupTypes) {
      const lookups = await ctx.db
        .query("system_lookups")
        .withIndex("by_organization_type", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("lookupType", lookupType)
        )
        .collect();

      results[lookupType] = lookups.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    return results;
  },
});

/**
 * GET UNIQUE TYPES - Get list of unique lookup types for an organization
 */
export const getUniqueTypes = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const lookups = await ctx.db
      .query("system_lookups")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const types = [...new Set(lookups.map((l) => l.lookupType))];
    return types.sort((a, b) => a.localeCompare(b));
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * CREATE - Create a new system lookup
 */
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    lookupType: v.string(),
    lookupCode: v.string(),
    lookupValue: v.string(),
    description: v.string(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    // Check for duplicate type+code combination within organization
    const existing = await ctx.db
      .query("system_lookups")
      .withIndex("by_organization_type_code", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("lookupType", args.lookupType)
          .eq("lookupCode", args.lookupCode)
      )
      .first();

    if (existing) {
      throw new Error(
        `Lookup with type "${args.lookupType}" and code "${args.lookupCode}" already exists`
      );
    }

    const id = await ctx.db.insert("system_lookups", {
      organizationId: args.organizationId,
      lookupType: args.lookupType,
      lookupCode: args.lookupCode,
      lookupValue: args.lookupValue,
      description: args.description,
      sortOrder: args.sortOrder,
    });

    return id;
  },
});

/**
 * UPDATE - Update an existing system lookup
 */
export const update = mutation({
  args: {
    id: v.id("system_lookups"),
    lookupValue: v.optional(v.string()),
    description: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Lookup not found");
    }

    // Filter out undefined values
    const cleanUpdates: Partial<{
      lookupValue: string;
      description: string;
      sortOrder: number;
    }> = {};

    if (updates.lookupValue !== undefined) {
      cleanUpdates.lookupValue = updates.lookupValue;
    }
    if (updates.description !== undefined) {
      cleanUpdates.description = updates.description;
    }
    if (updates.sortOrder !== undefined) {
      cleanUpdates.sortOrder = updates.sortOrder;
    }

    await ctx.db.patch(id, cleanUpdates);

    return id;
  },
});

/**
 * DELETE - Delete a system lookup
 */
export const remove = mutation({
  args: {
    id: v.id("system_lookups"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Lookup not found");
    }

    await ctx.db.delete(args.id);

    return args.id;
  },
});

// ============================================================================
// CONSTANTS
// ============================================================================

// Common lookup type constants for type safety
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
