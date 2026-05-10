import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

export const seedZoneAssignmentStatuses = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if the lookups already exist
    const existing = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType", (q) => q.eq("lookupType", "ZoneAssignmentStatus"))
      .collect();
    
    if (existing.length > 0) {
      return { 
        message: "ZoneAssignmentStatus lookups already exist", 
        count: existing.length,
        statuses: existing.map(s => s.lookupCode)
      };
    }

    // Insert the three required statuses
    const notStartedId = await ctx.db.insert("system_lookups", {
      lookupType: "ZoneAssignmentStatus",
      lookupCode: "NOT_STARTED",
      lookupValue: "Not Started",
      description: "Zone assignment has not been started",
      sortOrder: 1,
    });

    const inProgressId = await ctx.db.insert("system_lookups", {
      lookupType: "ZoneAssignmentStatus",
      lookupCode: "IN_PROGRESS",
      lookupValue: "In Progress",
      description: "Worker is actively counting in this zone",
      sortOrder: 2,
    });

    const completedId = await ctx.db.insert("system_lookups", {
      lookupType: "ZoneAssignmentStatus",
      lookupCode: "COMPLETED",
      lookupValue: "Completed",
      description: "Zone count has been completed by the worker",
      sortOrder: 3,
    });

    return { 
      message: "Successfully created ZoneAssignmentStatus lookups",
      ids: {
        notStartedId,
        inProgressId,
        completedId
      }
    };
  },
});

// ================================================================
// REFERENCE DATA QUERIES
// ================================================================

/**
 * getStorageZones
 *
 * Purpose: Retrieves all storage zones for a specific branch
 *
 * Access: Available to all authenticated users within the organization
 */
export const getStorageZones = query({
  args: {
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const zones = await ctx.db
      .query("storage_zones")
      .withIndex("branchId", (q) => q.eq("branchId", args.branchId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    return zones;
  },
});

/**
 * getCycleCountLookups
 *
 * Purpose: Retrieves all system lookups needed for cycle count session creation
 *
 * Access: Available to all authenticated users
 */
export const getCycleCountLookups = query({
  args: {},
  handler: async (ctx) => {
    // Get session type lookup for "Cycle Count"
    const sessionType = await ctx.db
      .query("system_lookups")
      .filter((q) =>
        q.and(
          q.eq(q.field("lookupType"), "SessionType"),
          q.eq(q.field("lookupCode"), "CYCLE_COUNT"),
        ),
      )
      .first();

    // Get cycle count types (Daily, Weekly)
    const cycleCountTypes = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType", (q) => q.eq("lookupType", "CycleCountType"))
      .collect();

    // Get session status types
    const sessionStatuses = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType", (q) => q.eq("lookupType", "SessionStatus"))
      .collect();

    // Get the "Pending" status as default for new sessions
    const pendingStatus = sessionStatuses.find(
      (s) => s.lookupCode === "PENDING",
    );

    return {
      sessionTypeId: sessionType?._id ?? null,
      cycleCountTypes: cycleCountTypes.map((t) => ({
        _id: t._id,
        lookupCode: t.lookupCode,
        lookupValue: t.lookupValue,
      })),
      sessionStatuses: sessionStatuses.map((s) => ({
        _id: s._id,
        lookupCode: s.lookupCode,
        lookupValue: s.lookupValue,
      })),
      defaultStatusId: pendingStatus?._id ?? null,
    };
  },
});

/**
 * getAdjustmentLookups
 *
 * Purpose: Retrieves all system lookups needed for adjustment dialogs
 *
 * Access: Available to all authenticated users
 */
export const getAdjustmentLookups = query({
  args: {},
  handler: async (ctx) => {
    // Get adjustment types (Quantity, Location)
    const adjustmentTypes = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType", (q) => q.eq("lookupType", "AdjustmentType"))
      .collect();

    // Get adjustment statuses (Pending, Approved, Rejected)
    const adjustmentStatuses = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType", (q) => q.eq("lookupType", "AdjustmentStatus"))
      .collect();

    // Get adjustment reasons (Damaged, Count Discrepancy, Expired)
    const adjustmentReasons = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType", (q) => q.eq("lookupType", "AdjustmentReason"))
      .collect();

    // Find the default "Pending" status
    const pendingStatus = adjustmentStatuses.find(
      (s) => s.lookupCode === "PENDING",
    );

    // Find quantity and location types
    const quantityType = adjustmentTypes.find(
      (t) => t.lookupCode === "QUANTITY",
    );
    const locationType = adjustmentTypes.find(
      (t) => t.lookupCode === "LOCATION",
    );

    return {
      adjustmentTypes: adjustmentTypes.map((t) => ({
        _id: t._id,
        lookupCode: t.lookupCode,
        lookupValue: t.lookupValue,
      })),
      adjustmentStatuses: adjustmentStatuses.map((s) => ({
        _id: s._id,
        lookupCode: s.lookupCode,
        lookupValue: s.lookupValue,
      })),
      adjustmentReasons: adjustmentReasons.map((r) => ({
        _id: r._id,
        lookupCode: r.lookupCode,
        lookupValue: r.lookupValue,
      })),
      defaultStatusId: pendingStatus?._id ?? null,
      quantityTypeId: quantityType?._id ?? null,
      locationTypeId: locationType?._id ?? null,
    };
  },
});

/**
 * getInventoryBatchesByZone
 *
 * Purpose: Retrieves inventory batches (items) for a specific zone
 * Used by location transfer dialog to show items available for transfer
 *
 * Access: Available to all authenticated users
 */
export const getInventoryBatchesByZone = query({
  args: {
    zoneId: v.id("storage_zones"),
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    // Get all inventory batches in this zone
    const batches = await ctx.db
      .query("inventory_batches")
      .withIndex("zoneId", (q) => q.eq("zoneId", args.zoneId))
      .filter((q) =>
        q.and(
          q.eq(q.field("branchId"), args.branchId),
          q.gt(q.field("quantity"), 0),
          q.eq(q.field("isDeleted"), false),
        ),
      )
      .collect();

    // Enrich batches with product variant and product info
    const enrichedBatches = await Promise.all(
      batches.map(async (batch) => {
        // Get product variant (SKU)
        const productVariant = await ctx.db.get(batch.skuId);
        // Get parent product
        const product = productVariant
          ? await ctx.db.get(productVariant.productId)
          : null;

        return {
          _id: batch._id,
          batchCode:
            batch.internalBatchNumber ?? batch.supplierBatchNumber ?? "N/A",
          productId: productVariant?._id ?? "unknown",
          productName: product?.name ?? "Unknown Product",
          productCode: productVariant?.skuCode ?? "N/A",
          currentQuantity: batch.quantity,
          expiresAt: batch.expiresAt,
          zoneId: batch.zoneId,
        };
      }),
    );

    return enrichedBatches;
  },
});

/**
 * getOrganizationUsers
 *
 * Purpose: Retrieves all users (workers) for a specific organization
 *
 * Access: Available to all authenticated users within the organization
 */
export const getOrganizationUsers = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get all members of the organization
    const members = await ctx.db
      .query("members")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .collect();

    // Get user details for each member
    const users = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        if (!user || user.isDeleted) return null;
        return {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
        };
      }),
    );

    return users.filter((u) => u !== null);
  },
});

// ================================================================
// SESSION QUERIES & MUTATIONS
// ================================================================

/**
 * getAllCycleCountSession
 *
 * Purpose: Retrieves all cycle count sessions for a specific organization
 *
 * Process:
 * 1. Queries the work_sessions table filtered by organization
 * 2. Further filters by session type to get only cycle count sessions
 * 3. Returns all matching cycle count sessions
 *
 * Access: Available to all authenticated users within the organization
 * Typical users: Warehouse managers, inventory staff, supervisors, admins
 */
export const getAllCycleCountSession = query({
  args: {
    organizationId: v.id("organizations"),
    branchId: v.id("branches"),
    sessionTypeId: v.id("system_lookups"),
  },
  handler: async (ctx, args) => {
    // Step 1: Query work_sessions table filtered by organization
    const cycleCounts = await ctx.db
      .query("work_sessions")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      // Step 2: Filter by session type and branch to get only cycle count sessions
      .filter((q) =>
        q.and(
          q.eq(q.field("sessionTypeId"), args.sessionTypeId),
          q.eq(q.field("branchId"), args.branchId),
        ),
      )
      .collect();

    // Step 3: Return all cycle count sessions
    return cycleCounts;
  },
});

/**
 * getSessionsByStatus
 *
 * Purpose: Retrieves cycle count sessions filtered by status
 *
 * Process:
 * 1. Queries the work_sessions table using sessionStatusTypeId index
 * 2. Filters by organization and session type
 * 3. Returns all matching sessions with the specified status
 *
 * Access: Available to all authenticated users within the organization
 * Typical users: Warehouse managers, supervisors, admins
 */
export const getSessionsByStatus = query({
  args: {
    organizationId: v.id("organizations"),
    branchId: v.id("branches"),
    sessionTypeId: v.id("system_lookups"),
    sessionStatusTypeId: v.id("system_lookups"),
  },
  handler: async (ctx, args) => {
    // Step 1: Query work_sessions table using status index
    const sessions = await ctx.db
      .query("work_sessions")
      .withIndex("sessionStatusTypeId", (q) =>
        q.eq("sessionStatusTypeId", args.sessionStatusTypeId),
      )
      // Step 2: Filter by organization, branch and session type
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("branchId"), args.branchId),
          q.eq(q.field("sessionTypeId"), args.sessionTypeId),
        ),
      )
      .collect();

    // Step 3: Return filtered sessions
    return sessions;
  },
});

/**
 * createCycleCountSession
 *
 * Purpose: Creates a new cycle count session (work session) with zone assignments and line items
 *
 * Process:
 * 1. Validates that at least one zone assignment is provided
 * 2. Creates the work session with cycle count session type, name, description, and count type
 * 3. Creates zone-worker assignments
 * 4. Creates all associated session line items
 * 5. Returns the newly created session ID
 *
 * Access: Restricted to authorized users with permission to create cycle count sessions
 * Typical users: Warehouse managers, supervisors, admins
 */
