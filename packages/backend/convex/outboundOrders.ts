import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { logCRUDAction } from "./audit";
import { createNotification } from "./notifications";

/**
 * Get all outbound orders for a branch (list view for table)
 * Returns only fields needed for the table display
 */
export const listOutboundOrders = query({
  args: {
    branchId: v.id("branches"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("outbound_orders")
      .withIndex("branchId", (q) => q.eq("branchId", args.branchId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .order("desc")
      .collect();

    // Enrich with status for table display
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const status = await ctx.db.get(order.outboundStatusTypeId);
        const createdByUser = await ctx.db.get(order.createdByUserId);

        return {
          _id: order._id,
          orderCode: order.orderCode,
          orderDate: order.orderDate,
          requestedShipDate: order.requestedShipDate ?? null,
          trackingNumber: order.trackingNumber ?? null,
          vehicleArrivedAt: order.vehicleArrivedAt ?? null,
          createdByUser: createdByUser
            ? { fullName: createdByUser.fullName }
            : null,
          outboundStatus: status
            ? { lookupValue: status.lookupValue, lookupCode: status.lookupCode }
            : null,
        };
      }),
    );

    return enrichedOrders;
  },
});

/**
 * Get outbound order with full details for the detail dialog
 * Returns all information needed to display the outbound order detail view
 */
export const getOutboundOrderDetailed = query({
  args: {
    orderId: v.id("outbound_orders"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Outbound order not found");
    }

    // Get order details (line items)
    const details = await ctx.db
      .query("outbound_order_details")
      .withIndex("outboundOrderId", (q) =>
        q.eq("outboundOrderId", args.orderId),
      )
      .collect();

    // Enrich details with product information
    const enrichedDetails = await Promise.all(
      details.map(async (detail) => {
        const variant = await ctx.db.get(detail.skuId);
        let productName: string | null = null;
        let skuCode = "Unknown";

        if (variant) {
          skuCode = variant.skuCode;
          const product = await ctx.db.get(variant.productId);
          productName = product?.name ?? null;
        }

        return {
          _id: detail._id,
          skuCode,
          productName,
          quantityRequested: detail.quantityRequested,
          quantityPicked: detail.quantityPicked,
          quantityPacked: detail.quantityPacked,
        };
      }),
    );

    // Get related entities
    const status = await ctx.db.get(order.outboundStatusTypeId);
    const createdByUser = await ctx.db.get(order.createdByUserId);

    // Calculate totals
    const totalItems = enrichedDetails.length;
    const totalQuantityRequested = enrichedDetails.reduce(
      (sum, item) => sum + item.quantityRequested,
      0,
    );
    const totalQuantityPicked = enrichedDetails.reduce(
      (sum, item) => sum + item.quantityPicked,
      0,
    );
    const totalQuantityPacked = enrichedDetails.reduce(
      (sum, item) => sum + item.quantityPacked,
      0,
    );

    return {
      _id: order._id,
      orderCode: order.orderCode,
      orderDate: order.orderDate,
      requestedShipDate: order.requestedShipDate ?? null,
      trackingNumber: order.trackingNumber ?? null,
      createdByUser: createdByUser
        ? { fullName: createdByUser.fullName }
        : null,
      outboundStatus: status ? { lookupValue: status.lookupValue } : null,
      items: enrichedDetails,
      totalItems,
      totalQuantityRequested,
      totalQuantityPicked,
      totalQuantityPacked,
    };
  },
});

/**
 * Get product variants available for outbound (from inventory batches)
 * Returns variants that have quantity > 0 in inventory
 */
