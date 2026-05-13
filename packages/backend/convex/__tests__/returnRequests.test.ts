/**
 * MODULE 7: INBOUND — Return Requests — Unit Tests
 * UC33, UC49–UC51 | BR122–BR124, BR168–BR174
 *
 * Tests based on Business Rules from testcase_instruction.md:
 *   RET-001 to RET-007
 *
 * Source: packages/backend/convex/returnRequest.ts
 */

/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import {
  seedFullPOChain,
  seedPOWithDetails,
  seedSystemLookup,
} from "./helpers/seed";

const modules = import.meta.glob("../**/*.ts");

/**
 * Helper: Creates the full chain needed for return request tests:
 *   org → branch → brand → supplier → product → variant → zone
 *   → PO (PENDING) → Receive Session → processReceiveItem
 *   → setItemReturnRequested (marks item for return)
 *   → return request created via createReturnFromReceiveSession
 *
 * This mirrors the real user flow:
 *   1. Create PO
 *   2. Create receive session
 *   3. Process items (partial receive)
 *   4. Mark item for return
 *   5. Complete session → creates return request
 */
async function setupReturnRequestScenario(t: ReturnType<typeof convexTest>) {
  const seed = await seedFullPOChain(t);

  // Seed return-related statuses
  const pendingReturnStatus = await seedSystemLookup(
    t,
    "ReturnStatus",
    "PENDING",
    "Pending",
    1,
  );
  const approvedReturnStatus = await seedSystemLookup(
    t,
    "ReturnStatus",
    "APPROVED",
    "Approved",
    2,
  );
  const rejectedReturnStatus = await seedSystemLookup(
    t,
    "ReturnStatus",
    "REJECTED",
    "Rejected",
    3,
  );

  // Seed return reason
  const returnReasonId = await seedSystemLookup(
    t,
    "ReturnReason",
    "DAMAGED",
    "Damaged",
    1,
  );

  // Create a PO with PENDING status
  const po = await seedPOWithDetails(t, {
    orgId: seed.orgId,
    branchId: seed.branchId,
    supplierId: seed.supplierId,
    userId: seed.userId,
    statusId: seed.poStatuses.pending,
    zoneId: seed.zoneId,
    items: [{ variantId: seed.variantId, quantity: 10 }],
  });

  // Create receive session from PO
  const session = await t.mutation(
    api.receiveSessions.createReceiveSession,
    {
      purchaseOrderId: po.poId,
      userId: seed.userId,
    },
  );

  // Get the receive session detail
  const details = await t.run(async (ctx) => {
    return await ctx.db
      .query("receive_sessions_details")
      .withIndex("receiveSessionId", (q) =>
        q.eq("receiveSessionId", session.receiveSessionId),
      )
      .collect();
  });

  const detailId = details[0]._id;

  // Process the item (receive 10 units)
  await t.mutation(api.receiveSessions.processReceiveItem, {
    receiveSessionDetailId: detailId,
    quantityToAdd: 10,
  });

  // Mark item for return
  await t.mutation(api.receiveSessions.setItemReturnRequested, {
    receiveSessionDetailId: detailId,
    returnTypeId: returnReasonId,
    notes: "Item damaged during receiving",
  });

  return {
    seed,
    po,
    session,
    detailId,
    pendingReturnStatus,
    approvedReturnStatus,
    rejectedReturnStatus,
    returnReasonId,
  };
}

// ─── UC33: Create Return Request ─────────────────────────────────────────────