export const createCycleCountSession = mutation({
  args: {
    organizationId: v.id("organizations"),
    branchId: v.id("branches"),
    sessionTypeId: v.id("system_lookups"),
    sessionCode: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    cycleCountTypeId: v.id("system_lookups"), // Daily/Weekly
    assignedUserId: v.id("users"), // Primary assigned user
    sessionStatusTypeId: v.id("system_lookups"),
    zoneAssignments: v.array(
      v.object({
        zoneId: v.id("storage_zones"),
        assignedUserId: v.optional(v.id("users")), // Made optional - can assign later
      }),
    ),
    lineItems: v.optional(
      v.array(
        v.object({
          skuId: v.id("product_variants"),
          expectedQuantity: v.number(),
          zoneId: v.optional(v.id("storage_zones")),
          batchId: v.optional(v.id("inventory_batches")),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    // Step 1: Validate that zone assignments are provided
    if (!args.zoneAssignments || args.zoneAssignments.length === 0) {
      throw new Error(
        "Cycle count session must have at least one zone assignment",
      );
    }

    // Step 2: Create the work session for cycle count
    const sessionId = await ctx.db.insert("work_sessions", {
      organizationId: args.organizationId,
      branchId: args.branchId,
      sessionTypeId: args.sessionTypeId,
      sessionCode: args.sessionCode,
      name: args.name,
      description: args.description,
      cycleCountTypeId: args.cycleCountTypeId,
      assignedUserId: args.assignedUserId,
      sessionStatusTypeId: args.sessionStatusTypeId,
    });

    // Step 3: Get the "not_started" status for zone assignments using the compound index
    const notStartedStatus = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q.eq("lookupType", "ZoneAssignmentStatus").eq("lookupCode", "NOT_STARTED")
      )
      .first();

    // Step 4: Create zone-worker assignments with initial status
    for (const assignment of args.zoneAssignments) {
      await ctx.db.insert("session_zone_assignments", {
        sessionId,
        zoneId: assignment.zoneId,
        assignedUserId: assignment.assignedUserId ?? args.assignedUserId, // Fall back to primary user
        assignmentStatusTypeId: notStartedStatus?._id,
      });
    }

    // Step 5: Create session line items
    if (args.lineItems && args.lineItems.length > 0) {
      // Use provided line items
      for (const item of args.lineItems) {
        await ctx.db.insert("session_line_items", {
          sessionId,
          skuId: item.skuId,
          expectedQuantity: item.expectedQuantity,
          actualQuantity: 0,
          zoneId: item.zoneId,
          batchId: item.batchId,
        });
      }
    } else {
      // Auto-generate line items from inventory batches in selected zones
      const zoneIds = args.zoneAssignments.map((a) => a.zoneId);
      for (const zoneId of zoneIds) {
        const batches = await ctx.db
          .query("inventory_batches")
          .withIndex("zoneId", (q) => q.eq("zoneId", zoneId))
          .filter((q) =>
            q.and(
              q.eq(q.field("organizationId"), args.organizationId),
              q.eq(q.field("branchId"), args.branchId),
              q.eq(q.field("isDeleted"), false),
              q.gt(q.field("quantity"), 0),
            ),
          )
          .collect();

        for (const batch of batches) {
          await ctx.db.insert("session_line_items", {
            sessionId,
            skuId: batch.skuId,
            expectedQuantity: batch.quantity,
            actualQuantity: 0,
            zoneId: zoneId,
            batchId: batch._id,
          });
        }
      }
    }

    // Step 6: Return the newly created session ID
    return sessionId;
  },
});

/**
 * batchCreateCycleCountSession
 *
 * Purpose: Creates multiple cycle count sessions in a single transaction
 */
export const batchCreateCycleCountSession = mutation({
  args: {
    sessions: v.array(
      v.object({
        organizationId: v.id("organizations"),
        branchId: v.id("branches"),
        sessionTypeId: v.id("system_lookups"),
        sessionCode: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        cycleCountTypeId: v.id("system_lookups"),
        assignedUserId: v.id("users"),
        sessionStatusTypeId: v.id("system_lookups"),
        zoneAssignments: v.array(
          v.object({
            zoneId: v.id("storage_zones"),
            assignedUserId: v.optional(v.id("users")),
          }),
        ),
        lineItems: v.optional(
          v.array(
            v.object({
              skuId: v.id("product_variants"),
              expectedQuantity: v.number(),
              zoneId: v.optional(v.id("storage_zones")),
              batchId: v.optional(v.id("inventory_batches")),
            }),
          ),
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Get the "not_started" status for zone assignments once
    const notStartedStatus = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q.eq("lookupType", "ZoneAssignmentStatus").eq("lookupCode", "NOT_STARTED")
      )
      .first();

    const createdSessionIds = [];

    for (const sessionArgs of args.sessions) {
      if (!sessionArgs.zoneAssignments || sessionArgs.zoneAssignments.length === 0) {
        continue;
      }

      // Create the work session
      const sessionId = await ctx.db.insert("work_sessions", {
        organizationId: sessionArgs.organizationId,
        branchId: sessionArgs.branchId,
        sessionTypeId: sessionArgs.sessionTypeId,
        sessionCode: sessionArgs.sessionCode,
        name: sessionArgs.name,
        description: sessionArgs.description,
        cycleCountTypeId: sessionArgs.cycleCountTypeId,
        assignedUserId: sessionArgs.assignedUserId,
        sessionStatusTypeId: sessionArgs.sessionStatusTypeId,
      });

      createdSessionIds.push(sessionId);

      // Create zone-worker assignments
      for (const assignment of sessionArgs.zoneAssignments) {
        await ctx.db.insert("session_zone_assignments", {
          sessionId,
          zoneId: assignment.zoneId,
          assignedUserId: assignment.assignedUserId ?? sessionArgs.assignedUserId,
          assignmentStatusTypeId: notStartedStatus?._id,
        });
      }

      // Create session line items
      if (sessionArgs.lineItems && sessionArgs.lineItems.length > 0) {
        for (const item of sessionArgs.lineItems) {
          await ctx.db.insert("session_line_items", {
            sessionId,
            skuId: item.skuId,
            expectedQuantity: item.expectedQuantity,
            actualQuantity: 0,
            zoneId: item.zoneId,
            batchId: item.batchId,
          });
        }
      } else {
        // Auto-generate line items from inventory batches
        const zoneIds = sessionArgs.zoneAssignments.map((a) => a.zoneId);
        for (const zoneId of zoneIds) {
          const batches = await ctx.db
            .query("inventory_batches")
            .withIndex("zoneId", (q) => q.eq("zoneId", zoneId))
            .filter((q) =>
              q.and(
                q.eq(q.field("organizationId"), sessionArgs.organizationId),
                q.eq(q.field("branchId"), sessionArgs.branchId),
                q.eq(q.field("isDeleted"), false),
                q.gt(q.field("quantity"), 0),
              ),
            )
            .collect();

          for (const batch of batches) {
            await ctx.db.insert("session_line_items", {
              sessionId,
              skuId: batch.skuId,
              expectedQuantity: batch.quantity,
              actualQuantity: 0,
              zoneId: zoneId,
              batchId: batch._id,
            });
          }
        }
      }
    }

    return createdSessionIds;
  },
});

/**
 * cancelCycleCountSession
 *
 * Purpose: Soft deletes a cycle count session by setting its status to CANCELLED
 *
 * Access: Available to authorized users
 */
export const cancelCycleCountSession = mutation({
  args: {
    sessionId: v.id("work_sessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const cancelledStatus = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q.eq("lookupType", "SessionStatus").eq("lookupCode", "CANCELLED")
      )
      .first();

    if (!cancelledStatus) {
      throw new Error("Cancelled status not found");
    }

    await ctx.db.patch(args.sessionId, {
      sessionStatusTypeId: cancelledStatus._id,
    });
  },
});

/**
 * viewCycleCountSessionDetail
 *
 * Purpose: Retrieves a specific cycle count session by its ID along with zone assignments, line items, and inventory transactions
 *
 * Process:
 * 1. Fetches the work session from the database using the provided ID
 * 2. Validates that the session exists
 * 3. Queries all zone assignments for the session
 * 4. Queries all associated session line items
 * 5. Queries all inventory transactions related to the session
 * 6. Returns the session with all related data
 *
 * Access: Available to all authenticated users within the organization
 * Typical users: Warehouse managers, inventory staff, supervisors, admins
 */
export const viewCycleCountSessionDetail = query({
  args: {
    sessionId: v.id("work_sessions"),
  },
  handler: async (ctx, args) => {
    // Step 1: Fetch the work session by ID
    const session = await ctx.db.get(args.sessionId);

    // Step 2: Validate session exists
    if (!session) {
      return null;
    }

    // Step 3: Query all zone assignments for this session
    const zoneAssignments = await ctx.db
      .query("session_zone_assignments")
      .withIndex("sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Step 4: Query all associated session line items
    const lineItems = await ctx.db
      .query("session_line_items")
      .withIndex("sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Step 5: Query all inventory transactions related to this session
    const inventoryTransactions = await ctx.db
      .query("inventory_transactions")
      .filter((q) => q.eq(q.field("workSessionId"), args.sessionId))
      .collect();

    // Step 6: Return the complete session with all related data
    return {
      ...session,
      zoneAssignments,
      lineItems,
      inventoryTransactions,
    };
  },
});

/**
 * getSessionDetailForDialog
 *
 * Purpose: Retrieves a cycle count session with all enriched data for the detail dialog
 *
 * Process:
 * 1. Fetches the work session by ID
 * 2. Fetches session type, cycle count type, and status lookups
 * 3. Fetches the user who created the session
 * 4. Queries all zone assignments with zone details and assigned users
 * 5. Queries all line items with SKU and product details
 * 6. Groups line items by zone for display
 * 7. Returns the complete enriched session data
 *
 * Access: Available to all authenticated users within the organization
 */
export const getSessionDetailForDialog = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Step 1: Fetch the work session by ID
    const session = await ctx.db.get(args.sessionId as Id<"work_sessions">);

    if (!session) {
      return null;
    }

    // Step 2: Fetch lookups
    const cycleCountType = session.cycleCountTypeId
      ? await ctx.db.get(session.cycleCountTypeId)
      : null;

    const sessionStatus = await ctx.db.get(session.sessionStatusTypeId);

    // Step 3: Fetch the user who created the session
    const createdByUser = await ctx.db.get(session.assignedUserId);

    // Step 4: Query all zone assignments for this session
    const zoneAssignments = await ctx.db
      .query("session_zone_assignments")
      .withIndex("sessionId", (q) =>
        q.eq("sessionId", args.sessionId as Id<"work_sessions">),
      )
      .collect();

    // Step 5: Enrich zone assignments with zone details and assigned users
    const enrichedZones = await Promise.all(
      zoneAssignments.map(async (assignment) => {
        const zone = await ctx.db.get(assignment.zoneId);
        const assignedUser = await ctx.db.get(assignment.assignedUserId);

        return {
          zoneId: assignment.zoneId,
          zoneName: zone?.name ?? "Unknown Zone",
          assignedWorker: assignedUser
            ? { fullName: assignedUser.fullName ?? assignedUser.email }
            : null,
          assignmentStatus: assignment.assignmentStatusTypeId
            ? await ctx.db.get(assignment.assignmentStatusTypeId)
            : null,
          startedAt: assignment.startedAt,
          completedAt: assignment.completedAt,
        };
      }),
    );

    // Step 6: Query all line items for this session
    const lineItems = await ctx.db
      .query("session_line_items")
      .withIndex("sessionId", (q) =>
        q.eq("sessionId", args.sessionId as Id<"work_sessions">),
      )
      .collect();

    // Step 7: Enrich line items with SKU and product details
    const enrichedLineItems = await Promise.all(
      lineItems.map(async (item) => {
        const sku = await ctx.db.get(item.skuId);
        let productName = "Unknown Product";
        let skuCode = "Unknown SKU";

        if (sku) {
          skuCode = sku.skuCode;
          const product = await ctx.db.get(sku.productId);
          productName = product?.name ?? "Unknown Product";
        }

        const variance = item.actualQuantity - item.expectedQuantity;

        return {
          _id: item._id,
          skuId: item.skuId,
          skuCode,
          productName,
          zoneId: item.zoneId,
          batchId: item.batchId,
          expectedQuantity: item.expectedQuantity,
          actualQuantity: item.actualQuantity,
          variance,
          scannedAt: item.scannedAt,
          notes: item.notes,
        };
      }),
    );

    // Step 8: Group line items by zone
    const zonesWithLineItems = enrichedZones.map((zone) => {
      const zoneLineItems = enrichedLineItems.filter(
        (item) => item.zoneId?.toString() === zone.zoneId.toString(),
      );

      const matchedCount = zoneLineItems.filter(
        (item) => item.variance === 0,
      ).length;
      const totalCount = zoneLineItems.length;

      return {
        ...zone,
        lineItems: zoneLineItems,
        matchedCount,
        totalCount,
      };
    });

    // Also include line items without a specific zone assignment
    const unassignedLineItems = enrichedLineItems.filter(
      (item) =>
        !item.zoneId ||
        !enrichedZones.some(
          (z) => z.zoneId.toString() === item.zoneId?.toString(),
        ),
    );

    // If there are unassigned line items, add them to a default zone
    if (unassignedLineItems.length > 0) {
      const matchedCount = unassignedLineItems.filter(
        (item) => item.variance === 0,
      ).length;

      zonesWithLineItems.push({
        zoneId: "unassigned" as unknown as Id<"storage_zones">,
        zoneName: "Unassigned Items",
        assignedWorker: null,
        assignmentStatus: null,
        startedAt: undefined,
        completedAt: undefined,
        lineItems: unassignedLineItems,
        matchedCount,
        totalCount: unassignedLineItems.length,
      });
    }

    // Step 9: Return the complete enriched session
    return {
      _id: session._id,
      sessionCode: session.sessionCode,
      name: session.name ?? session.sessionCode,
      description: session.description,
      cycleCountType: cycleCountType
        ? { lookupValue: cycleCountType.lookupValue }
        : null,
      sessionStatus: sessionStatus
        ? { lookupValue: sessionStatus.lookupValue }
        : null,
      createdByUser: createdByUser
        ? { fullName: createdByUser.fullName ?? createdByUser.email }
        : null,
      createdAt: session._creationTime,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      zones: zonesWithLineItems,
    };
  },
});

/**
 * updateSessionStatus
 *
 * Purpose: Updates the status of a cycle count session
 *
 * Process:
 * 1. Fetches the session to validate it exists
 * 2. Updates the session status and optional timestamp fields
 * 3. Returns the updated session ID
 *
 * Access: Restricted to authorized users with permission to manage sessions
 * Typical users: Warehouse managers, supervisors, admins
 */
export const updateSessionStatus = mutation({
  args: {
    sessionId: v.id("work_sessions"),
    sessionStatusTypeId: v.id("system_lookups"),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    verifiedAt: v.optional(v.number()),
    verifiedByUserId: v.optional(v.id("users")),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Step 1: Fetch the session to validate it exists
    const session = await ctx.db.get(args.sessionId);

    if (!session) {
      throw new Error("Session not found");
    }

    // Step 2: Build update object with provided fields
    const updateData: Record<string, unknown> = {
      sessionStatusTypeId: args.sessionStatusTypeId,
    };

    if (args.startedAt !== undefined) updateData.startedAt = args.startedAt;
    if (args.completedAt !== undefined)
      updateData.completedAt = args.completedAt;
    if (args.verifiedAt !== undefined) updateData.verifiedAt = args.verifiedAt;
    if (args.verifiedByUserId !== undefined)
      updateData.verifiedByUserId = args.verifiedByUserId;
    if (args.rejectionReason !== undefined)
      updateData.rejectionReason = args.rejectionReason;

    // Step 3: Update the session
    await ctx.db.patch(args.sessionId, updateData);

    // Step 4: Return the updated session ID
    return args.sessionId;
  },
});

/**
 * updateSessionLineItem
 *
 * Purpose: Updates a session line item with the actual counted quantity
 *
 * Process:
 * 1. Fetches the line item to validate it exists
 * 2. Updates the actual quantity and optional fields
 * 3. Returns the updated line item ID
 *
 * Access: Available to assigned workers and supervisors
 * Typical users: Warehouse staff performing counts, supervisors
 */
export const updateSessionLineItem = mutation({
  args: {
    lineItemId: v.id("session_line_items"),
    actualQuantity: v.number(),
    scannedByUserId: v.optional(v.id("users")),
    scannedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Step 1: Fetch the line item to validate it exists
    const lineItem = await ctx.db.get(args.lineItemId);

    if (!lineItem) {
      throw new Error("Line item not found");
    }

    // Step 2: Update the line item with actual quantity
    await ctx.db.patch(args.lineItemId, {
      actualQuantity: args.actualQuantity,
      scannedAt: args.scannedAt ?? Date.now(),
      scannedByUserId: args.scannedByUserId,
      notes: args.notes,
    });

    // Step 3: Return the updated line item ID
    return args.lineItemId;
  },
});

// ================================================================
// EMPLOYEE SCANNER UI QUERIES & MUTATIONS
// ================================================================

/**
 * getMyAssignedSessions
 *
 * Purpose: Retrieves all cycle count sessions where the current user is assigned to at least one zone
 *
 * Process:
 * 1. Queries session_zone_assignments for the user
 * 2. Gets unique session IDs
 * 3. Fetches session details with status and progress info
 * 4. Returns sessions that are not completed/cancelled
 *
 * Access: Available to all authenticated users
 * Typical users: Warehouse staff checking their assigned work
 */
export const getMyAssignedSessions = query({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    // Step 1: Get all zone assignments for this user
    const myAssignments = await ctx.db
      .query("session_zone_assignments")
      .withIndex("assignedUserId", (q) => q.eq("assignedUserId", args.userId))
      .collect();

    if (myAssignments.length === 0) {
      return [];
    }

    // Step 2: Get unique session IDs
    const sessionIds = [...new Set(myAssignments.map((a) => a.sessionId))];

    // Step 3: Fetch session details
    const sessions = await Promise.all(
      sessionIds.map(async (sessionId) => {
        const session = await ctx.db.get(sessionId);
        if (!session) return null;

        // Check if session belongs to org/branch
        if (
          session.organizationId !== args.organizationId ||
          session.branchId !== args.branchId
        ) {
          return null;
        }

        // Get session status
        const sessionStatus = await ctx.db.get(session.sessionStatusTypeId);
        const statusValue = sessionStatus?.lookupValue?.toLowerCase();

        // Skip completed/cancelled sessions
        if (statusValue === "completed" || statusValue === "cancelled") {
          return null;
        }

        // Get user's zone assignments for this session
        const userZoneAssignments = myAssignments.filter(
          (a) => a.sessionId === sessionId,
        );

        // Get zone details and assignment status
        const zonesWithStatus = await Promise.all(
          userZoneAssignments.map(async (assignment) => {
            const zone = await ctx.db.get(assignment.zoneId);
            const assignmentStatus = assignment.assignmentStatusTypeId
              ? await ctx.db.get(assignment.assignmentStatusTypeId)
              : null;
            return {
              zoneId: assignment.zoneId,
              zoneName: zone?.name ?? "Unknown Zone",
              assignmentStatus: assignmentStatus?.lookupValue ?? "Not Started",
              assignmentId: assignment._id,
            };
          }),
        );

        return {
          _id: session._id,
          sessionCode: session.sessionCode,
          name: session.name ?? session.sessionCode,
          sessionStatus: sessionStatus?.lookupValue ?? "Unknown",
          assignedZones: zonesWithStatus,
          createdAt: session._creationTime,
        };
      }),
    );

    // Filter out nulls and return
    return sessions.filter((s) => s !== null);
  },
});

/**
 * getZoneLineItems
 *
 * Purpose: Retrieves all line items for a specific zone in a session (for scanner UI)
 *
 * Process:
 * 1. Validates the zone assignment exists and user is assigned
 * 2. Fetches all line items for the zone
 * 3. Enriches with product details
 * 4. Returns items sorted by scan status
 *
 * Access: Available to assigned workers
 * Typical users: Warehouse staff using scanner UI
 */
export const getZoneLineItems = query({
  args: {
    sessionId: v.id("work_sessions"),
    zoneId: v.id("storage_zones"),
  },
  handler: async (ctx, args) => {
    // Step 1: Get all line items for this session and zone
    const lineItems = await ctx.db
      .query("session_line_items")
      .withIndex("sessionId", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("zoneId"), args.zoneId))
      .collect();

    // Step 2: Enrich with product details
    const enrichedItems = await Promise.all(
      lineItems.map(async (item) => {
        const sku = await ctx.db.get(item.skuId);
        const product = sku?.productId ? await ctx.db.get(sku.productId) : null;
        const scannedByUser = item.scannedByUserId
          ? await ctx.db.get(item.scannedByUserId)
          : null;

        return {
          _id: item._id,
          skuId: item.skuId,
          skuCode: sku?.skuCode ?? "Unknown SKU",
          productName: product?.name ?? "Unknown Product",
          expectedQuantity: item.expectedQuantity,
          actualQuantity: item.actualQuantity,
          variance: item.actualQuantity - item.expectedQuantity,
          isScanned: item.scannedAt !== undefined,
          scannedAt: item.scannedAt,
          scannedByUser: scannedByUser?.fullName ?? null,
          notes: item.notes,
          batchId: item.batchId,
        };
      }),
    );

    // Step 3: Sort by scan status (unscanned first)
    return enrichedItems.sort((a, b) => {
      if (a.isScanned === b.isScanned) return 0;
      return a.isScanned ? 1 : -1;
    });
  },
});

/**
 * updateZoneAssignmentStatus
 *
 * Purpose: Updates the status of a zone assignment (start/complete work)
 *
 * Process:
 * 1. Validates the assignment exists
 * 2. Updates status and timestamps
 * 3. Returns the updated assignment ID
 *
 * Access: Available to assigned workers and supervisors
 * Typical users: Warehouse staff starting/completing zone work
 */
export const updateZoneAssignmentStatus = mutation({
  args: {
    assignmentId: v.id("session_zone_assignments"),
    assignmentStatusTypeId: v.id("system_lookups"),
  },
  handler: async (ctx, args) => {
    // Step 1: Fetch the assignment to validate it exists
    const assignment = await ctx.db.get(args.assignmentId);

    if (!assignment) {
      throw new Error("Zone assignment not found");
    }

    // Step 2: Get the status to determine which timestamp to set
    const status = await ctx.db.get(args.assignmentStatusTypeId);
    const statusCode = status?.lookupCode?.toLowerCase();

    // Step 3: Build update object
    const updateData: Record<string, unknown> = {
      assignmentStatusTypeId: args.assignmentStatusTypeId,
    };

    if (statusCode === "in_progress" && !assignment.startedAt) {
      updateData.startedAt = Date.now();
    }

    if (statusCode === "completed") {
      updateData.completedAt = Date.now();
    }

    // Step 4: Update the assignment
    await ctx.db.patch(args.assignmentId, updateData);

    return args.assignmentId;
  },
});

/**
 * getZoneAssignmentDetail
 *
 * Purpose: Retrieves detailed information about a specific zone assignment for the scanner UI
 *
 * Process:
 * 1. Fetches the zone assignment
 * 2. Gets related session, zone, and user details
 * 3. Calculates progress statistics
 * 4. Returns comprehensive assignment data
 *
 * Access: Available to assigned workers and supervisors
 */
export const getZoneAssignmentDetail = query({
  args: {
    assignmentId: v.id("session_zone_assignments"),
  },
  handler: async (ctx, args) => {
    // Step 1: Get the zone assignment
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) return null;

    // Step 2: Get related entities
    const session = await ctx.db.get(assignment.sessionId);
    const zone = await ctx.db.get(assignment.zoneId);
    const assignedUser = await ctx.db.get(assignment.assignedUserId);
    const assignmentStatus = assignment.assignmentStatusTypeId
      ? await ctx.db.get(assignment.assignmentStatusTypeId)
      : null;

    // Step 3: Get line items for this zone
    const lineItems = await ctx.db
      .query("session_line_items")
      .withIndex("sessionId", (q) => q.eq("sessionId", assignment.sessionId))
      .filter((q) => q.eq(q.field("zoneId"), assignment.zoneId))
      .collect();

    // Step 4: Calculate progress
    const totalItems = lineItems.length;
    const scannedItems = lineItems.filter((i) => i.scannedAt !== undefined).length;
    const itemsWithVariance = lineItems.filter(
      (i) => i.scannedAt !== undefined && i.actualQuantity !== i.expectedQuantity,
    ).length;

    return {
      _id: assignment._id,
      sessionId: assignment.sessionId,
      sessionCode: session?.sessionCode ?? "Unknown",
      sessionName: session?.name ?? session?.sessionCode ?? "Unknown",
      zoneId: assignment.zoneId,
      zoneName: zone?.name ?? "Unknown Zone",
      assignedUserId: assignment.assignedUserId,
      assignedUserName: assignedUser?.fullName ?? "Unknown",
      status: assignmentStatus?.lookupValue ?? "Not Started",
      statusCode: assignmentStatus?.lookupCode ?? "not_started",
      startedAt: assignment.startedAt,
      completedAt: assignment.completedAt,
      progress: {
        totalItems,
        scannedItems,
        itemsWithVariance,
        progressPercent: totalItems > 0 ? Math.round((scannedItems / totalItems) * 100) : 0,
      },
    };
  },
});

/**
 * getSessionForProceed
 *
 * Purpose: Retrieves cycle count session data for the proceed/scanning page
 *
 * Process:
 * 1. Fetches the session with status and type info
 * 2. Gets all zone assignments with status
 * 3. Gets all line items grouped by zone with inventory batch data
 * 4. Calculates progress for each zone
 *
 * Access: Available to all authenticated users within the organization
 */
export const getSessionForProceed = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Step 1: Get the session
    const session = await ctx.db.get(args.sessionId as Id<"work_sessions">);
    if (!session) return null;

    // Step 2: Get status and type lookups
    const sessionStatus = await ctx.db.get(session.sessionStatusTypeId);
    const cycleCountType = session.cycleCountTypeId
      ? await ctx.db.get(session.cycleCountTypeId)
      : null;
    const createdByUser = await ctx.db.get(session.assignedUserId);

    // Step 3: Get all zone assignments
    const zoneAssignments = await ctx.db
      .query("session_zone_assignments")
      .withIndex("sessionId", (q) =>
        q.eq("sessionId", args.sessionId as Id<"work_sessions">),
      )
      .collect();

    // Step 4: Get all line items for this session
    const allLineItems = await ctx.db
      .query("session_line_items")
      .withIndex("sessionId", (q) =>
        q.eq("sessionId", args.sessionId as Id<"work_sessions">),
      )
      .collect();

    // Step 5: Enrich zone assignments with zone details, user info, and line items
    const enrichedZones = await Promise.all(
      zoneAssignments.map(async (assignment) => {
        const zone = await ctx.db.get(assignment.zoneId);
        const assignedUser = await ctx.db.get(assignment.assignedUserId);
        const assignmentStatus = assignment.assignmentStatusTypeId
          ? await ctx.db.get(assignment.assignmentStatusTypeId)
          : null;

        // Get line items for this zone - compare IDs properly
        const zoneLineItems = allLineItems.filter(
          (item) => item.zoneId && item.zoneId === assignment.zoneId,
        );

        // If no line items exist for this zone, fetch from inventory_batches directly
        let enrichedLineItems: {
          _id: string;
          skuId: Id<"product_variants">;
          skuCode: string;
          productName: string;
          expectedQuantity: number;
          actualQuantity: number;
          inventoryQuantity: number;
          variance: number;
          isScanned: boolean;
          scannedAt?: number;
          batchId?: Id<"inventory_batches">;
          notes?: string;
        }[] = [];

        if (zoneLineItems.length > 0) {
          // Enrich existing line items with SKU and product info
          enrichedLineItems = await Promise.all(
            zoneLineItems.map(async (item) => {
              const sku = await ctx.db.get(item.skuId);
              const product = sku?.productId
                ? await ctx.db.get(sku.productId)
                : null;

              // Get the inventory batch for expected quantity from inventory
              const inventoryBatch = item.batchId
                ? await ctx.db.get(item.batchId)
                : null;

              return {
                _id: item._id as string,
                skuId: item.skuId,
                skuCode: sku?.skuCode ?? "Unknown SKU",
                productName: product?.name ?? "Unknown Product",
                expectedQuantity: item.expectedQuantity,
                actualQuantity: item.actualQuantity,
                inventoryQuantity: inventoryBatch?.quantity ?? item.expectedQuantity,
                variance: item.actualQuantity - item.expectedQuantity,
                isScanned: item.scannedAt !== undefined,
                scannedAt: item.scannedAt,
                batchId: item.batchId,
                notes: item.notes,
              };
            }),
          );
        } else {
          // Fallback: Get inventory batches directly from this zone for display
          const batches = await ctx.db
            .query("inventory_batches")
            .withIndex("zoneId", (q) => q.eq("zoneId", assignment.zoneId))
            .filter((q) =>
              q.and(
                q.eq(q.field("branchId"), session.branchId),
                q.gt(q.field("quantity"), 0),
                q.eq(q.field("isDeleted"), false),
              ),
            )
            .collect();

          enrichedLineItems = await Promise.all(
            batches.map(async (batch) => {
              const sku = await ctx.db.get(batch.skuId);
              const product = sku?.productId
                ? await ctx.db.get(sku.productId)
                : null;

              return {
                _id: `batch-${batch._id}`, // Temporary ID for display (not a real line item)
                skuId: batch.skuId,
                skuCode: sku?.skuCode ?? "Unknown SKU",
                productName: product?.name ?? "Unknown Product",
                expectedQuantity: batch.quantity,
                actualQuantity: 0,
                inventoryQuantity: batch.quantity,
                variance: 0 - batch.quantity,
                isScanned: false,
                scannedAt: undefined,
                batchId: batch._id,
                notes: undefined,
              };
            }),
          );
        }

        // Calculate zone progress
        const totalItems = enrichedLineItems.length;
        const scannedItems = enrichedLineItems.filter((i) => i.isScanned).length;
        const matchedItems = enrichedLineItems.filter(
          (i) => i.isScanned && i.variance === 0,
        ).length;

        return {
          assignmentId: assignment._id,
          zoneId: assignment.zoneId,
          zoneName: zone?.name ?? "Unknown Zone",
          assignedUser: assignedUser
            ? {
                _id: assignedUser._id,
                fullName: assignedUser.fullName ?? assignedUser.email,
              }
            : null,
          status: assignmentStatus?.lookupValue ?? "Not Started",
          statusCode: assignmentStatus?.lookupCode ?? "NOT_STARTED",
          startedAt: assignment.startedAt,
          completedAt: assignment.completedAt,
          lineItems: enrichedLineItems,
          progress: {
            totalItems,
            scannedItems,
            matchedItems,
            progressPercent:
              totalItems > 0
                ? Math.round((scannedItems / totalItems) * 100)
                : 0,
          },
        };
      }),
    );

    // Calculate overall progress
    const totalLineItems = enrichedZones.reduce((sum, z) => sum + z.lineItems.length, 0);
    const totalScanned = enrichedZones.reduce((sum, z) => sum + z.progress.scannedItems, 0);
    const totalZones = zoneAssignments.length;
    const completedZones = enrichedZones.filter(
      (z) => z.statusCode?.toLowerCase() === "completed",
    ).length;

    return {
      _id: session._id,
      sessionCode: session.sessionCode,
      name: session.name ?? session.sessionCode,
      description: session.description,
      sessionStatus: sessionStatus?.lookupValue ?? "Unknown",
      sessionStatusCode: sessionStatus?.lookupCode ?? "UNKNOWN",
      cycleCountType: cycleCountType?.lookupValue ?? null,
      createdByUser: createdByUser
        ? { fullName: createdByUser.fullName ?? createdByUser.email }
        : null,
      createdAt: session._creationTime,
      startedAt: session.startedAt,
      zones: enrichedZones,
      overallProgress: {
        totalItems: totalLineItems,
        scannedItems: totalScanned,
        totalZones,
        completedZones,
        progressPercent:
          totalLineItems > 0
            ? Math.round((totalScanned / totalLineItems) * 100)
            : 0,
      },
    };
  },
});

