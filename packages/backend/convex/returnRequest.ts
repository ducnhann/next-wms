import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { logCRUDAction } from "./audit";

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Get supplier by ID (handles string ID from return_requests table)
 */
async function getSupplierById(ctx: any, supplierId: string) {
  try {
    const supplier = await ctx.db.get(supplierId as Id<"suppliers">);
    return supplier;
  } catch {
    return null;
  }
}

/**
 * Get user by ID (handles string ID from return_requests table)
 */
async function getUserById(ctx: any, userId: string) {
  try {
    const user = await ctx.db.get(userId as Id<"users">);
    return user;
  } catch {
    return null;
  }
}

/**
 * Get system lookup by ID
 */
async function getSystemLookup(ctx: any, lookupId: string) {
  try {
    const lookup = await ctx.db.get(lookupId as Id<"system_lookups">);
    return lookup;
  } catch {
    return null;
  }
}

/**
 * Get product variant by ID
 */
async function getProductVariant(ctx: any, skuId: string) {
  try {
    const variant = await ctx.db.get(skuId as Id<"product_variants">);
    return variant;
  } catch {
    return null;
  }
}

/**
 * Check if all items in a receive session are resolved (COMPLETE or RETURNED)
 * and update the session status to COMPLETE if so
 */
async function checkAndCompleteReceiveSession(
  ctx: any,
  purchaseOrderId: string,
) {
  // Find the receive session by purchaseOrderId
  const receiveSession = await ctx.db
    .query("receive_sessions")
    .withIndex("purchaseOrderId", (q: any) =>
      q.eq("purchaseOrderId", purchaseOrderId),
    )
    .first();

  if (!receiveSession) {
    return null;
  }

  // Get all receive session details
  const details = await ctx.db
    .query("receive_sessions_details")
    .withIndex("receiveSessionId", (q: any) =>
      q.eq("receiveSessionId", receiveSession._id),
    )
    .collect();

  // Get COMPLETE and RETURNED status IDs
  const completeStatus = await ctx.db
    .query("system_lookups")
    .withIndex("lookupType_lookupCode", (q: any) =>
      q
        .eq("lookupType", "ReceiveSessionItemStatus")
        .eq("lookupCode", "COMPLETE"),
    )
    .first();

  const returnedStatus = await ctx.db
    .query("system_lookups")
    .withIndex("lookupType_lookupCode", (q: any) =>
      q
        .eq("lookupType", "ReceiveSessionItemStatus")
        .eq("lookupCode", "RETURNED"),
    )
    .first();

  // Check if all items are either COMPLETE or RETURNED
  const allItemsResolved = details.every((d: any) => {
    const isComplete =
      completeStatus && d.receiveSessionItemStatusTypeId === completeStatus._id;
    const isReturned =
      returnedStatus && d.receiveSessionItemStatusTypeId === returnedStatus._id;
    return isComplete || isReturned;
  });

  if (allItemsResolved) {
    // Get or create COMPLETE status for receive session
    let sessionCompleteStatus = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q: any) =>
        q.eq("lookupType", "ReceiveSessionStatus").eq("lookupCode", "COMPLETE"),
      )
      .first();

    if (!sessionCompleteStatus) {
      const newStatusId = await ctx.db.insert("system_lookups", {
        lookupType: "ReceiveSessionStatus",
        lookupCode: "COMPLETE",
        lookupValue: "Complete",
        description: "Receive session is complete",
        sortOrder: 3,
      });
      sessionCompleteStatus = await ctx.db.get(newStatusId);
    }

    // Update receive session status to COMPLETE
    await ctx.db.patch(receiveSession._id, {
      receiveSessionStatusTypeId: sessionCompleteStatus._id,
    });

    return receiveSession._id;
  }

  return null;
}

// ================================================================
// QUERIES
// ================================================================

/**
 * getAllReturnRequest
 *
 * Purpose: Retrieves all active return requests for a specific organization
 *
 * Process:
 * 1. Queries the return_requests table using the organizationId index
 * 2. Filters results to only include non-deleted records (isDeleted = false)
 * 3. Returns the complete list of active return requests
 *
 * Access: Available to all authenticated users within the organization
 * Typical users: Warehouse managers, inventory staff, admins
 */
