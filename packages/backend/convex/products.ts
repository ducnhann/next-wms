/**
 * PRODUCTS API - UC2
 *
 * WHO CAN USE:
 * ✅ Warehouse Manager - full CRUD
 * ✅ Inventory Manager - full CRUD
 * ✅ Admin - full CRUD
 * ⚠️ Staff - read only
 *
 * NOTES:
 * - Products have variants (SKU level)
 * - Each variant can have multiple barcodes
 * - Product belongs to a category and brand
 * - Soft delete supported
 *
 * BEST PRACTICES:
 * - Always include variants when creating products
 * - Use pagination for product lists
 * - Search across product name, SKU, and barcode
 * - Track reorder points for inventory management
 */

import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { logCRUDAction } from "./audit";

// ============================================================================
// PRODUCT QUERIES
// ============================================================================

/**
 * LIST - Get all products with pagination and filters
 */
export const list = query({
  args: {
    organizationId: v.id("organizations"),
    paginationOpts: paginationOptsValidator,
    categoryId: v.optional(v.id("categories")),
    brandId: v.optional(v.id("brands")),
    isActive: v.optional(v.boolean()),
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const {
      organizationId,
      paginationOpts,
      categoryId,
      brandId,
      isActive,
      includeDeleted = false,
    } = args;

    let queryBuilder = ctx.db
      .query("products")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", organizationId),
      );

    // Apply filters
    if (categoryId) {
      queryBuilder = queryBuilder.filter((q) =>
        q.eq(q.field("categoryId"), categoryId),
      );
    }

    if (brandId) {
      queryBuilder = queryBuilder.filter((q) =>
        q.eq(q.field("brandId"), brandId),
      );
    }

    if (isActive !== undefined) {
      queryBuilder = queryBuilder.filter((q) =>
        q.eq(q.field("isActive"), isActive),
      );
    }

    if (!includeDeleted) {
      queryBuilder = queryBuilder.filter((q) =>
        q.eq(q.field("isDeleted"), false),
      );
    }

    const products = await queryBuilder.order("desc").paginate(paginationOpts);

    return products;
  },
});

/**
 * LIST WITH DETAILS - Get all products with category, brand, variants info (no pagination)
 */
export const listWithDetails = query({
  args: {
    organizationId: v.id("organizations"),
    categoryId: v.optional(v.id("categories")),
    brandId: v.optional(v.id("brands")),
    isActive: v.optional(v.boolean()),
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const {
      organizationId,
      categoryId,
      brandId,
      isActive,
      includeDeleted = false,
    } = args;

    let queryBuilder = ctx.db
      .query("products")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", organizationId),
      );

    // Apply filters
    if (categoryId) {
      queryBuilder = queryBuilder.filter((q) =>
        q.eq(q.field("categoryId"), categoryId),
      );
    }

    if (brandId) {
      queryBuilder = queryBuilder.filter((q) =>
        q.eq(q.field("brandId"), brandId),
      );
    }

    if (isActive !== undefined) {
      queryBuilder = queryBuilder.filter((q) =>
        q.eq(q.field("isActive"), isActive),
      );
    }

    if (!includeDeleted) {
      queryBuilder = queryBuilder.filter((q) =>
        q.eq(q.field("isDeleted"), false),
      );
    }

    const products = await queryBuilder.order("desc").collect();

    // Enrich products with related data
    const enrichedProducts = await Promise.all(
      products.map(async (product) => {
        // Get category
        const category = await ctx.db.get(product.categoryId);

        // Get brand
        const brand = await ctx.db.get(product.brandId);

        // Get storage requirement type
        const storageRequirement = await ctx.db.get(
          product.storageRequirementTypeId,
        );

        // Get tracking method type
        const trackingMethod = await ctx.db.get(product.trackingMethodTypeId);

        // Get variants with barcodes
        const variants = await ctx.db
          .query("product_variants")
          .withIndex("productId", (q) => q.eq("productId", product._id))
          .filter((q) => q.eq(q.field("isDeleted"), false))
          .collect();

        const variantsWithDetails = await Promise.all(
          variants.map(async (variant) => {
            // Get barcodes
            const barcodes = await ctx.db
              .query("product_barcodes")
              .withIndex("skuId", (q) => q.eq("skuId", variant._id))
              .collect();

            // Get unit of measure
            const unitOfMeasure = await ctx.db.get(variant.unitOfMeasureId);

            return {
              ...variant,
              barcodes,
              unitOfMeasure: unitOfMeasure
                ? {
                    _id: unitOfMeasure._id,
                    lookupValue: unitOfMeasure.lookupValue,
                    lookupCode: unitOfMeasure.lookupCode,
                  }
                : null,
            };
          }),
        );

        return {
          ...product,
          category: category
            ? {
                _id: category._id,
                name: category.name,
                path: category.path,
              }
            : null,
          brand: brand
            ? {
                _id: brand._id,
                name: brand.name,
              }
            : null,
          storageRequirement: storageRequirement
            ? {
                _id: storageRequirement._id,
                lookupValue: storageRequirement.lookupValue,
                lookupCode: storageRequirement.lookupCode,
              }
            : null,
          trackingMethod: trackingMethod
            ? {
                _id: trackingMethod._id,
                lookupValue: trackingMethod.lookupValue,
                lookupCode: trackingMethod.lookupCode,
              }
            : null,
          variants: variantsWithDetails,
        };
      }),
    );

    return enrichedProducts;
  },
});

