/**
 * MODULE 8: Inventory — Unit Tests
 * UC43–UC48 | BR154–BR167
 *
 * Tests based on Business Rules from testcase_instruction.md:
 *   INV-001, INV-002, INV-003
 *   ADJ-001, ADJ-006, ADJ-016, ADJ-018
 *
 * Source: packages/backend/convex/products.ts, cycleCount.ts
 */

/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import {
  seedFullPOChain,
  seedSystemLookup,
  seedUser,
} from "./helpers/seed";

const modules = import.meta.glob("../**/*.ts");

async function seedInventoryBatch(t: ReturnType<typeof convexTest>) {
  const seed = await seedFullPOChain(t);
  const batchStatusId = await seedSystemLookup(
    t,
    "BatchStatus",
    "ACTIVE",
    "Active",
    1,
  );

  const batchId = await t.run(async (ctx) => {
    return await ctx.db.insert("inventory_batches", {
      organizationId: seed.orgId,
      skuId: seed.variantId,
      zoneId: seed.zoneId,
      quantity: 50,
      branchId: seed.branchId,
      batchStatusTypeId: batchStatusId,
      isDeleted: false,
    });
  });

  return { seed, batchId, batchStatusId };
}

async function seedAdjustmentLookups(t: ReturnType<typeof convexTest>) {
  const quantityTypeId = await seedSystemLookup(
    t,
    "AdjustmentType",
    "QUANTITY",
    "Quantity",
    1,
  );
  const locationTypeId = await seedSystemLookup(
    t,
    "AdjustmentType",
    "LOCATION",
    "Location",
    2,
  );
  const pendingStatusId = await seedSystemLookup(
    t,
    "AdjustmentStatus",
    "PENDING",
    "Pending",
    1,
  );
  const approvedStatusId = await seedSystemLookup(
    t,
    "AdjustmentStatus",
    "APPROVED",
    "Approved",
    2,
  );
  const rejectedStatusId = await seedSystemLookup(
    t,
    "AdjustmentStatus",
    "REJECTED",
    "Rejected",
    3,
  );
  const reasonTypeId = await seedSystemLookup(
    t,
    "AdjustmentReason",
    "DAMAGE",
    "Damaged",
    1,
  );
  const adjustmentTxnTypeId = await seedSystemLookup(
    t,
    "InventoryTransactionType",
    "ADJUSTMENT",
    "Adjustment",
    1,
  );

  return {
    quantityTypeId,
    locationTypeId,
    pendingStatusId,
    approvedStatusId,
    rejectedStatusId,
    reasonTypeId,
    adjustmentTxnTypeId,
  };
}

// ─── UC43–UC44: Inventory List & Detail ─────────────────────────────────────

describe("UC43–UC44: Inventory List & Detail", () => {
  it("[BR154] INV-001: Inventory list returns batch and stock info", async () => {
    const t = convexTest(schema, modules);
    const { seed } = await seedInventoryBatch(t);

    const list = await t.query(api.products.getProductInventoryList, {
      organizationId: seed.orgId,
      branchId: seed.branchId,
    });

    expect(list).toHaveLength(1);
    expect(list[0].totalQuantity).toBe(50);
    expect(list[0].totalBatchCount).toBe(1);
    expect(list[0].locations).toContain("Zone A");
  });

  it("[BR155] INV-002: Search filters inventory list", async () => {
    const t = convexTest(schema, modules);
    const { seed } = await seedInventoryBatch(t);

    const list = await t.query(api.products.getProductInventoryList, {
      organizationId: seed.orgId,
      branchId: seed.branchId,
      searchTerm: "sku-001",
    });

    expect(list.length).toBeGreaterThan(0);
    expect(list[0].variants[0].skuCode).toBe("SKU-001");
  });

  it("[BR156] INV-003: Inventory detail shows batches and zones", async () => {
    const t = convexTest(schema, modules);
    const { seed } = await seedInventoryBatch(t);

    const detail = await t.query(api.products.getProductInventoryDetail, {
      productId: seed.productId,
      branchId: seed.branchId,
    });

    expect(detail.batches).toHaveLength(1);
    expect(detail.batches[0].zoneName).toBe("Zone A");
    expect(detail.summary.totalQuantity).toBe(50);
  });
});