export const getAllReturnRequest = query({
  args: {
    organizationId: v.string(),
    branchId: v.string(),
  },
  handler: async (ctx, args) => {
    // Step 1: Query return_requests table filtered by organization
    const returnRequests = await ctx.db
      .query("return_requests")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      // Step 2: Exclude soft-deleted records and filter by branch
      .filter((q) =>
        q.and(
          q.eq(q.field("branchId"), args.branchId),
          q.eq(q.field("isDeleted"), false),
        ),
      )
      .collect();

    // Step 3: Return all active return requests
    return returnRequests;
  },
});

/**
 * listWithDetails
 *
 * Purpose: Retrieves all active return requests with related data (supplier, user, status)
 *
 * Process:
 * 1. Queries the return_requests table using the organizationId index
 * 2. Filters results to only include non-deleted records
 * 3. Enriches each request with supplier name, user name, and status
 * 4. Counts total SKUs and items for each request
 *
 * Access: Available to all authenticated users within the organization
 */
export const listWithDetails = query({
  args: {
    organizationId: v.string(),
    branchId: v.string(),
  },
  handler: async (ctx, args) => {
    // Step 1: Query return_requests table filtered by organization
    const returnRequests = await ctx.db
      .query("return_requests")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("branchId"), args.branchId),
          q.eq(q.field("isDeleted"), false),
        ),
      )
      .order("desc")
      .collect();

    // Step 2: Enrich each request with related data
    const enrichedRequests = await Promise.all(
      returnRequests.map(async (request) => {
        // Get supplier
        const supplier = await getSupplierById(ctx, request.supplierId);

        // Get requested by user
        const requestedByUser = await getUserById(
          ctx,
          request.requestedByUserId,
        );

        // Get status
        const status = await getSystemLookup(ctx, request.returnStatusTypeId);

        // Get details to count total SKUs and items
        const details = await ctx.db
          .query("return_request_details")
          .withIndex("returnRequestId", (q) =>
            q.eq("returnRequestId", request._id),
          )
          .collect();

        const totalSKUs = details.length;
        const totalItems = details.reduce(
          (sum, detail) => sum + detail.quantityToReturn,
          0,
        );

        return {
          _id: request._id,
          requestCode: request.requestCode,
          requestedAt: request.requestedAt,
          supplier: supplier ? { name: supplier.name } : null,
          requestedByUser: requestedByUser
            ? { fullName: requestedByUser.fullName }
            : null,
          returnStatus: status ? { lookupValue: status.lookupValue } : null,
          totalSKUs,
          totalItems,
        };
      }),
    );

    return enrichedRequests;
  },
});

/**
 * getFilteredReturnRequestByStatus
 *
 * Purpose: Retrieves return requests filtered by specific status type
 *
 * Process:
 * 1. Queries the return_requests table using the returnStatusTypeId index
 * 2. Filters by organization and status type
 * 3. Excludes soft-deleted records (isDeleted = false)
 * 4. Returns all matching return requests
 *
 * Access: Available to all authenticated users within the organization
 * Typical users: Warehouse managers, inventory staff, supervisors, admins
 */
export const getFilteredReturnRequestByStatus = query({
  args: {
    organizationId: v.string(),
    branchId: v.string(),
    returnStatusTypeId: v.string(),
  },
  handler: async (ctx, args) => {
    // Step 1: Query return_requests table using returnStatusTypeId index
    const returnRequests = await ctx.db
      .query("return_requests")
      .withIndex("returnStatusTypeId", (q) =>
        q.eq("returnStatusTypeId", args.returnStatusTypeId),
      )
      // Step 2: Filter by organization, branch and exclude soft-deleted records
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("branchId"), args.branchId),
          q.eq(q.field("isDeleted"), false),
        ),
      )
      .collect();

    // Step 3: Return filtered return requests
    return returnRequests;
  },
});