/**
 * recordLineItemCount
 *
 * Purpose: Records the counted quantity for a line item during cycle count
 *
 * Process:
 * 1. If lineItemId is a real ID, updates the existing line item
 * 2. If lineItemId starts with "batch-", creates a new line item from batch
 * 3. Updates the actual quantity and marks as scanned
 *
 * Access: Available to assigned workers
 */
export const recordLineItemCount = mutation({
  args: {
    lineItemId: v.union(v.id("session_line_items"), v.string()),
    actualQuantity: v.number(),
    scannedByUserId: v.id("users"),
    notes: v.optional(v.string()),
    // Required when creating from batch (fallback mode)
    sessionId: v.optional(v.id("work_sessions")),
    batchId: v.optional(v.id("inventory_batches")),
    zoneId: v.optional(v.id("storage_zones")),
  },
  handler: async (ctx, args) => {
    // Check if this is a batch-based item (fallback mode)
    if (typeof args.lineItemId === "string" && args.lineItemId.startsWith("batch-")) {
      // This is from the fallback - need to create a new line item
      if (!args.sessionId || !args.batchId || !args.zoneId) {
        throw new Error("sessionId, batchId, and zoneId are required when recording from inventory batch");
      }

      const batch = await ctx.db.get(args.batchId);
      if (!batch) {
        throw new Error("Inventory batch not found");
      }

      // Create the line item
      const lineItemId = await ctx.db.insert("session_line_items", {
        sessionId: args.sessionId,
        skuId: batch.skuId,
        expectedQuantity: batch.quantity,
        actualQuantity: args.actualQuantity,
        zoneId: args.zoneId,
        batchId: args.batchId,
        scannedAt: Date.now(),
        scannedByUserId: args.scannedByUserId,
        notes: args.notes,
      });

      return lineItemId;
    }

    // Existing line item - just update it
    const lineItem = await ctx.db.get(args.lineItemId as Id<"session_line_items">);
    if (!lineItem) {
      throw new Error("Line item not found");
    }

    await ctx.db.patch(args.lineItemId as Id<"session_line_items">, {
      actualQuantity: args.actualQuantity,
      scannedAt: Date.now(),
      scannedByUserId: args.scannedByUserId,
      notes: args.notes,
    });

    return args.lineItemId;
  },
});