/**
 * GET - Get a single product by ID
 */
export const get = query({
  args: {
    id: v.id("products"),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);

    if (!product) {
      throw new Error("Product not found");
    }

    if (product.isDeleted) {
      throw new Error("Product has been deleted");
    }

    return product;
  },
});

/**
 * GET WITH DETAILS - Get product with category, brand, and variants
 */
export const getWithDetails = query({
  args: {
    id: v.id("products"),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);

    if (!product) {
      throw new Error("Product not found");
    }

    if (product.isDeleted) {
      throw new Error("Product has been deleted");
    }

    // Get category
    const category = await ctx.db.get(product.categoryId);

    // Get brand
    const brand = await ctx.db.get(product.brandId);

    // Get variants
    const variants = await ctx.db
      .query("product_variants")
      .withIndex("productId", (q) => q.eq("productId", args.id))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    // Get barcodes for each variant
    const variantsWithBarcodes = await Promise.all(
      variants.map(async (variant) => {
        const barcodes = await ctx.db
          .query("product_barcodes")
          .withIndex("skuId", (q) => q.eq("skuId", variant._id))
          .collect();
        return { ...variant, barcodes };
      }),
    );

    return {
      ...product,
      category,
      brand,
      variants: variantsWithBarcodes,
    };
  },
});

/**
 * SEARCH - Search products by name or SKU
 */
export const search = query({
  args: {
    organizationId: v.id("organizations"),
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { organizationId, searchTerm, limit = 20 } = args;

    // Search in products
    const products = await ctx.db
      .query("products")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", organizationId),
      )
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    const searchLower = searchTerm.toLowerCase();
    const matchedProducts = products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchLower) ||
        product.description.toLowerCase().includes(searchLower),
    );

    // Search in variants (by SKU)
    const variants = await ctx.db.query("product_variants").collect();
    const matchedVariants = variants.filter(
      (variant) =>
        variant.skuCode.toLowerCase().includes(searchLower) &&
        !variant.isDeleted,
    );

    // Get products from matched variants
    const productIdsFromVariants = new Set(
      matchedVariants.map((v) => v.productId),
    );
    const productsFromVariants = products.filter((p) =>
      productIdsFromVariants.has(p._id),
    );

    // Combine and deduplicate
    const allMatched = [...matchedProducts, ...productsFromVariants];
    const uniqueProducts = Array.from(
      new Map(allMatched.map((p) => [p._id, p])).values(),
    ).slice(0, limit);

    return uniqueProducts;
  },
});

/**
 * SEARCH BY BARCODE - Find product by barcode value
 */
export const searchByBarcode = query({
  args: {
    barcodeValue: v.string(),
  },
  handler: async (ctx, args) => {
    const barcode = await ctx.db
      .query("product_barcodes")
      .withIndex("barcodeValue", (q) => q.eq("barcodeValue", args.barcodeValue))
      .first();

    if (!barcode) {
      return null;
    }

    // Get variant
    const variant = await ctx.db.get(barcode.skuId);
    if (!variant || variant.isDeleted) {
      return null;
    }

    // Get product
    const product = await ctx.db.get(variant.productId);
    if (!product || product.isDeleted) {
      return null;
    }

    return {
      product,
      variant,
      barcode,
    };
  },
});

