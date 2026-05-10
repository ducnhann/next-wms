import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { logCRUDAction } from "./audit";
import { logInventoryTransaction } from "./inventory";
import { createNotification } from "./notifications";

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Generate a unique receive session code
 * Format: RS-YYYY-MM-XXX (e.g., RS-2026-01-003)
 */
async function generateReceiveSessionCode(
  ctx: any,
  branchId: Id<"branches">,
): Promise<string> {
  const now = Date.now();
  const date = new Date(now);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");

  // Get count of sessions this month for this branch
  const startOfMonth = new Date(
    date.getFullYear(),
    date.getMonth(),
    1,
  ).getTime();
  const endOfMonth = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  ).getTime();

  const monthSessions = await ctx.db
    .query("receive_sessions")
    .withIndex("branchId", (q: any) => q.eq("branchId", branchId))
    .filter((q: any) =>
      q.and(
        q.gte(q.field("receivedAt"), startOfMonth),
        q.lte(q.field("receivedAt"), endOfMonth),
      ),
    )
    .collect();

  const sequence = (monthSessions.length + 1).toString().padStart(3, "0");
  return `RS-${year}-${month}-${sequence}`;
}

/**
 * Generate a unique work session code
 * Format: WS-YYYYMMDD-XXXX
 */
async function generateWorkSessionCode(
  ctx: any,
  branchId: Id<"branches">,
): Promise<string> {
  const now = Date.now();
  const date = new Date(now);
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");

  const startOfDay = new Date(date.setHours(0, 0, 0, 0)).getTime();
  const endOfDay = new Date(date.setHours(23, 59, 59, 999)).getTime();

  const todaySessions = await ctx.db
    .query("work_sessions")
    .withIndex("branchId", (q: any) => q.eq("branchId", branchId))
    .filter((q: any) =>
      q.and(
        q.gte(q.field("startedAt"), startOfDay),
        q.lte(q.field("startedAt"), endOfDay),
      ),
    )
    .collect();

  const sequence = (todaySessions.length + 1).toString().padStart(4, "0");
  return `WS-${dateStr}-${sequence}`;
}

/**
 * Get or create a system lookup by type and code
 */
async function getSystemLookup(
  ctx: any,
  lookupType: string,
  lookupCode: string,
): Promise<Id<"system_lookups"> | null> {
  const lookup = await ctx.db
    .query("system_lookups")
    .withIndex("lookupType_lookupCode", (q: any) =>
      q.eq("lookupType", lookupType).eq("lookupCode", lookupCode),
    )
    .first();

  return lookup?._id ?? null;
}

/**
 * Ensure a system lookup exists, create if missing
 */
async function ensureSystemLookup(
  ctx: any,
  lookupType: string,
  lookupCode: string,
  lookupValue: string,
  description: string,
): Promise<Id<"system_lookups">> {
  const existingLookup = await getSystemLookup(ctx, lookupType, lookupCode);

  if (existingLookup) {
    return existingLookup;
  }

  const newLookupId = await ctx.db.insert("system_lookups", {
    lookupType,
    lookupCode,
    lookupValue,
    description,
    sortOrder: 1,
  });

  return newLookupId;
}

/**
 * Generate a supplier batch number
 * Format: SB-YYYYMMDD-XXX
 */
async function generateSupplierBatchNumber(
  ctx: any,
  branchId: Id<"branches">,
): Promise<string> {
  const now = Date.now();
  const date = new Date(now);
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");

  const startOfDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  ).getTime();
  const endOfDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  ).getTime();

  const todayBatches = await ctx.db
    .query("inventory_batches")
    .withIndex("branchId", (q: any) => q.eq("branchId", branchId))
    .filter((q: any) =>
      q.and(
        q.gte(q.field("receivedAt"), startOfDay),
        q.lte(q.field("receivedAt"), endOfDay),
      ),
    )
    .collect();

  const sequence = (todayBatches.length + 1).toString().padStart(3, "0");
  return `SB-${dateStr}-${sequence}`;
}

/**
 * Generate an internal batch number
 * Format: IB-YYYYMMDD-XXX
 */
async function generateInternalBatchNumber(
  ctx: any,
  branchId: Id<"branches">,
): Promise<string> {
  const now = Date.now();
  const date = new Date(now);
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");

  const startOfDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  ).getTime();
  const endOfDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  ).getTime();

  const todayBatches = await ctx.db
    .query("inventory_batches")
    .withIndex("branchId", (q: any) => q.eq("branchId", branchId))
    .filter((q: any) =>
      q.and(
        q.gte(q.field("receivedAt"), startOfDay),
        q.lte(q.field("receivedAt"), endOfDay),
      ),
    )
    .collect();

  const sequence = (todayBatches.length + 1).toString().padStart(3, "0");
  return `IB-${dateStr}-${sequence}`;
}

/**
 * Generate a return request code
 * Format: RR-YYYYMMDD-XXXX
 */
async function generateReturnRequestCode(
  ctx: any,
  branchId: Id<"branches">,
): Promise<string> {
  const now = Date.now();
  const date = new Date(now);
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");

  const startOfDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  ).getTime();
  const endOfDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  ).getTime();

  const todayReturns = await ctx.db
    .query("return_requests")
    .withIndex("branchId", (q: any) => q.eq("branchId", branchId as any))
    .filter((q: any) =>
      q.and(
        q.gte(q.field("requestedAt"), startOfDay),
        q.lte(q.field("requestedAt"), endOfDay),
      ),
    )
    .collect();

  const sequence = (todayReturns.length + 1).toString().padStart(4, "0");
  return `RR-${dateStr}-${sequence}`;
}

/**
 * Get a random storage zone from the branch for zone recommendation
 * Filters by branch and optionally by zone type
 */
