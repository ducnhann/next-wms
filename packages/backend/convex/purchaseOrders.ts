import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { logCRUDAction } from "./audit";
/**
 * Generate the next purchase order code
 * Format: PO-YYYY-MM-XXX where XXX is a 3-digit sequence number for the month
 * Example: PO-2026-01-004 (4th order in January 2026)
 */
export const generateNextPurchaseOrderCode = query({
  args: {
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    // Get branch to get organizationId
    const branch = await ctx.db.get(args.branchId);
    if (!branch) {
      throw new Error("Branch not found");
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    // Get the start and end of current month
    const startOfMonth = new Date(year, now.getMonth(), 1).getTime();
    const endOfMonth = new Date(
      year,
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    ).getTime();

    // Count orders created this month in the organization
    const monthOrders = await ctx.db
      .query("purchase_orders")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", branch.organizationId),
      )
      .filter((q) =>
        q.and(
          q.gte(q.field("orderedAt"), startOfMonth),
          q.lte(q.field("orderedAt"), endOfMonth),
        ),
      )
      .collect();

    const sequence = (monthOrders.length + 1).toString().padStart(3, "0");
    const code = `PO-${year}-${month}-${sequence}`;

    return { code };
  },
});

/**
 * List all active product variants
 * Returns skuCode and description for display in the add purchase order dialog
 */
export const listAllProductVariants = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get all active products for this organization
    const products = await ctx.db
      .query("products")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    // Get variants for each product
    const variantsWithDetails = [];
    for (const product of products) {
      const variants = await ctx.db
        .query("product_variants")
        .withIndex("productId", (q) => q.eq("productId", product._id))
        .filter((q) => q.eq(q.field("isActive"), true))
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .collect();

      for (const variant of variants) {
        variantsWithDetails.push({
          _id: variant._id,
          skuCode: variant.skuCode,
          description: variant.description,
          productName: product.name,
        });
      }
    }

    return variantsWithDetails;
  },
});

/**
 * Get product variants by supplier (brand)
 * Returns productId, variant details, and product name for display
 */