// ============================================================================
// PRODUCT MUTATIONS
// ============================================================================

/**
 * CREATE - Create a new product with variants
 * Permission required: products:create
 */
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.string(),
    categoryId: v.id("categories"),
    brandId: v.id("brands"),
    storageRequirementTypeId: v.id("system_lookups"),
    trackingMethodTypeId: v.id("system_lookups"),
    shelfLifeDays: v.optional(v.number()),
    reorderPoint: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // TODO: Add permission check
    // const identity = await ctx.auth.getUserIdentity();

    const {
      organizationId,
      name,
      description,
      categoryId,
      brandId,
      storageRequirementTypeId,
      trackingMethodTypeId,
      shelfLifeDays,
      reorderPoint,
      isActive = true,
    } = args;

    // Validate category exists
    const category = await ctx.db.get(categoryId);
    if (!category || category.isDeleted) {
      throw new Error("Category not found or deleted");
    }

    // Validate brand exists
    const brand = await ctx.db.get(brandId);
    if (!brand) {
      throw new Error("Brand not found");
    }

    // Check duplicate name
    const existing = await ctx.db
      .query("products")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", organizationId),
      )
      .filter((q) => q.eq(q.field("name"), name))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .first();

    if (existing) {
      throw new Error("Product with this name already exists");
    }

    const productId = await ctx.db.insert("products", {
      organizationId,
      name,
      description,
      categoryId,
      brandId,
      storageRequirementTypeId,
      trackingMethodTypeId,
      shelfLifeDays,
      reorderPoint,
      reorderPointOverride: undefined,
      isActive,
      isDeleted: false,
    });

    // Log audit for product creation
    await logCRUDAction(ctx, {
      organizationId,
      action: "CREATE",
      entityType: "products",
      entityId: productId,
      newValue: { name, categoryId, brandId },
      notes: `Created product "${name}"`,
    });

    return productId;
  },
});

/**
 * UPDATE - Update an existing product
 * Permission required: products:update
 */
export const update = mutation({
  args: {
    id: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    brandId: v.optional(v.id("brands")),
    storageRequirementTypeId: v.optional(v.id("system_lookups")),
    trackingMethodTypeId: v.optional(v.id("system_lookups")),
    shelfLifeDays: v.optional(v.number()),
    reorderPoint: v.optional(v.number()),
    reorderPointOverride: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // TODO: Add permission check

    const { id, name, categoryId, brandId, ...otherUpdates } = args;

    const product = await ctx.db.get(id);
    if (!product) {
      throw new Error("Product not found");
    }

    if (product.isDeleted) {
      throw new Error("Cannot update deleted product");
    }

    const updates: any = { ...otherUpdates };

    // Check name uniqueness if updating
    if (name !== undefined && name !== product.name) {
      const existing = await ctx.db
        .query("products")
        .withIndex("organizationId", (q) =>
          q.eq("organizationId", product.organizationId),
        )
        .filter((q) => q.eq(q.field("name"), name))
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .first();

      if (existing) {
        throw new Error("Product with this name already exists");
      }

      updates.name = name;
    }

    // Validate category if updating
    if (categoryId !== undefined) {
      const category = await ctx.db.get(categoryId);
      if (!category || category.isDeleted) {
        throw new Error("Category not found or deleted");
      }
      updates.categoryId = categoryId;
    }

    // Validate brand if updating
    if (brandId !== undefined) {
      const brand = await ctx.db.get(brandId);
      if (!brand) {
        throw new Error("Brand not found");
      }
      updates.brandId = brandId;
    }

    await ctx.db.patch(id, updates);

    // Log audit for product update
    await logCRUDAction(ctx, {
      organizationId: product.organizationId,
      action: "UPDATE",
      entityType: "products",
      entityId: id,
      oldValue: { name: product.name },
      newValue: updates,
      notes: `Updated product "${product.name}"`,
    });

    return id;
  },
});

/**
 * DELETE - Soft delete a product
 * Permission required: products:delete
 */