/**
 * completeZoneAssignment
 *
 * Purpose: Marks a zone assignment as completed
 *
 * Process:
 * 1. Gets the "COMPLETED" status lookup
 * 2. Updates the zone assignment status
 * 3. Checks if all zones are completed
 * 4. If all zones completed, updates session status to completed
 *
 * Access: Available to assigned workers
 */
export const completeZoneAssignment = mutation({
  args: {
    assignmentId: v.id("session_zone_assignments"),
  },
  handler: async (ctx, args) => {
    // Get the assignment
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Zone assignment not found");
    }

    // Get the "COMPLETED" status lookup using the compound index
    const completedStatus = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q.eq("lookupType", "ZoneAssignmentStatus").eq("lookupCode", "COMPLETED")
      )
      .first();

    if (!completedStatus) {
      throw new Error("COMPLETED status lookup not found for ZoneAssignmentStatus. Please ensure seed data has been run.");
    }

    // Update the assignment status
    await ctx.db.patch(args.assignmentId, {
      assignmentStatusTypeId: completedStatus._id,
      completedAt: Date.now(),
    });

    // Check if all zone assignments for this session are completed
    const allAssignments = await ctx.db
      .query("session_zone_assignments")
      .withIndex("sessionId", (q) => q.eq("sessionId", assignment.sessionId))
      .collect();

    const allCompleted = allAssignments.every(
      (a) =>
        a._id === args.assignmentId ||
        a.assignmentStatusTypeId === completedStatus._id,
    );

    // If all zones are completed, update session status
    if (allCompleted) {
      const sessionCompletedStatus = await ctx.db
        .query("system_lookups")
        .filter((q) =>
          q.and(
            q.eq(q.field("lookupType"), "SessionStatus"),
            q.eq(q.field("lookupCode"), "COMPLETED"),
          ),
        )
        .first();

      if (sessionCompletedStatus) {
        await ctx.db.patch(assignment.sessionId, {
          sessionStatusTypeId: sessionCompletedStatus._id,
          completedAt: Date.now(),
        });
      }
    }

    return {
      assignmentId: args.assignmentId,
      sessionCompleted: allCompleted,
    };
  },
});

/**
 * startZoneAssignment
 *
 * Purpose: Marks a zone assignment as in progress (started)
 *
 * Process:
 * 1. Gets the "IN_PROGRESS" status lookup
 * 2. Updates the zone assignment status and start time
 * 3. If session hasn't started, updates session status to "In Progress"
 *
 * Access: Available to assigned workers
 */
export const startZoneAssignment = mutation({
  args: {
    assignmentId: v.id("session_zone_assignments"),
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Zone assignment not found");
    }

    // Get the "IN_PROGRESS" status lookup using the compound index
    const inProgressStatus = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q.eq("lookupType", "ZoneAssignmentStatus").eq("lookupCode", "IN_PROGRESS")
      )
      .first();

    if (!inProgressStatus) {
      // Provide diagnostic information
      const allZoneStatuses = await ctx.db
        .query("system_lookups")
        .withIndex("lookupType", (q) => q.eq("lookupType", "ZoneAssignmentStatus"))
        .collect();
      
      throw new Error(
        `IN_PROGRESS status lookup not found for ZoneAssignmentStatus. ` +
        `Available statuses: ${allZoneStatuses.map(s => s.lookupCode).join(", ") || "none"}. ` +
        `Please ensure seed data has been run.`
      );
    }

    // Update the assignment
    await ctx.db.patch(args.assignmentId, {
      assignmentStatusTypeId: inProgressStatus._id,
      startedAt: Date.now(),
    });

    // Check if session needs to be updated to "In Progress"
    const session = await ctx.db.get(assignment.sessionId);
    if (session && !session.startedAt) {
      const sessionInProgressStatus = await ctx.db
        .query("system_lookups")
        .filter((q) =>
          q.and(
            q.eq(q.field("lookupType"), "SessionStatus"),
            q.eq(q.field("lookupCode"), "IN_PROGRESS"),
          ),
        )
        .first();

      if (sessionInProgressStatus) {
        await ctx.db.patch(assignment.sessionId, {
          sessionStatusTypeId: sessionInProgressStatus._id,
          startedAt: Date.now(),
        });
      }
    }

    return args.assignmentId;
  },
});

/**
 * completeSession
 *
 * Purpose: Completes a cycle count session (called from the main page)
 *
 * Process:
 * 1. Validates session exists
 * 2. Checks all zone assignments are completed
 * 3. Updates session status to completed
 * 4. Calculates and stores session metrics
 *
 * Access: Available to supervisors and managers
 */
