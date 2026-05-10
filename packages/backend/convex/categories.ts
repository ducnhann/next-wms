/**
 * CATEGORIES API - UC2
 *
 * WHO CAN USE:
 * ✅ Warehouse Manager - full CRUD
 * ✅ Admin - full CRUD
 * ⚠️ Staff - read only
 *
 * NOTES:
 * - Categories have hierarchical structure (path field - ltree)
 * - Path format: "parent.child.subchild"
 * - Soft delete supported (isDeleted flag)
 *
 * BEST PRACTICES:
 * - Pagination for large lists
 * - Cache-friendly queries
 * - Validate parent existence before create
 */

import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { logCRUDAction } from "./audit";

/**
 * LIST - Get all categories with pagination
 * Returns hierarchical structure
 */
export const list = query({
  args: {
    organizationId: v.id("organizations"),
    paginationOpts: paginationOptsValidator,
    isActive: v.optional(v.boolean()),
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const {
      organizationId,
      paginationOpts,
      isActive,
      includeDeleted = false,
    } = args;

    let queryBuilder = ctx.db
      .query("categories")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", organizationId),
      );

    // Filter by active status
    if (isActive !== undefined) {
      queryBuilder = queryBuilder.filter((q) =>
        q.eq(q.field("isActive"), isActive),
      );
    }

    // Filter deleted items
    if (!includeDeleted) {
      queryBuilder = queryBuilder.filter((q) =>
        q.eq(q.field("isDeleted"), false),
      );
    }

    const categories = await queryBuilder.order("asc").paginate(paginationOpts);

    return categories;
  },
});

/**
 * GET - Get a single category by ID
 */
export const get = query({
  args: {
    id: v.id("categories"),
  },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.id);

    if (!category) {
      throw new Error("Category not found");
    }

    if (category.isDeleted) {
      throw new Error("Category has been deleted");
    }

    return category;
  },
});

/**
 * GET BY PATH - Get category by hierarchical path
 * Example path: "electronics.computers.laptops"
 */
export const getByPath = query({
  args: {
    organizationId: v.id("organizations"),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    const { organizationId, path } = args;

    const categories = await ctx.db
      .query("categories")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", organizationId),
      )
      .filter((q) => q.eq(q.field("path"), path))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .first();

    return categories;
  },
});

/**
 * GET CHILDREN - Get all direct children of a category
 */
export const getChildren = query({
  args: {
    organizationId: v.id("organizations"),
    parentPath: v.string(),
  },
  handler: async (ctx, args) => {
    const { organizationId, parentPath } = args;

    const allCategories = await ctx.db
      .query("categories")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", organizationId),
      )
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    // Filter children (path starts with parent path + one level deeper)
    const children = allCategories.filter((cat) => {
      const catPath = cat.path;
      // Check if it's direct child: parent.child (not parent.child.grandchild)
      return (
        catPath.startsWith(parentPath + ".") &&
        catPath.split(".").length === parentPath.split(".").length + 1
      );
    });

    return children;
  },
});

/**
 * GET TREE - Get entire category tree for an organization
 */
export const getTree = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Sort by path to maintain hierarchy
    categories.sort((a, b) => a.path.localeCompare(b.path));

    return categories;
  },
});

/**
 * CREATE - Create a new category
 * Permission required: categories:create
 */
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    parentPath: v.optional(v.string()), // Empty for root categories
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // TODO: Add permission check
    // const identity = await ctx.auth.getUserIdentity();

    const { organizationId, name, parentPath, isActive = true } = args;

    // Generate path
    const path = parentPath
      ? `${parentPath}.${name.toLowerCase().replace(/\s+/g, "_")}`
      : name.toLowerCase().replace(/\s+/g, "_");

    // Check if path already exists
    const existing = await ctx.db
      .query("categories")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", organizationId),
      )
      .filter((q) => q.eq(q.field("path"), path))
      .first();

    if (existing) {
      throw new Error("Category with this path already exists");
    }

    // If has parent, validate parent exists
    if (parentPath) {
      const parent = await ctx.db
        .query("categories")
        .withIndex("organizationId", (q) =>
          q.eq("organizationId", organizationId),
        )
        .filter((q) => q.eq(q.field("path"), parentPath))
        .first();

      if (!parent) {
        throw new Error("Parent category not found");
      }
    }

    const categoryId = await ctx.db.insert("categories", {
      organizationId,
      name,
      path,
      isActive,
      isDeleted: false,
    });

    // Log audit for category creation
    await logCRUDAction(ctx, {
      organizationId,
      action: "CREATE",
      entityType: "categories",
      entityId: categoryId,
      newValue: { name, path },
      notes: `Created category "${name}"`,
    });

    return categoryId;
  },
});

/**
 * UPDATE - Update an existing category
 * Permission required: categories:update
 */
export const update = mutation({
  args: {
    id: v.id("categories"),
    name: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // TODO: Add permission check

    const { id, name, isActive } = args;

    const category = await ctx.db.get(id);
    if (!category) {
      throw new Error("Category not found");
    }

    if (category.isDeleted) {
      throw new Error("Cannot update deleted category");
    }

    const updates: any = {};

    if (name !== undefined) {
      updates.name = name;
      // Note: Updating path requires updating all children - complex operation
      // For now, just update name, not path
    }

    if (isActive !== undefined) {
      updates.isActive = isActive;
    }

    await ctx.db.patch(id, updates);

    // Log audit for category update
    await logCRUDAction(ctx, {
      organizationId: category.organizationId,
      action: "UPDATE",
      entityType: "categories",
      entityId: id,
      oldValue: { name: category.name },
      newValue: updates,
      notes: `Updated category "${category.name}"`,
    });

    return id;
  },
});

/**
 * DELETE - Soft delete a category
 * Permission required: categories:delete
 * Note: This marks category as deleted, doesn't remove from DB
 */
export const remove = mutation({
  args: {
    id: v.id("categories"),
  },
  handler: async (ctx, args) => {
    // TODO: Add permission check

    const category = await ctx.db.get(args.id);
    if (!category) {
      throw new Error("Category not found");
    }

    // Check if category has products
    const hasProducts = await ctx.db
      .query("products")
      .withIndex("categoryId", (q) => q.eq("categoryId", args.id))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .first();

    if (hasProducts) {
      throw new Error(
        "Cannot delete category that has products. Remove products first.",
      );
    }

    // Soft delete
    await ctx.db.patch(args.id, {
      isDeleted: true,
      deletedAt: Date.now(),
    });

    // Log audit for category deletion
    await logCRUDAction(ctx, {
      organizationId: category.organizationId,
      action: "DELETE",
      entityType: "categories",
      entityId: args.id,
      oldValue: { name: category.name, path: category.path },
      notes: `Deleted category "${category.name}"`,
    });

    return args.id;
  },
});

/**
 * SEARCH - Search categories by name
 */
export const search = query({
  args: {
    organizationId: v.id("organizations"),
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { organizationId, searchTerm, limit = 20 } = args;

    const categories = await ctx.db
      .query("categories")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", organizationId),
      )
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    // Simple case-insensitive search
    const filtered = categories
      .filter((cat) =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      .slice(0, limit);

    return filtered;
  },
});
