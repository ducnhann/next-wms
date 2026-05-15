/**
 * MODULE 9: Reports — Unit Tests
 * UC52–UC54 | BR175–BR186
 *
 * Tests based on Business Rules from testcase_instruction.md:
 *   RPT-001 to RPT-012
 *
 * Source: packages/backend/convex/reports.ts
 */

/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import {
  seedFullPOChain,
  seedProductVariant,
  seedSystemLookup,
} from "./helpers/seed";

const modules = import.meta.glob("../**/*.ts");

async function seedInboundReportData(t: ReturnType<typeof convexTest>) {
  const seed = await seedFullPOChain(t);

  const receiveStatusId = await seedSystemLookup(
    t,
    "ReceiveSessionStatus",
    "COMPLETED",
    "Completed",
    1,
  );
  const receiveItemStatusId = await seedSystemLookup(
    t,
    "ReceiveSessionItemStatus",
    "RECEIVED",
    "Received",
    1,
  );
  const poStatusId = await seedSystemLookup(
    t,
    "PurchaseOrderStatus",
    "PENDING",
    "Pending",
    1,
  );

  const now = Date.now();
  const startDate = now - 7 * 24 * 60 * 60 * 1000;
  const endDate = now + 1000;

  const poId = await t.run(async (ctx) => {
    return await ctx.db.insert("purchase_orders", {
      organizationId: seed.orgId,
      branchId: seed.branchId,
      code: "PO-REPORT-001",
      supplierId: seed.supplierId,
      orderedAt: now - 5 * 24 * 60 * 60 * 1000,
      expectedDeliveryAt: now + 2 * 24 * 60 * 60 * 1000,
      createdByUserId: seed.userId,
      purchaseOrderStatusTypeId: poStatusId,
      isDeleted: false,
    });
  });

  const sessionId = await t.run(async (ctx) => {
    return await ctx.db.insert("receive_sessions", {
      receiveSessionCode: "RS-REPORT-001",
      purchaseOrderId: poId,
      branchId: seed.branchId,
      receivedAt: now - 2 * 24 * 60 * 60 * 1000,
      receiveSessionStatusTypeId: receiveStatusId,
    });
  });

  await t.run(async (ctx) => {
    await ctx.db.insert("receive_sessions_details", {
      receiveSessionId: sessionId,
      skuId: seed.variantId,
      quantityReceived: 8,
      quantityExpected: 10,
      receiveSessionItemStatusTypeId: receiveItemStatusId,
      recommendedZoneId: seed.zoneId,
    });
  });

  const sessionId2 = await t.run(async (ctx) => {
    return await ctx.db.insert("receive_sessions", {
      receiveSessionCode: "RS-REPORT-002",
      purchaseOrderId: poId,
      branchId: seed.branchId,
      receivedAt: now - 1 * 24 * 60 * 60 * 1000,
      receiveSessionStatusTypeId: receiveStatusId,
    });
  });

  await t.run(async (ctx) => {
    await ctx.db.insert("receive_sessions_details", {
      receiveSessionId: sessionId2,
      skuId: seed.variantId,
      quantityReceived: 5,
      quantityExpected: 5,
      receiveSessionItemStatusTypeId: receiveItemStatusId,
      recommendedZoneId: seed.zoneId,
    });
  });

  return { seed, startDate, endDate };
}

async function seedInventoryReportData(t: ReturnType<typeof convexTest>) {
  const seed = await seedFullPOChain(t);
  const batchStatusId = await seedSystemLookup(
    t,
    "BatchStatus",
    "ACTIVE",
    "Active",
    1,
  );

  const variant2 = await seedProductVariant(t, seed.productId, {
    skuCode: "SKU-REPORT-002",
    description: "Report Variant 2",
    costPrice: 50,
  });

  const endDate = Date.now();
  const expiringSoon = endDate + 5 * 24 * 60 * 60 * 1000;
  const expired = endDate - 24 * 60 * 60 * 1000;

  await t.run(async (ctx) => {
    await ctx.db.insert("inventory_batches", {
      organizationId: seed.orgId,
      skuId: seed.variantId,
      zoneId: seed.zoneId,
      quantity: 8,
      branchId: seed.branchId,
      batchStatusTypeId: batchStatusId,
      expiresAt: expiringSoon,
      isDeleted: false,
    });

    await ctx.db.insert("inventory_batches", {
      organizationId: seed.orgId,
      skuId: variant2,
      zoneId: seed.zoneId,
      quantity: 20,
      branchId: seed.branchId,
      batchStatusTypeId: batchStatusId,
      expiresAt: expired,
      isDeleted: false,
    });
  });

  return { seed, endDate };
}