describe("UC33: Create Return Request", () => {
  // RET-001 | BR123: Tạo yêu cầu trả hàng với chi tiết
  it("[BR123] RET-001: Creates return request with details — return_request + return_request_details records", async () => {
    const t = convexTest(schema, modules);
    const ctx = await setupReturnRequestScenario(t);

    // Act: Create return request via the createReturnRequest mutation
    const returnRequestId = await t.mutation(
      api.returnRequest.createReturnRequest,
      {
        organizationId: ctx.seed.orgId as unknown as string,
        branchId: ctx.seed.branchId as unknown as string,
        requestCode: "RR-20260513-0001",
        supplierId: ctx.seed.supplierId as unknown as string,
        requestedByUserId: ctx.seed.userId as unknown as string,
        returnStatusTypeId: ctx.pendingReturnStatus as unknown as string,
        purchaseOrderId: ctx.po.poId as unknown as string,
        details: [
          {
            skuId: ctx.seed.variantId as unknown as string,
            quantityToReturn: 3,
            reasonTypeId: ctx.returnReasonId as unknown as string,
            customReasonNotes: "Damaged packaging",
          },
        ],
      },
    );

    // Assert: return_request record exists
    const returnRequest = await t.run(async (dbCtx) => {
      return await dbCtx.db.get(returnRequestId);
    });
    expect(returnRequest).not.toBeNull();
    expect(returnRequest!.requestCode).toBe("RR-20260513-0001");
    expect(returnRequest!.isDeleted).toBe(false);

    // Assert: return_request_details record exists
    const returnDetails = await t.run(async (dbCtx) => {
      return await dbCtx.db
        .query("return_request_details")
        .withIndex("returnRequestId", (q) =>
          q.eq("returnRequestId", returnRequestId),
        )
        .collect();
    });
    expect(returnDetails).toHaveLength(1);
    expect(returnDetails[0].quantityToReturn).toBe(3);
  });

  // RET-002 | BR123: Liên kết return request với PO
  it("[BR123] RET-002: Links return request to PO — PO ID stored in record", async () => {
    const t = convexTest(schema, modules);
    const ctx = await setupReturnRequestScenario(t);

    const returnRequestId = await t.mutation(
      api.returnRequest.createReturnRequest,
      {
        organizationId: ctx.seed.orgId as unknown as string,
        branchId: ctx.seed.branchId as unknown as string,
        requestCode: "RR-20260513-0002",
        supplierId: ctx.seed.supplierId as unknown as string,
        requestedByUserId: ctx.seed.userId as unknown as string,
        returnStatusTypeId: ctx.pendingReturnStatus as unknown as string,
        purchaseOrderId: ctx.po.poId as unknown as string,
        details: [
          {
            skuId: ctx.seed.variantId as unknown as string,
            quantityToReturn: 2,
            reasonTypeId: ctx.returnReasonId as unknown as string,
          },
        ],
      },
    );

    // Assert: PO ID is stored in the return request record
    const returnRequest = await t.run(async (dbCtx) => {
      return await dbCtx.db.get(returnRequestId);
    });
    expect(returnRequest!.purchaseOrderId).toBe(
      ctx.po.poId as unknown as string,
    );
  });
});

// ─── UC51: Complete Return Request ───────────────────────────────────────────

