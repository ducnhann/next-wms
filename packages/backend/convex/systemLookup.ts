/**
 * SYSTEM LOOKUP API
 *
 * Provides query functions for the system_lookups table.
 * Used to get lookup IDs by type and code for status types, etc.
 */

import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Get a system lookup by type and code
 * Used to find status IDs like "PurchaseOrderStatus" + "PENDING"
 */
export const getLookupByTypeAndCode = query({
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
 * Get all lookups by type
 * Returns all lookup entries for a given type (e.g., all PurchaseOrderStatus values)
 */
export const getLookupsByType = query({
  args: {
    organizationId: v.id("organizations"),
    lookupType: v.string(),
  },
  handler: async (ctx, args) => {
    const lookups = await ctx.db
      .query("system_lookups")
      .withIndex("by_organization_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("lookupType", args.lookupType)
      )
      .collect();

    return lookups.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});