async function getRandomStorageZone(
  ctx: any,
  branchId: Id<"branches">,
  zoneTypeCode?: string,
): Promise<Id<"storage_zones"> | null> {
  let zones = await ctx.db
    .query("storage_zones")
    .withIndex("branchId", (q: any) => q.eq("branchId", branchId))
    .filter((q: any) => q.eq(q.field("isDeleted"), false))
    .collect();

  // Filter by zone type if specified
  if (zoneTypeCode && zones.length > 0) {
    const zoneType = await getSystemLookup(ctx, "ZoneType", zoneTypeCode);
    if (zoneType) {
      zones = zones.filter((z: any) => z.zoneTypeId === zoneType);
    }
  }

  if (zones.length === 0) {
    return null;
  }

  // Return random zone
  const randomIndex = Math.floor(Math.random() * zones.length);
  return zones[randomIndex]._id;
}

/**
 * Create or get work session for a receive session
 */
async function ensureWorkSession(
  ctx: any,
  organizationId: Id<"organizations">,
  branchId: Id<"branches">,
  receiveSessionId: Id<"receive_sessions">,
  assignedUserId: Id<"users">,
): Promise<Id<"work_sessions">> {
  // Check if work session already exists for this receive session
  const existingSession = await ctx.db
    .query("work_sessions")
    .withIndex("receiveSessionId", (q: any) =>
      q.eq("receiveSessionId", receiveSessionId),
    )
    .first();

  if (existingSession) {
    return existingSession._id;
  }

  // Get required lookup IDs
  const sessionTypeId = await ensureSystemLookup(
    ctx,
    "SessionType",
    "INBOUND",
    "Inbound Receiving",
    "Work session for receiving inbound goods",
  );

  const sessionStatusId = await ensureSystemLookup(
    ctx,
    "SessionStatus",
    "IN_PROGRESS",
    "In Progress",
    "Session is currently in progress",
  );

  // Generate work session code
  const sessionCode = await generateWorkSessionCode(ctx, branchId);

  // Create work session
  const workSessionId = await ctx.db.insert("work_sessions", {
    organizationId,
    branchId,
    sessionTypeId,
    sessionCode,
    name: `Receiving Session ${sessionCode}`,
    description: "Auto-generated work session for receiving",
    assignedUserId,
    sessionStatusTypeId: sessionStatusId,
    startedAt: Date.now(),
    receiveSessionId,
  });

  return workSessionId;
}

// ================================================================
// QUERIES
// ================================================================

/**
 * Get all return reason types from system lookups
 * Used for populating return reason dropdown in the UI
 */
export const getReturnReasons = query({
  args: {},
  handler: async (ctx) => {
    const reasons = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType", (q) => q.eq("lookupType", "ReturnReason"))
      .collect();

    return reasons.map((reason) => ({
      _id: reason._id,
      lookupCode: reason.lookupCode,
      lookupValue: reason.lookupValue,
    }));
  },
});

/**
 * Get pending purchase orders by branch (for dropdown selection when creating receive session)
 * Returns only POs with "Pending" status that don't already have a receive session
 */
export const getPendingPurchaseOrdersByBranch = query({
  args: {
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    // Get only pending status (not partial, as partial already has receive sessions)
    const pendingStatus = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q.eq("lookupType", "PurchaseOrderStatus").eq("lookupCode", "PENDING"),
      )
      .first();

    if (!pendingStatus) {
      return [];
    }

    // Get all purchase orders with pending status for this branch
    const purchaseOrders = await ctx.db
      .query("purchase_orders")
      .withIndex("branchId", (q) => q.eq("branchId", args.branchId))
      .filter((q) =>
        q.and(
          q.eq(q.field("isDeleted"), false),
          q.eq(q.field("purchaseOrderStatusTypeId"), pendingStatus._id),
        ),
      )
      .collect();

    // Get all existing receive sessions for this branch to exclude POs that already have one
    const existingReceiveSessions = await ctx.db
      .query("receive_sessions")
      .withIndex("branchId", (q) => q.eq("branchId", args.branchId))
      .collect();

    const existingPOIds = new Set(
      existingReceiveSessions.map((rs) => rs.purchaseOrderId),
    );

    // Filter out POs that already have receive sessions and enrich with supplier name
    const filteredOrders = [];
    for (const order of purchaseOrders) {
      // Skip if this PO already has a receive session
      if (existingPOIds.has(order._id)) {
        continue;
      }

      const supplier = await ctx.db.get(order.supplierId);
      const status = await ctx.db.get(order.purchaseOrderStatusTypeId);

      filteredOrders.push({
        purchaseOrderId: order._id,
        code: order.code,
        supplierName: supplier?.name ?? "Unknown",
        statusName: status?.lookupValue ?? "Unknown",
        orderedAt: order.orderedAt,
        expectedDeliveryAt: order.expectedDeliveryAt,
      });
    }

    return filteredOrders;
  },
});

/**
 * Get receive session by ID with basic info
 */