describe("UC51: Complete Return Request", () => {
  /**
   * Helper: Creates a return request with receiveSessionDetailId linked,
   * which is needed for approve/reject to update receive session items.
   */
  async function createLinkedReturnRequest(
    t: ReturnType<typeof convexTest>,
  ) {
    const ctx = await setupReturnRequestScenario(t);

    // Complete the receive session which creates the return request
    // for RETURN_REQUESTED items
    const completeResult = await t.mutation(
      api.receiveSessions.completeReceiveSession,
      {
        receiveSessionId: ctx.session.receiveSessionId,
        verifiedByUserId: ctx.seed.userId,
      },
    );

    // The completeReceiveSession creates a return request for RETURN_REQUESTED items
    const returnRequestId = completeResult.returnRequestId;

    return { ctx, returnRequestId, completeResult };
  }

  // RET-003 | BR172: Phê duyệt → status = APPROVED
  it("[BR172] RET-003: Sets status to APPROVED", async () => {
    const t = convexTest(schema, modules);
    const { ctx, returnRequestId } = await createLinkedReturnRequest(t);

    // Precondition: return request must exist
    expect(returnRequestId).toBeDefined();

    // Act: Approve the return request
    await t.mutation(api.returnRequest.approveReturnRequest, {
      returnRequestId,
    });

    // Assert: Status = APPROVED
    const returnRequest = await t.run(async (dbCtx) => {
      return await dbCtx.db.get(returnRequestId);
    });
    const status = await t.run(async (dbCtx) => {
      return await dbCtx.db.get(
        returnRequest!.returnStatusTypeId as any,
      );
    });
    expect(status!.lookupCode).toBe("APPROVED");
  });

  // RET-004 | BR172: Phê duyệt → receive session items status = RETURNED
  it("[BR172] RET-004: Updates receive session items to RETURNED status", async () => {
    const t = convexTest(schema, modules);
    const { ctx, returnRequestId } = await createLinkedReturnRequest(t);

    // Act: Approve the return request
    await t.mutation(api.returnRequest.approveReturnRequest, {
      returnRequestId,
    });

    // Assert: linked receive session detail has RETURNED status
    const detail = await t.run(async (dbCtx) => {
      return await dbCtx.db.get(ctx.detailId);
    });

    const itemStatus = await t.run(async (dbCtx) => {
      return await dbCtx.db.get(detail!.receiveSessionItemStatusTypeId);
    });

    expect(itemStatus!.lookupCode).toBe("RETURNED");
  });

  // RET-005 | BR173: Từ chối → status = REJECTED
  it("[BR173] RET-005: Sets status to REJECTED", async () => {
    const t = convexTest(schema, modules);
    const { ctx, returnRequestId } = await createLinkedReturnRequest(t);

    // Act: Reject the return request
    await t.mutation(api.returnRequest.rejectReturnRequest, {
      returnRequestId,
      rejectionNotes: "Items are acceptable quality",
    });

    // Assert: Status = REJECTED
    const returnRequest = await t.run(async (dbCtx) => {
      return await dbCtx.db.get(returnRequestId);
    });
    const status = await t.run(async (dbCtx) => {
      return await dbCtx.db.get(
        returnRequest!.returnStatusTypeId as any,
      );
    });
    expect(status!.lookupCode).toBe("REJECTED");
  });

  // RET-006 | BR173: Từ chối → tạo inventory batch (hàng được nhập vào kho)
  it("[BR173] RET-006: Creates inventory batch for rejected items — items accepted into warehouse", async () => {
    const t = convexTest(schema, modules);
    const { ctx, returnRequestId } = await createLinkedReturnRequest(t);

    // Count batches before rejection
    const batchesBefore = await t.run(async (dbCtx) => {
      return await dbCtx.db
        .query("inventory_batches")
        .withIndex("branchId", (q) => q.eq("branchId", ctx.seed.branchId))
        .collect();
    });

    // Act: Reject the return request
    const result = await t.mutation(api.returnRequest.rejectReturnRequest, {
      returnRequestId,
    });

    // Assert: inventory batch was created
    const batchesAfter = await t.run(async (dbCtx) => {
      return await dbCtx.db
        .query("inventory_batches")
        .withIndex("branchId", (q) => q.eq("branchId", ctx.seed.branchId))
        .collect();
    });

    expect(batchesAfter.length).toBeGreaterThan(batchesBefore.length);
  });
});

// ─── UC50: List Return Requests ──────────────────────────────────────────────

describe("UC50: List Return Requests", () => {
  // RET-007 | BR169: Trả về yêu cầu trả hàng với supplier, creator, status
  it("[BR169] RET-007: Returns requests with supplier, creator, status — all enriched fields present", async () => {
    const t = convexTest(schema, modules);
    const ctx = await setupReturnRequestScenario(t);

    // Create a return request first
    await t.mutation(api.returnRequest.createReturnRequest, {
      organizationId: ctx.seed.orgId as unknown as string,
      branchId: ctx.seed.branchId as unknown as string,
      requestCode: "RR-20260513-0003",
      supplierId: ctx.seed.supplierId as unknown as string,
      requestedByUserId: ctx.seed.userId as unknown as string,
      returnStatusTypeId: ctx.pendingReturnStatus as unknown as string,
      purchaseOrderId: ctx.po.poId as unknown as string,
      details: [
        {
          skuId: ctx.seed.variantId as unknown as string,
          quantityToReturn: 5,
          reasonTypeId: ctx.returnReasonId as unknown as string,
        },
      ],
    });

    // Act: List with details
    const results = await t.query(api.returnRequest.listWithDetails, {
      organizationId: ctx.seed.orgId as unknown as string,
      branchId: ctx.seed.branchId as unknown as string,
    });

    // Assert: enriched fields present
    expect(results.length).toBeGreaterThanOrEqual(1);

    const first = results[0];
    expect(first.requestCode).toBeDefined();
    expect(first.supplier).toBeDefined();
    expect(first.supplier!.name).toBe("Test Supplier");
    expect(first.requestedByUser).toBeDefined();
    expect(first.requestedByUser!.fullName).toBe("Test User");
    expect(first.returnStatus).toBeDefined();
    expect(first.totalSKUs).toBe(1);
    expect(first.totalItems).toBe(5);
  });
});