export const completeSession = mutation({
  args: {
    sessionId: v.id("work_sessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Get all zone assignments
    const assignments = await ctx.db
      .query("session_zone_assignments")
      .withIndex("sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Get completed status lookup
    const completedAssignmentStatus = await ctx.db
      .query("system_lookups")
      .filter((q) =>
        q.and(
          q.eq(q.field("lookupType"), "AssignmentStatus"),
          q.eq(q.field("lookupCode"), "COMPLETED"),
        ),
      )
      .first();

    // Check if all zones are completed
    const allZonesCompleted =
      assignments.length > 0 &&
      assignments.every(
        (a) => a.assignmentStatusTypeId === completedAssignmentStatus?._id,
      );

    if (!allZonesCompleted && assignments.length > 0) {
      throw new Error(
        "Cannot complete session: not all zone assignments are completed",
      );
    }

    // Get completed session status
    const completedSessionStatus = await ctx.db
      .query("system_lookups")
      .filter((q) =>
        q.and(
          q.eq(q.field("lookupType"), "SessionStatus"),
          q.eq(q.field("lookupCode"), "COMPLETED"),
        ),
      )
      .first();

    if (!completedSessionStatus) {
      throw new Error("Completed status not found");
    }

    // Get all line items for metrics
    const lineItems = await ctx.db
      .query("session_line_items")
      .withIndex("sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Calculate metrics
    const totalItems = lineItems.length;
    const scannedItems = lineItems.filter((i) => i.scannedAt !== undefined).length;
    const matchedItems = lineItems.filter(
      (i) => i.scannedAt !== undefined && i.actualQuantity === i.expectedQuantity,
    ).length;
    const accuracyRate =
      scannedItems > 0 ? Math.round((matchedItems / scannedItems) * 100) : 0;
    const totalTimeSeconds = session.startedAt
      ? Math.round((Date.now() - session.startedAt) / 1000)
      : 0;

    // Update session
    await ctx.db.patch(args.sessionId, {
      sessionStatusTypeId: completedSessionStatus._id,
      completedAt: Date.now(),
    });

    // Store session metrics
    await ctx.db.insert("session_metrics", {
      sessionId: args.sessionId,
      totalTimeSeconds,
      totalItemsProcessed: scannedItems,
      accuracyRate,
      calculatedAt: Date.now(),
    });

    return {
      sessionId: args.sessionId,
      metrics: {
        totalItems,
        scannedItems,
        matchedItems,
        accuracyRate,
        totalTimeSeconds,
      },
    };
  },
});

/**
 * getSessionCompletionStatus
 *
 * Purpose: Gets the completion status of all zones in a session
 *
 * Access: Available to all authenticated users
 */
export const getSessionCompletionStatus = query({
  args: {
    sessionId: v.id("work_sessions"),
  },
  handler: async (ctx, args) => {
    const assignments = await ctx.db
      .query("session_zone_assignments")
      .withIndex("sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const completedStatus = await ctx.db
      .query("system_lookups")
      .filter((q) =>
        q.and(
          q.eq(q.field("lookupType"), "AssignmentStatus"),
          q.eq(q.field("lookupCode"), "COMPLETED"),
        ),
      )
      .first();

    const enrichedAssignments = await Promise.all(
      assignments.map(async (a) => {
        const zone = await ctx.db.get(a.zoneId);
        const user = await ctx.db.get(a.assignedUserId);
        const status = a.assignmentStatusTypeId
          ? await ctx.db.get(a.assignmentStatusTypeId)
          : null;

        return {
          zoneId: a.zoneId,
          zoneName: zone?.name ?? "Unknown",
          assignedUser: user?.fullName ?? "Unknown",
          status: status?.lookupValue ?? "Not Started",
          isCompleted: a.assignmentStatusTypeId === completedStatus?._id,
          completedAt: a.completedAt,
        };
      }),
    );

    const allCompleted =
      assignments.length > 0 &&
      assignments.every(
        (a) => a.assignmentStatusTypeId === completedStatus?._id,
      );

    return {
      zones: enrichedAssignments,
      totalZones: assignments.length,
      completedZones: enrichedAssignments.filter((a) => a.isCompleted).length,
      allCompleted,
    };
  },
});

// ================================================================
// ADJUSTMENT QUERIES & MUTATIONS
// ================================================================

/**
 * getQuantityAdjustmentsForTable
 *
 * Purpose: Retrieves quantity adjustment requests with enriched data for table display
 *
 * Process:
 * 1. Gets the "QUANTITY" adjustment type lookup
 * 2. Queries adjustment_requests filtered by type, organization and branch
 * 3. Enriches each request with user info, status, reason, and detail summary
 *
 * Access: Available to all authenticated users within the organization
 */
export const getQuantityAdjustmentsForTable = query({
  args: {
    organizationId: v.id("organizations"),
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    // Get the quantity adjustment type ID
    const quantityType = await ctx.db
      .query("system_lookups")
      .filter((q) =>
        q.and(
          q.eq(q.field("lookupType"), "AdjustmentType"),
          q.eq(q.field("lookupCode"), "QUANTITY"),
        ),
      )
      .first();

    if (!quantityType) return [];

    // Query adjustment requests
    const adjustmentRequests = await ctx.db
      .query("adjustment_requests")
      .withIndex("adjustmentTypeId", (q) =>
        q.eq("adjustmentTypeId", quantityType._id as unknown as string),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId as unknown as string),
          q.eq(q.field("branchId"), args.branchId as unknown as string),
        ),
      )
      .order("desc")
      .collect();

    // Enrich each request with related data
    const enrichedRequests = await Promise.all(
      adjustmentRequests.map(async (request) => {
        // Get user info
        const requestedByUser = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("_id"), request.requestedByUserId))
          .first();

        // Get status lookup
        const statusLookup = await ctx.db.get(
          request.adjustmentStatusTypeId as unknown as Id<"system_lookups">,
        );

        // Get details for this request
        const details = await ctx.db
          .query("adjustment_request_details")
          .withIndex("adjustmentRequestId", (q) =>
            q.eq("adjustmentRequestId", request._id),
          )
          .collect();

        // Get first detail for product info
        const firstDetail = details[0];
        let productName = "Multiple Products";

        if (firstDetail && details.length === 1) {
          // Try to get product name from SKU
          const productVariant = firstDetail.skuId
            ? await ctx.db
                .query("product_variants")
                .filter((q) => q.eq(q.field("skuCode"), firstDetail.skuId))
                .first()
            : null;

          if (productVariant) {
            const product = await ctx.db.get(productVariant.productId);
            productName = product?.name ?? firstDetail.skuId;
          } else {
            productName = firstDetail.skuId;
          }
        }

        // Get reason lookup
        const reasonLookup = firstDetail?.reasonTypeId
          ? await ctx.db.get(firstDetail.reasonTypeId as unknown as Id<"system_lookups">)
          : null;

        // Calculate totals from all details
        const totalExpected = details.reduce((sum, d) => sum + d.expectedQuantity, 0);
        const totalActual = details.reduce((sum, d) => sum + d.actualQuantity, 0);

        return {
          _id: request._id,
          requestCode: request.requestCode,
          productName,
          currentQty: totalExpected,
          adjustedQty: totalActual,
          reason: reasonLookup?.lookupValue ?? "Unknown",
          status: statusLookup?.lookupValue ?? "Unknown",
          requestedBy: requestedByUser ? { fullName: requestedByUser.fullName } : null,
          createdAt: request.requestedAt,
        };
      }),
    );

    return enrichedRequests;
  },
});

/**
 * getLocationAdjustmentsForTable
 *
 * Purpose: Retrieves location adjustment requests with enriched data for table display
 *
 * Process:
 * 1. Gets the "LOCATION" adjustment type lookup
 * 2. Queries adjustment_requests filtered by type, organization and branch
 * 3. Enriches each request with user info, status, reason, and location details
 *
 * Access: Available to all authenticated users within the organization
 */
export const getLocationAdjustmentsForTable = query({
  args: {
    organizationId: v.id("organizations"),
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    // Get the location adjustment type ID
    const locationType = await ctx.db
      .query("system_lookups")
      .filter((q) =>
        q.and(
          q.eq(q.field("lookupType"), "AdjustmentType"),
          q.eq(q.field("lookupCode"), "LOCATION"),
        ),
      )
      .first();

    if (!locationType) return [];

    // Query adjustment requests
    const adjustmentRequests = await ctx.db
      .query("adjustment_requests")
      .withIndex("adjustmentTypeId", (q) =>
        q.eq("adjustmentTypeId", locationType._id as unknown as string),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId as unknown as string),
          q.eq(q.field("branchId"), args.branchId as unknown as string),
        ),
      )
      .order("desc")
      .collect();

    // Enrich each request with related data
    const enrichedRequests = await Promise.all(
      adjustmentRequests.map(async (request) => {
        // Get user info
        const requestedByUser = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("_id"), request.requestedByUserId))
          .first();

        // Get status lookup
        const statusLookup = await ctx.db.get(
          request.adjustmentStatusTypeId as unknown as Id<"system_lookups">,
        );

        // Get details for this request
        const details = await ctx.db
          .query("adjustment_request_details")
          .withIndex("adjustmentRequestId", (q) =>
            q.eq("adjustmentRequestId", request._id),
          )
          .collect();

        // Get first detail for product and location info
        const firstDetail = details[0];
        let productName = "Multiple Products";
        let fromLocation = "N/A";
        let toLocation = "N/A";

        if (firstDetail) {
          // Get product name
          if (details.length === 1) {
            const productVariant = firstDetail.skuId
              ? await ctx.db
                  .query("product_variants")
                  .filter((q) => q.eq(q.field("skuCode"), firstDetail.skuId))
                  .first()
              : null;

            if (productVariant) {
              const product = await ctx.db.get(productVariant.productId);
              productName = product?.name ?? firstDetail.skuId;
            } else {
              productName = firstDetail.skuId;
            }
          }

          // Get from zone name
          if (firstDetail.fromZoneId) {
            const fromZone = await ctx.db.get(
              firstDetail.fromZoneId as unknown as Id<"storage_zones">,
            );
            fromLocation = fromZone?.name ?? firstDetail.fromZoneId;
          }

          // Get to zone name
          if (firstDetail.toZoneId) {
            const toZone = await ctx.db.get(
              firstDetail.toZoneId as unknown as Id<"storage_zones">,
            );
            toLocation = toZone?.name ?? firstDetail.toZoneId;
          }
        }

        // Get reason lookup
        const reasonLookup = firstDetail?.reasonTypeId
          ? await ctx.db.get(firstDetail.reasonTypeId as unknown as Id<"system_lookups">)
          : null;

        // Calculate total quantity from all details
        const totalQuantity = details.reduce((sum, d) => sum + (d.quantity ?? 0), 0);

        return {
          _id: request._id,
          requestCode: request.requestCode,
          productName,
          fromLocation,
          toLocation,
          quantity: totalQuantity,
          reason: reasonLookup?.lookupValue ?? "Location Transfer",
          status: statusLookup?.lookupValue ?? "Unknown",
          requestedBy: requestedByUser ? { fullName: requestedByUser.fullName } : null,
          createdAt: request.requestedAt,
        };
      }),
    );

    return enrichedRequests;
  },
});

/**
 * getAdjustmentStats
 *
 * Purpose: Retrieves summary statistics for adjustment requests
 *
 * Access: Available to all authenticated users within the organization
 */
export const getAdjustmentStats = query({
  args: {
    organizationId: v.id("organizations"),
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    // Get all adjustment requests for this branch
    const adjustmentRequests = await ctx.db
      .query("adjustment_requests")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId as unknown as string),
      )
      .filter((q) => q.eq(q.field("branchId"), args.branchId as unknown as string))
      .collect();

    // Get status lookups
    const pendingStatus = await ctx.db
      .query("system_lookups")
      .filter((q) =>
        q.and(
          q.eq(q.field("lookupType"), "AdjustmentStatus"),
          q.eq(q.field("lookupCode"), "PENDING"),
        ),
      )
      .first();

    const approvedStatus = await ctx.db
      .query("system_lookups")
      .filter((q) =>
        q.and(
          q.eq(q.field("lookupType"), "AdjustmentStatus"),
          q.eq(q.field("lookupCode"), "APPROVED"),
        ),
      )
      .first();

    const rejectedStatus = await ctx.db
      .query("system_lookups")
      .filter((q) =>
        q.and(
          q.eq(q.field("lookupType"), "AdjustmentStatus"),
          q.eq(q.field("lookupCode"), "REJECTED"),
        ),
      )
      .first();

    // Count by status
    const pendingCount = adjustmentRequests.filter(
      (r) => r.adjustmentStatusTypeId === (pendingStatus?._id as unknown as string),
    ).length;
    const approvedCount = adjustmentRequests.filter(
      (r) => r.adjustmentStatusTypeId === (approvedStatus?._id as unknown as string),
    ).length;
    const rejectedCount = adjustmentRequests.filter(
      (r) => r.adjustmentStatusTypeId === (rejectedStatus?._id as unknown as string),
    ).length;

    return {
      totalQuantityRequests: adjustmentRequests.length,
      pendingApproval: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
    };
  },
});