export const getReceiveSessionById = query({
  args: {
    receiveSessionId: v.id("receive_sessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.receiveSessionId);
    if (!session) {
      return null;
    }

    const purchaseOrder = await ctx.db.get(session.purchaseOrderId);
    const status = await ctx.db.get(session.receiveSessionStatusTypeId);

    return {
      ...session,
      purchaseOrderCode: purchaseOrder?.code ?? "Unknown",
      statusName: status?.lookupValue ?? "Unknown",
    };
  },
});

/**
 * Get detailed receive session information
 * Includes: SKU details, work session info, employee, quantities, status
 */
export const getReceiveSessionDetailed = query({
  args: {
    receiveSessionId: v.id("receive_sessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.receiveSessionId);
    if (!session) {
      throw new Error("Receive session not found");
    }

    // Get receive session details (line items)
    const details = await ctx.db
      .query("receive_sessions_details")
      .withIndex("receiveSessionId", (q) =>
        q.eq("receiveSessionId", args.receiveSessionId),
      )
      .collect();

    // Enrich details with SKU information
    const enrichedDetails = await Promise.all(
      details.map(async (detail) => {
        const variant = await ctx.db.get(detail.skuId);
        const product = variant ? await ctx.db.get(variant.productId) : null;
        const itemStatus = await ctx.db.get(
          detail.receiveSessionItemStatusTypeId,
        );
        const zone = detail.recommendedZoneId
          ? await ctx.db.get(detail.recommendedZoneId)
          : null;

        return {
          detailId: detail._id,
          skuId: detail.skuId,
          skuCode: variant?.skuCode ?? "Unknown",
          productName: product?.name ?? "Unknown",
          quantityExpected: detail.quantityExpected,
          quantityReceived: detail.quantityReceived,
          notes: detail.notes,
          status: itemStatus?.lookupValue ?? "Unknown",
          statusCode: itemStatus?.lookupCode ?? "UNKNOWN",
          recommendedZone: zone?.name ?? null,
          recommendedZoneId: detail.recommendedZoneId,
        };
      }),
    );

    // Get linked work session
    const workSession = await ctx.db
      .query("work_sessions")
      .withIndex("receiveSessionId", (q) =>
        q.eq("receiveSessionId", args.receiveSessionId),
      )
      .first();

    let workSessionInfo = null;
    if (workSession) {
      const employee = await ctx.db.get(workSession.assignedUserId);
      const wsStatus = await ctx.db.get(workSession.sessionStatusTypeId);

      workSessionInfo = {
        workSessionId: workSession._id,
        sessionCode: workSession.sessionCode,
        employeeId: workSession.assignedUserId,
        employeeName: employee?.fullName ?? "Unknown",
        startedAt: workSession.startedAt,
        completedAt: workSession.completedAt,
        status: wsStatus?.lookupValue ?? "Unknown",
      };
    }

    // Get purchase order info
    const purchaseOrder = await ctx.db.get(session.purchaseOrderId);
    const supplier = purchaseOrder
      ? await ctx.db.get(purchaseOrder.supplierId)
      : null;
    const sessionStatus = await ctx.db.get(session.receiveSessionStatusTypeId);

    // Calculate totals
    const totalSku = enrichedDetails.length;
    const totalExpectedQuantity = enrichedDetails.reduce(
      (sum, d) => sum + d.quantityExpected,
      0,
    );
    const totalReceivedQuantity = enrichedDetails.reduce(
      (sum, d) => sum + d.quantityReceived,
      0,
    );

    return {
      receiveSessionId: session._id,
      receiveSessionCode: session.receiveSessionCode,
      purchaseOrderId: session.purchaseOrderId,
      purchaseOrderCode: purchaseOrder?.code ?? "Unknown",
      supplierName: supplier?.name ?? "Unknown",
      supplierPhone: supplier?.phone ?? null,
      receivedAt: session.receivedAt,
      status: sessionStatus?.lookupValue ?? "Unknown",
      statusCode: sessionStatus?.lookupCode ?? "UNKNOWN",
      workSession: workSessionInfo,
      summary: {
        totalSku,
        totalExpectedQuantity,
        totalReceivedQuantity,
      },
      items: enrichedDetails,
    };
  },
});

/**
 * Get receive session progress overview
 * Focused view for tracking receiving progress
 */
export const getReceiveSessionProgress = query({
  args: {
    receiveSessionId: v.id("receive_sessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.receiveSessionId);
    if (!session) {
      throw new Error("Receive session not found");
    }

    // Get purchase order
    const purchaseOrder = await ctx.db.get(session.purchaseOrderId);

    // Get session status
    const sessionStatus = await ctx.db.get(session.receiveSessionStatusTypeId);

    // Get all details
    const details = await ctx.db
      .query("receive_sessions_details")
      .withIndex("receiveSessionId", (q) =>
        q.eq("receiveSessionId", args.receiveSessionId),
      )
      .collect();

    // Enrich with SKU codes, product names, and calculate totals
    const items = await Promise.all(
      details.map(async (detail) => {
        const variant = await ctx.db.get(detail.skuId);
        const product = variant ? await ctx.db.get(variant.productId) : null;
        const itemStatus = await ctx.db.get(
          detail.receiveSessionItemStatusTypeId,
        );

        return {
          detailId: detail._id,
          skuId: detail.skuId,
          skuCode: variant?.skuCode ?? "Unknown",
          productName: product?.name ?? "Unknown Product",
          quantityExpected: detail.quantityExpected,
          quantityReceived: detail.quantityReceived,
          remainingQuantity: detail.quantityExpected - detail.quantityReceived,
          notes: detail.notes,
          status: itemStatus?.lookupValue ?? "Unknown",
          statusCode: itemStatus?.lookupCode ?? "UNKNOWN",
          isComplete: detail.quantityReceived >= detail.quantityExpected,
        };
      }),
    );

    const totalExpectedQuantity = items.reduce(
      (sum, i) => sum + i.quantityExpected,
      0,
    );
    const totalReceivedQuantity = items.reduce(
      (sum, i) => sum + i.quantityReceived,
      0,
    );
    const completedItems = items.filter((i) => i.isComplete).length;
    const progressPercentage =
      totalExpectedQuantity > 0
        ? Math.round((totalReceivedQuantity / totalExpectedQuantity) * 100)
        : 0;

    return {
      receiveSessionCode: session.receiveSessionCode,
      purchaseOrderCode: purchaseOrder?.code ?? "Unknown",
      status: sessionStatus?.lookupValue ?? "Unknown",
      statusCode: sessionStatus?.lookupCode ?? "UNKNOWN",
      totalExpectedQuantity,
      totalReceivedQuantity,
      progressPercentage,
      totalItems: items.length,
      completedItems,
      items,
    };
  },
});

/**
 * List all receive sessions for a branch
 */
export const listReceiveSessions = query({
  args: {
    branchId: v.id("branches"),
    statusFilter: v.optional(v.string()), // Status code to filter by
  },
  handler: async (ctx, args) => {
    let sessions = await ctx.db
      .query("receive_sessions")
      .withIndex("branchId", (q) => q.eq("branchId", args.branchId))
      .order("desc")
      .collect();

    // Filter by status if provided
    if (args.statusFilter) {
      const statusLookup = await ctx.db
        .query("system_lookups")
        .withIndex("lookupType_lookupCode", (q) =>
          q
            .eq("lookupType", "ReceiveSessionStatus")
            .eq("lookupCode", args.statusFilter!),
        )
        .first();

      if (statusLookup) {
        sessions = sessions.filter(
          (s) => s.receiveSessionStatusTypeId === statusLookup._id,
        );
      }
    }

    // Enrich with additional info
    const enrichedSessions = await Promise.all(
      sessions.map(async (session) => {
        const purchaseOrder = await ctx.db.get(session.purchaseOrderId);
        const status = await ctx.db.get(session.receiveSessionStatusTypeId);
        const supplier = purchaseOrder
          ? await ctx.db.get(purchaseOrder.supplierId)
          : null;

        // Get item counts
        const details = await ctx.db
          .query("receive_sessions_details")
          .withIndex("receiveSessionId", (q) =>
            q.eq("receiveSessionId", session._id),
          )
          .collect();

        const totalExpected = details.reduce(
          (sum, d) => sum + d.quantityExpected,
          0,
        );
        const totalReceived = details.reduce(
          (sum, d) => sum + d.quantityReceived,
          0,
        );

        return {
          _id: session._id,
          receiveSessionCode: session.receiveSessionCode,
          purchaseOrderCode: purchaseOrder?.code ?? "Unknown",
          supplierName: supplier?.name ?? "Unknown",
          receivedAt: session.receivedAt,
          status: status?.lookupValue ?? "Unknown",
          statusCode: status?.lookupCode ?? "UNKNOWN",
          totalItems: details.length,
          totalExpected,
          totalReceived,
          progressPercentage:
            totalExpected > 0
              ? Math.round((totalReceived / totalExpected) * 100)
              : 0,
        };
      }),
    );

    return enrichedSessions;
  },
});

// ================================================================
// MUTATIONS
// ================================================================

/**
 * Create a new receive session from a purchase order
 * Automatically creates receive_session_details from purchase_order_details
 * Also creates a work session for the receiving process
 */
export const createReceiveSession = mutation({
  args: {
    purchaseOrderId: v.id("purchase_orders"),
    userId: v.id("users"),
    assignedWorkerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Get purchase order
    const purchaseOrder = await ctx.db.get(args.purchaseOrderId);
    if (!purchaseOrder) {
      throw new Error("Purchase order not found");
    }

    if (purchaseOrder.isDeleted) {
      throw new Error("Purchase order has been deleted");
    }

    // Get branch info
    const branch = await ctx.db.get(purchaseOrder.branchId);
    if (!branch) {
      throw new Error("Branch not found");
    }

    // Check if a receive session already exists for this PO
    const existingSession = await ctx.db
      .query("receive_sessions")
      .withIndex("purchaseOrderId", (q) =>
        q.eq("purchaseOrderId", args.purchaseOrderId),
      )
      .first();

    if (existingSession) {
      throw new Error(
        `A receive session already exists for this purchase order: ${existingSession.receiveSessionCode}`,
      );
    }

    // Get purchase order details
    const poDetails = await ctx.db
      .query("purchase_order_details")
      .withIndex("purchaseOrderId", (q) =>
        q.eq("purchaseOrderId", args.purchaseOrderId),
      )
      .collect();

    if (poDetails.length === 0) {
      throw new Error("Purchase order has no items");
    }

    // Ensure required system lookups exist
    const pendingStatusId = await ensureSystemLookup(
      ctx,
      "ReceiveSessionStatus",
      "PENDING",
      "Pending",
      "Receive session is pending",
    );

    const pendingItemStatusId = await ensureSystemLookup(
      ctx,
      "ReceiveSessionItemStatus",
      "PENDING",
      "Pending",
      "Item is pending receiving",
    );

    // Generate receive session code
    const receiveSessionCode = await generateReceiveSessionCode(
      ctx,
      purchaseOrder.branchId,
    );

    // Create receive session
    const receiveSessionId = await ctx.db.insert("receive_sessions", {
      receiveSessionCode,
      purchaseOrderId: args.purchaseOrderId,
      branchId: purchaseOrder.branchId,
      receivedAt: Date.now(),
      receiveSessionStatusTypeId: pendingStatusId,
    });

    // Create receive session details from PO details
    for (const poDetail of poDetails) {
      await ctx.db.insert("receive_sessions_details", {
        receiveSessionId,
        skuId: poDetail.skuId,
        quantityExpected: poDetail.quantityOrdered,
        quantityReceived: 0,
        receiveSessionItemStatusTypeId: pendingItemStatusId,
        recommendedZoneId: poDetail.recommendedZoneId,
      });
    }

    // Determine which user to assign to the work session
    const assignedUserId = args.assignedWorkerId ?? args.userId;

    // Create work session for this receive session
    const workSessionId = await ensureWorkSession(
      ctx,
      branch.organizationId,
      purchaseOrder.branchId,
      receiveSessionId,
      assignedUserId,
    );

    // Update purchase order status to "Received"
    const receivedStatusId = await getSystemLookup(
      ctx,
      "PurchaseOrderStatus",
      "RECEIVED",
    );

    if (receivedStatusId) {
      await ctx.db.patch(args.purchaseOrderId, {
        purchaseOrderStatusTypeId: receivedStatusId,
      });
    }

    // Send notification to assigned worker
    if (args.assignedWorkerId) {
      // Get notification category lookup (NotificationCategory, INFO)
      const notificationCategory = await ctx.db
        .query("system_lookups")
        .withIndex("lookupType_lookupCode", (q) =>
          q.eq("lookupType", "NotificationCategory").eq("lookupCode", "INFO")
        )
        .first();

      // Get priority lookup (Priority, HIGH)
      const priorityLookup = await ctx.db
        .query("system_lookups")
        .withIndex("lookupType_lookupCode", (q) =>
          q.eq("lookupType", "Priority").eq("lookupCode", "HIGH")
        )
        .first();

      // Only send notification if lookups exist
      if (notificationCategory && priorityLookup) {
        await createNotification(ctx, {
          organizationId: branch.organizationId,
          notificationCategoryTypeId: notificationCategory._id,
          notificationType: "RECEIVE_SESSION_ASSIGNED",
          recipientUserId: args.assignedWorkerId,
          title: "New Receive Session Assigned",
          message: `You have been assigned to receive session ${receiveSessionCode} for PO ${purchaseOrder.code}`,
          priorityTypeId: priorityLookup._id,
          actionUrl: `/receiving-sessions/${receiveSessionId}`,
          relatedEntityType: "receive_sessions",
          relatedEntityId: receiveSessionId,
        });
      }
    }

    // Log audit for receive session creation
    await logCRUDAction(ctx, {
      organizationId: branch.organizationId,
      userId: args.userId,
      action: "CREATE",
      entityType: "receive_sessions",
      entityId: receiveSessionId,
      newValue: { 
        receiveSessionCode, 
        purchaseOrderCode: purchaseOrder.code,
        itemCount: poDetails.length 
      },
      notes: `Created receive session ${receiveSessionCode} from PO ${purchaseOrder.code}`,
    });

    return {
      success: true,
      receiveSessionId,
      receiveSessionCode,
      workSessionId,
      itemCount: poDetails.length,
    };
  },
});

/**
 * Process a received item - update quantity and optionally add notes
 * Automatically recommends a storage zone
 */
export const processReceiveItem = mutation({
  args: {
    receiveSessionDetailId: v.id("receive_sessions_details"),
    quantityToAdd: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.quantityToAdd <= 0) {
      throw new Error("Quantity to add must be greater than 0");
    }

    // Get the detail record
    const detail = await ctx.db.get(args.receiveSessionDetailId);
    if (!detail) {
      throw new Error("Receive session detail not found");
    }

    // Get the receive session
    const session = await ctx.db.get(detail.receiveSessionId);
    if (!session) {
      throw new Error("Receive session not found");
    }

    // Calculate new quantity
    const newQuantityReceived = detail.quantityReceived + args.quantityToAdd;

    // Determine item status based on received vs expected
    let newStatusCode: string;
    if (newQuantityReceived >= detail.quantityExpected) {
      newStatusCode = "COMPLETE";
    } else if (newQuantityReceived > 0) {
      newStatusCode = "PARTIAL";
    } else {
      newStatusCode = "PENDING";
    }

    const newStatusId = await ensureSystemLookup(
      ctx,
      "ReceiveSessionItemStatus",
      newStatusCode,
      newStatusCode === "COMPLETE"
        ? "Complete"
        : newStatusCode === "PARTIAL"
          ? "Partial"
          : "Pending",
      `Item receiving is ${newStatusCode.toLowerCase()}`,
    );

    // Get a random storage zone recommendation from the same branch
    const recommendedZoneId = await getRandomStorageZone(
      ctx,
      session.branchId,
      "STORAGE", // Filter for storage type zones
    );

    // Append notes instead of overwriting
    let newNotes = detail.notes || "";
    if (args.notes) {
      newNotes = newNotes ? `${newNotes}\n- ${args.notes}` : `- ${args.notes}`;
    }

    // Update the detail record
    await ctx.db.patch(args.receiveSessionDetailId, {
      quantityReceived: newQuantityReceived,
      receiveSessionItemStatusTypeId: newStatusId,
      notes: newNotes,
      recommendedZoneId: recommendedZoneId ?? detail.recommendedZoneId,
    });

    // Check if all items are complete to update session status
    const allDetails = await ctx.db
      .query("receive_sessions_details")
      .withIndex("receiveSessionId", (q) =>
        q.eq("receiveSessionId", detail.receiveSessionId),
      )
      .collect();

    const allComplete = allDetails.every((d) => {
      if (d._id === args.receiveSessionDetailId) {
        return newQuantityReceived >= d.quantityExpected;
      }
      return d.quantityReceived >= d.quantityExpected;
    });

    const anyPartial = allDetails.some((d) => {
      if (d._id === args.receiveSessionDetailId) {
        return newQuantityReceived > 0;
      }
      return d.quantityReceived > 0;
    });

    // Update session status
    let sessionStatusCode: string;
    if (allComplete) {
      sessionStatusCode = "COMPLETE";
    } else if (anyPartial) {
      sessionStatusCode = "IN_PROGRESS";
    } else {
      sessionStatusCode = "PENDING";
    }

    const sessionStatusId = await ensureSystemLookup(
      ctx,
      "ReceiveSessionStatus",
      sessionStatusCode,
      sessionStatusCode === "COMPLETE"
        ? "Complete"
        : sessionStatusCode === "IN_PROGRESS"
          ? "In Progress"
          : "Pending",
      `Receive session is ${sessionStatusCode.toLowerCase().replace("_", " ")}`,
    );

    await ctx.db.patch(detail.receiveSessionId, {
      receiveSessionStatusTypeId: sessionStatusId,
    });

    // Update purchase order detail quantity received
    const purchaseOrder = await ctx.db.get(session.purchaseOrderId);
    if (purchaseOrder) {
      const poDetails = await ctx.db
        .query("purchase_order_details")
        .withIndex("purchaseOrderId", (q) =>
          q.eq("purchaseOrderId", session.purchaseOrderId),
        )
        .filter((q) => q.eq(q.field("skuId"), detail.skuId))
        .first();

      if (poDetails) {
        await ctx.db.patch(poDetails._id, {
          quantityReceived: poDetails.quantityReceived + args.quantityToAdd,
        });
      }
    }

    // Get zone name for response
    const zone = recommendedZoneId ? await ctx.db.get(recommendedZoneId) : null;

    return {
      success: true,
      newQuantityReceived,
      quantityExpected: detail.quantityExpected,
      isComplete: newQuantityReceived >= detail.quantityExpected,
      status: sessionStatusCode,
      recommendedZone: zone?.name ?? null,
      recommendedZoneId,
    };
  },
});

/**
 * Create a return request from a receive session item
 * Used when user wants to return an SKU during receiving
 */
export const createReturnFromReceiveSession = mutation({
  args: {
    receiveSessionDetailId: v.id("receive_sessions_details"),
    quantityToReturn: v.number(),
    reasonTypeId: v.string(),
    customReasonNotes: v.optional(v.string()),
    requestedByUserId: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.quantityToReturn <= 0) {
      throw new Error("Quantity to return must be greater than 0");
    }

    // Get the detail record
    const detail = await ctx.db.get(args.receiveSessionDetailId);
    if (!detail) {
      throw new Error("Receive session detail not found");
    }

    // Get the receive session
    const session = await ctx.db.get(detail.receiveSessionId);
    if (!session) {
      throw new Error("Receive session not found");
    }

    // Get the purchase order
    const purchaseOrder = await ctx.db.get(session.purchaseOrderId);
    if (!purchaseOrder) {
      throw new Error("Purchase order not found");
    }

    // Get branch info
    const branch = await ctx.db.get(session.branchId);
    if (!branch) {
      throw new Error("Branch not found");
    }

    // Get SKU info for calculating expected credit
    const variant = await ctx.db.get(detail.skuId);
    const expectedCreditAmount = variant
      ? variant.costPrice * args.quantityToReturn
      : 0;

    // Generate return request code
    const now = Date.now();
    const date = new Date(now);
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");

    const startOfDay = new Date(date.setHours(0, 0, 0, 0)).getTime();
    const endOfDay = new Date(date.setHours(23, 59, 59, 999)).getTime();

    const todayReturns = await ctx.db
      .query("return_requests")
      .withIndex("branchId", (q) => q.eq("branchId", session.branchId as any))
      .filter((q) =>
        q.and(
          q.gte(q.field("requestedAt"), startOfDay),
          q.lte(q.field("requestedAt"), endOfDay),
        ),
      )
      .collect();

    const sequence = (todayReturns.length + 1).toString().padStart(4, "0");
    const requestCode = `RR-${dateStr}-${sequence}`;

    // Ensure pending status exists for return request
    const pendingReturnStatus = await ensureSystemLookup(
      ctx,
      "ReturnStatus",
      "PENDING",
      "Pending",
      "Return request is pending",
    );

    // Create return request
    const returnRequestId = await ctx.db.insert("return_requests", {
      organizationId: branch.organizationId as any,
      branchId: session.branchId as any,
      requestCode,
      supplierId: purchaseOrder.supplierId as any,
      requestedByUserId: args.requestedByUserId,
      requestedAt: Date.now(),
      returnStatusTypeId: pendingReturnStatus as any,
      isDeleted: false,
    });

    // Create return request detail
    await ctx.db.insert("return_request_details", {
      returnRequestId,
      batchId: "", // No batch yet since item is being received
      skuId: detail.skuId as any,
      quantityToReturn: args.quantityToReturn,
      reasonTypeId: args.reasonTypeId,
      customReasonNotes: args.customReasonNotes,
      expectedCreditAmount,
      receiveSessionDetailId: args.receiveSessionDetailId,
    });

    // Update the receive session detail status to indicate return requested
    const returnRequestedStatus = await ensureSystemLookup(
      ctx,
      "ReceiveSessionItemStatus",
      "RETURN_REQUESTED",
      "Return Requested",
      "Return has been requested for this item",
    );

    await ctx.db.patch(args.receiveSessionDetailId, {
      receiveSessionItemStatusTypeId: returnRequestedStatus,
    });

    return {
      success: true,
      returnRequestId,
      requestCode,
      quantityToReturn: args.quantityToReturn,
      expectedCreditAmount,
    };
  },
});

/**
 * Update receive session status manually
 */
export const updateReceiveSessionStatus = mutation({
  args: {
    receiveSessionId: v.id("receive_sessions"),
    statusCode: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.receiveSessionId);
    if (!session) {
      throw new Error("Receive session not found");
    }

    const newStatusId = await ensureSystemLookup(
      ctx,
      "ReceiveSessionStatus",
      args.statusCode,
      args.statusCode.charAt(0).toUpperCase() +
        args.statusCode.slice(1).toLowerCase().replace("_", " "),
      `Receive session status: ${args.statusCode}`,
    );

    await ctx.db.patch(args.receiveSessionId, {
      receiveSessionStatusTypeId: newStatusId,
    });

    // If completing session, also complete the work session
    if (args.statusCode === "COMPLETE") {
      const workSession = await ctx.db
        .query("work_sessions")
        .withIndex("receiveSessionId", (q) =>
          q.eq("receiveSessionId", args.receiveSessionId),
        )
        .first();

      if (workSession) {
        const completedStatusId = await ensureSystemLookup(
          ctx,
          "SessionStatus",
          "COMPLETED",
          "Completed",
          "Session has been completed",
        );

        await ctx.db.patch(workSession._id, {
          sessionStatusTypeId: completedStatusId,
          completedAt: Date.now(),
        });
      }
    }

    return {
      success: true,
      receiveSessionId: args.receiveSessionId,
      newStatusCode: args.statusCode,
    };
  },
});