export const getProductVariantsForOutbound = query({
  args: {
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    // Get all inventory batches for this branch with quantity > 0
    const inventoryBatches = await ctx.db
      .query("inventory_batches")
      .withIndex("branchId", (q) => q.eq("branchId", args.branchId))
      .filter((q) =>
        q.and(q.eq(q.field("isDeleted"), false), q.gt(q.field("quantity"), 0)),
      )
      .collect();

    // Get unique SKU IDs
    const skuIds = [...new Set(inventoryBatches.map((b) => b.skuId))];

    // Get variant details
    const variantsWithDetails = [];
    for (const skuId of skuIds) {
      const variant = await ctx.db.get(skuId);
      if (!variant || !variant.isActive || variant.isDeleted) continue;

      const product = await ctx.db.get(variant.productId);
      if (!product || !product.isActive || product.isDeleted) continue;

      // Calculate total available quantity across all batches
      const totalAvailable = inventoryBatches
        .filter((b) => b.skuId === skuId)
        .reduce((sum, b) => sum + b.quantity, 0);

      variantsWithDetails.push({
        variantId: variant._id,
        productId: product._id,
        productName: product.name,
        skuCode: variant.skuCode,
        description: variant.description,
        sellingPrice: variant.sellingPrice,
        availableQuantity: totalAvailable,
      });
    }

    return variantsWithDetails;
  },
});

/**
 * Create a new outbound order
 */
export const createOutboundOrder = mutation({
  args: {
    branchId: v.id("branches"),
    userId: v.id("users"),
    requestedShipDate: v.optional(v.number()),
    assignedWorkerId: v.optional(v.id("users")),
    items: v.array(
      v.object({
        variantId: v.id("product_variants"),
        quantity: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Validate items array is not empty
    if (!args.items || args.items.length === 0) {
      throw new Error("Outbound order must contain at least one item");
    }

    // Validate quantities are positive
    for (const item of args.items) {
      if (item.quantity <= 0) {
        throw new Error("Item quantity must be greater than 0");
      }
    }

    // Get branch to verify it exists and get organizationId
    const branch = await ctx.db.get(args.branchId);
    if (!branch) {
      throw new Error("Branch not found");
    }

    // Get the "Pending" status from system_lookups
    const pendingStatus = await ctx.db
      .query("system_lookups")
      .filter((q) =>
        q.and(
          q.eq(q.field("lookupType"), "OutboundOrderStatus"),
          q.eq(q.field("lookupValue"), "Pending"),
        ),
      )
      .first();

    if (!pendingStatus) {
      throw new Error("Pending status not found in system lookups");
    }

    // Generate outbound order code (format: OUT-YYYY-XXXX)
    const now = Date.now();
    const date = new Date(now);
    const year = date.getFullYear();

    // Get count of orders this year to generate sequence number
    const startOfYear = new Date(year, 0, 1).getTime();
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999).getTime();

    const yearOrders = await ctx.db
      .query("outbound_orders")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", branch.organizationId),
      )
      .filter((q) =>
        q.and(
          q.gte(q.field("orderDate"), startOfYear),
          q.lte(q.field("orderDate"), endOfYear),
        ),
      )
      .collect();

    const sequence = (yearOrders.length + 1).toString().padStart(4, "0");
    const orderCode = `OUT-${year}-${sequence}`;

    // Insert outbound order
    const orderId = await ctx.db.insert("outbound_orders", {
      organizationId: branch.organizationId,
      branchId: args.branchId,
      orderCode,
      orderDate: now,
      requestedShipDate: args.requestedShipDate,
      createdByUserId: args.userId,
      outboundStatusTypeId: pendingStatus._id,
      isDeleted: false,
      assignedWorkerId: args.assignedWorkerId,
    });

    // Insert outbound order details for each item
    for (const item of args.items) {
      await ctx.db.insert("outbound_order_details", {
        outboundOrderId: orderId,
        skuId: item.variantId,
        quantityRequested: item.quantity,
        quantityPicked: 0,
        quantityPacked: 0,
      });
    }

    // Send notification to assigned worker
    if (args.assignedWorkerId) {
      // Get notification category lookup (NotificationCategory, INFO)
      const notificationCategory = await ctx.db
        .query("system_lookups")
        .withIndex("lookupType_lookupCode", (q) =>
          q.eq("lookupType", "NotificationCategory").eq("lookupCode", "INFO"),
        )
        .first();

      // Get priority lookup (Priority, HIGH)
      const priorityLookup = await ctx.db
        .query("system_lookups")
        .withIndex("lookupType_lookupCode", (q) =>
          q.eq("lookupType", "Priority").eq("lookupCode", "HIGH"),
        )
        .first();

      // Only send notification if lookups exist
      if (notificationCategory && priorityLookup) {
        await createNotification(ctx, {
          organizationId: branch.organizationId,
          notificationCategoryTypeId: notificationCategory._id,
          notificationType: "OUTBOUND_ORDER_ASSIGNED",
          recipientUserId: args.assignedWorkerId,
          title: "New Outbound Order Assigned",
          message: `You have been assigned to outbound order ${orderCode}`,
          priorityTypeId: priorityLookup._id,
          actionUrl: `/outbound-orders/${orderId}`,
          relatedEntityType: "outbound_orders",
          relatedEntityId: orderId,
        });
      }
    }

    // Log audit for outbound order creation
    await logCRUDAction(ctx, {
      organizationId: branch.organizationId,
      userId: args.userId,
      action: "CREATE",
      entityType: "outbound_orders",
      entityId: orderId,
      newValue: { orderCode, itemCount: args.items.length },
      notes: `Created outbound order ${orderCode} with ${args.items.length} items`,
    });

    return {
      success: true,
      orderId,
      orderCode,
    };
  },
});

// Helper to get or create system lookup
async function ensureSystemLookup(
  ctx: any,
  lookupType: string,
  lookupCode: string,
  lookupValue: string,
  description: string,
) {
  const existing = await ctx.db
    .query("system_lookups")
    .filter((q: any) =>
      q.and(
        q.eq(q.field("lookupType"), lookupType),
        q.eq(q.field("lookupCode"), lookupCode),
      ),
    )
    .first();

  if (existing) return existing._id;

  return await ctx.db.insert("system_lookups", {
    lookupType,
    lookupCode,
    lookupValue,
    description,
    sortOrder: 1,
  });
}

/**
 * Mark vehicle as arrived for an outbound order
 */
export const markVehicleArrived = mutation({
  args: {
    orderId: v.id("outbound_orders"),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Outbound order not found");
    }

    if (order.vehicleArrivedAt) {
      return { success: true, alreadyArrived: true };
    }

    await ctx.db.patch(args.orderId, {
      vehicleArrivedAt: Date.now(),
    });

    return { success: true, alreadyArrived: false };
  },
});

