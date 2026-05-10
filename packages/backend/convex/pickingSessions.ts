import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

// ================================================================
// HELPER FUNCTIONS
// ================================================================

// Generate a unique picking session code
// Format: PS-YYYYMMDD-XXXX (e.g., PS-20260117-0001)
async function generatePickingSessionCode(
  ctx: any,
  branchId: Id<"branches">
): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");

  // Count existing sessions today for this branch
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const existingSessions = await ctx.db
    .query("picking_sessions")
    .withIndex("branchId", (q: any) => q.eq("branchId", branchId))
    .filter((q: any) =>
      q.and(
        q.gte(q.field("_creationTime"), startOfDay.getTime()),
        q.lt(q.field("_creationTime"), endOfDay.getTime())
      )
    )
    .collect();

  const nextNumber = (existingSessions.length + 1).toString().padStart(4, "0");
  return `PS-${dateStr}-${nextNumber}`;
}

// Get or create system lookup by type and code
async function getSystemLookup(
  ctx: any,
  lookupType: string,
  lookupCode: string
): Promise<Id<"system_lookups"> | null> {
  const lookup = await ctx.db
    .query("system_lookups")
    .filter((q: any) =>
      q.and(
        q.eq(q.field("lookupType"), lookupType),
        q.eq(q.field("lookupCode"), lookupCode)
      )
    )
    .first();
  return lookup?._id ?? null;
}

// Ensure a system lookup exists
async function ensureSystemLookup(
  ctx: any,
  lookupType: string,
  lookupCode: string,
  lookupValue: string,
  description: string
): Promise<Id<"system_lookups">> {
  const existing = await getSystemLookup(ctx, lookupType, lookupCode);
  if (existing) return existing;

  return await ctx.db.insert("system_lookups", {
    lookupType,
    lookupCode,
    lookupValue,
    description,
    sortOrder: 1,
  });
}

// ================================================================
// QUERIES
// ================================================================

/**
 * Get outbound orders ready for picking (Processing status)
 * Returns orders that don't already have an active picking session
 */
export const getProcessingOutboundOrdersByBranch = query({
  args: {
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    // Get Processing status ID
    const processingStatus = await ctx.db
      .query("system_lookups")
      .filter((q) =>
        q.and(
          q.eq(q.field("lookupType"), "OutboundOrderStatus"),
          q.eq(q.field("lookupCode"), "PROCESSING")
        )
      )
      .first();

    if (!processingStatus) {
      return [];
    }

    // Get outbound orders with Processing status
    const orders = await ctx.db
      .query("outbound_orders")
      .withIndex("branchId", (q) => q.eq("branchId", args.branchId))
      .filter((q) =>
        q.and(
          q.eq(q.field("isDeleted"), false),
          q.eq(q.field("outboundStatusTypeId"), processingStatus._id)
        )
      )
      .collect();

    // Filter out orders that already have a picking session
    const ordersWithSession = await Promise.all(
      orders.map(async (order) => {
        const existingSession = await ctx.db
          .query("picking_sessions")
          .withIndex("outboundOrderId", (q) =>
            q.eq("outboundOrderId", order._id)
          )
          .first();
        return { order, hasSession: !!existingSession };
      })
    );

    return ordersWithSession
      .filter((item) => !item.hasSession)
      .map((item) => ({
        _id: item.order._id,
        orderCode: item.order.orderCode,
        orderDate: item.order.orderDate,
        requestedShipDate: item.order.requestedShipDate,
      }));
  },
});

/**
 * Get picking session by ID with basic info
 */
