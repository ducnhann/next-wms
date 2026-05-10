import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, type MutationCtx } from "./_generated/server";
import { logAudit } from "./audit";
import { createNotification } from "./notifications";

/**
 * Get or create an inventory transaction type from system_lookups.
 * Creates the lookup if it doesn't exist.
 */
async function getOrCreateTransactionType(
  ctx: MutationCtx,
  transactionType: "RECEIVE" | "SHIP" | "ADJUST" | "TRANSFER" | "PICK"
): Promise<Id<"system_lookups">> {
  // Try to find existing lookup
  const existing = await ctx.db
    .query("system_lookups")
    .withIndex("lookupType_lookupCode", (q) =>
      q.eq("lookupType", "InventoryTransactionType").eq("lookupCode", transactionType)
    )
    .first();

  if (existing) {
    return existing._id;
  }

  // Create if not exists
  const lookupValues: Record<string, { value: string; order: number }> = {
    RECEIVE: { value: "Receive", order: 1 },
    SHIP: { value: "Ship", order: 2 },
    ADJUST: { value: "Adjust", order: 3 },
    TRANSFER: { value: "Transfer", order: 4 },
    PICK: { value: "Pick", order: 5 },
  };

  const id = await ctx.db.insert("system_lookups", {
    organizationId: undefined,
    lookupType: "InventoryTransactionType",
    lookupCode: transactionType,
    lookupValue: lookupValues[transactionType].value,
    description: `Inventory transaction type for ${transactionType.toLowerCase()} operations`,
    sortOrder: lookupValues[transactionType].order,
  });

  return id;
}

/**
 * Helper to log inventory transactions.
 * Automatically handles transaction type lookup creation.
 * Use this for tracking all inventory movements.
 */
export async function logInventoryTransaction(
  ctx: MutationCtx,
  args: {
    organizationId: Id<"organizations">;
    batchId?: Id<"inventory_batches">;
    serialNumberId?: Id<"serial_numbers">;
    quantityBefore: number;
    quantityChange: number;
    quantityAfter: number;
    transactionType: "RECEIVE" | "SHIP" | "ADJUST" | "TRANSFER" | "PICK";
    createdByUserId: Id<"users">;
    notes?: string;
    // Source document references
    purchaseOrderDetailId?: Id<"purchase_order_details">;
    transferOrderDetailId?: Id<"transfer_order_details">;
    workSessionId?: Id<"work_sessions">;
    adjustmentRequestDetailId?: Id<"adjustment_request_details">;
    outboundOrderDetailId?: Id<"outbound_order_details">;
  }
) {
  try {
    const transactionTypeId = await getOrCreateTransactionType(ctx, args.transactionType);

    await ctx.db.insert("inventory_transactions", {
      organizationId: args.organizationId,
      batchId: args.batchId,
      serialNumberId: args.serialNumberId,
      quantityBefore: args.quantityBefore,
      quantityChange: args.quantityChange,
      quantityAfter: args.quantityAfter,
      inventoryTransactionTypeId: transactionTypeId,
      createdByUserId: args.createdByUserId,
      notes: args.notes,
      purchaseOrderDetailId: args.purchaseOrderDetailId,
      transferOrderDetailId: args.transferOrderDetailId,
      workSessionId: args.workSessionId,
      adjustmentRequestDetailId: args.adjustmentRequestDetailId,
      outboundOrderDetailId: args.outboundOrderDetailId,
    });
  } catch (error) {
    // Log error but don't throw - transaction logging should not break main operations
    console.error("Failed to log inventory transaction:", error);
  }
}

/**
 * Adjust inventory quantity (increase or decrease).
 * Records the transaction and an audit log.
 */