/**
 * Start loading goods onto vehicle
 * Can only be done when order is in "Picked" status and vehicle has arrived
 */
export const startLoading = mutation({
  args: {
    orderId: v.id("outbound_orders"),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Outbound order not found");
    }

    // Check if vehicle has arrived
    if (!order.vehicleArrivedAt) {
      throw new Error("Vehicle has not arrived yet");
    }

    // Get current status
    const currentStatus = await ctx.db.get(order.outboundStatusTypeId);
    if (currentStatus?.lookupCode !== "PICKED") {
      throw new Error("Order must be in 'Picked' status to start loading");
    }

    // Get or create Loading status
    const loadingStatusId = await ensureSystemLookup(
      ctx,
      "OutboundOrderStatus",
      "LOADING",
      "Loading",
      "Loading goods onto vehicle",
    );

    await ctx.db.patch(args.orderId, {
      outboundStatusTypeId: loadingStatusId,
    });

    return { success: true };
  },
});

/**
 * Complete loading - marks order as shipped
 */
export const completeLoading = mutation({
  args: {
    orderId: v.id("outbound_orders"),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Outbound order not found");
    }

    // Get current status
    const currentStatus = await ctx.db.get(order.outboundStatusTypeId);
    if (currentStatus?.lookupCode !== "LOADING") {
      throw new Error("Order must be in 'Loading' status to complete");
    }

    // Update quantityPacked to match quantityPicked for all order details
    const orderDetails = await ctx.db
      .query("outbound_order_details")
      .withIndex("outboundOrderId", (q) =>
        q.eq("outboundOrderId", args.orderId),
      )
      .collect();

    for (const detail of orderDetails) {
      await ctx.db.patch(detail._id, {
        quantityPacked: detail.quantityPicked,
      });
    }

    // Get or create Shipped status
    const shippedStatusId = await ensureSystemLookup(
      ctx,
      "OutboundOrderStatus",
      "SHIPPED",
      "Shipped",
      "Order has been shipped",
    );

    await ctx.db.patch(args.orderId, {
      outboundStatusTypeId: shippedStatusId,
    });

    return { success: true };
  },
});
