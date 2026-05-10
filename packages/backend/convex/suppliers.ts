/**
 * SUPPLIERS API - UC2
 *
 * WHO CAN USE:
 * ✅ Warehouse Manager - full CRUD
 * ✅ Purchasing Manager - full CRUD
 * ✅ Admin - full CRUD
 * ⚠️ Staff - read only
 *
 * NOTES:
 * - Suppliers provide products to the warehouse
 * - Track lead time for purchase order planning
 * - Soft delete supported (isDeleted flag)
 *
 * BEST PRACTICES:
 * - Email validation on create/update
 * - Phone number formatting
 * - Pagination for large supplier lists
 * - Search by name, email, or contact person
 */

import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { logCRUDAction } from "./audit";

/**
 * LIST - Get all suppliers with pagination and filters
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
      .query("suppliers")
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

    const suppliers = await queryBuilder.order("desc").paginate(paginationOpts);

    return suppliers;
  },
});

/**
 * GET - Get a single supplier by ID with full details
 */
export const get = query({
  args: {
    id: v.id("suppliers"),
  },
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get(args.id);

    if (!supplier) {
      throw new Error("Supplier not found");
    }

    if (supplier.isDeleted) {
      throw new Error("Supplier has been deleted");
    }

    return supplier;
  },
});

/**
 * GET WITH STATS - Get supplier with purchase order statistics
 */
export const getWithStats = query({
  args: {
    id: v.id("suppliers"),
  },
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get(args.id);

    if (!supplier) {
      throw new Error("Supplier not found");
    }

    if (supplier.isDeleted) {
      throw new Error("Supplier has been deleted");
    }

    // Get purchase order count
    const purchaseOrders = await ctx.db
      .query("purchase_orders")
      .withIndex("supplierId", (q) => q.eq("supplierId", args.id))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    return {
      ...supplier,
      stats: {
        totalPurchaseOrders: purchaseOrders.length,
        // Could add more stats: total amount, average lead time, etc.
      },
    };
  },
});

/**
 * CREATE - Create a new supplier
 * Permission required: suppliers:create
 */
export const create = mutation({
  args: {
    brandId: v.id("brands"),
    organizationId: v.id("organizations"),
    name: v.string(),
    contactPerson: v.string(),
    email: v.string(),
    phone: v.string(),
    defaultLeadTimeDays: v.number(),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // TODO: Add permission check
    // const identity = await ctx.auth.getUserIdentity();

    const {
      brandId,
      organizationId,
      name,
      contactPerson,
      email,
      phone,
      defaultLeadTimeDays,
      isActive = true,
    } = args;

    // Basic email validation
    if (!email.includes("@")) {
      throw new Error("Invalid email format");
    }

    // Check if supplier with same name already exists
    const existing = await ctx.db
      .query("suppliers")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", organizationId),
      )
      .filter((q) => q.eq(q.field("name"), name))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .first();

    if (existing) {
      throw new Error("Supplier with this name already exists");
    }

    // Check if email already exists
    const existingEmail = await ctx.db
      .query("suppliers")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", organizationId),
      )
      .filter((q) => q.eq(q.field("email"), email))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .first();

    if (existingEmail) {
      throw new Error("Supplier with this email already exists");
    }

    // Validate lead time
    if (defaultLeadTimeDays < 0) {
      throw new Error("Lead time must be a positive number");
    }

    const supplierId = await ctx.db.insert("suppliers", {
      brandId,
      organizationId,
      name,
      contactPerson,
      email,
      phone,
      defaultLeadTimeDays,
      isActive,
      isDeleted: false,
    });

    // Log audit for supplier creation
    await logCRUDAction(ctx, {
      organizationId,
      action: "CREATE",
      entityType: "suppliers",
      entityId: supplierId,
      newValue: { name, email, contactPerson },
      notes: `Created supplier "${name}"`,
    });

    return supplierId;
  },
});

/**
 * UPDATE - Update an existing supplier
 * Permission required: suppliers:update
 */