export const getProductVariantsBySupplier = query({
  args: {
    supplierId: v.id("suppliers"),
  },
  handler: async (ctx, args) => {
    // Get all products for this brand/supplier
    const supplier = await ctx.db
      .query("suppliers")
      .filter((q) => q.eq(q.field("_id"), args.supplierId))
      .first();

    if (!supplier) {
      return [];
    }
    const brandId = supplier.brandId;

    const products = await ctx.db
      .query("products")
      .withIndex("brandId", (q) => q.eq("brandId", brandId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    // Get variants for each product
    const variantsWithDetails = [];
    for (const product of products) {
      const variants = await ctx.db
        .query("product_variants")
        .withIndex("productId", (q) => q.eq("productId", product._id))
        .filter((q) => q.eq(q.field("isActive"), true))
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .collect();

      for (const variant of variants) {
        variantsWithDetails.push({
          variantId: variant._id,
          productId: product._id,
          productName: product.name,
          skuCode: variant.skuCode,
          description: variant.description,
          costPrice: variant.costPrice,
          sellingPrice: variant.sellingPrice,
          unitOfMeasureId: variant.unitOfMeasureId,
        });
      }
    }

    return variantsWithDetails;
  },
});

/**
 * Create a new purchase order
 */
export const createPurchaseOrder = mutation({
  args: {
    receivingBranchId: v.id("branches"),
    userId: v.id("users"),
    supplierId: v.id("suppliers"),
    note: v.optional(v.string()),
    items: v.array(
      v.object({
        variantId: v.id("product_variants"),
        quantity: v.number(),
        zoneId: v.id("storage_zones"), // Required zone for each item
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Authenticate user

    // Validate items array is not empty
    if (!args.items || args.items.length === 0) {
      throw new Error("Purchase order must contain at least one item");
    }

    // Get branch to verify it exists and get organizationId
    const branch = await ctx.db.get(args.receivingBranchId);
    if (!branch) {
      throw new Error("Branch not found");
    }

    // Verify supplier exists
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) {
      throw new Error("Supplier not found");
    }

    // Validate all items have zones
    for (const item of args.items) {
      const zone = await ctx.db.get(item.zoneId);
      if (!zone) {
        throw new Error(
          `Zone not found for item with variantId: ${item.variantId}`,
        );
      }
    }

    // Get the "Pending" status from system_lookups using lookupCode
    const pendingStatus = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q.eq("lookupType", "PurchaseOrderStatus").eq("lookupCode", "PENDING"),
      )
      .first();

    if (!pendingStatus) {
      throw new Error("Pending status not found in system lookups");
    }

    // Generate purchase order code (format: PO-YYYY-MM-XXX)
    const now = Date.now();
    const date = new Date(now);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    // Get the start and end of current month
    const startOfMonth = new Date(year, date.getMonth(), 1).getTime();
    const endOfMonth = new Date(
      year,
      date.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    ).getTime();

    // Count orders created this month in the organization
    const monthOrders = await ctx.db
      .query("purchase_orders")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", branch.organizationId),
      )
      .filter((q) =>
        q.and(
          q.gte(q.field("orderedAt"), startOfMonth),
          q.lte(q.field("orderedAt"), endOfMonth),
        ),
      )
      .collect();

    const sequence = (monthOrders.length + 1).toString().padStart(3, "0");
    const code = `PO-${year}-${month}-${sequence}`;

    // Calculate expected delivery date (use supplier's default lead time)
    const expectedDeliveryAt =
      now + supplier.defaultLeadTimeDays * 24 * 60 * 60 * 1000;

    // Insert purchase order
    const orderId = await ctx.db.insert("purchase_orders", {
      organizationId: branch.organizationId,
      branchId: args.receivingBranchId,
      code,
      supplierId: args.supplierId,
      orderedAt: now,
      expectedDeliveryAt,
      createdByUserId: args.userId,
      purchaseOrderStatusTypeId: pendingStatus._id,
      isDeleted: false,
    });

    // Insert purchase order details for each item with zone
    for (const item of args.items) {
      await ctx.db.insert("purchase_order_details", {
        purchaseOrderId: orderId,
        skuId: item.variantId,
        quantityOrdered: item.quantity,
        unitCost: 0,
        quantityReceived: 0,
        recommendedZoneId: item.zoneId,
      });
    }

    // Log audit for purchase order creation
    await logCRUDAction(ctx, {
      organizationId: branch.organizationId,
      userId: args.userId,
      action: "CREATE",
      entityType: "purchase_orders",
      entityId: orderId,
      newValue: { code, supplierId: args.supplierId, itemCount: args.items.length },
      notes: `Created purchase order ${code} with ${args.items.length} items`,
    });

    return {
      success: true,
      orderId,
      code,
    };
  },
});

/**
 * Get all purchase orders for a branch (list view for table)
 * Returns only fields needed for the table display
 */
export const listPurchaseOrders = query({
  args: {
    branchId: v.id("branches"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("purchase_orders")
      .withIndex("branchId", (q) => q.eq("branchId", args.branchId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .order("desc")
      .collect();

    // Enrich with supplier and status for table display
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const supplier = await ctx.db.get(order.supplierId);
        const status = await ctx.db.get(order.purchaseOrderStatusTypeId);

        return {
          _id: order._id,
          code: order.code,
          orderedAt: order.orderedAt,
          expectedDeliveryAt: order.expectedDeliveryAt ?? null,
          supplier: supplier ? { name: supplier.name } : null,
          purchaseOrderStatus: status
            ? { lookupValue: status.lookupValue, lookupCode: status.lookupCode }
            : null,
        };
      }),
    );

    return enrichedOrders;
  },
});

/**
 * Get purchase order with full details for the detail dialog
 * Returns all information needed to display the purchase order detail view
 */
export const getPurchaseOrderDetailed = query({
  args: {
    orderId: v.id("purchase_orders"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Purchase order not found");
    }

    // Get order details (line items)
    const details = await ctx.db
      .query("purchase_order_details")
      .withIndex("purchaseOrderId", (q) =>
        q.eq("purchaseOrderId", args.orderId),
      )
      .collect();

    // Enrich details with product information and location
    const enrichedDetails = await Promise.all(
      details.map(async (detail) => {
        const variant = await ctx.db.get(detail.skuId);
        let productName: string | null = null;
        let skuCode = "Unknown";

        if (variant) {
          skuCode = variant.skuCode;
          const product = await ctx.db.get(variant.productId);
          productName = product?.name ?? null;
        }

        // Get location from inventory batches if available
        // For purchase orders, location would typically be recommended receiving zone
        // We'll query inventory batches to find where items are stored
        let location: string | null = null;
        const inventoryBatch = await ctx.db
          .query("inventory_batches")
          .withIndex("skuId", (q) => q.eq("skuId", detail.skuId))
          .filter((q) => q.eq(q.field("isDeleted"), false))
          .first();

        if (inventoryBatch) {
          const zone = await ctx.db.get(inventoryBatch.zoneId);
          location = zone?.name ?? null;
        }

        return {
          _id: detail._id,
          skuCode,
          productName,
          quantityOrdered: detail.quantityOrdered,
          location,
        };
      }),
    );

    // Get related entities
    const supplier = await ctx.db.get(order.supplierId);
    const status = await ctx.db.get(order.purchaseOrderStatusTypeId);
    const createdByUser = await ctx.db.get(order.createdByUserId);

    // Calculate totals
    const totalItems = enrichedDetails.length;
    const totalQuantityOrdered = enrichedDetails.reduce(
      (sum, item) => sum + item.quantityOrdered,
      0,
    );

    return {
      _id: order._id,
      code: order.code,
      orderedAt: order.orderedAt,
      expectedDeliveryAt: order.expectedDeliveryAt ?? null,
      createdByUser: createdByUser
        ? { fullName: createdByUser.fullName }
        : null,
      supplier: supplier
        ? {
            name: supplier.name,
            phone: supplier.phone,
          }
        : null,
      purchaseOrderStatus: status ? { lookupValue: status.lookupValue } : null,
      items: enrichedDetails,
      totalItems,
      totalQuantityOrdered,
    };
  },
});

// ============================================================================
// EXCEL IMPORT LOOKUP QUERIES
// ============================================================================

/**
 * Get branch by name (case-insensitive) for Excel import
 * Returns branch ID and name if found, null otherwise
 */
export const getBranchByName = query({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const branches = await ctx.db
      .query("branches")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Case-insensitive name matching
    const normalizedSearchName = args.name.toLowerCase().trim();
    const match = branches.find(
      (b) => b.name.toLowerCase().trim() === normalizedSearchName,
    );

    if (!match) {
      return null;
    }

    return {
      _id: match._id,
      name: match.name,
    };
  },
});

/**
 * Get supplier by name (case-insensitive) for Excel import
 * Returns supplier ID and name if found, null otherwise
 */
export const getSupplierByName = query({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const suppliers = await ctx.db
      .query("suppliers")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Case-insensitive name matching
    const normalizedSearchName = args.name.toLowerCase().trim();
    const match = suppliers.find(
      (s) => s.name.toLowerCase().trim() === normalizedSearchName,
    );

    if (!match) {
      return null;
    }

    return {
      _id: match._id,
      name: match.name,
    };
  },
});