/**
 * Complete a receive session
 * Updates each item's status based on received vs expected:
 * - COMPLETE if record >= expected
 * - RETURN_REQUESTED items stay as is
 *
 * Additionally:
 * - Creates ONE return request for all RETURN_REQUESTED items
 * - Creates inventory batches for COMPLETE items
 *
 * Marks session and work session as complete
 */
export const completeReceiveSession = mutation({
  args: {
    receiveSessionId: v.id("receive_sessions"),
    verifiedByUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.receiveSessionId);
    if (!session) {
      throw new Error("Receive session not found");
    }

    // Get branch info for organizationId
    const branch = await ctx.db.get(session.branchId);
    if (!branch) {
      throw new Error("Branch not found");
    }

    // Get purchase order for supplier info
    const purchaseOrder = await ctx.db.get(session.purchaseOrderId);
    if (!purchaseOrder) {
      throw new Error("Purchase order not found");
    }

    // Get all session details
    const details = await ctx.db
      .query("receive_sessions_details")
      .withIndex("receiveSessionId", (q) =>
        q.eq("receiveSessionId", args.receiveSessionId),
      )
      .collect();

    // Get status IDs
    const completeItemStatusId = await ensureSystemLookup(
      ctx,
      "ReceiveSessionItemStatus",
      "COMPLETE",
      "Complete",
      "Item has been fully received",
    );

    const returnRequestedStatusId = await getSystemLookup(
      ctx,
      "ReceiveSessionItemStatus",
      "RETURN_REQUESTED",
    );

    // Get batch status for inventory batches (BatchStatus/ACTIVE)
    const activeBatchStatusId = await ensureSystemLookup(
      ctx,
      "BatchStatus",
      "ACTIVE",
      "Active",
      "Batch is active and available for use",
    );

    // Get pending status for return request
    const pendingReturnStatusId = await ensureSystemLookup(
      ctx,
      "ReturnStatus",
      "PENDING",
      "Pending",
      "Return request is pending",
    );

    // Separate items into return requested and complete
    const returnRequestedItems: typeof details = [];
    const completeItems: typeof details = [];

    for (const detail of details) {
      const isReturnRequested =
        returnRequestedStatusId &&
        detail.receiveSessionItemStatusTypeId === returnRequestedStatusId;

      if (isReturnRequested) {
        returnRequestedItems.push(detail);
      } else if (detail.quantityReceived >= detail.quantityExpected) {
        // Mark as complete
        await ctx.db.patch(detail._id, {
          receiveSessionItemStatusTypeId: completeItemStatusId,
        });
        completeItems.push(detail);
      }
    }

    // ================================================================
    // CREATE RETURN REQUEST for all RETURN_REQUESTED items
    // ================================================================
    let returnRequestId: any = null;
    if (returnRequestedItems.length > 0 && args.verifiedByUserId) {
      // Generate return request code
      const requestCode = await generateReturnRequestCode(
        ctx,
        session.branchId,
      );

      // Create return request header
      returnRequestId = await ctx.db.insert("return_requests", {
        organizationId: branch.organizationId as any,
        branchId: session.branchId as any,
        requestCode,
        supplierId: purchaseOrder.supplierId as any,
        requestedByUserId: args.verifiedByUserId as any,
        requestedAt: Date.now(),
        returnStatusTypeId: pendingReturnStatusId as any,
        purchaseOrderId: session.purchaseOrderId as any,
        isDeleted: false,
      });

      // Create return request details for each item
      for (const item of returnRequestedItems) {
        // Get SKU info for expected credit calculation
        const variant = await ctx.db.get(item.skuId);
        const expectedCreditAmount = variant
          ? variant.costPrice * item.quantityExpected
          : 0;

        await ctx.db.insert("return_request_details", {
          returnRequestId,
          skuId: item.skuId as any,
          quantityToReturn: item.quantityExpected,
          reasonTypeId: (item.returnTypeId || pendingReturnStatusId) as any,
          customReasonNotes: item.notes || undefined,
          expectedCreditAmount,
          receiveSessionDetailId: item._id,
        });
      }
    }

    // ================================================================
    // CREATE INVENTORY BATCHES for all COMPLETE items
    // ================================================================
    const createdBatches: any[] = [];
    for (const item of completeItems) {
      // Check if item has a recommended zone
      if (!item.recommendedZoneId) {
        // Skip items without a zone - this shouldn't happen if PO was created correctly
        console.warn(
          `Item ${item._id} has no recommendedZoneId, skipping batch creation`,
        );
        continue;
      }

      // Generate batch numbers
      const supplierBatchNumber = await generateSupplierBatchNumber(
        ctx,
        session.branchId,
      );
      const internalBatchNumber = await generateInternalBatchNumber(
        ctx,
        session.branchId,
      );

      // Create inventory batch
      const batchId = await ctx.db.insert("inventory_batches", {
        organizationId: branch.organizationId,
        skuId: item.skuId,
        zoneId: item.recommendedZoneId,
        quantity: item.quantityReceived,
        branchId: session.branchId,
        supplierBatchNumber,
        internalBatchNumber,
        receivedAt: Date.now(),
        batchStatusTypeId: activeBatchStatusId,
        isDeleted: false,
      });

      // Log inventory transaction for receiving
      await logInventoryTransaction(ctx, {
        organizationId: branch.organizationId,
        batchId,
        quantityBefore: 0,
        quantityChange: item.quantityReceived,
        quantityAfter: item.quantityReceived,
        transactionType: "RECEIVE",
        createdByUserId: args.verifiedByUserId ?? session.assignedWorkerId!,
        notes: `Received ${item.quantityReceived} units into batch ${internalBatchNumber}`,
      });

      createdBatches.push({
        batchId,
        skuId: item.skuId,
        quantity: item.quantityReceived,
        supplierBatchNumber,
        internalBatchNumber,
      });
    }

    // ================================================================
    // UPDATE SESSION STATUS
    // ================================================================
    // Check if any item has RETURN_REQUESTED status
    const hasReturnRequested = details.some((d) => {
      return (
        returnRequestedStatusId &&
        d.receiveSessionItemStatusTypeId === returnRequestedStatusId
      );
    });

    // Check if all items are complete (quantity received >= expected)
    const allItemsComplete = details.every(
      (d) => d.quantityReceived >= d.quantityExpected,
    );

    // Check if all items are handled (either complete or return requested)
    const allHandled = details.every((d) => {
      const isReturnRequested =
        returnRequestedStatusId &&
        d.receiveSessionItemStatusTypeId === returnRequestedStatusId;
      const isComplete = d.quantityReceived >= d.quantityExpected;
      return isReturnRequested || isComplete;
    });

    // Determine session status:
    // - If ANY item has RETURN_REQUESTED → session = RETURN_REQUESTED
    // - If ALL items are COMPLETE → session = COMPLETE
    // - Otherwise → session = IN_PROGRESS
    let sessionStatusCode: string;
    let sessionStatusValue: string;

    if (hasReturnRequested) {
      sessionStatusCode = "RETURN_REQUESTED";
      sessionStatusValue = "Return Requested";
    } else if (allItemsComplete) {
      sessionStatusCode = "COMPLETE";
      sessionStatusValue = "Complete";
    } else {
      sessionStatusCode = "IN_PROGRESS";
      sessionStatusValue = "In Progress";
    }

    const sessionStatusId = await ensureSystemLookup(
      ctx,
      "ReceiveSessionStatus",
      sessionStatusCode,
      sessionStatusValue,
      `Receive session is ${sessionStatusCode.toLowerCase().replace("_", " ")}`,
    );

    // Update session status
    await ctx.db.patch(args.receiveSessionId, {
      receiveSessionStatusTypeId: sessionStatusId,
    });

    // Update work session
    const workSession = await ctx.db
      .query("work_sessions")
      .withIndex("receiveSessionId", (q) =>
        q.eq("receiveSessionId", args.receiveSessionId),
      )
      .first();

    if (workSession) {
      const completedSessionStatusId = await ensureSystemLookup(
        ctx,
        "SessionStatus",
        "COMPLETED",
        "Completed",
        "Session has been completed",
      );

      await ctx.db.patch(workSession._id, {
        sessionStatusTypeId: completedSessionStatusId,
        completedAt: Date.now(),
        verifiedByUserId: args.verifiedByUserId,
        verifiedAt: args.verifiedByUserId ? Date.now() : undefined,
      });
    }

    // Update purchase order status to Received if all items handled
    if (purchaseOrder && allHandled) {
      const receivedStatusId = await ensureSystemLookup(
        ctx,
        "PurchaseOrderStatus",
        "RECEIVED",
        "Received",
        "Purchase order has been received",
      );

      await ctx.db.patch(session.purchaseOrderId, {
        purchaseOrderStatusTypeId: receivedStatusId,
      });
    }

    return {
      success: true,
      receiveSessionId: args.receiveSessionId,
      sessionStatus: sessionStatusCode,
      completedAt: Date.now(),
      returnRequestId,
      returnRequestedItemCount: returnRequestedItems.length,
      inventoryBatchesCreated: createdBatches.length,
    };
  },
});

