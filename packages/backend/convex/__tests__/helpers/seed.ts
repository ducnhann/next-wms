/**
 * Shared seed helpers for Convex unit tests.
 * Each helper inserts records directly into the in-memory DB via t.run().
 *
 * IMPORTANT: Field shapes MUST match schema.ts exactly.
 * - system_lookups requires: lookupType, lookupCode, lookupValue, description, sortOrder
 * - organizations requires: authId, slug, name, address, isActive, isDeleted, authCreatedAt
 * - branches requires: organizationId, name, address, phoneNumber, isActive, isDeleted
 * - storage_zones requires: branchId, name, path, storageBlockType, isDeleted
 * - users requires: authId, username, fullName, email, emailVerified, isActive, isDeleted, authCreatedAt, authUpdatedAt
 * - brands requires: organizationId (string!), name, isActive
 * - suppliers requires: brandId, organizationId (Id!), name, contactPerson, email, phone, defaultLeadTimeDays, isActive, isDeleted
 * - products requires: organizationId, name, description, categoryId, brandId, storageRequirementTypeId, trackingMethodTypeId, isActive, isDeleted
 * - product_variants requires: productId, skuCode, description, costPrice, sellingPrice, unitOfMeasureId, temperatureSensitive, isActive, isDeleted
 */

import type { TestConvex } from "convex-test";

// ─── Organization ────────────────────────────────────────────────────────────

export async function seedOrganization(t: TestConvex<any>, overrides = {}) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("organizations", {
      authId: "ba-org-1",
      slug: "test-org",
      name: "Test Organization",
      address: "123 Test St",
      isActive: true,
      isDeleted: false,
      authCreatedAt: Date.now(),
      ...overrides,
    });
  });
}

// ─── User ────────────────────────────────────────────────────────────────────

export async function seedUser(t: TestConvex<any>, overrides = {}) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      authId: "ba-user-1",
      username: "testuser",
      fullName: "Test User",
      email: "user@test.com",
      emailVerified: true,
      isActive: true,
      isDeleted: false,
      authCreatedAt: Date.now(),
      authUpdatedAt: Date.now(),
      ...overrides,
    });
  });
}

// ─── Branch ──────────────────────────────────────────────────────────────────

export async function seedBranch(
  t: TestConvex<any>,
  organizationId: any,
  overrides = {},
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("branches", {
      organizationId,
      name: "Main Branch",
      address: "456 Branch Ave",
      phoneNumber: "0123456789",
      isActive: true,
      isDeleted: false,
      ...overrides,
    });
  });
}

// ─── Storage Zone ────────────────────────────────────────────────────────────

export async function seedStorageZone(
  t: TestConvex<any>,
  branchId: any,
  overrides = {},
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("storage_zones", {
      branchId,
      name: "Zone A",
      path: "zone_a",
      storageBlockType: "shelf",
      isDeleted: false,
      ...overrides,
    });
  });
}

// ─── Brand (note: organizationId is v.string(), not v.id!) ───────────────────

export async function seedBrand(
  t: TestConvex<any>,
  organizationId: string,
  overrides = {},
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("brands", {
      organizationId,
      name: "Test Brand",
      isActive: true,
      ...overrides,
    });
  });
}

// ─── Category ────────────────────────────────────────────────────────────────

export async function seedCategory(
  t: TestConvex<any>,
  organizationId: any,
  overrides = {},
) {
  return await t.run(async (ctx) => {
    const name = (overrides as any).name ?? "Test Category";
    return await ctx.db.insert("categories", {
      organizationId,
      name,
      path: name.toLowerCase().replace(/\s+/g, "_"),
      isActive: true,
      isDeleted: false,
      ...overrides,
    });
  });
}

// ─── Supplier ────────────────────────────────────────────────────────────────

export async function seedSupplier(
  t: TestConvex<any>,
  organizationId: any,
  brandId: any,
  overrides = {},
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("suppliers", {
      organizationId,
      brandId,
      name: "Test Supplier",
      contactPerson: "John Doe",
      email: "supplier@test.com",
      phone: "0123456789",
      defaultLeadTimeDays: 7,
      isActive: true,
      isDeleted: false,
      ...overrides,
    });
  });
}