export const getPickingSessionById = query({
  args: {
    pickingSessionId: v.id("picking_sessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.pickingSessionId);
    if (!session) return null;

    const status = session.statusTypeId
      ? await ctx.db.get(session.statusTypeId)
      : null;

    return {
      ...session,
      status: status ? { lookupValue: status.lookupValue } : null,
    };
  },
});

/**
 * Get detailed picking session information
 * Includes: SKU details, locations, quantities, status
 */
export const getPickingSessionDetailed = query({
  args: {
    pickingSessionId: v.id("picking_sessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.pickingSessionId);
    if (!session) {
      throw new Error("Picking session not found");
    }

    // Get outbound order
    const outboundOrder = await ctx.db.get(session.outboundOrderId);

    // Get session details (line items)
    const details = await ctx.db
      .query("picking_session_details")
      .withIndex("pickingSessionId", (q) =>
        q.eq("pickingSessionId", args.pickingSessionId)
      )
      .collect();

    // Enrich details with product and location information
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

        // Get location info from inventory batch (using zoneId)
        let location = null;
        if (detail.batchId) {
          const batch = await ctx.db.get(detail.batchId);
          if (batch?.zoneId) {
            const zone = await ctx.db.get(batch.zoneId);
            if (zone) {
              location = {
                zoneId: zone._id,
                zoneName: zone.name ?? "Unknown Zone",
                zonePath: zone.path ?? "",
                zoneType: zone.storageBlockType ?? "",
              };
            }
          }
        }

        return {
          _id: detail._id,
          skuCode,
          productName,
          quantityRequired: detail.quantityRequired,
          quantityPicked: detail.quantityPicked,
          batchId: detail.batchId,
          location,
        };
      })
    );

    // Get related entities
    const status = session.statusTypeId
      ? await ctx.db.get(session.statusTypeId)
      : null;
    const assignedUser = session.assignedUserId
      ? await ctx.db.get(session.assignedUserId)
      : null;

    // Calculate totals
    const totalItems = enrichedDetails.length;
    const totalQuantityRequired = enrichedDetails.reduce(
      (sum, item) => sum + item.quantityRequired,
      0
    );
    const totalQuantityPicked = enrichedDetails.reduce(
      (sum, item) => sum + item.quantityPicked,
      0
    );

    return {
      _id: session._id,
      sessionCode: session.sessionCode,
      outboundOrderId: session.outboundOrderId,
      outboundOrderCode: outboundOrder?.orderCode ?? null,
      assignedUser: assignedUser ? { fullName: assignedUser.fullName } : null,
      status: status ? { lookupValue: status.lookupValue } : null,
      items: enrichedDetails,
      totalItems,
      totalQuantityRequired,
      totalQuantityPicked,
      createdAt: session._creationTime,
    };
  },
});

/**
 * Get picking session progress overview
 */