export const remove = mutation({
  args: {
    id: v.id("products"),
  },
  handler: async (ctx, args) => {
    // TODO: Add permission check

    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new Error("Product not found");
    }

    // Soft delete product
    await ctx.db.patch(args.id, {
      isDeleted: true,
      deletedAt: Date.now(),
    });

    // Also soft delete all variants
    const variants = await ctx.db
      .query("product_variants")
      .withIndex("productId", (q) => q.eq("productId", args.id))
      .collect();

    for (const variant of variants) {
      await ctx.db.patch(variant._id, {
        isDeleted: true,
        deletedAt: Date.now(),
      });
    }

    // Log audit for product deletion
    await logCRUDAction(ctx, {
      organizationId: product.organizationId,
      action: "DELETE",
      entityType: "products",
      entityId: args.id,
      oldValue: { name: product.name, variantCount: variants.length },
      notes: `Deleted product "${product.name}" and ${variants.length} variants`,
    });

    return args.id;
  },
});

// ============================================================================
// PRODUCT VARIANT QUERIES & MUTATIONS
// ============================================================================

/**
 * GET VARIANTS - Get all variants of a product
 */
export const getVariants = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const variants = await ctx.db
      .query("product_variants")
      .withIndex("productId", (q) => q.eq("productId", args.productId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    return variants;
  },
});

/**
 * CREATE WITH VARIANTS - Create a product with multiple variants at once
 * Used for Excel import and bulk product creation
 */
export const createWithVariants = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.string(),
    categoryId: v.id("categories"),
    brandId: v.id("brands"),
    storageRequirementTypeId: v.id("system_lookups"),
    trackingMethodTypeId: v.id("system_lookups"),
    shelfLifeDays: v.optional(v.number()),
    reorderPoint: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    variants: v.array(
      v.object({
        skuCode: v.string(),
        description: v.string(),
        costPrice: v.number(),
        sellingPrice: v.number(),
        unitOfMeasureId: v.id("system_lookups"),
        weightKg: v.optional(v.number()),
        volumeM3: v.optional(v.number()),
        temperatureSensitive: v.optional(v.boolean()),
        stackingLimit: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
        barcodes: v.optional(
          v.array(
            v.object({
              barcodeTypeId: v.id("system_lookups"),
              barcodeValue: v.string(),
            }),
          ),
        ),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const {
      organizationId,
      name,
      description,
      categoryId,
      brandId,
      storageRequirementTypeId,
      trackingMethodTypeId,
      shelfLifeDays,
      reorderPoint,
      isActive = true,
      variants,
    } = args;

    // Validate category exists
    const category = await ctx.db.get(categoryId);
    if (!category || category.isDeleted) {
      throw new Error("Category not found or deleted");
    }

    // Validate brand exists
    const brand = await ctx.db.get(brandId);
    if (!brand) {
      throw new Error("Brand not found");
    }

    // Check duplicate product name
    const existingProduct = await ctx.db
      .query("products")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", organizationId),
      )
      .filter((q) => q.eq(q.field("name"), name))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .first();

    if (existingProduct) {
      throw new Error("Product with this name already exists");
    }

    // Check duplicate SKU codes
    for (const variant of variants) {
      const existingSku = await ctx.db
        .query("product_variants")
        .withIndex("skuCode", (q) => q.eq("skuCode", variant.skuCode))
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .first();

      if (existingSku) {
        throw new Error(`SKU "${variant.skuCode}" already exists`);
      }
    }

    // Create product
    const productId = await ctx.db.insert("products", {
      organizationId,
      name,
      description,
      categoryId,
      brandId,
      storageRequirementTypeId,
      trackingMethodTypeId,
      shelfLifeDays,
      reorderPoint,
      reorderPointOverride: undefined,
      isActive,
      isDeleted: false,
    });

    // Create variants
    const variantIds: Id<"product_variants">[] = [];
    for (const variant of variants) {
      const variantId = await ctx.db.insert("product_variants", {
        productId,
        skuCode: variant.skuCode,
        description: variant.description,
        costPrice: variant.costPrice,
        sellingPrice: variant.sellingPrice,
        unitOfMeasureId: variant.unitOfMeasureId,
        weightKg: variant.weightKg,
        volumeM3: variant.volumeM3,
        temperatureSensitive: variant.temperatureSensitive ?? false,
        stackingLimit: variant.stackingLimit,
        customFields: undefined,
        isActive: variant.isActive ?? true,
        isDeleted: false,
      });

      variantIds.push(variantId);

      // Create barcodes if provided
      if (variant.barcodes) {
        for (const barcode of variant.barcodes) {
          await ctx.db.insert("product_barcodes", {
            skuId: variantId,
            barcodeTypeId: barcode.barcodeTypeId,
            barcodeValue: barcode.barcodeValue,
          });
        }
      }
    }

    return { productId, variantIds };
  },
});

