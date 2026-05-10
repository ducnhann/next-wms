/**
 * BRANDS API - UC2
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

import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { logCRUDAction } from "./audit";

/**
 * LIST - Get all brands with pagination
 * Uses Convex built-in pagination
 */
export const getPaginatedBrands = query({
  args: {
    paginationOpts: paginationOptsValidator,
    organizationId: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { paginationOpts, organizationId, isActive } = args;

    // Build query with optional filters
    let query = organizationId
      ? ctx.db
          .query("brands")
          .withIndex("organizationId", (q) =>
            q.eq("organizationId", organizationId),
          )
      : ctx.db.query("brands");

    // Filter by active status if provided
    if (isActive !== undefined) {
      query = query.filter((q) => q.eq(q.field("isActive"), isActive));
    }

    const brands = await query.order("desc").paginate(paginationOpts);
    return brands;
  },
});

/**
 * GET - Get a single brand by ID
 */
export const get = query({
  args: {
    id: v.id("brands"),
  },
  handler: async (ctx, args) => {
    const brand = await ctx.db.get(args.id);
    if (!brand) {
      throw new Error("Brand not found");
    }
    return brand;
  },
});

/**
 * LIST ALL - Get all brands without pagination (for dropdowns)
 */
export const listAll = query({
  args: {
    organizationId: v.string(),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { organizationId, isActive } = args;

    let query = ctx.db
      .query("brands")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", organizationId),
      );

    if (isActive !== undefined) {
      query = query.filter((q) => q.eq(q.field("isActive"), isActive));
    }

    return await query.collect();
  },
});

/**
 * LIST ALL WITH PRODUCT COUNT - Get all brands with their product count
 * Returns brands with the count of products associated with each brand
 */
export const listBrandsWithProductCount = query({
  args: {
    organizationId: v.string(),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { organizationId, isActive } = args;

    let brandsQuery = ctx.db
      .query("brands")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", organizationId),
      );

    if (isActive !== undefined) {
      brandsQuery = brandsQuery.filter((q) =>
        q.eq(q.field("isActive"), isActive),
      );
    }

    const brands = await brandsQuery.collect();

    // Get product counts for each brand
    const brandsWithProductCount = await Promise.all(
      brands.map(async (brand) => {
        const products = await ctx.db
          .query("products")
          .withIndex("brandId", (q) => q.eq("brandId", brand._id))
          .filter((q) => q.eq(q.field("isDeleted"), false))
          .collect();

        return {
          ...brand,
          productCount: products.length,
        };
      }),
    );

    return brandsWithProductCount;
  },
});

/**
 * CREATE - Create a new brand
 * Permission required: brands:create
 */
export const createBrand = mutation({
  args: {
    organizationId: v.string(),
    name: v.string(),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // TODO: Add permission check
    // const identity = await ctx.auth.getUserIdentity();

    const { organizationId, name, isActive = true } = args;

    // Check if brand name already exists in this organization
    const existing = await ctx.db
      .query("brands")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", organizationId),
      )
      .filter((q) => q.eq(q.field("name"), name))
      .first();

    if (existing) {
      throw new Error("Brand name already exists");
    }

    const brandId = await ctx.db.insert("brands", {
      organizationId,
      name,
      isActive,
    });

    // Log audit for brand creation
    await logCRUDAction(ctx, {
      organizationId: organizationId as Id<"organizations">,
      action: "CREATE",
      entityType: "brands",
      entityId: brandId,
      newValue: { name, isActive },
      notes: `Created brand "${name}"`,
    });

    return brandId;
  },
});

/**
 * UPDATE - Update an existing brand
 * Permission required: brands:update
 */
export const updateBrand = mutation({
  args: {
    id: v.id("brands"),
    name: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // TODO: Add permission check

    const { id, name, isActive } = args;

    const brand = await ctx.db.get(id);
    if (!brand) {
      throw new Error("Brand not found");
    }

    const updates: any = {};

    // Check name uniqueness if updating name
    if (name !== undefined && name !== brand.name) {
      const existing = await ctx.db
        .query("brands")
        .withIndex("organizationId", (q) =>
          q.eq("organizationId", brand.organizationId),
        )
        .filter((q) => q.eq(q.field("name"), name))
        .first();

      if (existing) {
        throw new Error("Brand name already exists");
      }

      updates.name = name;
    }

    if (isActive !== undefined) {
      updates.isActive = isActive;
    }

    await ctx.db.patch(id, updates);

    // Log audit for brand update
    await logCRUDAction(ctx, {
      organizationId: brand.organizationId as Id<"organizations">,
      action: "UPDATE",
      entityType: "brands",
      entityId: id,
      oldValue: { name: brand.name, isActive: brand.isActive },
      newValue: updates,
      notes: `Updated brand "${brand.name}"`,
    });

    return id;
  },
});

/**
 * DELETE - Hard delete a brand (use with caution!)
 * Permission required: brands:delete
 * Note: This is hard delete. Consider using isActive=false for soft delete.
 */
export const deleteBrand = mutation({
  args: {
    brandId: v.string(),
  },
  handler: async (ctx, args) => {
    // TODO: Add permission check

    const { brandId } = args;
    const id = brandId as Id<"brands">;

    // Check if brand has products
    const hasProducts = await ctx.db
      .query("products")
      .withIndex("brandId", (q) => q.eq("brandId", id))
      .first();

    if (hasProducts) {
      throw new Error(
        "Cannot delete brand that has products. Remove products first or deactivate the brand.",
      );
    }

    // Log audit for brand deletion before deleting
    await logCRUDAction(ctx, {
      organizationId: id as unknown as Id<"organizations">, // brands table uses string organizationId
      action: "DELETE",
      entityType: "brands",
      entityId: brandId,
      notes: `Hard deleted brand`,
    });

    await ctx.db.delete(id);
    return { success: true };
  },
});

/**
 * DEACTIVATE - Soft delete by setting isActive to false
 * Permission required: brands:delete
 * This is the recommended way to "delete" brands
 */
export const deactivateBrand = mutation({
  args: {
    id: v.id("brands"),
  },
  handler: async (ctx, args) => {
    // TODO: Add permission check

    const brand = await ctx.db.get(args.id);
    if (!brand) {
      throw new Error("Brand not found");
    }

    await ctx.db.patch(args.id, {
      isActive: false,
    });

    // Log audit for brand deactivation
    await logCRUDAction(ctx, {
      organizationId: brand.organizationId as Id<"organizations">,
      action: "UPDATE",
      entityType: "brands",
      entityId: args.id,
      oldValue: { isActive: brand.isActive },
      newValue: { isActive: false },
      notes: `Deactivated brand "${brand.name}"`,
    });

    return args.id;
  },
});

/**
 * SEARCH - Search brands by name
 */
export const search = query({
  args: {
    organizationId: v.string(),
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { organizationId, searchTerm, limit = 20 } = args;

    const brands = await ctx.db
      .query("brands")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", organizationId),
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Simple case-insensitive search
    const filtered = brands
      .filter((brand) =>
        brand.name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      .slice(0, limit);

    return filtered;
  },
});
