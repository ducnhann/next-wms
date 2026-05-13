/**
 * MODULE 5: Purchase Orders — Unit Tests
 * UC27–UC30 | BR95–BR107
 *
 * Tests for: createPurchaseOrder, cancelPurchaseOrder,
 *            listPurchaseOrders, getPurchaseOrderDetailed
 *
 * Source: packages/backend/convex/purchaseOrders.ts
 */

/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import {
  seedFullPOChain,
  seedProductVariant,
} from "./helpers/seed";

const modules = import.meta.glob("../**/*.ts");

// ─── UC27: Create Purchase Order ─────────────────────────────────────────────

describe("UC27: Create Purchase Order", () => {
  it("[BR98] PO-001: Creates PO with valid data", async () => {
    const t = convexTest(schema, modules);
    const seed = await seedFullPOChain(t);

    const result = await t.mutation(api.purchaseOrders.createPurchaseOrder, {
      receivingBranchId: seed.branchId,
      userId: seed.userId,
      supplierId: seed.supplierId,
      items: [
        {
          variantId: seed.variantId,
          quantity: 10,
          zoneId: seed.zoneId,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.orderId).toBeDefined();
    expect(result.code).toBeDefined();

    // Verify PO record exists in DB
    const po = await t.run(async (ctx) => {
      return await ctx.db.get(result.orderId);
    });
    expect(po).not.toBeNull();
    expect(po!.supplierId).toBe(seed.supplierId);
    expect(po!.branchId).toBe(seed.branchId);
    expect(po!.isDeleted).toBe(false);
  });

  it("[BR98] PO-002: Rejects when branch not found", async () => {
    const t = convexTest(schema, modules);
    const seed = await seedFullPOChain(t);

    // Create a fake branch ID by inserting and deleting
    const fakeBranchId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("branches", {
        organizationId: seed.orgId,
        name: "Fake",
        address: "x",
        phoneNumber: "x",
        isActive: true,
        isDeleted: false,
      });
      await ctx.db.delete(id);
      return id;
    });

    await expect(
      t.mutation(api.purchaseOrders.createPurchaseOrder, {
        receivingBranchId: fakeBranchId,
        userId: seed.userId,
        supplierId: seed.supplierId,
        items: [
          { variantId: seed.variantId, quantity: 10, zoneId: seed.zoneId },
        ],
      }),
    ).rejects.toThrow("Branch not found");
  });

  it("[BR98] PO-003: Rejects when supplier not found", async () => {
    const t = convexTest(schema, modules);
    const seed = await seedFullPOChain(t);

    const fakeSupplierId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("suppliers", {
        organizationId: seed.orgId,
        brandId: seed.brandId,
        name: "Fake",
        contactPerson: "x",
        email: "x@x.com",
        phone: "x",
        defaultLeadTimeDays: 1,
        isActive: true,
        isDeleted: false,
      });
      await ctx.db.delete(id);
      return id;
    });

    await expect(
      t.mutation(api.purchaseOrders.createPurchaseOrder, {
        receivingBranchId: seed.branchId,
        userId: seed.userId,
        supplierId: fakeSupplierId,
        items: [
          { variantId: seed.variantId, quantity: 10, zoneId: seed.zoneId },
        ],
      }),
    ).rejects.toThrow("Supplier not found");
  });

  it("[BR98] PO-004: Rejects when zone not found", async () => {
    const t = convexTest(schema, modules);
    const seed = await seedFullPOChain(t);

    const fakeZoneId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("storage_zones", {
        branchId: seed.branchId,
        name: "Fake",
        path: "fake",
        storageBlockType: "shelf",
        isDeleted: false,
      });
      await ctx.db.delete(id);
      return id;
    });

    await expect(
      t.mutation(api.purchaseOrders.createPurchaseOrder, {
        receivingBranchId: seed.branchId,
        userId: seed.userId,
        supplierId: seed.supplierId,
        items: [
          { variantId: seed.variantId, quantity: 10, zoneId: fakeZoneId },
        ],
      }),
    ).rejects.toThrow(/Zone not found/);
  });

  it("[BR98] PO-005: Rejects empty items array", async () => {
    const t = convexTest(schema, modules);
    const seed = await seedFullPOChain(t);

    await expect(
      t.mutation(api.purchaseOrders.createPurchaseOrder, {
        receivingBranchId: seed.branchId,
        userId: seed.userId,
        supplierId: seed.supplierId,
        items: [],
      }),
    ).rejects.toThrow(/at least one item/);
  });

  it("[BR99] PO-006: Generates PO code in format PO-YYYY-MM-XXX", async () => {
    const t = convexTest(schema, modules);
    const seed = await seedFullPOChain(t);

    const result = await t.mutation(api.purchaseOrders.createPurchaseOrder, {
      receivingBranchId: seed.branchId,
      userId: seed.userId,
      supplierId: seed.supplierId,
      items: [
        { variantId: seed.variantId, quantity: 5, zoneId: seed.zoneId },
      ],
    });

    // Code should match PO-YYYY-MM-XXX pattern
    expect(result.code).toMatch(/^PO-\d{4}-\d{2}-\d{3}$/);
  });

  it("[BR99] PO-007: Sequential code for multiple POs in same month", async () => {
    const t = convexTest(schema, modules);
    const seed = await seedFullPOChain(t);

    const result1 = await t.mutation(api.purchaseOrders.createPurchaseOrder, {
      receivingBranchId: seed.branchId,
      userId: seed.userId,
      supplierId: seed.supplierId,
      items: [
        { variantId: seed.variantId, quantity: 5, zoneId: seed.zoneId },
      ],
    });

    const result2 = await t.mutation(api.purchaseOrders.createPurchaseOrder, {
      receivingBranchId: seed.branchId,
      userId: seed.userId,
      supplierId: seed.supplierId,
      items: [
        { variantId: seed.variantId, quantity: 3, zoneId: seed.zoneId },
      ],
    });

    // Extract sequence numbers from codes
    const seq1 = parseInt(result1.code.split("-").pop()!, 10);
    const seq2 = parseInt(result2.code.split("-").pop()!, 10);
    expect(seq2).toBe(seq1 + 1);
  });

  it("[BR100] PO-008: Calculates expectedDeliveryAt from supplier leadTime", async () => {
    const t = convexTest(schema, modules);
    const seed = await seedFullPOChain(t);
    // Supplier has defaultLeadTimeDays = 7

    const result = await t.mutation(api.purchaseOrders.createPurchaseOrder, {
      receivingBranchId: seed.branchId,
      userId: seed.userId,
      supplierId: seed.supplierId,
      items: [
        { variantId: seed.variantId, quantity: 5, zoneId: seed.zoneId },
      ],
    });

    const po = await t.run(async (ctx) => {
      return await ctx.db.get(result.orderId);
    });

    expect(po!.expectedDeliveryAt).toBeDefined();

    // expectedDeliveryAt should be roughly orderedAt + 7 days (within 10s tolerance)
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const diff = po!.expectedDeliveryAt! - po!.orderedAt;
    expect(diff).toBeGreaterThanOrEqual(sevenDaysMs - 10_000);
    expect(diff).toBeLessThanOrEqual(sevenDaysMs + 10_000);
  });

  it("[BR101] PO-009: Creates purchase_order_details for each item", async () => {
    const t = convexTest(schema, modules);
    const seed = await seedFullPOChain(t);

    // Create additional variants
    const variant2 = await seedProductVariant(t, seed.productId, {
      skuCode: "SKU-002",
      description: "Variant 2",
    });
    const variant3 = await seedProductVariant(t, seed.productId, {
      skuCode: "SKU-003",
      description: "Variant 3",
    });

    const result = await t.mutation(api.purchaseOrders.createPurchaseOrder, {
      receivingBranchId: seed.branchId,
      userId: seed.userId,
      supplierId: seed.supplierId,
      items: [
        { variantId: seed.variantId, quantity: 10, zoneId: seed.zoneId },
        { variantId: variant2, quantity: 20, zoneId: seed.zoneId },
        { variantId: variant3, quantity: 30, zoneId: seed.zoneId },
      ],
    });

    // Verify 3 detail records were created
    const details = await t.run(async (ctx) => {
      return await ctx.db
        .query("purchase_order_details")
        .withIndex("purchaseOrderId", (q) =>
          q.eq("purchaseOrderId", result.orderId),
        )
        .collect();
    });

    expect(details).toHaveLength(3);
    expect(details.map((d) => d.quantityOrdered).sort()).toEqual([10, 20, 30]);
  });
});