/**
 * CREATE VARIANT - Add a new variant to a product
 * Permission required: products:create
 */
export const createVariant = mutation({
  args: {
    productId: v.id("products"),
    skuCode: v.string(),
    description: v.string(),
    costPrice: v.number(),
    sellingPrice: v.number(),
    unitOfMeasureId: v.id("system_lookups"),
    weightKg: v.optional(v.number()),
    volumeM3: v.optional(v.number()),
    temperatureSensitive: v.optional(v.boolean()),
    stackingLimit: v.optional(v.number()),
    customFields: v.optional(v.any()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // TODO: Add permission check

    const {
      productId,
      skuCode,
      temperatureSensitive = false,
      isActive = true,
      ...rest
    } = args;

    // Validate product exists
    const product = await ctx.db.get(productId);
    if (!product || product.isDeleted) {
      throw new Error("Product not found or deleted");
    }

    // Check SKU uniqueness
    const existing = await ctx.db
      .query("product_variants")
      .withIndex("skuCode", (q) => q.eq("skuCode", skuCode))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .first();

    if (existing) {
      throw new Error("SKU code already exists");
    }

    const variantId = await ctx.db.insert("product_variants", {
      productId,
      skuCode,
      temperatureSensitive,
      isActive,
      isDeleted: false,
      ...rest,
    });

    return variantId;
  },
});

/**
 * UPDATE VARIANT - Update a product variant
 */
export const updateVariant = mutation({
  args: {
    id: v.id("product_variants"),
    skuCode: v.optional(v.string()),
    description: v.optional(v.string()),
    costPrice: v.optional(v.number()),
    sellingPrice: v.optional(v.number()),
    unitOfMeasureId: v.optional(v.id("system_lookups")),
    weightKg: v.optional(v.number()),
    volumeM3: v.optional(v.number()),
    temperatureSensitive: v.optional(v.boolean()),
    stackingLimit: v.optional(v.number()),
    customFields: v.optional(v.any()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, skuCode, ...otherUpdates } = args;

    const variant = await ctx.db.get(id);
    if (!variant) {
      throw new Error("Variant not found");
    }

    if (variant.isDeleted) {
      throw new Error("Cannot update deleted variant");
    }

    const updates: any = { ...otherUpdates };

    // Check SKU uniqueness if updating
    if (skuCode !== undefined && skuCode !== variant.skuCode) {
      const existing = await ctx.db
        .query("product_variants")
        .withIndex("skuCode", (q) => q.eq("skuCode", skuCode))
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .first();

      if (existing) {
        throw new Error("SKU code already exists");
      }

      updates.skuCode = skuCode;
    }

    await ctx.db.patch(id, updates);

    return id;
  },
});

/**
 * DELETE VARIANT - Soft delete a variant
 */
export const removeVariant = mutation({
  args: {
    id: v.id("product_variants"),
  },
  handler: async (ctx, args) => {
    const variant = await ctx.db.get(args.id);
    if (!variant) {
      throw new Error("Variant not found");
    }

    await ctx.db.patch(args.id, {
      isDeleted: true,
      deletedAt: Date.now(),
    });

    return args.id;
  },
});

// ============================================================================
// BARCODE MANAGEMENT
// ============================================================================

/**
 * ADD BARCODE - Add a barcode to a variant
 */
export const addBarcode = mutation({
  args: {
    skuId: v.id("product_variants"),
    barcodeTypeId: v.optional(v.id("system_lookups")),
    barcodeValue: v.string(),
  },
  handler: async (ctx, args) => {
    const { skuId, barcodeValue } = args;
    let { barcodeTypeId } = args;

    // Validate variant exists
    const variant = await ctx.db.get(skuId);
    if (!variant || variant.isDeleted) {
      throw new Error("Variant not found or deleted");
    }

    // If barcodeTypeId not provided, get default (EAN13)
    if (!barcodeTypeId) {
      const defaultBarcodeType = await ctx.db
        .query("system_lookups")
        .withIndex("lookupType", (q) => q.eq("lookupType", "BarcodeType"))
        .filter((q) => q.eq(q.field("lookupCode"), "EAN13"))
        .first();

      if (!defaultBarcodeType) {
        // Fallback: get any barcode type
        const anyBarcodeType = await ctx.db
          .query("system_lookups")
          .withIndex("lookupType", (q) => q.eq("lookupType", "BarcodeType"))
          .first();

        if (!anyBarcodeType) {
          throw new Error("No barcode type found in system. Please seed system lookups first.");
        }
        barcodeTypeId = anyBarcodeType._id;
      } else {
        barcodeTypeId = defaultBarcodeType._id;
      }
    }

    // Check barcode uniqueness
    const existing = await ctx.db
      .query("product_barcodes")
      .withIndex("barcodeValue", (q) => q.eq("barcodeValue", barcodeValue))
      .first();

    if (existing) {
      throw new Error("Barcode already exists");
    }

    const barcodeId = await ctx.db.insert("product_barcodes", {
      skuId,
      barcodeTypeId,
      barcodeValue,
    });

    return barcodeId;
  },
});

/**
 * REMOVE BARCODE - Delete a barcode
 */
export const removeBarcode = mutation({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id as Id<"product_barcodes">);
    return args.id;
  },
});