// ─── UC45–UC48: Adjustments ─────────────────────────────────────────────────

describe("UC45–UC48: Adjustments", () => {
  it("[BR157] ADJ-001: Adjustment lookups include quantity and location", async () => {
    const t = convexTest(schema, modules);
    await seedAdjustmentLookups(t);

    const lookups = await t.query(api.cycleCount.getAdjustmentLookups, {});

    const typeCodes = lookups.adjustmentTypes.map((t) => t.lookupCode);
    expect(typeCodes).toContain("QUANTITY");
    expect(typeCodes).toContain("LOCATION");
  });

  it("[BR159] ADJ-006: Missing detail lines rejected", async () => {
    const t = convexTest(schema, modules);
    const seed = await seedFullPOChain(t);
    const lookups = await seedAdjustmentLookups(t);

    await expect(
      t.mutation(api.cycleCount.createNewAdjustmentRequest, {
        organizationId: seed.orgId as unknown as string,
        branchId: seed.branchId as unknown as string,
        requestCode: "ADJ-EMPTY",
        adjustmentTypeId: lookups.quantityTypeId as unknown as string,
        requestedByUserId: seed.userId as unknown as string,
        adjustmentStatusTypeId: lookups.pendingStatusId as unknown as string,
        details: [],
      }),
    ).rejects.toThrow("Adjustment request must have at least one detail line item");
  });

  it("[BR165] ADJ-016: Approve applies quantity adjustment", async () => {
    const t = convexTest(schema, modules);
    const { seed, batchId } = await seedInventoryBatch(t);
    const lookups = await seedAdjustmentLookups(t);
    const approverId = await seedUser(t, { authId: "ba-user-approver" });

    const adjustmentRequestId = await t.mutation(
      api.cycleCount.createNewAdjustmentRequest,
      {
        organizationId: seed.orgId as unknown as string,
        branchId: seed.branchId as unknown as string,
        requestCode: "ADJ-APPROVE",
        adjustmentTypeId: lookups.quantityTypeId as unknown as string,
        requestedByUserId: seed.userId as unknown as string,
        adjustmentStatusTypeId: lookups.pendingStatusId as unknown as string,
        details: [
          {
            batchId: batchId as unknown as string,
            skuId: seed.variantId as unknown as string,
            expectedQuantity: 50,
            actualQuantity: 40,
            varianceQuantity: -10,
            costImpact: 0,
            reasonTypeId: lookups.reasonTypeId as unknown as string,
          },
        ],
      },
    );

    await t.mutation(api.cycleCount.approveAdjustmentRequest, {
      adjustmentRequestId,
      approvedByUserId: approverId as unknown as string,
      resolutionNotes: "Approved",
    });

    const batch = await t.run(async (ctx) => ctx.db.get(batchId));
    expect(batch!.quantity).toBe(40);
  });

  it("[BR166] ADJ-018: Reject keeps inventory unchanged", async () => {
    const t = convexTest(schema, modules);
    const { seed, batchId } = await seedInventoryBatch(t);
    const lookups = await seedAdjustmentLookups(t);

    const adjustmentRequestId = await t.mutation(
      api.cycleCount.createNewAdjustmentRequest,
      {
        organizationId: seed.orgId as unknown as string,
        branchId: seed.branchId as unknown as string,
        requestCode: "ADJ-REJECT",
        adjustmentTypeId: lookups.quantityTypeId as unknown as string,
        requestedByUserId: seed.userId as unknown as string,
        adjustmentStatusTypeId: lookups.pendingStatusId as unknown as string,
        details: [
          {
            batchId: batchId as unknown as string,
            skuId: seed.variantId as unknown as string,
            expectedQuantity: 50,
            actualQuantity: 20,
            varianceQuantity: -30,
            costImpact: 0,
            reasonTypeId: lookups.reasonTypeId as unknown as string,
          },
        ],
      },
    );

    await t.mutation(api.cycleCount.rejectAdjustmentRequest, {
      adjustmentRequestId,
      resolutionNotes: "Rejected",
    });

    const batch = await t.run(async (ctx) => ctx.db.get(batchId));
    expect(batch!.quantity).toBe(50);
  });
});