/**
 * getAllAdjustmentRequests
 *
 * Purpose: Retrieves all adjustment requests for a specific organization
 *
 * Process:
 * 1. Queries the adjustment_requests table using the organizationId index
 * 2. Returns all adjustment requests for the organization
 *
 * Access: Available to all authenticated users within the organization
 * Typical users: Warehouse managers, inventory staff, supervisors, admins
 */
export const getAllAdjustmentRequests = query({
  args: {
    organizationId: v.string(),
    branchId: v.string(),
  },
  handler: async (ctx, args) => {
    // Step 1: Query adjustment_requests table filtered by organization
    const adjustmentRequests = await ctx.db
      .query("adjustment_requests")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .filter((q) => q.eq(q.field("branchId"), args.branchId))
      .collect();

    // Step 2: Return all adjustment requests
    return adjustmentRequests;
  },
});

/**
 * getAdjustmentsByType
 *
 * Purpose: Retrieves adjustment requests filtered by type (quantity or location)
 *
 * Process:
 * 1. Queries the adjustment_requests table using the adjustmentTypeId index
 * 2. Filters by organization
 * 3. Returns all matching adjustment requests
 *
 * Access: Available to all authenticated users within the organization
 * Typical users: Warehouse managers, inventory staff, supervisors, admins
 */
export const getAdjustmentsByType = query({
  args: {
    organizationId: v.string(),
    branchId: v.string(),
    adjustmentTypeId: v.string(), // "quantity" or "location"
  },
  handler: async (ctx, args) => {
    // Step 1: Query adjustment_requests table using type index
    const adjustmentRequests = await ctx.db
      .query("adjustment_requests")
      .withIndex("adjustmentTypeId", (q) =>
        q.eq("adjustmentTypeId", args.adjustmentTypeId),
      )
      // Step 2: Filter by organization and branch
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("branchId"), args.branchId),
        ),
      )
      .collect();

    // Step 3: Return filtered adjustment requests
    return adjustmentRequests;
  },
});

/**
 * getAdjustmentRequestById
 *
 * Purpose: Retrieves a specific adjustment request by its ID along with its details
 *
 * Process:
 * 1. Fetches the adjustment request from the database using the provided ID
 * 2. Validates that the request exists
 * 3. Queries all associated adjustment request details
 * 4. Returns the adjustment request with its details
 *
 * Access: Available to all authenticated users within the organization
 * Typical users: Warehouse managers, inventory staff, supervisors, admins
 */
export const getAdjustmentRequestById = query({
  args: {
    adjustmentRequestId: v.id("adjustment_requests"),
  },
  handler: async (ctx, args) => {
    // Step 1: Fetch the adjustment request by ID
    const adjustmentRequest = await ctx.db.get(args.adjustmentRequestId);

    // Step 2: Validate request exists
    if (!adjustmentRequest) {
      return null;
    }

    // Step 3: Get related data
    const adjustmentType = adjustmentRequest.adjustmentTypeId
      ? await ctx.db
          .query("system_lookups")
          .filter((q) => q.eq(q.field("_id"), adjustmentRequest.adjustmentTypeId))
          .first()
      : null;

    const adjustmentStatus = adjustmentRequest.adjustmentStatusTypeId
      ? await ctx.db
          .query("system_lookups")
          .filter((q) => q.eq(q.field("_id"), adjustmentRequest.adjustmentStatusTypeId))
          .first()
      : null;

    const requestedBy = adjustmentRequest.requestedByUserId
      ? await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("_id"), adjustmentRequest.requestedByUserId))
          .first()
      : null;

    const approvedByUser = adjustmentRequest.approvedByUserId
      ? await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("_id"), adjustmentRequest.approvedByUserId))
          .first()
      : null;

    // Step 4: Query all associated adjustment request details
    const detailsRaw = await ctx.db
      .query("adjustment_request_details")
      .withIndex("adjustmentRequestId", (q) =>
        q.eq("adjustmentRequestId", args.adjustmentRequestId),
      )
      .collect();

    // Step 5: Enrich details with related data
    const details = await Promise.all(
      detailsRaw.map(async (detail) => {
        const productVariant = detail.skuId
          ? await ctx.db
              .query("product_variants")
              .filter((q) => q.eq(q.field("_id"), detail.skuId))
              .first()
          : null;

        const product = productVariant?.productId
          ? await ctx.db
              .query("products")
              .filter((q) => q.eq(q.field("_id"), productVariant.productId))
              .first()
          : null;

        const fromZone = detail.fromZoneId
          ? await ctx.db
              .query("storage_zones")
              .filter((q) => q.eq(q.field("_id"), detail.fromZoneId))
              .first()
          : null;

        const toZone = detail.toZoneId
          ? await ctx.db
              .query("storage_zones")
              .filter((q) => q.eq(q.field("_id"), detail.toZoneId))
              .first()
          : null;

        return {
          ...detail,
          productName: product?.name,
          skuCode: productVariant?.skuCode,
          fromLocationName: fromZone?.name,
          toLocationName: toZone?.name,
          currentQuantity: detail.expectedQuantity,
          adjustedQuantity: detail.actualQuantity,
          quantityToTransfer: detail.quantity,
        };
      }),
    );

    // Step 6: Return the complete adjustment request with enriched details
    return {
      ...adjustmentRequest,
      adjustmentType,
      status: adjustmentStatus?.lookupValue,
      requestedBy,
      approvedByUser,
      details,
    };
  },
});

/**
 * createAdjustmentRequest
 *
 * Purpose: Creates a new adjustment request from cycle count session with multiple items
 *
 * Process:
 * 1. Generates a unique request code
 * 2. Finds the pending status for adjustment requests
 * 3. Creates the adjustment request header
 * 4. Creates all associated adjustment request detail records
 * 5. Returns the newly created adjustment request ID
 *
 * Access: Restricted to authorized users with permission to create adjustment requests
 */
export const createAdjustmentRequest = mutation({
  args: {
    branchId: v.id("branches"),
    adjustmentTypeId: v.id("system_lookups"),
    details: v.array(
      v.object({
        skuId: v.id("products"),
        batchId: v.union(v.id("inventory_batches"), v.null()),
        currentQuantity: v.number(),
        newQuantity: v.number(),
        sourceZoneId: v.union(v.id("storage_zones"), v.null()),
        destinationZoneId: v.union(v.id("storage_zones"), v.null()),
      }),
    ),
    reason: v.string(),
    requestedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Step 1: Generate request code
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const requestCode = `ADJ-${timestamp}-${randomSuffix}`;

    // Step 2: Get the branch to find organizationId
    const branch = await ctx.db.get(args.branchId);
    if (!branch) {
      throw new Error("Branch not found");
    }

    // Step 3: Find the pending status
    const pendingStatus = await ctx.db
      .query("system_lookups")
      .filter((q) =>
        q.and(
          q.eq(q.field("lookupType"), "AdjustmentStatus"),
          q.eq(q.field("lookupValue"), "PENDING"),
        ),
      )
      .first();

    if (!pendingStatus) {
      throw new Error("Pending status not found in system lookups");
    }

    // Step 4: Find a default reason type (or use the first one available)
    const defaultReasonType = await ctx.db
      .query("system_lookups")
      .filter((q) => q.eq(q.field("lookupType"), "AdjustmentReason"))
      .first();

    // Step 5: Create the adjustment request header
    const adjustmentRequestId = await ctx.db.insert("adjustment_requests", {
      organizationId: branch.organizationId,
      branchId: args.branchId.toString(),
      requestCode,
      adjustmentTypeId: args.adjustmentTypeId.toString(),
      requestedByUserId: args.requestedBy.toString(),
      requestedAt: timestamp,
      adjustmentStatusTypeId: pendingStatus._id.toString(),
      resolutionNotes: args.reason, // Store reason in resolutionNotes field
    });

    // Step 6: Get the adjustment type to check if it's quantity or location
    const adjustmentType = await ctx.db.get(args.adjustmentTypeId);
    const isQuantityType =
      adjustmentType?.lookupValue?.toUpperCase() === "QUANTITY";

    // Step 7: Create all adjustment request detail records
    for (const detail of args.details) {
      await ctx.db.insert("adjustment_request_details", {
        adjustmentRequestId,
        batchId: detail.batchId?.toString() ?? "",
        skuId: detail.skuId.toString(),
        // Quantity adjustment fields
        expectedQuantity: detail.currentQuantity,
        actualQuantity: detail.newQuantity,
        varianceQuantity: detail.newQuantity - detail.currentQuantity,
        costImpact: 0,
        // Location transfer fields
        fromZoneId: detail.sourceZoneId?.toString(),
        toZoneId: detail.destinationZoneId?.toString(),
        quantity: isQuantityType ? undefined : detail.currentQuantity,
        // Reason
        reasonTypeId: defaultReasonType?._id.toString() ?? "",
        customReasonNotes: args.reason,
      });
    }

    return adjustmentRequestId;
  },
});

/**
 * createNewAdjustmentRequest
 *
 * Purpose: Creates a new inventory adjustment request (quantity or location) with line items
 *
 * Process:
 * 1. Validates that at least one detail line item is provided
 * 2. Creates the adjustment request header with type and initial status
 * 3. Creates all associated adjustment request detail records
 * 4. Returns the newly created adjustment request ID
 *
 * Access: Restricted to authorized users with permission to create adjustment requests
 * Typical users: Warehouse managers, inventory staff, supervisors, admins
 */