/**
 * GET BARCODES - Get all barcodes for a variant
 */
export const getBarcodes = query({
  args: {
    skuId: v.id("product_variants"),
  },
  handler: async (ctx, args) => {
    const barcodes = await ctx.db
      .query("product_barcodes")
      .withIndex("skuId", (q) => q.eq("skuId", args.skuId))
      .collect();

    return barcodes;
  },
});

// ============================================================================
// PRODUCT INVENTORY QUERIES (For Inventory > Products page)
// ============================================================================

/**
 * GET PRODUCT INVENTORY STATS - Get statistics for product inventory dashboard
 */
export const getProductInventoryStats = query({
  args: {
    organizationId: v.id("organizations"),
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    const { organizationId, branchId } = args;

    // Get all active products for this organization
    const products = await ctx.db
      .query("products")
      .withIndex("organizationId", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    // Get all variants for these products
    const productIds = products.map((p) => p._id);
    const allVariants = await ctx.db
      .query("product_variants")
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();
    const variants = allVariants.filter((v) => productIds.includes(v.productId));

    // Get inventory batches (filter by branch if provided)
    let batchesQuery = ctx.db
      .query("inventory_batches")
      .withIndex("organizationId", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("isDeleted"), false));
    
    const allBatches = await batchesQuery.collect();
    const batches = branchId 
      ? allBatches.filter((b) => b.branchId === branchId)
      : allBatches;

    // Calculate stats
    const totalProducts = products.length;
    const totalVariants = variants.length;
    const totalBatches = batches.length;
    const totalQuantity = batches.reduce((sum, b) => sum + b.quantity, 0);
    
    // Low stock products (quantity <= reorder point)
    const variantQuantities = new Map<string, number>();
    for (const batch of batches) {
      const current = variantQuantities.get(batch.skuId) ?? 0;
      variantQuantities.set(batch.skuId, current + batch.quantity);
    }

    let lowStockCount = 0;
    let outOfStockCount = 0;
    for (const variant of variants) {
      const qty = variantQuantities.get(variant._id) ?? 0;
      const product = products.find((p) => p._id === variant.productId);
      const reorderPoint = product?.reorderPointOverride ?? product?.reorderPoint ?? 10;
      
      if (qty === 0) {
        outOfStockCount++;
      } else if (qty <= reorderPoint) {
        lowStockCount++;
      }
    }

    // Expiring soon (within 30 days)
    const thirtyDaysFromNow = Date.now() + 30 * 24 * 60 * 60 * 1000;
    const expiringSoon = batches.filter(
      (b) => b.expiresAt && b.expiresAt <= thirtyDaysFromNow && b.quantity > 0
    ).length;

    return {
      totalProducts,
      totalVariants,
      totalBatches,
      totalQuantity,
      lowStockCount,
      outOfStockCount,
      expiringSoon,
    };
  },
});

/**
 * GET PRODUCT INVENTORY LIST - Get detailed product inventory data for table display
 */