async function seedOutboundReportData(t: ReturnType<typeof convexTest>) {
  const seed = await seedFullPOChain(t);
  const outboundStatusId = await seedSystemLookup(
    t,
    "OutboundStatus",
    "SHIPPED",
    "Shipped",
    1,
  );

  const now = Date.now();
  const startDate = now - 7 * 24 * 60 * 60 * 1000;
  const endDate = now + 1000;

  const orderId = await t.run(async (ctx) => {
    return await ctx.db.insert("outbound_orders", {
      organizationId: seed.orgId,
      branchId: seed.branchId,
      orderCode: "OUT-REPORT-001",
      orderDate: now - 2 * 24 * 60 * 60 * 1000,
      requestedShipDate: now + 1 * 24 * 60 * 60 * 1000,
      createdByUserId: seed.userId,
      outboundStatusTypeId: outboundStatusId,
      isDeleted: false,
    });
  });

  await t.run(async (ctx) => {
    await ctx.db.insert("outbound_order_details", {
      outboundOrderId: orderId,
      skuId: seed.variantId,
      quantityRequested: 10,
      quantityPicked: 8,
      quantityPacked: 8,
    });
  });

  await t.run(async (ctx) => {
    await ctx.db.insert("picking_sessions", {
      organizationId: seed.orgId,
      branchId: seed.branchId,
      outboundOrderId: orderId,
      sessionCode: "PS-REPORT-001",
      isDeleted: false,
      startedAt: now - 3 * 60 * 60 * 1000,
      completedAt: now - 2 * 60 * 60 * 1000,
    });
  });

  const outOfRangeOrderId = await t.run(async (ctx) => {
    return await ctx.db.insert("outbound_orders", {
      organizationId: seed.orgId,
      branchId: seed.branchId,
      orderCode: "OUT-REPORT-OUTSIDE",
      orderDate: now - 30 * 24 * 60 * 60 * 1000,
      createdByUserId: seed.userId,
      outboundStatusTypeId: outboundStatusId,
      isDeleted: false,
    });
  });

  await t.run(async (ctx) => {
    await ctx.db.insert("outbound_order_details", {
      outboundOrderId: outOfRangeOrderId,
      skuId: seed.variantId,
      quantityRequested: 5,
      quantityPicked: 0,
      quantityPacked: 0,
    });
  });

  return { seed, startDate, endDate, orderId };
}

// ─── UC52: Inbound Report ───────────────────────────────────────────────────

describe("UC52: Inbound Report", () => {
  it("[BR175] RPT-001: Inbound report summary returns KPIs", async () => {
    const t = convexTest(schema, modules);
    const { seed, startDate, endDate } = await seedInboundReportData(t);

    const summary = await t.query(api.reports.getInboundReportSummary, {
      branchId: seed.branchId,
      startDate,
      endDate,
    });

    expect(summary.kpis.totalSessions).toBe(2);
    expect(summary.kpis.totalItemsReceived).toBe(13);
    expect(summary.kpis.overallAccuracyRate).toBe(87);
    expect(summary.statusBreakdown.length).toBeGreaterThan(0);
  });

  it("[BR176] RPT-002: Inbound report sessions include supplier and totals", async () => {
    const t = convexTest(schema, modules);
    const { seed, startDate, endDate } = await seedInboundReportData(t);

    const sessions = await t.query(api.reports.getInboundReportSessions, {
      branchId: seed.branchId,
      startDate,
      endDate,
    });

    expect(sessions).toHaveLength(2);
    expect(sessions[0].supplierName).toBe("Test Supplier");
    expect(sessions[0].totalExpected).toBeGreaterThan(0);
  });
});

// ─── UC53: Inventory Report ────────────────────────────────────────────────

describe("UC53: Inventory Report", () => {
  it("[BR179] RPT-005: Inventory report summary KPIs and alerts", async () => {
    const t = convexTest(schema, modules);
    const { seed, endDate } = await seedInventoryReportData(t);

    const summary = await t.query(api.reports.getInventoryReportSummary, {
      branchId: seed.branchId,
      startDate: endDate - 7 * 24 * 60 * 60 * 1000,
      endDate,
    });

    expect(summary.kpis.totalSKUs).toBe(2);
    expect(summary.kpis.expiringSoonCount).toBe(1);
    expect(summary.kpis.expiredCount).toBe(1);
    expect(summary.kpis.lowStockCount).toBe(1);
  });

  it("[BR180] RPT-006: Inventory report items include flags", async () => {
    const t = convexTest(schema, modules);
    const { seed, endDate } = await seedInventoryReportData(t);

    const items = await t.query(api.reports.getInventoryReportItems, {
      branchId: seed.branchId,
      endDate,
    });

    const lowStockItem = items.find((item) => item.quantity === 8);
    expect(lowStockItem).toBeDefined();
    expect(lowStockItem!.isLowStock).toBe(true);
    expect(lowStockItem!.isExpiringSoon).toBe(true);
    expect(lowStockItem!.isExpired).toBe(false);
  });
});

// ─── UC54: Outbound Report ─────────────────────────────────────────────────

describe("UC54: Outbound Report", () => {
  it("[BR183] RPT-009: Outbound report summary KPIs", async () => {
    const t = convexTest(schema, modules);
    const { seed, startDate, endDate } = await seedOutboundReportData(t);

    const summary = await t.query(api.reports.getOutboundReportSummary, {
      branchId: seed.branchId,
      startDate,
      endDate,
    });

    expect(summary.kpis.totalOrders).toBe(1);
    expect(summary.kpis.totalItemsShipped).toBe(8);
    expect(summary.kpis.overallFulfillmentRate).toBe(80);
    expect(summary.kpis.avgPickingTimeMinutes).toBe(60);
  });

  it("[BR184] RPT-010: Outbound report orders list includes totals", async () => {
    const t = convexTest(schema, modules);
    const { seed, startDate, endDate } = await seedOutboundReportData(t);

    const orders = await t.query(api.reports.getOutboundReportOrders, {
      branchId: seed.branchId,
      startDate,
      endDate,
    });

    expect(orders).toHaveLength(1);
    expect(orders[0].orderCode).toBe("OUT-REPORT-001");
    expect(orders[0].itemCount).toBe(1);
    expect(orders[0].fulfillmentRate).toBe(80);
  });

  it("[BR186] RPT-012: Date range filters out-of-range orders", async () => {
    const t = convexTest(schema, modules);
    const { seed, startDate, endDate } = await seedOutboundReportData(t);

    const orders = await t.query(api.reports.getOutboundReportOrders, {
      branchId: seed.branchId,
      startDate,
      endDate,
    });

    const codes = orders.map((o) => o.orderCode);
    expect(codes).toContain("OUT-REPORT-001");
    expect(codes).not.toContain("OUT-REPORT-OUTSIDE");
  });
});
