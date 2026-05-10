import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * List audit logs for an organization within a date range.
 * Joins with users and system_lookups for display names.
 */
export const listAuditLogs = query({
  args: {
    organizationId: v.id("organizations"),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Query audit logs for this organization
    let auditLogs = await ctx.db
      .query("audit_logs")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter by date range if provided
    if (args.dateFrom !== undefined) {
      auditLogs = auditLogs.filter((log) => log._creationTime >= args.dateFrom!);
    }
    if (args.dateTo !== undefined) {
      auditLogs = auditLogs.filter((log) => log._creationTime <= args.dateTo!);
    }

    // Sort by creation time descending (most recent first)
    auditLogs.sort((a, b) => b._creationTime - a._creationTime);

    // Join with users and system_lookups
    const enrichedLogs = await Promise.all(
      auditLogs.map(async (log) => {
        const [user, actionType] = await Promise.all([
          log.userId ? ctx.db.get(log.userId) : null,
          ctx.db.get(log.actionTypeId),
        ]);

        return {
          _id: log._id,
          timestamp: log._creationTime,
          userName: user?.fullName ?? "System",
          actionType: actionType?.lookupValue ?? "Unknown",
          actionTypeCode: actionType?.lookupCode ?? "",
          entityType: log.entityType,
          entityId: log.entityId ?? "",
          fieldName: log.fieldName ?? "",
          oldValue: log.oldValue,
          newValue: log.newValue,
          ipAddress: log.ipAddress ?? "",
          notes: log.notes ?? "",
        };
      })
    );

    return enrichedLogs;
  },
});

/**
 * List inventory transactions for an organization within a date range.
 * Joins with batches, SKUs, users, system_lookups, and work sessions.
 */
export const listInventoryTransactions = query({
  args: {
    organizationId: v.id("organizations"),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Query inventory transactions for this organization
    let transactions = await ctx.db
      .query("inventory_transactions")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter by date range if provided
    if (args.dateFrom !== undefined) {
      transactions = transactions.filter(
        (tx) => tx._creationTime >= args.dateFrom!
      );
    }
    if (args.dateTo !== undefined) {
      transactions = transactions.filter(
        (tx) => tx._creationTime <= args.dateTo!
      );
    }

    // Sort by creation time descending (most recent first)
    transactions.sort((a, b) => b._creationTime - a._creationTime);

    // Join with related tables
    const enrichedTransactions = await Promise.all(
      transactions.map(async (tx) => {
        const [batch, transactionType, user, workSession] = await Promise.all([
          tx.batchId ? ctx.db.get(tx.batchId) : null,
          ctx.db.get(tx.inventoryTransactionTypeId),
          ctx.db.get(tx.createdByUserId),
          tx.workSessionId ? ctx.db.get(tx.workSessionId) : null,
        ]);

        // Get SKU info from batch
        const sku = batch?.skuId ? await ctx.db.get(batch.skuId) : null;

        return {
          _id: tx._id,
          timestamp: tx._creationTime,
          transactionId: `T-${tx._id.slice(-6).toUpperCase()}`,
          skuCode: sku?.skuCode ?? "",
          batchNumber: batch?.internalBatchNumber ?? batch?.supplierBatchNumber ?? "",
          skuBatch: sku?.skuCode
            ? `${sku.skuCode}${batch?.internalBatchNumber ? ` / ${batch.internalBatchNumber}` : ""}`
            : "",
          transactionType: transactionType?.lookupValue ?? "Unknown",
          transactionTypeCode: transactionType?.lookupCode ?? "",
          quantityChange: tx.quantityChange,
          quantityAfter: tx.quantityAfter,
          sourceDoc: workSession?.sessionCode ?? "",
          userName: user?.fullName ?? "Unknown",
          notes: tx.notes ?? "",
        };
      })
    );

    return enrichedTransactions;
  },
});