/**
 * getReturnRequestById
 *
 * Purpose: Retrieves a specific return request by its ID along with its line item details
 *
 * Process:
 * 1. Fetches the return request from the database using the provided ID
 * 2. Validates that the request exists and is not deleted
 * 3. Queries all associated return request details (line items)
 * 4. Returns the return request with its details
 *
 * Access: Available to all authenticated users within the organization
 * Typical users: Warehouse managers, inventory staff, supervisors, admins
 */
export const getReturnRequestById = query({
  args: {
    returnRequestId: v.id("return_requests"),
  },
  handler: async (ctx, args) => {
    // Step 1: Fetch the return request by ID
    const returnRequest = await ctx.db.get(args.returnRequestId);

    // Step 2: Validate request exists and is not deleted
    if (!returnRequest || returnRequest.isDeleted) {
      return null;
    }

    // Step 3: Query all associated return request details
    const returnDetails = await ctx.db
      .query("return_request_details")
      .withIndex("returnRequestId", (q) =>
        q.eq("returnRequestId", args.returnRequestId),
      )
      .collect();

    // Step 4: Return the complete return request with details
    return {
      ...returnRequest,
      details: returnDetails,
    };
  },
});

/**
 * getReturnRequestWithDetails
 *
 * Purpose: Retrieves a specific return request by its ID with all enriched data
 *
 * Process:
 * 1. Fetches the return request from the database
 * 2. Enriches with supplier, user, and status information
 * 3. Enriches each detail line with SKU/product info and reason
 * 4. Returns the complete return request with all related data
 *
 * Access: Available to all authenticated users within the organization
 */
export const getReturnRequestWithDetails = query({
  args: {
    returnRequestId: v.id("return_requests"),
  },
  handler: async (ctx, args) => {
    // Step 1: Fetch the return request by ID
    const returnRequest = await ctx.db.get(args.returnRequestId);

    // Step 2: Validate request exists and is not deleted
    if (!returnRequest || returnRequest.isDeleted) {
      return null;
    }

    // Step 3: Get related data for the header
    const supplier = await getSupplierById(ctx, returnRequest.supplierId);
    const requestedByUser = await getUserById(
      ctx,
      returnRequest.requestedByUserId,
    );
    const status = await getSystemLookup(ctx, returnRequest.returnStatusTypeId);

    // Step 4: Query all associated return request details
    const returnDetails = await ctx.db
      .query("return_request_details")
      .withIndex("returnRequestId", (q) =>
        q.eq("returnRequestId", args.returnRequestId),
      )
      .collect();

    // Step 5: Enrich each detail with product/SKU info and reason
    const enrichedDetails = await Promise.all(
      returnDetails.map(async (detail) => {
        const productVariant = await getProductVariant(ctx, detail.skuId);
        const reason = await getSystemLookup(ctx, detail.reasonTypeId);

        // Get product name if variant exists
        let productName: string | null = null;
        if (productVariant) {
          const product = await ctx.db.get(
            productVariant.productId as Id<"products">,
          );
          productName = (product as { name?: string } | null)?.name ?? null;
        }

        return {
          _id: detail._id,
          skuCode: productVariant?.skuCode ?? "Unknown SKU",
          productName,
          quantityToReturn: detail.quantityToReturn,
          expectedCreditAmount: detail.expectedCreditAmount,
          reason: reason ? { lookupValue: reason.lookupValue } : null,
          customReasonNotes: detail.customReasonNotes,
          batchId: detail.batchId,
        };
      }),
    );

    // Calculate totals
    const totalSKUs = returnDetails.length;
    const totalExpectedQuantity = returnDetails.reduce(
      (sum, detail) => sum + detail.quantityToReturn,
      0,
    );

    // Step 6: Return the complete return request with enriched details
    return {
      _id: returnRequest._id,
      requestCode: returnRequest.requestCode,
      requestedAt: returnRequest.requestedAt,
      supplier: supplier ? { name: supplier.name } : null,
      requestedByUser: requestedByUser
        ? { fullName: requestedByUser.fullName }
        : null,
      returnStatus: status ? { lookupValue: status.lookupValue } : null,
      totalSKUs,
      totalExpectedQuantity,
      details: enrichedDetails,
    };
  },
});