/**
 * Set a single item's status to RETURN_REQUESTED
 * Used when user clicks Return for a specific SKU in the dialog
 */
export const setItemReturnRequested = mutation({
  args: {
    receiveSessionDetailId: v.id("receive_sessions_details"),
    returnTypeId: v.id("system_lookups"), // Required return reason type
    notes: v.optional(v.string()), // Optional additional notes
  },
  handler: async (ctx, args) => {
    // Get the detail record
    const detail = await ctx.db.get(args.receiveSessionDetailId);
    if (!detail) {
      throw new Error("Receive session detail not found");
    }

    // Validate return type exists
    const returnType = await ctx.db.get(args.returnTypeId);
    if (!returnType) {
      throw new Error("Invalid return reason type");
    }

    // Get RETURN_REQUESTED status ID
    const returnRequestedStatusId = await ensureSystemLookup(
      ctx,
      "ReceiveSessionItemStatus",
      "RETURN_REQUESTED",
      "Return Requested",
      "Return has been requested for this item",
    );

    // Update the item status, returnTypeId, and notes
    await ctx.db.patch(args.receiveSessionDetailId, {
      receiveSessionItemStatusTypeId: returnRequestedStatusId,
      returnTypeId: args.returnTypeId,
      notes: args.notes || undefined,
    });

    return {
      success: true,
      detailId: args.receiveSessionDetailId,
      newStatusCode: "RETURN_REQUESTED",
    };
  },
});

