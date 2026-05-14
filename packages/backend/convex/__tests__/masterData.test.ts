/**
 * MODULE 4: Master Data — Unit Tests
 * UC11–UC26 | BR46–BR94
 *
 * Tests based on Business Rules from testcase_instruction.md:
 *   PROD-009, PROD-010, PROD-011, PROD-022, PROD-026
 *   CAT-002, CAT-003, CAT-009, CAT-011
 *   BRAND-002, BRAND-011, BRAND-013
 *   SUP-002, SUP-003, SUP-004, SUP-005, SUP-010, SUP-011
 *
 * Source: packages/backend/convex/products.ts, categories.ts, brands.ts, suppliers.ts
 */

/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import {
  seedBrand,
  seedCategory,
  seedFullPOChain,
  seedOrganization,
  seedPOWithDetails,
  seedProduct,
  seedProductVariant,
  seedSupplier,
  seedSystemLookup,
} from "./helpers/seed";

const modules = import.meta.glob("../**/*.ts");

async function seedProductPrereqs(t: ReturnType<typeof convexTest>) {
  const orgId = await seedOrganization(t);
  const brandId = await seedBrand(t, orgId as unknown as string);
  const categoryId = await seedCategory(t, orgId);
  const storageReqId = await seedSystemLookup(
    t,
    "StorageRequirement",
    "AMBIENT",
    "Ambient",
    1,
  );
  const trackingId = await seedSystemLookup(
    t,
    "TrackingMethod",
    "BATCH",
    "Batch",
    1,
  );
  const uomId = await seedSystemLookup(t, "UnitOfMeasure", "PIECE", "Piece", 1);

  return { orgId, brandId, categoryId, storageReqId, trackingId, uomId };
}

// ─── UC11–UC14: Products ────────────────────────────────────────────────────