/**
 * setReturnRequestStatus
 *
 * Purpose: Updates the status of a specific return request
 *
 * Process:
 * 1. Fetches the return request by ID to validate it exists
 * 2. Verifies the request is not deleted
 * 3. Updates the returnStatusTypeId to the new status
 * 4. Returns the updated return request ID
 *
 * Access: Restricted to authorized users with permission to manage return requests
 * Typical users: Warehouse managers, supervisors, admins
 */
export const setReturnRequestStatus = mutation({
  args: {
    returnRequestId: v.id("return_requests"),
    returnStatusTypeId: v.string(),
  },
  handler: async (ctx, args) => {
    // Step 1: Fetch the return request to validate it exists
    const returnRequest = await ctx.db.get(args.returnRequestId);

    // Step 2: Validate request exists and is not deleted
    if (!returnRequest || returnRequest.isDeleted) {
      throw new Error("Return request not found or has been deleted");
    }

    // Step 3: Update the status
    await ctx.db.patch(args.returnRequestId, {
      returnStatusTypeId: args.returnStatusTypeId,
    });

    // Step 4: Return the updated request ID
    return args.returnRequestId;
  },
});

/**
 * createReturnRequest
 *
 * Purpose: Creates a new return request along with its line item details
 *
 * Process:
 * 1. Validates that at least one detail line item is provided
 * 2. Creates the return request header with initial status
 * 3. Creates all associated return request detail records
 * 4. Returns the newly created return request ID
 *
 * Access: Restricted to authorized users with permission to create return requests
 * Typical users: Warehouse managers, inventory staff, admins
 */
