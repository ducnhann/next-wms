/**
 * BRANCHES API
 *
 * WHO CAN USE:
 * ✅ Warehouse Manager - full CRUD
 * ✅ Admin - full CRUD
 * ⚠️ Staff - read only
 *
 * BEST PRACTICES:
 * - Pagination: Use paginationOpts for large datasets
 * - Soft delete: Use isActive flag instead of hard delete
 * - Stateless: Each query is independent
 * - Cacheable: Queries are automatically cached by Convex
 */

import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

/**
 * LIST ALL - Get all branches without pagination
 */
export const listAll = query({
  args: {
    organizationId: v.id("organizations"),
    isActive: v.optional(v.boolean()),
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { organizationId, isActive, includeDeleted = false } = args;

    let query = ctx.db
      .query("branches")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", organizationId),
      );

    if (isActive !== undefined) {
      query = query.filter((q) => q.eq(q.field("isActive"), isActive));
    }

    // Filter out deleted branches unless includeDeleted is true
    if (!includeDeleted) {
      query = query.filter((q) => q.eq(q.field("isDeleted"), false));
    }

    return await query.collect();
  },
});

/**
 * GET - Get a single branch by ID
 */
export const get = query({
  args: {
    id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const branch = await ctx.db.get(args.id);
    if (!branch) {
      throw new Error("Branch not found");
    }
    return branch;
  },
});

/**
 * CREATE - Create a new branch
 * Permission required: branches:create
 */
export const createBranch = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    address: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { organizationId, name, address = "", phoneNumber = "", isActive = true } = args;

    // Check if branch name already exists in this organization
    const existing = await ctx.db
      .query("branches")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", organizationId),
      )
      .filter((q) => q.eq(q.field("name"), name))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .first();

    if (existing) {
      throw new Error("Branch name already exists");
    }

    return await ctx.db.insert("branches", {
      organizationId,
      name,
      address,
      phoneNumber,
      isActive,
      isDeleted: false,
    });
  },
});

/**
 * UPDATE - Update an existing branch
 * Permission required: branches:update
 */
export const updateBranch = mutation({
  args: {
    id: v.id("branches"),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    isDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, name, address, phoneNumber, isActive, isDeleted } = args;

    const branch = await ctx.db.get(id);
    if (!branch) {
      throw new Error("Branch not found");
    }

    const updates: Partial<{
      name: string;
      address: string;
      phoneNumber: string;
      isActive: boolean;
      isDeleted: boolean;
      deletedAt?: number;
    }> = {};

    // Check name uniqueness if updating name
    if (name !== undefined && name !== branch.name) {
      const existing = await ctx.db
        .query("branches")
        .withIndex("organizationId", (q) =>
          q.eq("organizationId", branch.organizationId),
        )
        .filter((q) => q.eq(q.field("name"), name))
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .first();

      if (existing) {
        throw new Error("Branch name already exists");
      }

      updates.name = name;
    }

    if (address !== undefined) {
      updates.address = address;
    }

    if (phoneNumber !== undefined) {
      updates.phoneNumber = phoneNumber;
    }

    if (isActive !== undefined) {
      updates.isActive = isActive;
    }

    if (isDeleted !== undefined) {
      updates.isDeleted = isDeleted;
      // Set or clear deletedAt based on isDeleted
      if (isDeleted && !branch.isDeleted) {
        updates.deletedAt = Date.now();
      } else if (!isDeleted && branch.isDeleted) {
        updates.deletedAt = undefined;
      }
    }

    await ctx.db.patch(id, updates);
    return id;
  },
});

/**
 * DEACTIVATE - Soft delete by setting isActive to false
 * Permission required: branches:delete
 */
export const deactivateBranch = mutation({
  args: {
    id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const branch = await ctx.db.get(args.id);
    if (!branch) {
      throw new Error("Branch not found");
    }

    await ctx.db.patch(args.id, {
      isActive: false,
    });

    return args.id;
  },
});

/**
 * DELETE - Soft delete a branch
 * Permission required: branches:delete
 */
export const deleteBranch = mutation({
  args: {
    id: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const branch = await ctx.db.get(args.id);
    if (!branch) {
      throw new Error("Branch not found");
    }

    await ctx.db.patch(args.id, {
      isDeleted: true,
      deletedAt: Date.now(),
    });

    return { success: true };
  },
});