export const getProductInventoryList = query({
  args: {
    organizationId: v.id("organizations"),
    branchId: v.optional(v.id("branches")),
    categoryId: v.optional(v.id("categories")),
    brandId: v.optional(v.id("brands")),
    stockStatus: v.optional(v.union(v.literal("all"), v.literal("in_stock"), v.literal("low_stock"), v.literal("out_of_stock"))),
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId, branchId, categoryId, brandId, stockStatus, searchTerm } = args;

    // Get all active products for this organization
    let productsQuery = ctx.db
      .query("products")
      .withIndex("organizationId", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("isDeleted"), false));

    let products = await productsQuery.collect();

    // Apply category filter
    if (categoryId) {
      products = products.filter((p) => p.categoryId === categoryId);
    }

    // Apply brand filter
    if (brandId) {
      products = products.filter((p) => p.brandId === brandId);
    }

    // Get all categories and brands for display
    const categories = await ctx.db
      .query("categories")
      .withIndex("organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();
    const categoryMap = new Map(categories.map((c) => [c._id, c]));

    const brands = await ctx.db
      .query("brands")
      .withIndex("organizationId", (q) => q.eq("organizationId", organizationId as string))
      .collect();
    const brandMap = new Map(brands.map((b) => [b._id, b]));

    // Get all variants
    const allVariants = await ctx.db
      .query("product_variants")
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    // Get inventory batches
    let batches = await ctx.db
      .query("inventory_batches")
      .withIndex("organizationId", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    if (branchId) {
      batches = batches.filter((b) => b.branchId === branchId);
    }

    // Get storage zones for location info
    const zones = await ctx.db.query("storage_zones").collect();
    const zoneMap = new Map(zones.map((z) => [z._id, z]));

    // Get branches for display
    const branches = await ctx.db
      .query("branches")
      .withIndex("organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();
    const branchMap = new Map(branches.map((b) => [b._id, b]));

    // Build product inventory list
    const productInventoryList = [];

    for (const product of products) {
      const variants = allVariants.filter((v) => v.productId === product._id);
      const category = categoryMap.get(product.categoryId);
      const brand = brandMap.get(product.brandId);

      // Calculate total quantity across all variants and batches
      let totalQuantity = 0;
      let totalBatchCount = 0;
      const variantDetails: Array<{
        variantId: string;
        skuCode: string;
        description: string;
        quantity: number;
        batchCount: number;
        costPrice: number;
        sellingPrice: number;
        locations: string[];
      }> = [];

      for (const variant of variants) {
        const variantBatches = batches.filter((b) => b.skuId === variant._id);
        const variantQty = variantBatches.reduce((sum, b) => sum + b.quantity, 0);
        totalQuantity += variantQty;
        totalBatchCount += variantBatches.length;

        // Get unique locations for this variant
        const locationSet = new Set<string>();
        for (const batch of variantBatches) {
          const zone = zoneMap.get(batch.zoneId);
          if (zone) {
            locationSet.add(zone.name);
          }
        }

        variantDetails.push({
          variantId: variant._id,
          skuCode: variant.skuCode,
          description: variant.description,
          quantity: variantQty,
          batchCount: variantBatches.length,
          costPrice: variant.costPrice,
          sellingPrice: variant.sellingPrice,
          locations: Array.from(locationSet),
        });
      }

      // Determine stock status
      const reorderPoint = product.reorderPointOverride ?? product.reorderPoint ?? 10;
      let currentStockStatus: "in_stock" | "low_stock" | "out_of_stock";
      if (totalQuantity === 0) {
        currentStockStatus = "out_of_stock";
      } else if (totalQuantity <= reorderPoint) {
        currentStockStatus = "low_stock";
      } else {
        currentStockStatus = "in_stock";
      }

      // Apply stock status filter
      if (stockStatus && stockStatus !== "all" && currentStockStatus !== stockStatus) {
        continue;
      }

      // Apply search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesProduct = product.name.toLowerCase().includes(search) ||
          product.description.toLowerCase().includes(search);
        const matchesVariant = variantDetails.some(
          (v) => v.skuCode.toLowerCase().includes(search) ||
            v.description.toLowerCase().includes(search)
        );
        if (!matchesProduct && !matchesVariant) {
          continue;
        }
      }

      // Get all unique locations for this product
      const allLocations = new Set<string>();
      for (const variant of variantDetails) {
        for (const loc of variant.locations) {
          allLocations.add(loc);
        }
      }

      productInventoryList.push({
        _id: product._id,
        name: product.name,
        description: product.description,
        categoryId: product.categoryId,
        categoryName: category?.name ?? "Unknown",
        brandId: product.brandId,
        brandName: brand?.name ?? "Unknown",
        variantCount: variants.length,
        totalQuantity,
        totalBatchCount,
        reorderPoint,
        stockStatus: currentStockStatus,
        isActive: product.isActive,
        locations: Array.from(allLocations),
        variants: variantDetails,
        shelfLifeDays: product.shelfLifeDays,
      });
    }

    return productInventoryList;
  },
});

