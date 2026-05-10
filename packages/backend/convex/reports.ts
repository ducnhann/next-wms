import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";

// ================================================================
// INBOUND (RECEIVING) REPORT QUERIES
// ================================================================

/**
 * Get inbound report summary with KPIs for a date range
 */
export const getInboundReportSummary = query({
  args: {
    branchId: v.id("branches"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const { branchId, startDate, endDate } = args;

    // Get all receive sessions in date range
    const sessions = await ctx.db
      .query("receive_sessions")
      .withIndex("branchId", (q) => q.eq("branchId", branchId))
      .filter((q) =>
        q.and(
          q.gte(q.field("receivedAt"), startDate),
          q.lte(q.field("receivedAt"), endDate),
        ),
      )
      .collect();

    // Get session details for all sessions
    const sessionDetails = await Promise.all(
      sessions.map(async (session) => {
        const details = await ctx.db
          .query("receive_sessions_details")
          .withIndex("receiveSessionId", (q) =>
            q.eq("receiveSessionId", session._id),
          )
          .collect();

        const status = await ctx.db.get(session.receiveSessionStatusTypeId);

        // Get purchase order for supplier info
        const purchaseOrder = await ctx.db.get(session.purchaseOrderId);
        let supplier = null;
        if (purchaseOrder) {
          supplier = await ctx.db.get(purchaseOrder.supplierId);
        }

        const totalReceived = details.reduce(
          (sum, d) => sum + d.quantityReceived,
          0,
        );
        const totalExpected = details.reduce(
          (sum, d) => sum + d.quantityExpected,
          0,
        );

        return {
          ...session,
          status,
          supplier,
          totalReceived,
          totalExpected,
          itemCount: details.length,
          accuracyRate:
            totalExpected > 0
              ? Math.round((totalReceived / totalExpected) * 100)
              : 100,
        };
      }),
    );

    // Calculate KPIs
    const totalSessions = sessionDetails.length;
    const totalItemsReceived = sessionDetails.reduce(
      (sum, s) => sum + s.totalReceived,
      0,
    );
    const totalItemsExpected = sessionDetails.reduce(
      (sum, s) => sum + s.totalExpected,
      0,
    );
    const avgItemsPerSession =
      totalSessions > 0 ? Math.round(totalItemsReceived / totalSessions) : 0;
    const overallAccuracyRate =
      totalItemsExpected > 0
        ? Math.round((totalItemsReceived / totalItemsExpected) * 100)
        : 100;

    // Group by status
    const statusBreakdown = sessionDetails.reduce(
      (acc, session) => {
        const statusName = session.status?.lookupValue ?? "Unknown";
        const statusCode = session.status?.lookupCode ?? "UNKNOWN";
        const existing = acc.find((s) => s.status === statusName);
        if (existing) {
          existing.count += 1;
        } else {
          acc.push({ status: statusName, statusCode, count: 1 });
        }
        return acc;
      },
      [] as { status: string; statusCode: string; count: number }[],
    );

    // Group by supplier
    const supplierBreakdown = sessionDetails.reduce(
      (acc, session) => {
        const supplierName = session.supplier?.name ?? "Unknown";
        const existing = acc.find((s) => s.supplier === supplierName);
        if (existing) {
          existing.sessions += 1;
          existing.itemsReceived += session.totalReceived;
        } else {
          acc.push({
            supplier: supplierName,
            sessions: 1,
            itemsReceived: session.totalReceived,
          });
        }
        return acc;
      },
      [] as { supplier: string; sessions: number; itemsReceived: number }[],
    );

    // Sort by items received descending
    supplierBreakdown.sort((a, b) => b.itemsReceived - a.itemsReceived);

    // Get daily trend data
    const dailyTrend = getDailyTrendData(
      sessionDetails.map((s) => ({
        date: s.receivedAt,
        value: s.totalReceived,
      })),
      startDate,
      endDate,
    );

    return {
      kpis: {
        totalSessions,
        totalItemsReceived,
        avgItemsPerSession,
        overallAccuracyRate,
      },
      statusBreakdown,
      supplierBreakdown: supplierBreakdown.slice(0, 10), // Top 10
      dailyTrend,
    };
  },
});

/**
 * Get detailed inbound sessions for the report table
 */
export const getInboundReportSessions = query({
  args: {
    branchId: v.id("branches"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const { branchId, startDate, endDate } = args;

    const sessions = await ctx.db
      .query("receive_sessions")
      .withIndex("branchId", (q) => q.eq("branchId", branchId))
      .filter((q) =>
        q.and(
          q.gte(q.field("receivedAt"), startDate),
          q.lte(q.field("receivedAt"), endDate),
        ),
      )
      .order("desc")
      .collect();

    const enrichedSessions = await Promise.all(
      sessions.map(async (session) => {
        const details = await ctx.db
          .query("receive_sessions_details")
          .withIndex("receiveSessionId", (q) =>
            q.eq("receiveSessionId", session._id),
          )
          .collect();

        const status = await ctx.db.get(session.receiveSessionStatusTypeId);
        const purchaseOrder = await ctx.db.get(session.purchaseOrderId);
        let supplier = null;
        if (purchaseOrder) {
          supplier = await ctx.db.get(purchaseOrder.supplierId);
        }

        const totalReceived = details.reduce(
          (sum, d) => sum + d.quantityReceived,
          0,
        );
        const totalExpected = details.reduce(
          (sum, d) => sum + d.quantityExpected,
          0,
        );

        return {
          _id: session._id,
          receiveSessionCode: session.receiveSessionCode,
          receivedAt: session.receivedAt,
          purchaseOrderCode: purchaseOrder?.code ?? "N/A",
          supplierName: supplier?.name ?? "Unknown",
          status: status?.lookupValue ?? "Unknown",
          statusCode: status?.lookupCode ?? "UNKNOWN",
          itemCount: details.length,
          totalReceived,
          totalExpected,
          variance: totalReceived - totalExpected,
          accuracyRate:
            totalExpected > 0
              ? Math.round((totalReceived / totalExpected) * 100)
              : 100,
        };
      }),
    );

    return enrichedSessions;
  },
});

// ================================================================
// INVENTORY REPORT QUERIES
// ================================================================

/**
 * Get inventory report summary with KPIs for a date range
 */
export const getInventoryReportSummary = query({
  args: {
    branchId: v.id("branches"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const { branchId, endDate } = args;

    // Get all active inventory batches for the branch
    const batches = await ctx.db
      .query("inventory_batches")
      .withIndex("branchId", (q) => q.eq("branchId", branchId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    // Enrich batches with product info
    const enrichedBatches = await Promise.all(
      batches.map(async (batch) => {
        const variant = await ctx.db.get(batch.skuId);
        let product = null;
        let category = null;

        if (variant) {
          product = await ctx.db.get(variant.productId);
          if (product) {
            category = await ctx.db.get(product.categoryId);
          }
        }

        const zone = await ctx.db.get(batch.zoneId);
        const status = await ctx.db.get(batch.batchStatusTypeId);

        return {
          ...batch,
          variant,
          product,
          category,
          zone,
          status,
          value: (variant?.costPrice ?? 0) * batch.quantity,
        };
      }),
    );

    // Calculate KPIs
    const totalSKUs = new Set(enrichedBatches.map((b) => b.skuId)).size;
    const totalQuantity = enrichedBatches.reduce(
      (sum, b) => sum + b.quantity,
      0,
    );
    const totalValue = enrichedBatches.reduce((sum, b) => sum + b.value, 0);

    // Expiring soon (within 30 days)
    const thirtyDaysFromNow = endDate + 30 * 24 * 60 * 60 * 1000;
    const expiringSoon = enrichedBatches.filter(
      (b) =>
        b.expiresAt &&
        b.expiresAt > endDate &&
        b.expiresAt <= thirtyDaysFromNow &&
        b.quantity > 0,
    );

    // Already expired
    const expired = enrichedBatches.filter(
      (b) => b.expiresAt && b.expiresAt <= endDate && b.quantity > 0,
    );

    // Low stock items (quantity <= 10)
    const lowStockBatches = enrichedBatches.filter(
      (b) => b.quantity > 0 && b.quantity <= 10,
    );

    // Group by category for chart
    const categoryBreakdown = enrichedBatches.reduce(
      (acc, batch) => {
        const categoryName = batch.category?.name ?? "Uncategorized";
        const existing = acc.find((c) => c.category === categoryName);
        if (existing) {
          existing.quantity += batch.quantity;
          existing.value += batch.value;
          existing.skuCount += 1;
        } else {
          acc.push({
            category: categoryName,
            quantity: batch.quantity,
            value: batch.value,
            skuCount: 1,
          });
        }
        return acc;
      },
      [] as {
        category: string;
        quantity: number;
        value: number;
        skuCount: number;
      }[],
    );

    // Sort by value descending
    categoryBreakdown.sort((a, b) => b.value - a.value);

    // Group by zone
    const zoneBreakdown = enrichedBatches.reduce(
      (acc, batch) => {
        const zoneName = batch.zone?.name ?? "Unassigned";
        const existing = acc.find((z) => z.zone === zoneName);
        if (existing) {
          existing.quantity += batch.quantity;
          existing.value += batch.value;
        } else {
          acc.push({
            zone: zoneName,
            quantity: batch.quantity,
            value: batch.value,
          });
        }
        return acc;
      },
      [] as { zone: string; quantity: number; value: number }[],
    );

    // Sort by value descending
    zoneBreakdown.sort((a, b) => b.value - a.value);

    // Get inventory transactions for movement analysis
    const branch = await ctx.db.get(branchId);
    let movementStats = { inbound: 0, outbound: 0, adjustments: 0 };

    if (branch) {
      const transactions = await ctx.db
        .query("inventory_transactions")
        .withIndex("organizationId", (q) =>
          q.eq("organizationId", branch.organizationId),
        )
        .collect();

      // Filter by date range manually (no index on createdAt)
      const filteredTransactions = transactions.filter((t) => {
        // Since we don't have timestamp, we'll include all
        return true;
      });

      for (const tx of filteredTransactions) {
        if (tx.quantityChange > 0) {
          movementStats.inbound += tx.quantityChange;
        } else {
          movementStats.outbound += Math.abs(tx.quantityChange);
        }
      }
    }

    return {
      kpis: {
        totalSKUs,
        totalQuantity,
        totalValue: Math.round(totalValue * 100) / 100,
        expiringSoonCount: expiringSoon.length,
        expiredCount: expired.length,
        lowStockCount: lowStockBatches.length,
      },
      categoryBreakdown: categoryBreakdown.slice(0, 10),
      zoneBreakdown: zoneBreakdown.slice(0, 10),
      movementStats,
    };
  },
});

/**
 * Get detailed inventory items for the report
 */
export const getInventoryReportItems = query({
  args: {
    branchId: v.id("branches"),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const { branchId, endDate } = args;

    const batches = await ctx.db
      .query("inventory_batches")
      .withIndex("branchId", (q) => q.eq("branchId", branchId))
      .filter((q) =>
        q.and(q.eq(q.field("isDeleted"), false), q.gt(q.field("quantity"), 0)),
      )
      .collect();

    const thirtyDaysFromNow = endDate + 30 * 24 * 60 * 60 * 1000;

    const enrichedBatches = await Promise.all(
      batches.map(async (batch) => {
        const variant = await ctx.db.get(batch.skuId);
        let product = null;
        let category = null;

        if (variant) {
          product = await ctx.db.get(variant.productId);
          if (product) {
            category = await ctx.db.get(product.categoryId);
          }
        }

        const zone = await ctx.db.get(batch.zoneId);
        const status = await ctx.db.get(batch.batchStatusTypeId);

        const isExpiringSoon =
          batch.expiresAt &&
          batch.expiresAt > endDate &&
          batch.expiresAt <= thirtyDaysFromNow;
        const isExpired = batch.expiresAt && batch.expiresAt <= endDate;
        const isLowStock = batch.quantity <= 10;

        return {
          _id: batch._id,
          skuCode: variant?.skuCode ?? "Unknown",
          productName: product?.name ?? "Unknown",
          categoryName: category?.name ?? "Uncategorized",
          zoneName: zone?.name ?? "Unassigned",
          quantity: batch.quantity,
          costPrice: variant?.costPrice ?? 0,
          value: (variant?.costPrice ?? 0) * batch.quantity,
          expiresAt: batch.expiresAt,
          status: status?.lookupValue ?? "Unknown",
          supplierBatchNumber: batch.supplierBatchNumber,
          isExpiringSoon,
          isExpired,
          isLowStock,
        };
      }),
    );

    // Sort by value descending
    enrichedBatches.sort((a, b) => b.value - a.value);

    return enrichedBatches;
  },
});

// ================================================================
// OUTBOUND REPORT QUERIES
// ================================================================

/**
 * Get outbound report summary with KPIs for a date range
 */
export const getOutboundReportSummary = query({
  args: {
    branchId: v.id("branches"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const { branchId, startDate, endDate } = args;

    // Get all outbound orders in date range
    const orders = await ctx.db
      .query("outbound_orders")
      .withIndex("branchId", (q) => q.eq("branchId", branchId))
      .filter((q) =>
        q.and(
          q.eq(q.field("isDeleted"), false),
          q.gte(q.field("orderDate"), startDate),
          q.lte(q.field("orderDate"), endDate),
        ),
      )
      .collect();

    // Enrich orders with details
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const details = await ctx.db
          .query("outbound_order_details")
          .withIndex("outboundOrderId", (q) =>
            q.eq("outboundOrderId", order._id),
          )
          .collect();

        const status = await ctx.db.get(order.outboundStatusTypeId);
        const createdBy = await ctx.db.get(order.createdByUserId);

        const totalRequested = details.reduce(
          (sum, d) => sum + d.quantityRequested,
          0,
        );
        const totalPicked = details.reduce(
          (sum, d) => sum + d.quantityPicked,
          0,
        );
        const totalPacked = details.reduce(
          (sum, d) => sum + d.quantityPacked,
          0,
        );

        return {
          ...order,
          status,
          createdBy,
          details,
          itemCount: details.length,
          totalRequested,
          totalPicked,
          totalPacked,
          fulfillmentRate:
            totalRequested > 0
              ? Math.round((totalPacked / totalRequested) * 100)
              : 0,
        };
      }),
    );

    // Calculate KPIs
    const totalOrders = enrichedOrders.length;
    const totalItemsShipped = enrichedOrders.reduce(
      (sum, o) => sum + o.totalPacked,
      0,
    );
    const totalItemsRequested = enrichedOrders.reduce(
      (sum, o) => sum + o.totalRequested,
      0,
    );
    const avgItemsPerOrder =
      totalOrders > 0 ? Math.round(totalItemsShipped / totalOrders) : 0;
    const overallFulfillmentRate =
      totalItemsRequested > 0
        ? Math.round((totalItemsShipped / totalItemsRequested) * 100)
        : 100;

    // Group by status
    const statusBreakdown = enrichedOrders.reduce(
      (acc, order) => {
        const statusName = order.status?.lookupValue ?? "Unknown";
        const statusCode = order.status?.lookupCode ?? "UNKNOWN";
        const existing = acc.find((s) => s.status === statusName);
        if (existing) {
          existing.count += 1;
        } else {
          acc.push({ status: statusName, statusCode, count: 1 });
        }
        return acc;
      },
      [] as { status: string; statusCode: string; count: number }[],
    );

    // Get daily trend data - count shipped orders per day
    const dailyTrend = getDailyTrendData(
      enrichedOrders.map((o) => ({
        date: o.orderDate,
        value: 1, // Count each order as 1
      })),
      startDate,
      endDate,
    );

    // Top products shipped - batch fetch variants and products for performance
    // First, collect all unique SKU IDs from all order details
    const allSkuIds = new Set<Id<"product_variants">>();
    for (const order of enrichedOrders) {
      for (const detail of order.details) {
        allSkuIds.add(detail.skuId);
      }
    }

    // Batch fetch all variants
    const variantPromises = Array.from(allSkuIds).map((skuId) =>
      ctx.db.get(skuId),
    );
    const variants = await Promise.all(variantPromises);

    // Create a map for quick lookup (use String() for consistent key comparison)
    const variantMap = new Map<string, Doc<"product_variants">>();
    for (const variant of variants) {
      if (variant) {
        variantMap.set(String(variant._id), variant);
      }
    }

    // Collect all unique product IDs and batch fetch products
    const productIds = new Set<Id<"products">>();
    for (const variant of variants) {
      if (variant) {
        productIds.add(variant.productId);
      }
    }

    const productPromises = Array.from(productIds).map((productId) =>
      ctx.db.get(productId),
    );
    const products = await Promise.all(productPromises);

    // Create a map for quick lookup (use String() for consistent key comparison)
    const productMap = new Map<string, Doc<"products">>();
    for (const product of products) {
      if (product) {
        productMap.set(String(product._id), product);
      }
    }

    // Now calculate product stats using the cached lookups
    const productStats = new Map<
      string,
      { skuCode: string; productName: string; quantity: number }
    >();

    for (const order of enrichedOrders) {
      for (const detail of order.details) {
        const variant = variantMap.get(String(detail.skuId));
        if (variant) {
          const product = productMap.get(String(variant.productId));
          const key = variant.skuCode;
          const existing = productStats.get(key);
          if (existing) {
            existing.quantity += detail.quantityPacked;
          } else {
            productStats.set(key, {
              skuCode: variant.skuCode,
              productName: product?.name ?? "Unknown",
              quantity: detail.quantityPacked,
            });
          }
        }
      }
    }

    const topProducts = Array.from(productStats.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Get picking sessions stats
    const pickingSessions = await ctx.db
      .query("picking_sessions")
      .withIndex("branchId", (q) => q.eq("branchId", branchId))
      .filter((q) =>
        q.and(
          q.eq(q.field("isDeleted"), false),
          q.gte(q.field("startedAt"), startDate),
          q.lte(q.field("startedAt"), endDate),
        ),
      )
      .collect();

    const completedPickingSessions = pickingSessions.filter(
      (s) => s.completedAt,
    );
    const avgPickingTimeMs =
      completedPickingSessions.length > 0
        ? completedPickingSessions.reduce(
            (sum, s) => sum + ((s.completedAt ?? 0) - (s.startedAt ?? 0)),
            0,
          ) / completedPickingSessions.length
        : 0;

    return {
      kpis: {
        totalOrders,
        totalItemsShipped,
        avgItemsPerOrder,
        overallFulfillmentRate,
        avgPickingTimeMinutes: Math.round(avgPickingTimeMs / 60000),
        totalPickingSessions: pickingSessions.length,
      },
      statusBreakdown,
      dailyTrend,
      topProducts,
    };
  },
});

/**
 * Get detailed outbound orders for the report table
 */
export const getOutboundReportOrders = query({
  args: {
    branchId: v.id("branches"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const { branchId, startDate, endDate } = args;

    const orders = await ctx.db
      .query("outbound_orders")
      .withIndex("branchId", (q) => q.eq("branchId", branchId))
      .filter((q) =>
        q.and(
          q.eq(q.field("isDeleted"), false),
          q.gte(q.field("orderDate"), startDate),
          q.lte(q.field("orderDate"), endDate),
        ),
      )
      .order("desc")
      .collect();

    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const details = await ctx.db
          .query("outbound_order_details")
          .withIndex("outboundOrderId", (q) =>
            q.eq("outboundOrderId", order._id),
          )
          .collect();

        const status = await ctx.db.get(order.outboundStatusTypeId);
        const createdBy = await ctx.db.get(order.createdByUserId);

        const totalRequested = details.reduce(
          (sum, d) => sum + d.quantityRequested,
          0,
        );
        const totalPicked = details.reduce(
          (sum, d) => sum + d.quantityPicked,
          0,
        );
        const totalPacked = details.reduce(
          (sum, d) => sum + d.quantityPacked,
          0,
        );

        return {
          _id: order._id,
          orderCode: order.orderCode,
          orderDate: order.orderDate,
          requestedShipDate: order.requestedShipDate,
          trackingNumber: order.trackingNumber,
          createdByName: createdBy?.fullName ?? "Unknown",
          status: status?.lookupValue ?? "Unknown",
          statusCode: status?.lookupCode ?? "UNKNOWN",
          itemCount: details.length,
          totalRequested,
          totalPicked,
          totalPacked,
          fulfillmentRate:
            totalRequested > 0
              ? Math.round((totalPacked / totalRequested) * 100)
              : 0,
        };
      }),
    );

    return enrichedOrders;
  },
});

// ================================================================
// DASHBOARD SUMMARY
// ================================================================

/**
 * Get dashboard summary with KPIs, activity feed, charts, and pending actions
 */
export const getDashboardSummary = query({
  args: {
    branchId: v.id("branches"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const { branchId, startDate, endDate } = args;

    const branch = await ctx.db.get(branchId);
    if (!branch) {
      throw new Error("Branch not found");
    }
    const organizationId = branch.organizationId;

    // ========== KPI: Total Inventory ==========
    const inventoryBatches = await ctx.db
      .query("inventory_batches")
      .withIndex("branchId", (q) => q.eq("branchId", branchId))
      .filter((q) =>
        q.and(q.eq(q.field("isDeleted"), false), q.gt(q.field("quantity"), 0)),
      )
      .collect();

    const totalInventory = inventoryBatches.reduce(
      (sum, b) => sum + b.quantity,
      0,
    );
    const uniqueSkus = new Set(inventoryBatches.map((b) => b.skuId)).size;

    // ========== KPI: Low Stock & Expiring ==========
    const lowStockCount = inventoryBatches.filter(
      (b) => b.quantity <= 10,
    ).length;
    const thirtyDaysFromNow = endDate + 30 * 24 * 60 * 60 * 1000;
    const expiringSoonCount = inventoryBatches.filter(
      (b) =>
        b.expiresAt &&
        b.expiresAt > endDate &&
        b.expiresAt <= thirtyDaysFromNow,
    ).length;

    // ========== KPI: Pending Inbound (Purchase Orders) ==========
    const purchaseOrders = await ctx.db
      .query("purchase_orders")
      .withIndex("branchId", (q) => q.eq("branchId", branchId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    const pendingStatusLookup = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q.eq("lookupType", "PurchaseOrderStatus").eq("lookupCode", "PENDING"),
      )
      .first();

    const pendingInboundCount = pendingStatusLookup
      ? purchaseOrders.filter(
          (po) => po.purchaseOrderStatusTypeId === pendingStatusLookup._id,
        ).length
      : 0;

    // ========== KPI: Outbound Ready ==========
    const outboundOrders = await ctx.db
      .query("outbound_orders")
      .withIndex("branchId", (q) => q.eq("branchId", branchId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    const readyStatusLookup = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q.eq("lookupType", "OutboundStatus").eq("lookupCode", "READY"),
      )
      .first();

    const pendingOutboundLookup = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q.eq("lookupType", "OutboundStatus").eq("lookupCode", "PENDING"),
      )
      .first();

    const outboundReadyCount = readyStatusLookup
      ? outboundOrders.filter(
          (o) => o.outboundStatusTypeId === readyStatusLookup._id,
        ).length
      : 0;

    const outboundPendingCount = pendingOutboundLookup
      ? outboundOrders.filter(
          (o) => o.outboundStatusTypeId === pendingOutboundLookup._id,
        ).length
      : 0;

    // ========== KPI: Pending Return Requests ==========
    const returnRequests = await ctx.db
      .query("return_requests")
      .withIndex("branchId", (q) => q.eq("branchId", branchId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    const pendingReturnLookup = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q.eq("lookupType", "ReturnStatus").eq("lookupCode", "PENDING"),
      )
      .first();

    const pendingReturnsCount = pendingReturnLookup
      ? returnRequests.filter(
          (r) => r.returnStatusTypeId === pendingReturnLookup._id,
        ).length
      : 0;

    // ========== KPI: Receive Sessions ==========
    const receiveSessions = await ctx.db
      .query("receive_sessions")
      .withIndex("branchId", (q) => q.eq("branchId", branchId))
      .collect();

    const pendingReceiveLookup = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q.eq("lookupType", "ReceiveSessionStatus").eq("lookupCode", "PENDING"),
      )
      .first();

    const pendingReceiveCount = pendingReceiveLookup
      ? receiveSessions.filter(
          (rs) => rs.receiveSessionStatusTypeId === pendingReceiveLookup._id,
        ).length
      : 0;

    // ========== Order Activity Trend (for charts) ==========
    const inboundInRange = receiveSessions.filter(
      (rs) => rs.receivedAt >= startDate && rs.receivedAt <= endDate,
    );
    const outboundInRange = outboundOrders.filter(
      (o) => o.orderDate >= startDate && o.orderDate <= endDate,
    );

    const inboundTrend = getDailyTrendData(
      inboundInRange.map((rs) => ({ date: rs.receivedAt, value: 1 })),
      startDate,
      endDate,
    );

    const outboundTrend = getDailyTrendData(
      outboundInRange.map((o) => ({ date: o.orderDate, value: 1 })),
      startDate,
      endDate,
    );

    // Combine trends for chart
    const orderActivityTrend = inboundTrend.map((item, index) => ({
      date: item.date,
      inbound: item.value,
      outbound: outboundTrend[index]?.value ?? 0,
    }));

    // ========== Recent Activity (from audit_logs) ==========
    const auditLogs = await ctx.db
      .query("audit_logs")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", organizationId),
      )
      .order("desc")
      .take(20);

    const recentActivity = await Promise.all(
      auditLogs.slice(0, 10).map(async (log) => {
        const user = log.userId ? await ctx.db.get(log.userId) : null;
        const actionType = await ctx.db.get(log.actionTypeId);

        return {
          _id: log._id,
          entityType: log.entityType,
          entityId: log.entityId,
          action: actionType?.lookupValue ?? "Unknown",
          userName: user?.fullName ?? "System",
          notes: log.notes,
          timestamp: log._creationTime,
        };
      }),
    );

    // ========== Recent Orders (for table) ==========
    const recentPurchaseOrders = await Promise.all(
      purchaseOrders
        .filter((po) => po.orderedAt >= startDate && po.orderedAt <= endDate)
        .sort((a, b) => b.orderedAt - a.orderedAt)
        .slice(0, 5)
        .map(async (po) => {
          const status = await ctx.db.get(po.purchaseOrderStatusTypeId);
          const supplier = await ctx.db.get(po.supplierId);
          const details = await ctx.db
            .query("purchase_order_details")
            .withIndex("purchaseOrderId", (q) =>
              q.eq("purchaseOrderId", po._id),
            )
            .collect();

          return {
            _id: po._id,
            code: po.code,
            type: "Inbound" as const,
            status: status?.lookupValue ?? "Unknown",
            statusCode: status?.lookupCode ?? "UNKNOWN",
            itemCount: details.length,
            createdAt: po.orderedAt,
            supplierName: supplier?.name,
          };
        }),
    );

    const recentOutboundOrders = await Promise.all(
      outboundOrders
        .filter((o) => o.orderDate >= startDate && o.orderDate <= endDate)
        .sort((a, b) => b.orderDate - a.orderDate)
        .slice(0, 5)
        .map(async (o) => {
          const status = await ctx.db.get(o.outboundStatusTypeId);
          const details = await ctx.db
            .query("outbound_order_details")
            .withIndex("outboundOrderId", (q) => q.eq("outboundOrderId", o._id))
            .collect();

          return {
            _id: o._id,
            code: o.orderCode,
            type: "Outbound" as const,
            status: status?.lookupValue ?? "Unknown",
            statusCode: status?.lookupCode ?? "UNKNOWN",
            itemCount: details.length,
            createdAt: o.orderDate,
            trackingNumber: o.trackingNumber,
          };
        }),
    );

    // Combine and sort recent orders
    const recentOrders = [...recentPurchaseOrders, ...recentOutboundOrders]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10);

    // ========== Fulfillment Rate ==========
    const completedOutboundLookup = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q.eq("lookupType", "OutboundStatus").eq("lookupCode", "SHIPPED"),
      )
      .first();

    const shippedCount = completedOutboundLookup
      ? outboundInRange.filter(
          (o) => o.outboundStatusTypeId === completedOutboundLookup._id,
        ).length
      : 0;

    const fulfillmentRate =
      outboundInRange.length > 0
        ? Math.round((shippedCount / outboundInRange.length) * 100)
        : 100;

    return {
      kpis: {
        totalInventory,
        uniqueSkus,
        pendingInboundCount,
        outboundReadyCount,
        outboundPendingCount,
        lowStockCount,
        expiringSoonCount,
        pendingReturnsCount,
        pendingReceiveCount,
        fulfillmentRate,
      },
      orderActivityTrend,
      recentActivity,
      recentOrders,
      pendingActions: {
        receiveSessions: pendingReceiveCount,
        outboundOrders: outboundReadyCount + outboundPendingCount,
        returnRequests: pendingReturnsCount,
      },
    };
  },
});

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Generate daily trend data between two dates
 */
function getDailyTrendData(
  data: { date: number; value: number }[],
  startDate: number,
  endDate: number,
): { date: string; value: number }[] {
  const result: { date: string; value: number }[] = [];
  const dayMs = 24 * 60 * 60 * 1000;

  // Create a map for quick lookup
  const valueByDate = new Map<string, number>();
  for (const item of data) {
    const dateStr = new Date(item.date).toISOString().split("T")[0];
    const existing = valueByDate.get(dateStr) ?? 0;
    valueByDate.set(dateStr, existing + item.value);
  }

  // Fill in all dates in range
  let current = startDate;
  while (current <= endDate) {
    const dateStr = new Date(current).toISOString().split("T")[0];
    result.push({
      date: dateStr,
      value: valueByDate.get(dateStr) ?? 0,
    });
    current += dayMs;
  }

  return result;
}