// ─── System Lookups ──────────────────────────────────────────────────────────

export async function seedSystemLookup(
  t: TestConvex<any>,
  lookupType: string,
  lookupCode: string,
  lookupValue: string,
  sortOrder = 1,
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("system_lookups", {
      lookupType,
      lookupCode,
      lookupValue,
      description: `${lookupType} - ${lookupValue}`,
      sortOrder,
    });
  });
}

/**
 * Seeds all PO-related system lookups (PENDING, PARTIAL, COMPLETED, CANCELLED).
 */
export async function seedPurchaseOrderStatuses(t: TestConvex<any>) {
  const pending = await seedSystemLookup(t, "PurchaseOrderStatus", "PENDING", "Pending", 1);
  const partial = await seedSystemLookup(t, "PurchaseOrderStatus", "PARTIAL", "Partial", 2);
  const completed = await seedSystemLookup(t, "PurchaseOrderStatus", "COMPLETED", "Completed", 3);
  const cancelled = await seedSystemLookup(t, "PurchaseOrderStatus", "CANCELLED", "Cancelled", 4);
  return { pending, partial, completed, cancelled };
}

// ─── Product + Variant ───────────────────────────────────────────────────────

export async function seedProduct(
  t: TestConvex<any>,
  organizationId: any,
  categoryId: any,
  brandId: any,
  overrides = {},
) {
  // Need system lookups for storageRequirement and trackingMethod
  const storageReqId = await seedSystemLookup(t, "StorageRequirement", "AMBIENT", "Ambient", 1);
  const trackingId = await seedSystemLookup(t, "TrackingMethod", "BATCH", "Batch", 1);

  return await t.run(async (ctx) => {
    return await ctx.db.insert("products", {
      organizationId,
      name: "Test Product",
      description: "A test product",
      categoryId,
      brandId,
      storageRequirementTypeId: storageReqId,
      trackingMethodTypeId: trackingId,
      isActive: true,
      isDeleted: false,
      ...overrides,
    });
  });
}

export async function seedProductVariant(
  t: TestConvex<any>,
  productId: any,
  overrides = {},
) {
  const uomId = await seedSystemLookup(t, "UnitOfMeasure", "PIECE", "Piece", 1);

  return await t.run(async (ctx) => {
    return await ctx.db.insert("product_variants", {
      productId,
      skuCode: "SKU-001",
      description: "Default variant",
      costPrice: 100,
      sellingPrice: 150,
      unitOfMeasureId: uomId,
      temperatureSensitive: false,
      isActive: true,
      isDeleted: false,
      ...overrides,
    });
  });
}

// ─── Full PO Seed Chain ──────────────────────────────────────────────────────

/**
 * Seeds the entire dependency chain needed for Purchase Order tests:
 * org → user → branch → zone → brand → category → supplier → product → variant → PO statuses
 *
 * Returns all created IDs for use in tests.
 */
export async function seedFullPOChain(t: TestConvex<any>) {
  const orgId = await seedOrganization(t);
  const userId = await seedUser(t);
  const branchId = await seedBranch(t, orgId);
  const zoneId = await seedStorageZone(t, branchId);

  // brands.organizationId is v.string(), so we need the string representation
  // In convex-test, IDs are string-like, so we cast
  const brandId = await seedBrand(t, orgId as unknown as string);
  const categoryId = await seedCategory(t, orgId);
  const supplierId = await seedSupplier(t, orgId, brandId);

  const productId = await seedProduct(t, orgId, categoryId, brandId);
  const variantId = await seedProductVariant(t, productId);

  const poStatuses = await seedPurchaseOrderStatuses(t);

  return {
    orgId,
    userId,
    branchId,
    zoneId,
    brandId,
    categoryId,
    supplierId,
    productId,
    variantId,
    poStatuses,
  };
}