/**
 * Save receive session state
 * Determines overall session status based on item statuses:
 * - COMPLETE: all items are either COMPLETE or RETURN_REQUESTED
 * - PARTIAL: some items have been processed (received or returned)
 * - IN_PROGRESS: at least one item has partial quantity
 * Does NOT create a return request - just saves current state
 */
export const saveReceiveSessionState = mutation({
  args: {
    receiveSessionId: v.id("receive_sessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.receiveSessionId);
    if (!session) {
      throw new Error("Receive session not found");
    }

    // Get all session details
    const details = await ctx.db
      .query("receive_sessions_details")
      .withIndex("receiveSessionId", (q) =>
        q.eq("receiveSessionId", args.receiveSessionId),
      )
      .collect();

    // Get status lookup values for comparison
    const returnRequestedStatus = await getSystemLookup(
      ctx,
      "ReceiveSessionItemStatus",
      "RETURN_REQUESTED",
    );
    const completeItemStatus = await getSystemLookup(
      ctx,
      "ReceiveSessionItemStatus",
      "COMPLETE",
    );

    // Analyze item statuses
    let allHandled = true;
    let anyProcessed = false;
    let hasPartialItems = false;

    for (const detail of details) {
      const isReturnRequested =
        returnRequestedStatus &&
        detail.receiveSessionItemStatusTypeId === returnRequestedStatus;
      const isComplete =
        detail.quantityReceived >= detail.quantityExpected ||
        (completeItemStatus &&
          detail.receiveSessionItemStatusTypeId === completeItemStatus);
      const isPartial =
        detail.quantityReceived > 0 &&
        detail.quantityReceived < detail.quantityExpected;

      if (isReturnRequested || isComplete) {
        anyProcessed = true;
      } else if (isPartial) {
        anyProcessed = true;
        hasPartialItems = true;
        allHandled = false;
      } else {
        // Not handled at all
        allHandled = false;
      }
    }

    // Determine session status (Save & Exit only sets PENDING or IN_PROGRESS, never COMPLETE)
    let sessionStatusCode: string;
    if (anyProcessed || hasPartialItems) {
      sessionStatusCode = "IN_PROGRESS";
    } else {
      sessionStatusCode = "PENDING";
    }

    const sessionStatusId = await ensureSystemLookup(
      ctx,
      "ReceiveSessionStatus",
      sessionStatusCode,
      sessionStatusCode === "IN_PROGRESS" ? "In Progress" : "Pending",
      `Receive session is ${sessionStatusCode.toLowerCase().replace("_", " ")}`,
    );

    // Update session status
    await ctx.db.patch(args.receiveSessionId, {
      receiveSessionStatusTypeId: sessionStatusId,
    });

    return {
      success: true,
      receiveSessionId: args.receiveSessionId,
      sessionStatus: sessionStatusCode,
    };
  },
});