export const createNewAdjustmentRequest = mutation({
  args: {
    organizationId: v.string(),
    branchId: v.string(),
    requestCode: v.string(),
    adjustmentTypeId: v.string(), // "quantity" or "location"
    requestedByUserId: v.string(),
    adjustmentStatusTypeId: v.string(),
    details: v.array(
      v.object({
        batchId: v.string(),
        skuId: v.string(),
        // For quantity adjustments
        expectedQuantity: v.optional(v.number()),
        actualQuantity: v.optional(v.number()),
        varianceQuantity: v.optional(v.number()),
        costImpact: v.optional(v.number()),
        // For location adjustments
        fromZoneId: v.optional(v.string()),
        toZoneId: v.optional(v.string()),
        quantity: v.optional(v.number()),
        // Common fields
        reasonTypeId: v.string(),
        customReasonNotes: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Step 1: Validate that details are provided
    if (!args.details || args.details.length === 0) {
      throw new Error(
        "Adjustment request must have at least one detail line item",
      );
    }

    // Step 2: Create the adjustment request header
    const adjustmentRequestId = await ctx.db.insert("adjustment_requests", {
      organizationId: args.organizationId,
      branchId: args.branchId,
      requestCode: args.requestCode,
      adjustmentTypeId: args.adjustmentTypeId,
      requestedByUserId: args.requestedByUserId,
      requestedAt: Date.now(),
      adjustmentStatusTypeId: args.adjustmentStatusTypeId,
    });

    // Step 3: Create all adjustment request detail records
    for (const detail of args.details) {
      await ctx.db.insert("adjustment_request_details", {
        adjustmentRequestId,
        batchId: detail.batchId,
        skuId: detail.skuId,
        expectedQuantity: detail.expectedQuantity ?? 0,
        actualQuantity: detail.actualQuantity ?? 0,
        varianceQuantity: detail.varianceQuantity ?? 0,
        costImpact: detail.costImpact ?? 0,
        fromZoneId: detail.fromZoneId,
        toZoneId: detail.toZoneId,
        quantity: detail.quantity,
        reasonTypeId: detail.reasonTypeId,
        customReasonNotes: detail.customReasonNotes,
      });
    }

    // Step 4: Return the newly created adjustment request ID
    return adjustmentRequestId;
  },
});

/**
 * setAdjustmentRequestStatus
 *
 * Purpose: Updates the status of a specific adjustment request
 *
 * Process:
 * 1. Fetches the adjustment request by ID to validate it exists
 * 2. Updates the status and optional approval fields
 * 3. Returns the updated adjustment request ID
 *
 * Access: Restricted to authorized users with permission to manage adjustment requests
 * Typical users: Warehouse managers, supervisors, admins
 */
export const setAdjustmentRequestStatus = mutation({
  args: {
    adjustmentRequestId: v.id("adjustment_requests"),
    adjustmentStatusTypeId: v.string(),
    approvedByUserId: v.optional(v.string()),
    resolutionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Step 1: Fetch the adjustment request to validate it exists
    const adjustmentRequest = await ctx.db.get(args.adjustmentRequestId);

    if (!adjustmentRequest) {
      throw new Error("Adjustment request not found");
    }

    // Step 2: Build update object
    const updateData: Record<string, unknown> = {
      adjustmentStatusTypeId: args.adjustmentStatusTypeId,
    };

    if (args.approvedByUserId !== undefined) {
      updateData.approvedByUserId = args.approvedByUserId;
      updateData.approvedAt = Date.now();
    }

    if (args.resolutionNotes !== undefined) {
      updateData.resolutionNotes = args.resolutionNotes;
    }

    // Step 3: Update the adjustment request
    await ctx.db.patch(args.adjustmentRequestId, updateData);

    // Step 4: Return the updated request ID
    return args.adjustmentRequestId;
  },
});

/**
 * approveAdjustmentRequest
 *
 * Purpose: Approves an adjustment request and applies the inventory changes
 *
 * Process:
 * 1. Validates the adjustment request exists
 * 2. Gets the adjustment details
 * 3. Applies inventory changes based on adjustment type (QUANTITY or LOCATION)
 * 4. Creates inventory transaction records
 * 5. Updates the adjustment request status to APPROVED
 *
 * Access: Restricted to authorized users with permission to approve adjustments
 * Typical users: Warehouse managers, inventory supervisors
 */
export const approveAdjustmentRequest = mutation({
  args: {
    adjustmentRequestId: v.id("adjustment_requests"),
    approvedByUserId: v.optional(v.string()),
    resolutionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Step 1: Validate adjustment request exists
    const adjustmentRequest = await ctx.db.get(args.adjustmentRequestId);
    if (!adjustmentRequest) {
      throw new Error("Adjustment request not found");
    }

    // Step 2: Get the APPROVED status lookup
    const approvedStatus = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q.eq("lookupType", "AdjustmentStatus").eq("lookupCode", "APPROVED")
      )
      .first();

    if (!approvedStatus) {
      throw new Error("APPROVED status lookup not found. Please ensure seed data has been run.");
    }

    // Step 3: Get adjustment type to determine how to process
    const adjustmentType = await ctx.db.get(
      adjustmentRequest.adjustmentTypeId as Id<"system_lookups">
    );

    // Step 4: Get all adjustment details
    const details = await ctx.db
      .query("adjustment_request_details")
      .withIndex("adjustmentRequestId", (q) =>
        q.eq("adjustmentRequestId", args.adjustmentRequestId)
      )
      .collect();

    // Step 5: Get inventory transaction type lookup
    const adjustmentTransactionType = await ctx.db
      .query("system_lookups")
      .filter((q) =>
        q.and(
          q.eq(q.field("lookupType"), "InventoryTransactionType"),
          q.eq(q.field("lookupCode"), "ADJUSTMENT")
        )
      )
      .first();

    // Step 6: Apply changes based on adjustment type
    if (adjustmentType?.lookupCode === "QUANTITY") {
      // Process QUANTITY adjustments
      for (const detail of details) {
        const batchId = detail.batchId as Id<"inventory_batches">;
        const batch = await ctx.db.get(batchId);
        
        if (batch) {
          const oldQuantity = batch.quantity;
          const newQuantity = detail.actualQuantity ?? detail.expectedQuantity ?? 0;
          const quantityChange = newQuantity - oldQuantity;

          // Update the batch quantity
          await ctx.db.patch(batchId, {
            quantity: newQuantity,
          });

          // Create inventory transaction record
          if (adjustmentTransactionType && args.approvedByUserId) {
            await ctx.db.insert("inventory_transactions", {
              organizationId: adjustmentRequest.organizationId as Id<"organizations">,
              batchId: batchId,
              quantityBefore: oldQuantity,
              quantityChange: quantityChange,
              quantityAfter: newQuantity,
              inventoryTransactionTypeId: adjustmentTransactionType._id,
              createdByUserId: args.approvedByUserId as Id<"users">,
              notes: args.resolutionNotes ?? `Quantity adjustment approved: ${detail.reasonTypeId}`,
              adjustmentRequestDetailId: detail._id,
            });
          }
        }
      }
    } else if (adjustmentType?.lookupCode === "LOCATION") {
      // Process LOCATION adjustments
      for (const detail of details) {
        const batchId = detail.batchId as Id<"inventory_batches"> | undefined;
        const fromZoneId = detail.fromZoneId as Id<"storage_zones"> | undefined;
        const toZoneId = detail.toZoneId as Id<"storage_zones"> | undefined;
        
        if (batchId && toZoneId) {
          const batch = await ctx.db.get(batchId);
          
          if (batch) {
            const oldZoneId = batch.zoneId;
            
            // Update the batch location
            await ctx.db.patch(batchId, {
              zoneId: toZoneId,
            });

            // Create inventory transaction record for location change
            if (adjustmentTransactionType && args.approvedByUserId) {
              await ctx.db.insert("inventory_transactions", {
                organizationId: adjustmentRequest.organizationId as Id<"organizations">,
                batchId: batchId,
                quantityBefore: batch.quantity,
                quantityChange: 0, // No quantity change for location adjustment
                quantityAfter: batch.quantity,
                inventoryTransactionTypeId: adjustmentTransactionType._id,
                createdByUserId: args.approvedByUserId as Id<"users">,
                notes: args.resolutionNotes ?? `Location adjustment approved: moved from zone ${oldZoneId} to ${toZoneId}`,
                adjustmentRequestDetailId: detail._id,
              });
            }
          }
        }
      }
    }

    // Step 7: Update the adjustment request status
    await ctx.db.patch(args.adjustmentRequestId, {
      adjustmentStatusTypeId: approvedStatus._id,
      approvedByUserId: args.approvedByUserId,
      approvedAt: Date.now(),
      resolutionNotes: args.resolutionNotes,
    });

    return args.adjustmentRequestId;
  },
});

/**
 * rejectAdjustmentRequest
 *
 * Purpose: Rejects an adjustment request by updating its status to REJECTED
 *
 * Process:
 * 1. Validates the adjustment request exists
 * 2. Fetches the REJECTED status lookup
 * 3. Updates the adjustment request status with rejection details
 *
 * Access: Restricted to authorized users with permission to reject adjustments
 * Typical users: Warehouse managers, inventory supervisors
 */
export const rejectAdjustmentRequest = mutation({
  args: {
    adjustmentRequestId: v.id("adjustment_requests"),
    approvedByUserId: v.optional(v.string()),
    resolutionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Step 1: Validate adjustment request exists
    const adjustmentRequest = await ctx.db.get(args.adjustmentRequestId);
    if (!adjustmentRequest) {
      throw new Error("Adjustment request not found");
    }

    // Step 2: Get the REJECTED status lookup
    const rejectedStatus = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q.eq("lookupType", "AdjustmentStatus").eq("lookupCode", "REJECTED")
      )
      .first();

    if (!rejectedStatus) {
      throw new Error("REJECTED status lookup not found. Please ensure seed data has been run.");
    }

    // Step 3: Update the adjustment request status
    await ctx.db.patch(args.adjustmentRequestId, {
      adjustmentStatusTypeId: rejectedStatus._id,
      approvedByUserId: args.approvedByUserId,
      approvedAt: Date.now(),
      resolutionNotes: args.resolutionNotes,
    });

    return args.adjustmentRequestId;
  },
});

// ================================================================
// EXPIRY QUERIES
// ================================================================

/**
 * getExpiringBatches
 *
 * Purpose: Retrieves all inventory batches that are approaching expiry within a specified number of days
 *
 * Process:
 * 1. Calculates the expiry threshold date based on provided days
 * 2. Queries the inventory_batches table filtered by organization
 * 3. Filters for non-deleted batches with expiresAt within the threshold
 * 4. Returns batches with calculated days to expiry
 *
 * Access: Available to all authenticated users within the organization
 * Typical users: Warehouse managers, inventory staff, supervisors, admins
 */
export const getExpiringBatches = query({
  args: {
    organizationId: v.id("organizations"),
    branchId: v.id("branches"),
    daysThreshold: v.number(), // Number of days to look ahead for expiry
  },
  handler: async (ctx, args) => {
    // Step 1: Calculate the expiry threshold date
    const now = Date.now();
    const thresholdDate = now + args.daysThreshold * 24 * 60 * 60 * 1000;

    // Step 2: Query inventory_batches table filtered by organization
    const batches = await ctx.db
      .query("inventory_batches")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      // Step 3: Filter for non-deleted batches with expiry within threshold and branch
      .filter((q) =>
        q.and(
          q.eq(q.field("branchId"), args.branchId),
          q.eq(q.field("isDeleted"), false),
          q.neq(q.field("expiresAt"), undefined),
          q.lte(q.field("expiresAt"), thresholdDate),
        ),
      )
      .collect();

    // Step 4: Calculate days to expiry and return enriched data
    return batches.map((batch) => {
      const daysToExpiry = batch.expiresAt
        ? Math.ceil((batch.expiresAt - now) / (24 * 60 * 60 * 1000))
        : null;

      return {
        ...batch,
        daysToExpiry,
        isExpired: daysToExpiry !== null && daysToExpiry <= 0,
      };
    });
  },
});

/**
 * getExpiringBatchesByZone
 *
 * Purpose: Retrieves expiring batches grouped by storage zone for targeted cycle count planning
 *
 * Process:
 * 1. Calculates the expiry threshold date based on provided days
 * 2. Queries inventory_batches filtered by organization and zone
 * 3. Filters for non-deleted batches with expiresAt within the threshold
 * 4. Returns batches with calculated days to expiry
 *
 * Access: Available to all authenticated users within the organization
 * Typical users: Warehouse managers, supervisors planning cycle counts
 */
export const getExpiringBatchesByZone = query({
  args: {
    organizationId: v.id("organizations"),
    branchId: v.id("branches"),
    zoneId: v.id("storage_zones"),
    daysThreshold: v.number(),
  },
  handler: async (ctx, args) => {
    // Step 1: Calculate the expiry threshold date
    const now = Date.now();
    const thresholdDate = now + args.daysThreshold * 24 * 60 * 60 * 1000;

    // Step 2: Query inventory_batches table filtered by zone
    const batches = await ctx.db
      .query("inventory_batches")
      .withIndex("zoneId", (q) => q.eq("zoneId", args.zoneId))
      // Step 3: Filter for organization, branch, non-deleted, and expiry within threshold
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("branchId"), args.branchId),
          q.eq(q.field("isDeleted"), false),
          q.neq(q.field("expiresAt"), undefined),
          q.lte(q.field("expiresAt"), thresholdDate),
        ),
      )
      .collect();

    // Step 4: Calculate days to expiry and return enriched data
    return batches.map((batch) => {
      const daysToExpiry = batch.expiresAt
        ? Math.ceil((batch.expiresAt - now) / (24 * 60 * 60 * 1000))
        : null;

      return {
        ...batch,
        daysToExpiry,
        isExpired: daysToExpiry !== null && daysToExpiry <= 0,
      };
    });
  },
});

// ================================================================
// LIST & STATS QUERIES
// ================================================================

/**
 * listWithDetails
 *
 * Purpose: Retrieves all cycle count sessions with enriched data for the table view
 *
 * Process:
 * 1. Queries work_sessions table filtered by organization and branch
 * 2. Filters by session type (cycle count)
 * 3. Enriches each session with cycle count type, status, assigned user, and zones count
 * 4. Returns formatted list matching CycleCountSessionListItem type
 *
 * Access: Available to all authenticated users within the organization
 */