/**
 * Batch lookup product variants by SKU codes for Excel import
 * Returns array of matching variants with their details
 * Non-matching SKU codes are silently skipped
 */
export const getVariantsBySkuCodes = query({
  args: {
    organizationId: v.id("organizations"),
    skuCodes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Get all active products for this organization
    const products = await ctx.db
      .query("products")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    const productIds = products.map((p) => p._id);
    const productMap = new Map(products.map((p) => [p._id, p]));

    // Get all variants for these products
    const allVariants = [];
    for (const productId of productIds) {
      const variants = await ctx.db
        .query("product_variants")
        .withIndex("productId", (q) => q.eq("productId", productId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .collect();
      allVariants.push(...variants);
    }

    // Normalize requested SKU codes for case-insensitive matching
    const normalizedSkuCodes = args.skuCodes.map((sku) =>
      sku.toLowerCase().trim(),
    );

    // Filter variants that match requested SKU codes
    const matchingVariants = allVariants.filter((v) =>
      normalizedSkuCodes.includes(v.skuCode.toLowerCase().trim()),
    );

    // Return enriched variant data
    return matchingVariants.map((variant) => {
      const product = productMap.get(variant.productId);
      return {
        _id: variant._id,
        skuCode: variant.skuCode,
        description: variant.description,
        productId: variant.productId,
        productName: product?.name ?? null,
      };
    });
  },
});

/**
 * Cancel a purchase order
 * Only allowed for orders with "PENDING" status
 */
export const cancelPurchaseOrder = mutation({
  args: {
    purchaseOrderId: v.id("purchase_orders"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get purchase order
    const purchaseOrder = await ctx.db.get(args.purchaseOrderId);
    if (!purchaseOrder) {
      throw new Error("Purchase order not found");
    }

    if (purchaseOrder.isDeleted) {
      throw new Error("Purchase order has been deleted");
    }

    // Get current status
    const currentStatus = await ctx.db.get(
      purchaseOrder.purchaseOrderStatusTypeId,
    );
    if (!currentStatus || currentStatus.lookupCode !== "PENDING") {
      throw new Error("Only pending purchase orders can be cancelled");
    }

    // Get the "CANCELLED" status from system_lookups
    const cancelledStatus = await ctx.db
      .query("system_lookups")
      .withIndex("lookupType_lookupCode", (q) =>
        q.eq("lookupType", "PurchaseOrderStatus").eq("lookupCode", "CANCELLED"),
      )
      .first();

    if (!cancelledStatus) {
      throw new Error("Cancelled status not found in system lookups");
    }

    // Update purchase order status
    await ctx.db.patch(args.purchaseOrderId, {
      purchaseOrderStatusTypeId: cancelledStatus._id,
    });

    // Log audit for purchase order cancellation
    await logCRUDAction(ctx, {
      organizationId: purchaseOrder.organizationId,
      userId: args.userId,
      action: "UPDATE",
      entityType: "purchase_orders",
      entityId: args.purchaseOrderId,
      fieldName: "status",
      oldValue: currentStatus.lookupCode,
      newValue: "CANCELLED",
      notes: `Cancelled purchase order ${purchaseOrder.code}`,
    });

    return {
      success: true,
      message: "Purchase order cancelled successfully",
    };
  },
});