export const adjustInventory = mutation({
  args: {
    batchId: v.id("inventory_batches"),
    quantityChange: v.number(), // Positive for increase, negative for decrease
    reasonTypeId: v.id("system_lookups"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.batchId);
    if (!batch) {
      throw new Error("Inventory batch not found");
    }

    const quantityBefore = batch.quantity;
    const quantityAfter = quantityBefore + args.quantityChange;

    if (quantityAfter < 0) {
      throw new Error("Insufficient inventory quantity");
    }

    // 1. Update the batch quantity
    await ctx.db.patch(args.batchId, {
      quantity: quantityAfter,
    });

    // 2. Get current user (who is performing the action)
    const identity = await ctx.auth.getUserIdentity();
    let userId: Id<"users"> | undefined;
    if (identity) {
      // Query user by email (Better Auth identity email)
      const user = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", identity.email ?? ""))
        .first();
      userId = user?._id;
    }

    if (!userId) {
      // In a real app, we might enforce authentication here
      // throw new Error("Unauthenticated");
    }

    // 3. Record the inventory transaction
    await ctx.db.insert("inventory_transactions", {
      organizationId: batch.organizationId,
      batchId: batch._id,
      quantityBefore: quantityBefore,
      quantityChange: args.quantityChange,
      quantityAfter: quantityAfter,
      inventoryTransactionTypeId: args.reasonTypeId,
      createdByUserId: userId!, // We assume user is found, or schema allows null (schema says v.id("users"))
      notes: args.notes,
    });

    // 4. Log Audit (System level log)
    await logAudit(ctx, {
      organizationId: batch.organizationId,
      userId: userId,
      actionTypeId: args.reasonTypeId, // Using the same reason as action type for simplicity
      entityType: "inventory_batches",
      entityId: batch._id,
      fieldName: "quantity",
      oldValue: quantityBefore,
      newValue: quantityAfter,
      notes: `Inventory adjustment: ${args.quantityChange > 0 ? "+" : ""}${args.quantityChange}. Reason: ${args.notes ?? "N/A"}`,
    });

    return {
      success: true,
      newQuantity: quantityAfter,
    };
  },
});

export const checkInventoryExpiration = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const threeMonthsFromNow = now + 90 * 24 * 60 * 60 * 1000;

    // 1. Get necessary lookup IDs (using fallbacks or specific codes)
    // We assume these lookups exist. In a real app, we might need to seed them.
    // Trying to find "ALERT" or "WARNING" for notification type
    let alertType = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q.eq("lookupType", "NOTIFICATION_TYPE").eq("lookupCode", "ALERT"),
      )
      .first();

    if (!alertType) {
      // Fallback: try to find any notification type
      alertType = await ctx.db
        .query("system_lookups")
        .withIndex("lookupType", (q) => q.eq("lookupType", "NOTIFICATION_TYPE"))
        .first();
    }

    // Trying to find "HIGH" for priority
    let highPriority = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q.eq("lookupType", "PRIORITY").eq("lookupCode", "HIGH"),
      )
      .first();

    if (!highPriority) {
      // Fallback
      highPriority = await ctx.db
        .query("system_lookups")
        .withIndex("lookupType", (q) => q.eq("lookupType", "PRIORITY"))
        .first();
    }

    if (!alertType || !highPriority) {
      console.error(
        "Missing system lookups for notifications (NOTIFICATION_TYPE or PRIORITY)",
      );
      return;
    }

    // 2. Query batches expiring soon
    // We use the index on expiresAt to efficiently find batches
    const expiringBatches = await ctx.db
      .query("inventory_batches")
      .withIndex("expiresAt", (q) =>
        q.gt("expiresAt", now).lt("expiresAt", threeMonthsFromNow),
      )
      .collect();

    // 3. Process batches
    for (const batch of expiringBatches) {
      if (batch.isDeleted) continue;

      // Get product info for the message
      const productVariant = await ctx.db.get(batch.skuId);
      if (!productVariant) continue;

      const product = await ctx.db.get(productVariant.productId);
      const productName = product ? product.name : "Unknown Product";

      // Find users to notify in the organization
      // In a real app, we might want to notify only specific roles (e.g. Warehouse Manager)
      // Query members table to find users in this organization
      const members = await ctx.db
        .query("members")
        .withIndex("organizationId", (q) =>
          q.eq("organizationId", batch.organizationId),
        )
        .collect();

      for (const member of members) {
        const user = await ctx.db.get(member.userId);
        if (!user || user.isDeleted || !user.isActive) continue;

        // Check if we already notified this user about this batch recently?
        // For simplicity, we'll just create the notification.
        // The user can mark it as read.

        await createNotification(ctx, {
          organizationId: batch.organizationId,
          notificationCategoryTypeId: alertType._id,
          notificationType: "Inventory Expiration",
          recipientUserId: user._id,
          title: "Inventory Expiration Warning",
          message: `Batch for ${productName} (SKU: ${productVariant.skuCode}) expires on ${new Date(batch.expiresAt!).toLocaleDateString()}`,
          priorityTypeId: highPriority._id,
          relatedEntityType: "inventory_batches",
          relatedEntityId: batch._id,
        });
      }
    }

    // console.log(
    //   `Checked inventory expiration. Found ${expiringBatches.length} batches expiring soon.`,
    // );
  },
});