/**
 * GET PRODUCT INVENTORY DETAIL - Get detailed inventory info for a single product
 */
export const getProductInventoryDetail = query({
  args: {
    productId: v.id("products"),
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    const { productId, branchId } = args;

    const product = await ctx.db.get(productId);
    if (!product || product.isDeleted) {
      throw new Error("Product not found");
    }

    // Get category and brand
    const category = await ctx.db.get(product.categoryId);
    const brand = await ctx.db.get(product.brandId);

    // Get variants
    const variants = await ctx.db
      .query("product_variants")
      .withIndex("productId", (q) => q.eq("productId", productId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    // Get batches
    let batches = await ctx.db
      .query("inventory_batches")
      .withIndex("organizationId", (q) => q.eq("organizationId", product.organizationId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    // Filter batches for this product's variants
    const variantIds = new Set(variants.map((v) => v._id));
    batches = batches.filter((b) => variantIds.has(b.skuId));

    if (branchId) {
      batches = batches.filter((b) => b.branchId === branchId);
    }

    // Get zones and branches
    const zones = await ctx.db.query("storage_zones").collect();
    const zoneMap = new Map(zones.map((z) => [z._id, z]));

    const branches = await ctx.db
      .query("branches")
      .withIndex("organizationId", (q) => q.eq("organizationId", product.organizationId))
      .collect();
    const branchMap = new Map(branches.map((b) => [b._id, b]));

    // Get barcodes for each variant
    const barcodes = await ctx.db
      .query("product_barcodes")
      .collect();

    // Build detailed batch information
    const batchDetails = batches.map((batch) => {
      const variant = variants.find((v) => v._id === batch.skuId);
      const zone = zoneMap.get(batch.zoneId);
      const batchBranch = branchMap.get(batch.branchId);

      return {
        _id: batch._id,
        skuId: batch.skuId,
        skuCode: variant?.skuCode ?? "Unknown",
        quantity: batch.quantity,
        zoneName: zone?.name ?? "Unknown",
        zoneId: batch.zoneId,
        branchName: batchBranch?.name ?? "Unknown",
        branchId: batch.branchId,
        supplierBatchNumber: batch.supplierBatchNumber,
        internalBatchNumber: batch.internalBatchNumber,
        receivedAt: batch.receivedAt,
        manufacturingDate: batch.manufacturingDate,
        expiresAt: batch.expiresAt,
      };
    });

    // Build variant details with barcodes
    const variantDetails = variants.map((variant) => {
      const variantBarcodes = barcodes.filter((b) => b.skuId === variant._id);
      const variantBatches = batches.filter((b) => b.skuId === variant._id);
      const totalQty = variantBatches.reduce((sum, b) => sum + b.quantity, 0);

      return {
        _id: variant._id,
        skuCode: variant.skuCode,
        description: variant.description,
        costPrice: variant.costPrice,
        sellingPrice: variant.sellingPrice,
        weightKg: variant.weightKg,
        volumeM3: variant.volumeM3,
        temperatureSensitive: variant.temperatureSensitive,
        stackingLimit: variant.stackingLimit,
        isActive: variant.isActive,
        totalQuantity: totalQty,
        batchCount: variantBatches.length,
        barcodes: variantBarcodes.map((b) => b.barcodeValue),
      };
    });

    // Calculate totals
    const totalQuantity = batches.reduce((sum, b) => sum + b.quantity, 0);
    const totalValue = variantDetails.reduce(
      (sum, v) => sum + v.totalQuantity * v.costPrice,
      0
    );

    return {
      product: {
        _id: product._id,
        name: product.name,
        description: product.description,
        categoryName: category?.name ?? "Unknown",
        brandName: brand?.name ?? "Unknown",
        shelfLifeDays: product.shelfLifeDays,
        reorderPoint: product.reorderPointOverride ?? product.reorderPoint,
        isActive: product.isActive,
      },
      variants: variantDetails,
      batches: batchDetails,
      summary: {
        totalVariants: variants.length,
        totalBatches: batches.length,
        totalQuantity,
        totalValue,
      },
    };
  },
});