describe("UC11–UC14: Products", () => {
  it("[BR48] PROD-009: Duplicate product name rejected", async () => {
    const t = convexTest(schema, modules);
    const prereq = await seedProductPrereqs(t);

    await t.mutation(api.products.create, {
      organizationId: prereq.orgId,
      name: "Test Product",
      description: "First",
      categoryId: prereq.categoryId,
      brandId: prereq.brandId,
      storageRequirementTypeId: prereq.storageReqId,
      trackingMethodTypeId: prereq.trackingId,
    });

    await expect(
      t.mutation(api.products.create, {
        organizationId: prereq.orgId,
        name: "Test Product",
        description: "Second",
        categoryId: prereq.categoryId,
        brandId: prereq.brandId,
        storageRequirementTypeId: prereq.storageReqId,
        trackingMethodTypeId: prereq.trackingId,
      }),
    ).rejects.toThrow("Product with this name already exists");
  });

  it("[BR48] PROD-010: Duplicate SKU code rejected", async () => {
    const t = convexTest(schema, modules);
    const prereq = await seedProductPrereqs(t);

    const productId = await t.mutation(api.products.create, {
      organizationId: prereq.orgId,
      name: "SKU Product",
      description: "Base",
      categoryId: prereq.categoryId,
      brandId: prereq.brandId,
      storageRequirementTypeId: prereq.storageReqId,
      trackingMethodTypeId: prereq.trackingId,
    });

    await t.mutation(api.products.createVariant, {
      productId,
      skuCode: "SKU-001",
      description: "Variant 1",
      costPrice: 10,
      sellingPrice: 15,
      unitOfMeasureId: prereq.uomId,
    });

    await expect(
      t.mutation(api.products.createVariant, {
        productId,
        skuCode: "SKU-001",
        description: "Variant 2",
        costPrice: 10,
        sellingPrice: 15,
        unitOfMeasureId: prereq.uomId,
      }),
    ).rejects.toThrow("SKU code already exists");
  });

  it("[BR49] PROD-011: Successful product creation", async () => {
    const t = convexTest(schema, modules);
    const prereq = await seedProductPrereqs(t);

    const productId = await t.mutation(api.products.create, {
      organizationId: prereq.orgId,
      name: "Create Product",
      description: "Created",
      categoryId: prereq.categoryId,
      brandId: prereq.brandId,
      storageRequirementTypeId: prereq.storageReqId,
      trackingMethodTypeId: prereq.trackingId,
    });

    const product = await t.query(api.products.get, { id: productId });
    expect(product.name).toBe("Create Product");
  });

  it("[BR56] PROD-022: Variants soft deleted when product deleted", async () => {
    const t = convexTest(schema, modules);
    const prereq = await seedProductPrereqs(t);

    const productId = await seedProduct(
      t,
      prereq.orgId,
      prereq.categoryId,
      prereq.brandId,
    );
    const variantId = await seedProductVariant(t, productId, {
      skuCode: "SKU-DELETE",
    });

    await t.mutation(api.products.remove, { id: productId });

    const variant = await t.run(async (ctx) => ctx.db.get(variantId));
    expect(variant!.isDeleted).toBe(true);
  });

  it("[BR58] PROD-026: Search is case-insensitive", async () => {
    const t = convexTest(schema, modules);
    const prereq = await seedProductPrereqs(t);

    await t.mutation(api.products.create, {
      organizationId: prereq.orgId,
      name: "Case Product",
      description: "Search",
      categoryId: prereq.categoryId,
      brandId: prereq.brandId,
      storageRequirementTypeId: prereq.storageReqId,
      trackingMethodTypeId: prereq.trackingId,
    });

    const results = await t.query(api.products.search, {
      organizationId: prereq.orgId,
      searchTerm: "case product",
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe("Case Product");
  });
});

// ─── UC15–UC18: Categories ──────────────────────────────────────────────────

describe("UC15–UC18: Categories", () => {
  it("[BR60] CAT-002: Duplicate path rejected", async () => {
    const t = convexTest(schema, modules);
    const orgId = await seedOrganization(t);

    await t.mutation(api.categories.create, {
      organizationId: orgId,
      name: "Electronics",
    });

    await expect(
      t.mutation(api.categories.create, {
        organizationId: orgId,
        name: "Electronics",
      }),
    ).rejects.toThrow("Category with this path already exists");
  });

  it("[BR60] CAT-003: Invalid parent path rejected", async () => {
    const t = convexTest(schema, modules);
    const orgId = await seedOrganization(t);

    await expect(
      t.mutation(api.categories.create, {
        organizationId: orgId,
        name: "Laptops",
        parentPath: "missing.parent",
      }),
    ).rejects.toThrow("Parent category not found");
  });

  it("[BR66] CAT-009: Category with products cannot be deleted", async () => {
    const t = convexTest(schema, modules);
    const orgId = await seedOrganization(t);
    const brandId = await seedBrand(t, orgId as unknown as string);
    const categoryId = await seedCategory(t, orgId, { name: "Devices" });

    await seedProduct(t, orgId, categoryId, brandId);

    await expect(
      t.mutation(api.categories.remove, { id: categoryId }),
    ).rejects.toThrow(/Cannot delete category/);
  });

  it("[BR68] CAT-011: Empty category soft deleted", async () => {
    const t = convexTest(schema, modules);
    const orgId = await seedOrganization(t);
    const categoryId = await seedCategory(t, orgId, { name: "Empty" });

    await t.mutation(api.categories.remove, { id: categoryId });

    const category = await t.run(async (ctx) => ctx.db.get(categoryId));
    expect(category!.isDeleted).toBe(true);
  });
});

// ─── UC19–UC22: Brands ──────────────────────────────────────────────────────

describe("UC19–UC22: Brands", () => {
  it("[BR72] BRAND-002: Duplicate brand name rejected", async () => {
    const t = convexTest(schema, modules);
    const orgId = await seedOrganization(t);

    await t.mutation(api.brands.createBrand, {
      organizationId: orgId as unknown as string,
      name: "Brand A",
    });

    await expect(
      t.mutation(api.brands.createBrand, {
        organizationId: orgId as unknown as string,
        name: "Brand A",
      }),
    ).rejects.toThrow("Brand name already exists");
  });

  it("[BR79] BRAND-011: Brand with products cannot be deleted", async () => {
    const t = convexTest(schema, modules);
    const orgId = await seedOrganization(t);
    const brandId = await seedBrand(t, orgId as unknown as string);
    const categoryId = await seedCategory(t, orgId);

    await seedProduct(t, orgId, categoryId, brandId);

    await expect(
      t.mutation(api.brands.deleteBrand, { brandId: brandId as any }),
    ).rejects.toThrow(/Cannot delete brand/);
  });

  it("[BR81] BRAND-013: Deactivate brand sets isActive to false", async () => {
    const t = convexTest(schema, modules);
    const orgId = await seedOrganization(t);
    const brandId = await seedBrand(t, orgId as unknown as string);

    await t.mutation(api.brands.deactivateBrand, { id: brandId });

    const brand = await t.run(async (ctx) => ctx.db.get(brandId));
    expect(brand!.isActive).toBe(false);
  });
});

// ─── UC23–UC26: Suppliers ───────────────────────────────────────────────────

describe("UC23–UC26: Suppliers", () => {
  it("[BR85] SUP-002: Invalid email format rejected", async () => {
    const t = convexTest(schema, modules);
    const orgId = await seedOrganization(t);
    const brandId = await seedBrand(t, orgId as unknown as string);

    await expect(
      t.mutation(api.suppliers.create, {
        brandId,
        organizationId: orgId,
        name: "Supplier X",
        contactPerson: "John",
        email: "bad-email",
        phone: "0123",
        defaultLeadTimeDays: 5,
      }),
    ).rejects.toThrow("Invalid email format");
  });

  it("[BR85] SUP-003: Duplicate supplier name rejected", async () => {
    const t = convexTest(schema, modules);
    const orgId = await seedOrganization(t);
    const brandId = await seedBrand(t, orgId as unknown as string);

    await t.mutation(api.suppliers.create, {
      brandId,
      organizationId: orgId,
      name: "Supplier Dup",
      contactPerson: "John",
      email: "dup@test.com",
      phone: "0123",
      defaultLeadTimeDays: 5,
    });

    await expect(
      t.mutation(api.suppliers.create, {
        brandId,
        organizationId: orgId,
        name: "Supplier Dup",
        contactPerson: "Jane",
        email: "other@test.com",
        phone: "0456",
        defaultLeadTimeDays: 5,
      }),
    ).rejects.toThrow("Supplier with this name already exists");
  });

  it("[BR85] SUP-004: Duplicate supplier email rejected", async () => {
    const t = convexTest(schema, modules);
    const orgId = await seedOrganization(t);
    const brandId = await seedBrand(t, orgId as unknown as string);

    await t.mutation(api.suppliers.create, {
      brandId,
      organizationId: orgId,
      name: "Supplier A",
      contactPerson: "John",
      email: "same@test.com",
      phone: "0123",
      defaultLeadTimeDays: 5,
    });

    await expect(
      t.mutation(api.suppliers.create, {
        brandId,
        organizationId: orgId,
        name: "Supplier B",
        contactPerson: "Jane",
        email: "same@test.com",
        phone: "0456",
        defaultLeadTimeDays: 5,
      }),
    ).rejects.toThrow("Supplier with this email already exists");
  });

  it("[BR85] SUP-005: Negative lead time rejected", async () => {
    const t = convexTest(schema, modules);
    const orgId = await seedOrganization(t);
    const brandId = await seedBrand(t, orgId as unknown as string);

    await expect(
      t.mutation(api.suppliers.create, {
        brandId,
        organizationId: orgId,
        name: "Supplier Lead",
        contactPerson: "John",
        email: "lead@test.com",
        phone: "0123",
        defaultLeadTimeDays: -1,
      }),
    ).rejects.toThrow("Lead time must be a positive number");
  });

  it("[BR90] SUP-010: Supplier with active POs cannot be deleted", async () => {
    const t = convexTest(schema, modules);
    const seed = await seedFullPOChain(t);

    await seedPOWithDetails(t, {
      orgId: seed.orgId,
      branchId: seed.branchId,
      supplierId: seed.supplierId,
      userId: seed.userId,
      statusId: seed.poStatuses.pending,
      zoneId: seed.zoneId,
      items: [{ variantId: seed.variantId, quantity: 1 }],
    });

    await expect(
      t.mutation(api.suppliers.remove, { id: seed.supplierId }),
    ).rejects.toThrow(/Cannot delete supplier/);
  });

  it("[BR91] SUP-011: Soft delete supplier without active POs", async () => {
    const t = convexTest(schema, modules);
    const orgId = await seedOrganization(t);
    const brandId = await seedBrand(t, orgId as unknown as string);
    const supplierId = await seedSupplier(t, orgId, brandId, {
      name: "Supplier Del",
      email: "del@test.com",
    });

    await t.mutation(api.suppliers.remove, { id: supplierId });

    const supplier = await t.run(async (ctx) => ctx.db.get(supplierId));
    expect(supplier!.isDeleted).toBe(true);
  });
});