export const getPickingSessionProgress = query({
  args: {
    pickingSessionId: v.id("picking_sessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.pickingSessionId);
    if (!session) {
      throw new Error("Picking session not found");
    }

    const outboundOrder = await ctx.db.get(session.outboundOrderId);
    const status = session.statusTypeId
      ? await ctx.db.get(session.statusTypeId)
      : null;

    // Get session details
    const details = await ctx.db
      .query("picking_session_details")
      .withIndex("pickingSessionId", (q) =>
        q.eq("pickingSessionId", args.pickingSessionId)
      )
      .collect();

    const totalRequired = details.reduce(
      (sum, d) => sum + d.quantityRequired,
      0
    );
    const totalPicked = details.reduce((sum, d) => sum + d.quantityPicked, 0);

    return {
      sessionId: session._id,
      sessionCode: session.sessionCode,
      linkedOrder: outboundOrder?.orderCode ?? "Unknown",
      status: status?.lookupValue ?? "Unknown",
      totalRequired,
      totalPicked,
      progressPercent:
        totalRequired > 0 ? Math.round((totalPicked / totalRequired) * 100) : 0,
    };
  },
});

/**
 * List all picking sessions for a branch
 */
export const listPickingSessions = query({
  args: {
    branchId: v.id("branches"),
    statusFilter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("picking_sessions")
      .withIndex("branchId", (q) => q.eq("branchId", args.branchId))
      .order("desc")
      .collect();

    const enrichedSessions = await Promise.all(
      sessions.map(async (session) => {
        const status = session.statusTypeId
          ? await ctx.db.get(session.statusTypeId)
          : null;
        const outboundOrder = await ctx.db.get(session.outboundOrderId);
        const assignedUser = session.assignedUserId
          ? await ctx.db.get(session.assignedUserId)
          : null;

        // Get progress
        const details = await ctx.db
          .query("picking_session_details")
          .withIndex("pickingSessionId", (q) =>
            q.eq("pickingSessionId", session._id)
          )
          .collect();

        const totalRequired = details.reduce(
          (sum, d) => sum + d.quantityRequired,
          0
        );
        const totalPicked = details.reduce(
          (sum, d) => sum + d.quantityPicked,
          0
        );

        return {
          _id: session._id,
          sessionCode: session.sessionCode,
          outboundOrderCode: outboundOrder?.orderCode ?? null,
          assignedUser: assignedUser
            ? { fullName: assignedUser.fullName }
            : null,
          status: status ? { lookupValue: status.lookupValue } : null,
          totalRequired,
          totalPicked,
          createdAt: session._creationTime,
        };
      })
    );

    // Filter by status if provided
    if (args.statusFilter) {
      return enrichedSessions.filter(
        (s) =>
          s.status?.lookupValue?.toLowerCase() ===
          args.statusFilter?.toLowerCase()
      );
    }

    return enrichedSessions;
  },
});

/**
 * Get items available for picking with their locations
 * Returns inventory batches grouped by SKU with location info
 */
export const getItemsForPicking = query({
  args: {
    pickingSessionId: v.id("picking_sessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.pickingSessionId);
    if (!session) {
      throw new Error("Picking session not found");
    }

    // Get session details
    const details = await ctx.db
      .query("picking_session_details")
      .withIndex("pickingSessionId", (q) =>
        q.eq("pickingSessionId", args.pickingSessionId)
      )
      .collect();

    const items = await Promise.all(
      details.map(async (detail) => {
        const variant = await ctx.db.get(detail.skuId);
        let productName: string | null = null;
        let skuCode = "Unknown";

        if (variant) {
          skuCode = variant.skuCode;
          const product = await ctx.db.get(variant.productId);
          productName = product?.name ?? null;
        }

        // Get all inventory batches for this SKU in the branch
        const batches = await ctx.db
          .query("inventory_batches")
          .withIndex("branchId", (q) => q.eq("branchId", session.branchId))
          .filter((q) =>
            q.and(
              q.eq(q.field("skuId"), detail.skuId),
              q.gt(q.field("quantity"), 0),
              q.eq(q.field("isDeleted"), false)
            )
          )
          .collect();

        // Enrich batches with zone info
        const batchesWithLocation = await Promise.all(
          batches.map(async (batch) => {
            let location = null;
            if (batch.zoneId) {
              const zone = await ctx.db.get(batch.zoneId);
              if (zone) {
                location = {
                  zoneId: zone._id,
                  zoneName: zone.name ?? "Unknown Zone",
                  zonePath: zone.path ?? "",
                  zoneType: zone.storageBlockType ?? "",
                };
              }
            }
            return {
              batchId: batch._id,
              batchNumber: batch.internalBatchNumber ?? batch.supplierBatchNumber ?? "Unknown",
              quantity: batch.quantity,
              location,
            };
          })
        );

        return {
          detailId: detail._id,
          skuId: detail.skuId,
          skuCode,
          productName,
          quantityRequired: detail.quantityRequired,
          quantityPicked: detail.quantityPicked,
          batches: batchesWithLocation,
        };
      })
    );

    return items;
  },
});

// ================================================================
// MUTATIONS
// ================================================================

/**
 * Create a new picking session from an outbound order
 */
export const createPickingSession = mutation({
  args: {
    outboundOrderId: v.id("outbound_orders"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get outbound order
    const outboundOrder = await ctx.db.get(args.outboundOrderId);
    if (!outboundOrder) {
      throw new Error("Outbound order not found");
    }

    // Check if picking session already exists
    const existingSession = await ctx.db
      .query("picking_sessions")
      .withIndex("outboundOrderId", (q) =>
        q.eq("outboundOrderId", args.outboundOrderId)
      )
      .first();

    // If session exists, return it so user can continue picking
    if (existingSession) {
      return {
        success: true,
        sessionId: existingSession._id,
        sessionCode: existingSession.sessionCode,
        isExisting: true,
      };
    }

    // Get or create Pending status
    const pendingStatusId = await ensureSystemLookup(
      ctx,
      "PickingSessionStatus",
      "PENDING",
      "Pending",
      "Picking session is pending"
    );

    // Generate session code
    const sessionCode = await generatePickingSessionCode(
      ctx,
      outboundOrder.branchId
    );

    // Create picking session
    const sessionId = await ctx.db.insert("picking_sessions", {
      organizationId: outboundOrder.organizationId,
      branchId: outboundOrder.branchId,
      outboundOrderId: args.outboundOrderId,
      sessionCode,
      assignedUserId: args.userId,
      statusTypeId: pendingStatusId,
      isDeleted: false,
    });

    // Get outbound order details
    const orderDetails = await ctx.db
      .query("outbound_order_details")
      .withIndex("outboundOrderId", (q) =>
        q.eq("outboundOrderId", args.outboundOrderId)
      )
      .collect();

    // Create picking session details for each order item
    for (const orderDetail of orderDetails) {
      // Find best batch to pick from (FIFO - oldest first)
      const batch = await ctx.db
        .query("inventory_batches")
        .withIndex("branchId", (q) => q.eq("branchId", outboundOrder.branchId))
        .filter((q) =>
          q.and(
            q.eq(q.field("skuId"), orderDetail.skuId),
            q.gt(q.field("quantity"), 0),
            q.eq(q.field("isDeleted"), false)
          )
        )
        .order("asc") // Oldest first
        .first();

      await ctx.db.insert("picking_session_details", {
        pickingSessionId: sessionId,
        skuId: orderDetail.skuId,
        batchId: batch?._id,
        quantityRequired: orderDetail.quantityRequested,
        quantityPicked: 0,
      });
    }

    // Update outbound order status to Picking
    const pickingStatusId = await ensureSystemLookup(
      ctx,
      "OutboundOrderStatus",
      "PICKING",
      "Picking",
      "Order is being picked"
    );
    await ctx.db.patch(args.outboundOrderId, {
      outboundStatusTypeId: pickingStatusId,
    });

    return {
      success: true,
      sessionId,
      sessionCode,
      isExisting: false,
    };
  },
});

/**
 * Process a picked item - update quantity
 */
export const processPickItem = mutation({
  args: {
    pickingSessionDetailId: v.id("picking_session_details"),
    quantityPicked: v.number(),
    batchId: v.optional(v.id("inventory_batches")),
  },
  handler: async (ctx, args) => {
    const detail = await ctx.db.get(args.pickingSessionDetailId);
    if (!detail) {
      throw new Error("Picking session detail not found");
    }

    const session = await ctx.db.get(detail.pickingSessionId);
    if (!session) {
      throw new Error("Picking session not found");
    }

    // Validate quantity
    if (args.quantityPicked < 0) {
      throw new Error("Quantity must be non-negative");
    }

    if (args.quantityPicked > detail.quantityRequired) {
      throw new Error("Cannot pick more than required quantity");
    }

    // Update the batch to use if provided
    const batchId = args.batchId ?? detail.batchId;

    // If picking from a batch, validate and update inventory
    if (batchId && args.quantityPicked > 0) {
      const batch = await ctx.db.get(batchId);
      if (!batch) {
        throw new Error("Inventory batch not found");
      }

      const additionalPicked = args.quantityPicked - detail.quantityPicked;
      if (additionalPicked > 0 && additionalPicked > batch.quantity) {
        throw new Error("Insufficient quantity in batch");
      }

      // Update batch quantity
      if (additionalPicked > 0) {
        await ctx.db.patch(batchId, {
          quantity: batch.quantity - additionalPicked,
        });
      }
    }

    // Update picking session detail
    await ctx.db.patch(args.pickingSessionDetailId, {
      quantityPicked: args.quantityPicked,
      batchId: batchId,
    });

    // Update session status to In Progress if needed
    const inProgressStatusId = await ensureSystemLookup(
      ctx,
      "PickingSessionStatus",
      "IN_PROGRESS",
      "In Progress",
      "Picking session is in progress"
    );

    if (session.statusTypeId !== inProgressStatusId) {
      await ctx.db.patch(detail.pickingSessionId, {
        statusTypeId: inProgressStatusId,
      });
    }

    return { success: true };
  },
});

/**
 * Complete a picking session
 */
export const completePickingSession = mutation({
  args: {
    pickingSessionId: v.id("picking_sessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.pickingSessionId);
    if (!session) {
      throw new Error("Picking session not found");
    }

    // Get all details to verify completion
    const details = await ctx.db
      .query("picking_session_details")
      .withIndex("pickingSessionId", (q) =>
        q.eq("pickingSessionId", args.pickingSessionId)
      )
      .collect();

    const allPicked = details.every(
      (d) => d.quantityPicked >= d.quantityRequired
    );

    // Get completed status
    const completedStatusId = await ensureSystemLookup(
      ctx,
      "PickingSessionStatus",
      "COMPLETED",
      "Completed",
      "Picking session is completed"
    );

    // Update session status
    await ctx.db.patch(args.pickingSessionId, {
      statusTypeId: completedStatusId,
      completedAt: Date.now(),
    });

    // Update outbound order picked quantities
    const outboundOrder = await ctx.db.get(session.outboundOrderId);
    if (outboundOrder) {
      for (const detail of details) {
        // Find matching outbound order detail
        const orderDetail = await ctx.db
          .query("outbound_order_details")
          .withIndex("outboundOrderId", (q) =>
            q.eq("outboundOrderId", session.outboundOrderId)
          )
          .filter((q) => q.eq(q.field("skuId"), detail.skuId))
          .first();

        if (orderDetail) {
          await ctx.db.patch(orderDetail._id, {
            quantityPicked: detail.quantityPicked,
          });
        }
      }

      // Update outbound order status based on vehicle arrival
      if (allPicked) {
        if (outboundOrder.vehicleArrivedAt) {
          // Vehicle arrived - go directly to Loading status
          const loadingStatusId = await ensureSystemLookup(
            ctx,
            "OutboundOrderStatus",
            "LOADING",
            "Loading",
            "Loading goods onto vehicle"
          );
          await ctx.db.patch(session.outboundOrderId, {
            outboundStatusTypeId: loadingStatusId,
          });
        } else {
          // Vehicle not arrived - set to Picked status
          const pickedStatusId = await ensureSystemLookup(
            ctx,
            "OutboundOrderStatus",
            "PICKED",
            "Picked",
            "Picking complete, waiting for vehicle"
          );
          await ctx.db.patch(session.outboundOrderId, {
            outboundStatusTypeId: pickedStatusId,
          });
        }
      }
    }

    return {
      success: true,
      allPicked,
    };
  },
});

/**
 * Start a picking session (change status to In Progress)
 */
export const startPickingSession = mutation({
  args: {
    pickingSessionId: v.id("picking_sessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.pickingSessionId);
    if (!session) {
      throw new Error("Picking session not found");
    }

    const inProgressStatusId = await ensureSystemLookup(
      ctx,
      "PickingSessionStatus",
      "IN_PROGRESS",
      "In Progress",
      "Picking session is in progress"
    );

    await ctx.db.patch(args.pickingSessionId, {
      statusTypeId: inProgressStatusId,
      startedAt: Date.now(),
    });

    return { success: true };
  },
});