export const update = mutation({
  args: {
    id: v.id("suppliers"),
    name: v.optional(v.string()),
    contactPerson: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    defaultLeadTimeDays: v.optional(v.number()),
    brandId: v.optional(v.id("brands")),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // TODO: Add permission check

    const { id, email, name, defaultLeadTimeDays, brandId, ...otherUpdates } = args;

    const supplier = await ctx.db.get(id);
    if (!supplier) {
      throw new Error("Supplier not found");
    }

    if (supplier.isDeleted) {
      throw new Error("Cannot update deleted supplier");
    }

    const updates: any = { ...otherUpdates };

    // Validate email if updating
    if (email !== undefined) {
      if (!email.includes("@")) {
        throw new Error("Invalid email format");
      }

      // Check email uniqueness
      if (email !== supplier.email) {
        const existingEmail = await ctx.db
          .query("suppliers")
          .withIndex("organizationId", (q) =>
            q.eq("organizationId", supplier.organizationId),
          )
          .filter((q) => q.eq(q.field("email"), email))
          .filter((q) => q.eq(q.field("isDeleted"), false))
          .first();

        if (existingEmail) {
          throw new Error("Supplier with this email already exists");
        }
      }

      updates.email = email;
    }

    // Check name uniqueness if updating
    if (name !== undefined && name !== supplier.name) {
      const existingName = await ctx.db
        .query("suppliers")
        .withIndex("organizationId", (q) =>
          q.eq("organizationId", supplier.organizationId),
        )
        .filter((q) => q.eq(q.field("name"), name))
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .first();

      if (existingName) {
        throw new Error("Supplier with this name already exists");
      }

      updates.name = name;
    }

    // Validate lead time if updating
    if (defaultLeadTimeDays !== undefined) {
      if (defaultLeadTimeDays < 0) {
        throw new Error("Lead time must be a positive number");
      }
      updates.defaultLeadTimeDays = defaultLeadTimeDays;
    }

    // Validate brandId if updating
    if (brandId !== undefined) {
      const brand = await ctx.db.get(brandId);
      if (!brand) {
        throw new Error("Brand not found");
      }
      updates.brandId = brandId;
    }

    await ctx.db.patch(id, updates);

    // Log audit for supplier update
    await logCRUDAction(ctx, {
      organizationId: supplier.organizationId,
      action: "UPDATE",
      entityType: "suppliers",
      entityId: id,
      oldValue: { name: supplier.name, email: supplier.email },
      newValue: updates,
      notes: `Updated supplier "${supplier.name}"`,
    });

    return id;
  },
});

/**
 * DELETE - Soft delete a supplier
 * Permission required: suppliers:delete
 */
export const remove = mutation({
  args: {
    id: v.id("suppliers"),
  },
  handler: async (ctx, args) => {
    // TODO: Add permission check

    const supplier = await ctx.db.get(args.id);
    if (!supplier) {
      throw new Error("Supplier not found");
    }

    // Check if supplier has active purchase orders
    const activePurchaseOrders = await ctx.db
      .query("purchase_orders")
      .withIndex("supplierId", (q) => q.eq("supplierId", args.id))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .first();

    if (activePurchaseOrders) {
      throw new Error(
        "Cannot delete supplier with active purchase orders. Complete or cancel orders first.",
      );
    }

    // Soft delete
    await ctx.db.patch(args.id, {
      isDeleted: true,
      deletedAt: Date.now(),
    });

    // Log audit for supplier deletion
    await logCRUDAction(ctx, {
      organizationId: supplier.organizationId,
      action: "DELETE",
      entityType: "suppliers",
      entityId: args.id,
      oldValue: { name: supplier.name, email: supplier.email },
      notes: `Deleted supplier "${supplier.name}"`,
    });

    return args.id;
  },
});

/**
 * SEARCH - Search suppliers by name, email, or contact person
 */
export const search = query({
  args: {
    organizationId: v.id("organizations"),
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { organizationId, searchTerm, limit = 20 } = args;

    const suppliers = await ctx.db
      .query("suppliers")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", organizationId),
      )
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    // Search in name, email, and contact person (case-insensitive)
    const searchLower = searchTerm.toLowerCase();
    const filtered = suppliers
      .filter(
        (supplier) =>
          supplier.name.toLowerCase().includes(searchLower) ||
          supplier.email.toLowerCase().includes(searchLower) ||
          supplier.contactPerson.toLowerCase().includes(searchLower),
      )
      .slice(0, limit);

    return filtered;
  },
});

/**
 * GET ACTIVE - Get only active suppliers (for dropdowns, etc.)
 * Returns suppliers enriched with brand names
 */
export const getActive = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const suppliers = await ctx.db
      .query("suppliers")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    // Enrich with brand information
    const brandIds = [...new Set(suppliers.map(s => s.brandId))];
    const brands = await Promise.all(
      brandIds.map(async (brandId) => {
        const brand = await ctx.db.get(brandId);
        // console.log(`Raw brand from DB for ID ${brandId}:`, JSON.stringify(brand, null, 2));
        return { id: brandId, brand };
      })
    );
    const brandMap = new Map(brands.map(b => [b.id, b.brand]));

    const enrichedSuppliers = suppliers.map((supplier) => {
      const brand = brandMap.get(supplier.brandId);
      const brandName = brand?.name || "";
      // console.log(`Supplier: ${supplier.name}, BrandId: ${supplier.brandId}, Brand Name: "${brandName}", Brand Object:`, JSON.stringify(brand, null, 2));
      return {
        ...supplier,
        brandName,
      };
    });

    return enrichedSuppliers;
  },
});