export const listWithDetails = query({
  args: {
    organizationId: v.string(),
    branchId: v.string(),
  },
  handler: async (ctx, args) => {
    // Step 1: Get the cycle count session type lookup (matching getCycleCountLookups)
    const cycleCountSessionType = await ctx.db
      .query("system_lookups")
      .filter((q) =>
        q.and(
          q.eq(q.field("lookupType"), "SessionType"),
          q.eq(q.field("lookupCode"), "CYCLE_COUNT"),
        ),
      )
      .first();

    if (!cycleCountSessionType) {
      return [];
    }

    // Step 2: Query work_sessions table filtered by organization
    const sessions = await ctx.db
      .query("work_sessions")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId as any),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("branchId"), args.branchId as any),
          q.eq(q.field("sessionTypeId"), cycleCountSessionType._id),
        ),
      )
      .order("desc")
      .collect();

    // Step 3: Enrich each session with related data
    const enrichedSessions = await Promise.all(
      sessions.map(async (session) => {
        // Get cycle count type
        const cycleCountType = session.cycleCountTypeId
          ? await ctx.db.get(session.cycleCountTypeId)
          : null;

        // Get session status
        const sessionStatus = await ctx.db.get(session.sessionStatusTypeId);

        // Get assigned user
        const assignedUser = await ctx.db.get(session.assignedUserId);

        // Count zones for this session
        const zoneAssignments = await ctx.db
          .query("session_zone_assignments")
          .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
          .collect();

        return {
          _id: session._id,
          sessionCode: session.sessionCode,
          name: session.name ?? session.sessionCode,
          cycleCountType: cycleCountType
            ? { lookupValue: cycleCountType.lookupValue }
            : null,
          sessionStatus: sessionStatus
            ? { lookupValue: sessionStatus.lookupValue }
            : null,
          createdByUser: assignedUser
            ? { fullName: assignedUser.fullName ?? assignedUser.email }
            : null,
          zonesCount: zoneAssignments.length,
          createdAt: session._creationTime,
        };
      }),
    );

    return enrichedSessions;
  },
});

/**
 * getStats
 *
 * Purpose: Retrieves cycle count statistics for the dashboard
 *
 * Process:
 * 1. Gets all cycle count sessions for the organization/branch
 * 2. Counts active sessions, completed sessions, and total zones
 * 3. Calculates verification rate from session metrics
 *
 * Access: Available to all authenticated users within the organization
 */
export const getStats = query({
  args: {
    organizationId: v.string(),
    branchId: v.string(),
  },
  handler: async (ctx, args) => {
    // Step 1: Get the cycle count session type lookup
    const cycleCountSessionType = await ctx.db
      .query("system_lookups")
      .filter((q) =>
        q.and(
          q.eq(q.field("lookupType"), "session_type"),
          q.eq(q.field("lookupValue"), "Cycle Count"),
        ),
      )
      .first();

    if (!cycleCountSessionType) {
      return {
        activeSessions: 0,
        totalZones: 0,
        completedSessions: 0,
        verificationRate: 0,
      };
    }

    // Step 2: Get active and completed status lookups
    const activeStatus = await ctx.db
      .query("system_lookups")
      .filter((q) =>
        q.and(
          q.eq(q.field("lookupType"), "session_status"),
          q.eq(q.field("lookupValue"), "Active"),
        ),
      )
      .first();

    const completedStatus = await ctx.db
      .query("system_lookups")
      .filter((q) =>
        q.and(
          q.eq(q.field("lookupType"), "session_status"),
          q.eq(q.field("lookupValue"), "Completed"),
        ),
      )
      .first();

    // Step 3: Query all cycle count sessions for this org/branch
    const allSessions = await ctx.db
      .query("work_sessions")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId as any),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("branchId"), args.branchId as any),
          q.eq(q.field("sessionTypeId"), cycleCountSessionType._id),
        ),
      )
      .collect();

    // Step 4: Count active and completed sessions
    const activeSessions = activeStatus
      ? allSessions.filter(
          (s) => s.sessionStatusTypeId === activeStatus._id,
        ).length
      : 0;

    const completedSessions = completedStatus
      ? allSessions.filter(
          (s) => s.sessionStatusTypeId === completedStatus._id,
        ).length
      : 0;

    // Step 5: Count total unique zones across all sessions
    const allZoneAssignments = await Promise.all(
      allSessions.map(async (session) => {
        const assignments = await ctx.db
          .query("session_zone_assignments")
          .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
          .collect();
        return assignments.map((a) => a.zoneId);
      }),
    );
    const uniqueZones = new Set(allZoneAssignments.flat());
    const totalZones = uniqueZones.size;

    // Step 6: Calculate average verification rate from session metrics
    const allMetrics = await Promise.all(
      allSessions.map(async (session) => {
        const metrics = await ctx.db
          .query("session_metrics")
          .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
          .first();
        return metrics?.accuracyRate;
      }),
    );
    const validMetrics = allMetrics.filter(
      (rate): rate is number => rate !== undefined && rate !== null,
    );
    const verificationRate =
      validMetrics.length > 0
        ? Math.round(
            validMetrics.reduce((sum, rate) => sum + rate, 0) /
              validMetrics.length,
          )
        : 0;

    return {
      activeSessions,
      totalZones,
      completedSessions,
      verificationRate,
    };
  },
});

/**
 * getStatsWithChartData
 *
 * Purpose: Retrieves cycle count statistics with chart data for date range visualization
 *
 * Process:
 * 1. Gets all cycle count sessions for the organization/branch within date range
 * 2. Aggregates daily counts for active sessions, completed sessions, zones, and verification rate
 * 3. Returns data suitable for ChartDataCard visualization
 *
 * Access: Available to all authenticated users within the organization
 */
export const getStatsWithChartData = query({
  args: {
    organizationId: v.id("organizations"),
    branchId: v.id("branches"),
    startDate: v.number(), // timestamp in ms
    endDate: v.number(), // timestamp in ms
  },
  handler: async (ctx, args) => {
    const { startDate, endDate } = args;

    // Step 1: Get all work sessions for this org/branch
    const allSessions = await ctx.db
      .query("work_sessions")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .filter((q) => q.eq(q.field("branchId"), args.branchId))
      .collect();

    // Step 2: Get status lookups to identify session states
    const statusLookups = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType", (q) => q.eq("lookupType", "SessionStatus"))
      .collect();

    const statusMap = new Map(
      statusLookups.map((s) => [s._id, s.lookupValue?.toLowerCase() || ""]),
    );

    // Helper to check if status matches
    const isActiveOrInProgress = (statusId: any) => {
      const status = statusMap.get(statusId);
      return (
        status === "active" ||
        status === "in progress" ||
        status === "pending"
      );
    };

    const isCompleted = (statusId: any) => {
      const status = statusMap.get(statusId);
      return status === "completed";
    };

    // Step 3: Calculate the number of days in the period
    const dayMs = 24 * 60 * 60 * 1000;
    const periodDays = Math.ceil((endDate - startDate) / dayMs);

    // Calculate the previous period for comparison
    const prevStartDate = startDate - (endDate - startDate);
    const prevEndDate = startDate;

    // Helper to format date label based on period length
    const formatLabel = (date: Date) => {
      if (periodDays <= 7) {
        return date.toLocaleDateString("en-US", { weekday: "short" });
      } else if (periodDays <= 31) {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      } else {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }
    };

    // Step 4: Build daily data maps
    const dailyActive: Map<string, number> = new Map();
    const dailyCompleted: Map<string, number> = new Map();
    const dailyZones: Map<string, Set<string>> = new Map();
    const dailyVerification: Map<string, number[]> = new Map();

    // Initialize all days in the period
    for (let i = 0; i < periodDays; i++) {
      const date = new Date(startDate + i * dayMs);
      const dateKey = date.toISOString().split("T")[0];
      dailyActive.set(dateKey, 0);
      dailyCompleted.set(dateKey, 0);
      dailyZones.set(dateKey, new Set());
      dailyVerification.set(dateKey, []);
    }

    // Process sessions
    for (const session of allSessions) {
      const creationTime = session._creationTime;
      const sessionDate = new Date(creationTime);
      const dateKey = sessionDate.toISOString().split("T")[0];

      // Only count sessions within the current period
      if (creationTime >= startDate && creationTime <= endDate) {
        // Count active/in-progress sessions
        if (isActiveOrInProgress(session.sessionStatusTypeId)) {
          dailyActive.set(dateKey, (dailyActive.get(dateKey) ?? 0) + 1);
        }

        // Count completed sessions
        if (isCompleted(session.sessionStatusTypeId)) {
          dailyCompleted.set(dateKey, (dailyCompleted.get(dateKey) ?? 0) + 1);
        }
      }
    }

    // Get zone assignments and metrics for all sessions
    for (const session of allSessions) {
      const creationTime = session._creationTime;

      if (creationTime >= startDate && creationTime <= endDate) {
        const sessionDate = new Date(creationTime);
        const dateKey = sessionDate.toISOString().split("T")[0];

        // Get zones for this session
        const zoneAssignments = await ctx.db
          .query("session_zone_assignments")
          .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
          .collect();

        const dateZones = dailyZones.get(dateKey) ?? new Set();
        for (const assignment of zoneAssignments) {
          dateZones.add(assignment.zoneId.toString());
        }
        dailyZones.set(dateKey, dateZones);

        // Get metrics for this session
        const metrics = await ctx.db
          .query("session_metrics")
          .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
          .first();

        if (metrics?.accuracyRate !== undefined) {
          const rates = dailyVerification.get(dateKey) ?? [];
          rates.push(metrics.accuracyRate);
          dailyVerification.set(dateKey, rates);
        }
      }
    }

    // Step 6: Convert maps to chart data arrays
    const activeData: { label: string; value: number }[] = [];
    const completedData: { label: string; value: number }[] = [];
    const zonesData: { label: string; value: number }[] = [];
    const verificationData: { label: string; value: number }[] = [];

    // Running totals for cumulative view
    let cumulativeActive = 0;
    let cumulativeCompleted = 0;
    const allZones = new Set<string>();
    const allVerificationRates: number[] = [];

    for (let i = 0; i < periodDays; i++) {
      const date = new Date(startDate + i * dayMs);
      const dateKey = date.toISOString().split("T")[0];
      const label = formatLabel(date);

      const dayActive = dailyActive.get(dateKey) ?? 0;
      const dayCompleted = dailyCompleted.get(dateKey) ?? 0;
      const dayZones = dailyZones.get(dateKey) ?? new Set();
      const dayRates = dailyVerification.get(dateKey) ?? [];

      cumulativeActive += dayActive;
      cumulativeCompleted += dayCompleted;
      for (const zone of dayZones) {
        allZones.add(zone);
      }
      allVerificationRates.push(...dayRates);

      // Calculate running average verification rate
      const avgVerification =
        allVerificationRates.length > 0
          ? Math.round(
              allVerificationRates.reduce((a, b) => a + b, 0) /
                allVerificationRates.length,
            )
          : 0;

      activeData.push({ label, value: cumulativeActive });
      completedData.push({ label, value: cumulativeCompleted });
      zonesData.push({ label, value: allZones.size });
      verificationData.push({ label, value: avgVerification });
    }

    // Step 6: Calculate previous period totals for comparison
    let prevActive = 0;
    let prevCompleted = 0;
    const prevZones = new Set<string>();
    const prevVerificationRates: number[] = [];

    for (const session of allSessions) {
      const creationTime = session._creationTime;

      if (creationTime >= prevStartDate && creationTime < prevEndDate) {
        if (isActiveOrInProgress(session.sessionStatusTypeId)) {
          prevActive++;
        }

        if (isCompleted(session.sessionStatusTypeId)) {
          prevCompleted++;
        }

        // Get zones
        const zoneAssignments = await ctx.db
          .query("session_zone_assignments")
          .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
          .collect();

        for (const assignment of zoneAssignments) {
          prevZones.add(assignment.zoneId.toString());
        }

        // Get metrics
        const metrics = await ctx.db
          .query("session_metrics")
          .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
          .first();

        if (metrics?.accuracyRate !== undefined) {
          prevVerificationRates.push(metrics.accuracyRate);
        }
      }
    }

    const prevAvgVerification =
      prevVerificationRates.length > 0
        ? Math.round(
            prevVerificationRates.reduce((a, b) => a + b, 0) /
              prevVerificationRates.length,
          )
        : 0;

    // Calculate change percentages
    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    // Get final values (last day's cumulative values)
    const finalActive = activeData[activeData.length - 1]?.value ?? 0;
    const finalCompleted = completedData[completedData.length - 1]?.value ?? 0;
    const finalZones = zonesData[zonesData.length - 1]?.value ?? 0;
    const finalVerification =
      verificationData[verificationData.length - 1]?.value ?? 0;

    return {
      activeSessions: {
        value: finalActive,
        changePercent: calcChange(finalActive, prevActive),
        data: activeData,
      },
      completedSessions: {
        value: finalCompleted,
        changePercent: calcChange(finalCompleted, prevCompleted),
        data: completedData,
      },
      totalZones: {
        value: finalZones,
        changePercent: calcChange(finalZones, prevZones.size),
        data: zonesData,
      },
      verificationRate: {
        value: finalVerification,
        changePercent: calcChange(finalVerification, prevAvgVerification),
        data: verificationData,
      },
    };
  },
});
