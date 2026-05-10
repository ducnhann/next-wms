import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation } from "./_generated/server";

/**
 * Get or create an audit action type from system_lookups.
 * Creates the lookup if it doesn't exist.
 */
async function getOrCreateActionType(
  ctx: MutationCtx,
  action: "CREATE" | "UPDATE" | "DELETE"
): Promise<Id<"system_lookups">> {
  // Try to find existing lookup
  const existing = await ctx.db
    .query("system_lookups")
    .withIndex("lookupType_lookupCode", (q) =>
      q.eq("lookupType", "AuditActionType").eq("lookupCode", action)
    )
    .first();

  if (existing) {
    return existing._id;
  }

  // Create if not exists
  const lookupValues: Record<string, string> = {
    CREATE: "Create",
    UPDATE: "Update",
    DELETE: "Delete",
  };

  const id = await ctx.db.insert("system_lookups", {
    organizationId: undefined,
    lookupType: "AuditActionType",
    lookupCode: action,
    lookupValue: lookupValues[action],
    description: `Audit action type for ${action.toLowerCase()} operations`,
    sortOrder: action === "CREATE" ? 1 : action === "UPDATE" ? 2 : 3,
  });

  return id;
}

/**
 * Enhanced helper to log CRUD actions to audit_logs.
 * Automatically handles action type lookup creation.
 * Use this for monitoring all CRUD activities.
 */
export async function logCRUDAction(
  ctx: MutationCtx,
  args: {
    organizationId: Id<"organizations">;
    userId?: Id<"users">;
    action: "CREATE" | "UPDATE" | "DELETE";
    entityType: string;
    entityId?: string;
    fieldName?: string;
    oldValue?: any;
    newValue?: any;
    notes?: string;
  }
) {
  try {
    const actionTypeId = await getOrCreateActionType(ctx, args.action);

    await ctx.db.insert("audit_logs", {
      organizationId: args.organizationId,
      userId: args.userId,
      actionTypeId,
      entityType: args.entityType,
      entityId: args.entityId,
      fieldName: args.fieldName,
      oldValue: args.oldValue,
      newValue: args.newValue,
      notes: args.notes,
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not break main operations
    console.error("Failed to log audit action:", error);
  }
}

/**
 * Internal helper to create an audit log entry.
 * Can be called from other mutations/actions.
 */
export async function logAudit(
  ctx: MutationCtx,
  args: {
    organizationId: Id<"organizations">;
    userId?: Id<"users">;
    actionTypeId: Id<"system_lookups">;
    entityType: string;
    entityId?: string;
    fieldName?: string;
    oldValue?: any;
    newValue?: any;
    ipAddress?: string;
    notes?: string;
  },
) {
  await ctx.db.insert("audit_logs", {
    organizationId: args.organizationId,
    userId: args.userId,
    actionTypeId: args.actionTypeId,
    entityType: args.entityType,
    entityId: args.entityId,
    fieldName: args.fieldName,
    oldValue: args.oldValue,
    newValue: args.newValue,
    ipAddress: args.ipAddress,
    notes: args.notes,
  });
}

/**
 * Public mutation to create an audit log.
 * Useful for client-side logging or testing.
 */
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.optional(v.id("users")),
    actionTypeId: v.id("system_lookups"),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    fieldName: v.optional(v.string()),
    oldValue: v.optional(v.any()),
    newValue: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await logAudit(ctx, args);
  },
});