// ─── UC29: List Purchase Orders ──────────────────────────────────────────────

describe("UC29: List Purchase Orders", () => {
  it("[BR104] PO-010: Returns POs with supplier and status", async () => {
    const t = convexTest(schema, modules);
    const seed = await seedFullPOChain(t);

    // Create a PO
    await t.mutation(api.purchaseOrders.createPurchaseOrder, {
      receivingBranchId: seed.branchId,
      userId: seed.userId,
      supplierId: seed.supplierId,
      items: [
        { variantId: seed.variantId, quantity: 5, zoneId: seed.zoneId },
      ],
    });

    const orders = await t.query(api.purchaseOrders.listPurchaseOrders, {
      branchId: seed.branchId,
      userId: seed.userId,
    });

    expect(orders).toHaveLength(1);
    expect(orders[0].supplier).toBeDefined();
    expect(orders[0].supplier!.name).toBe("Test Supplier");
    expect(orders[0].purchaseOrderStatus).toBeDefined();
    expect(orders[0].purchaseOrderStatus!.lookupCode).toBe("PENDING");
  });

  it("[BR104] PO-011: Excludes soft-deleted POs", async () => {
    const t = convexTest(schema, modules);
    const seed = await seedFullPOChain(t);

    // Create a PO, then soft-delete it
    const result = await t.mutation(api.purchaseOrders.createPurchaseOrder, {
      receivingBranchId: seed.branchId,
      userId: seed.userId,
      supplierId: seed.supplierId,
      items: [
        { variantId: seed.variantId, quantity: 5, zoneId: seed.zoneId },
      ],
    });

    await t.run(async (ctx) => {
      await ctx.db.patch(result.orderId, {
        isDeleted: true,
        deletedAt: Date.now(),
      });
    });

    const orders = await t.query(api.purchaseOrders.listPurchaseOrders, {
      branchId: seed.branchId,
      userId: seed.userId,
    });

    expect(orders).toHaveLength(0);
  });
});