export const createReturnRequest = mutation({
  args: {
    organizationId: v.string(),
    branchId: v.string(),
    requestCode: v.string(),
    supplierId: v.string(),
    requestedByUserId: v.string(),
    returnStatusTypeId: v.string(),
    purchaseOrderId: v.string(),
    details: v.array(
      v.object({
        skuId: v.string(),
        quantityToReturn: v.number(),
        reasonTypeId: v.string(),
        customReasonNotes: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Step 1: Validate that details are provided
    if (!args.details || args.details.length === 0) {
      throw new Error("Return request must have at least one detail line item");
    }

    // Step 2: Create the return request header
    const returnRequestId = await ctx.db.insert("return_requests", {
      organizationId: args.organizationId,
      branchId: args.branchId,
      requestCode: args.requestCode,
      supplierId: args.supplierId,
      requestedByUserId: args.requestedByUserId,
      requestedAt: Date.now(),
      returnStatusTypeId: args.returnStatusTypeId,
      isDeleted: false,
      purchaseOrderId: args.purchaseOrderId,
    });

    // Step 3: Create all return request detail records
    for (const detail of args.details) {
      await ctx.db.insert("return_request_details", {
        returnRequestId,
        skuId: detail.skuId,
        quantityToReturn: detail.quantityToReturn,
        reasonTypeId: detail.reasonTypeId,
        customReasonNotes: detail.customReasonNotes,
      });
    }

    // Log audit for return request creation
    await logCRUDAction(ctx, {
      organizationId: args.organizationId as Id<"organizations">,
      action: "CREATE",
      entityType: "return_requests",
      entityId: returnRequestId,
      newValue: { requestCode: args.requestCode, itemCount: args.details.length },
      notes: `Created return request ${args.requestCode} with ${args.details.length} items`,
    });

    // Step 4: Return the newly created return request ID
    return returnRequestId;
  },
});

/**
 * approveReturnRequest
 *
 * Purpose: Approves a return request by updating its status to APPROVED
 *          and updates linked receive session items to RETURNED status
 *
 * Process:
 * 1. Validates the return request exists
 * 2. Fetches the APPROVED status lookup
 * 3. Updates the return request status
 * 4. Gets all return request details
 * 5. Updates linked receive session item statuses to RETURNED
 *
 * Access: Restricted to authorized users with permission to approve returns
 * Typical users: Warehouse managers, inventory supervisors
 */
export const approveReturnRequest = mutation({
  args: {
    returnRequestId: v.id("return_requests"),
  },
  handler: async (ctx, args) => {
    // Step 1: Validate return request exists
    const returnRequest = await ctx.db.get(args.returnRequestId);
    if (!returnRequest || returnRequest.isDeleted) {
      throw new Error("Return request not found or has been deleted");
    }

    // Step 2: Get the APPROVED status lookup for return request
    const approvedStatus = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q.eq("lookupType", "ReturnStatus").eq("lookupCode", "APPROVED"),
      )
      .first();

    if (!approvedStatus) {
      throw new Error(
        "APPROVED status lookup not found. Please ensure seed data has been run.",
      );
    }

    // Step 3: Update the return request status
    await ctx.db.patch(args.returnRequestId, {
      returnStatusTypeId: approvedStatus._id,
    });

    // Step 4: Get all return request details
    const details = await ctx.db
      .query("return_request_details")
      .withIndex("returnRequestId", (q) =>
        q.eq("returnRequestId", args.returnRequestId),
      )
      .collect();

    // Step 5: Get or create RETURNED status for receive session items
    let returnedItemStatus = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q
          .eq("lookupType", "ReceiveSessionItemStatus")
          .eq("lookupCode", "RETURNED"),
      )
      .first();

    // Create RETURNED status if it doesn't exist
    if (!returnedItemStatus) {
      const newStatusId = await ctx.db.insert("system_lookups", {
        lookupType: "ReceiveSessionItemStatus",
        lookupCode: "RETURNED",
        lookupValue: "Returned",
        description: "Item has been returned to supplier",
        sortOrder: 5,
      });
      returnedItemStatus = await ctx.db.get(newStatusId);
    }

    // Step 6: Update each linked receive session item status to RETURNED
    for (const detail of details) {
      if (detail.receiveSessionDetailId) {
        const receiveDetail = await ctx.db.get(detail.receiveSessionDetailId);
        if (receiveDetail) {
          await ctx.db.patch(detail.receiveSessionDetailId, {
            receiveSessionItemStatusTypeId: returnedItemStatus!._id,
          });
        }
      }
    }

    // Step 7: Check if the receive session should be marked as COMPLETE
    if (returnRequest.purchaseOrderId) {
      await checkAndCompleteReceiveSession(ctx, returnRequest.purchaseOrderId);
    }

    // Log audit for return request approval
    await logCRUDAction(ctx, {
      organizationId: returnRequest.organizationId as Id<"organizations">,
      action: "UPDATE",
      entityType: "return_requests",
      entityId: args.returnRequestId,
      newValue: { status: "APPROVED" },
      notes: `Approved return request ${returnRequest.requestCode}`,
    });

    return args.returnRequestId;
  },
});

/**
 * rejectReturnRequest
 *
 * Purpose: Rejects a return request by updating its status to REJECTED.
 *          Updates linked receive session items to COMPLETE status and creates inventory batches.
 *
 * Process:
 * 1. Validates the return request exists
 * 2. Fetches the REJECTED status lookup
 * 3. Updates the return request status
 * 4. Gets all return request details with linked receive session items
 * 5. Updates linked receive session item statuses to COMPLETE
 * 6. Creates inventory batches for rejected (accepted into inventory) items
 *
 * Access: Restricted to authorized users with permission to reject returns
 * Typical users: Warehouse managers, inventory supervisors
 */
export const rejectReturnRequest = mutation({
  args: {
    returnRequestId: v.id("return_requests"),
    rejectionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Step 1: Validate return request exists
    const returnRequest = await ctx.db.get(args.returnRequestId);
    if (!returnRequest || returnRequest.isDeleted) {
      throw new Error("Return request not found or has been deleted");
    }

    // Step 2: Get the REJECTED status lookup
    const rejectedStatus = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q.eq("lookupType", "ReturnStatus").eq("lookupCode", "REJECTED"),
      )
      .first();

    if (!rejectedStatus) {
      throw new Error(
        "REJECTED status lookup not found. Please ensure seed data has been run.",
      );
    }

    // Step 3: Update the return request status
    await ctx.db.patch(args.returnRequestId, {
      returnStatusTypeId: rejectedStatus._id,
    });

    // Step 4: Get all return request details
    const details = await ctx.db
      .query("return_request_details")
      .withIndex("returnRequestId", (q) =>
        q.eq("returnRequestId", args.returnRequestId),
      )
      .collect();

    // Step 5: Get COMPLETE status for receive session items
    let completeItemStatus = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q
          .eq("lookupType", "ReceiveSessionItemStatus")
          .eq("lookupCode", "COMPLETE"),
      )
      .first();

    if (!completeItemStatus) {
      const newStatusId = await ctx.db.insert("system_lookups", {
        lookupType: "ReceiveSessionItemStatus",
        lookupCode: "COMPLETE",
        lookupValue: "Complete",
        description: "Item has been fully received",
        sortOrder: 3,
      });
      completeItemStatus = await ctx.db.get(newStatusId);
    }

    // Get ACTIVE batch status for inventory batches
    let activeBatchStatus = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q.eq("lookupType", "BatchStatus").eq("lookupCode", "ACTIVE"),
      )
      .first();

    if (!activeBatchStatus) {
      const newStatusId = await ctx.db.insert("system_lookups", {
        lookupType: "BatchStatus",
        lookupCode: "ACTIVE",
        lookupValue: "Active",
        description: "Batch is active and available",
        sortOrder: 1,
      });
      activeBatchStatus = await ctx.db.get(newStatusId);
    }

    // Step 6: Update each linked receive session item and create inventory batches
    const createdBatches: any[] = [];

    for (const detail of details) {
      if (detail.receiveSessionDetailId) {
        const receiveDetail = await ctx.db.get(detail.receiveSessionDetailId);
        if (receiveDetail) {
          // Update the receive session item status to COMPLETE
          await ctx.db.patch(detail.receiveSessionDetailId, {
            receiveSessionItemStatusTypeId: completeItemStatus!._id,
          });

          // Get receive session for branch info
          const receiveSession = await ctx.db.get(
            receiveDetail.receiveSessionId,
          );
          if (receiveSession && receiveDetail.recommendedZoneId) {
            // Get branch for organization info
            const branch = await ctx.db.get(receiveSession.branchId);
            if (branch) {
              // Generate batch numbers
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
                .withIndex("branchId", (q) =>
                  q.eq("branchId", receiveSession.branchId),
                )
                .filter((q) =>
                  q.and(
                    q.gte(q.field("receivedAt"), startOfDay),
                    q.lte(q.field("receivedAt"), endOfDay),
                  ),
                )
                .collect();

              const sequence = (todayBatches.length + 1)
                .toString()
                .padStart(3, "0");
              const supplierBatchNumber = `SB-${dateStr}-${sequence}`;
              const internalBatchNumber = `IB-${dateStr}-${sequence}`;

              // Create inventory batch with the quantity from return request
              const batchId = await ctx.db.insert("inventory_batches", {
                organizationId: branch.organizationId,
                skuId: receiveDetail.skuId,
                zoneId: receiveDetail.recommendedZoneId,
                quantity: detail.quantityToReturn, // Use the return quantity as inventory
                branchId: receiveSession.branchId,
                supplierBatchNumber,
                internalBatchNumber,
                receivedAt: Date.now(),
                batchStatusTypeId: activeBatchStatus!._id,
                isDeleted: false,
              });

              createdBatches.push({
                batchId,
                skuId: receiveDetail.skuId,
                quantity: detail.quantityToReturn,
              });
            }
          }
        }
      }
    }

    // Step 7: Check if the receive session should be marked as COMPLETE
    if (returnRequest.purchaseOrderId) {
      await checkAndCompleteReceiveSession(ctx, returnRequest.purchaseOrderId);
    }

    // Log audit for return request rejection
    await logCRUDAction(ctx, {
      organizationId: returnRequest.organizationId as Id<"organizations">,
      action: "UPDATE",
      entityType: "return_requests",
      entityId: args.returnRequestId,
      newValue: { status: "REJECTED", batchesCreated: createdBatches.length },
      notes: `Rejected return request ${returnRequest.requestCode}, created ${createdBatches.length} inventory batches`,
    });

    return {
      returnRequestId: args.returnRequestId,
      batchesCreated: createdBatches.length,
    };
  },
});