// ─── UC28: View PO Detail ────────────────────────────────────────────────────

describe("UC28: View PO Detail", () => {
  it("[BR103] PO-012: Returns full PO info with items, supplier, totals", async () => {
    const t = convexTest(schema, modules);
    const seed = await seedFullPOChain(t);

    const result = await t.mutation(api.purchaseOrders.createPurchaseOrder, {
      receivingBranchId: seed.branchId,
      userId: seed.userId,
      supplierId: seed.supplierId,
      items: [
        { variantId: seed.variantId, quantity: 10, zoneId: seed.zoneId },
      ],
    });

    const detail = await t.query(api.purchaseOrders.getPurchaseOrderDetailed, {
      orderId: result.orderId,
      userId: seed.userId,
    });

    expect(detail.code).toBe(result.code);
    expect(detail.supplier).toBeDefined();
    expect(detail.supplier!.name).toBe("Test Supplier");
    expect(detail.items).toHaveLength(1);
    expect(detail.items[0].skuCode).toBe("SKU-001");
    expect(detail.items[0].quantityOrdered).toBe(10);
    expect(detail.totalItems).toBe(1);
    expect(detail.totalQuantityOrdered).toBe(10);
  });

  it("[BR103] PO-013: Throws for non-existent PO", async () => {
    const t = convexTest(schema, modules);
    const seed = await seedFullPOChain(t);

    // Create and delete a PO to get a valid-format but non-existent ID
    const tempResult = await t.mutation(
      api.purchaseOrders.createPurchaseOrder,
      {
        receivingBranchId: seed.branchId,
        userId: seed.userId,
        supplierId: seed.supplierId,
        items: [
          { variantId: seed.variantId, quantity: 1, zoneId: seed.zoneId },
        ],
      },
    );

    await t.run(async (ctx) => {
      await ctx.db.delete(tempResult.orderId);
    });

    await expect(
      t.query(api.purchaseOrders.getPurchaseOrderDetailed, {
        orderId: tempResult.orderId,
        userId: seed.userId,
      }),
    ).rejects.toThrow("Purchase order not found");
  });
});

// ─── Cancel PO ───────────────────────────────────────────────────────────────

describe("Cancel Purchase Order", () => {
  it("PO-014: Cancels PENDING PO", async () => {
    const t = convexTest(schema, modules);
    const seed = await seedFullPOChain(t);

    const result = await t.mutation(api.purchaseOrders.createPurchaseOrder, {
      receivingBranchId: seed.branchId,
      userId: seed.userId,
      supplierId: seed.supplierId,
      items: [
        { variantId: seed.variantId, quantity: 5, zoneId: seed.zoneId },
      ],
    });

    const cancelResult = await t.mutation(
      api.purchaseOrders.cancelPurchaseOrder,
      {
        purchaseOrderId: result.orderId,
        userId: seed.userId,
      },
    );

    expect(cancelResult.success).toBe(true);

    // Verify status changed to CANCELLED
    const po = await t.run(async (ctx) => {
      const order = await ctx.db.get(result.orderId);
      if (!order) return null;
      const status = await ctx.db.get(order.purchaseOrderStatusTypeId);
      return { order, status };
    });

    expect(po!.status!.lookupCode).toBe("CANCELLED");
  });

  it("PO-015: Rejects cancel for non-PENDING PO", async () => {
    const t = convexTest(schema, modules);
    const seed = await seedFullPOChain(t);

    // Create PO
    const result = await t.mutation(api.purchaseOrders.createPurchaseOrder, {
      receivingBranchId: seed.branchId,
      userId: seed.userId,
      supplierId: seed.supplierId,
      items: [
        { variantId: seed.variantId, quantity: 5, zoneId: seed.zoneId },
      ],
    });

    // Manually change status to PARTIAL
    await t.run(async (ctx) => {
      await ctx.db.patch(result.orderId, {
        purchaseOrderStatusTypeId: seed.poStatuses.partial,
      });
    });

    await expect(
      t.mutation(api.purchaseOrders.cancelPurchaseOrder, {
        purchaseOrderId: result.orderId,
        userId: seed.userId,
      }),
    ).rejects.toThrow("Only pending purchase orders can be cancelled");
  });
});
