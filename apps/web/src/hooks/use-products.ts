/**
 * Custom hooks for Products API
 *
 * Provides hooks for:
 * - Listing products with filters and pagination
 * - Getting product details with variants and barcodes
 * - Creating, updating, deleting products
 * - Managing variants and barcodes
 */

import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";

// ============================================================================
// TYPES
// ============================================================================

export type ProductListItem = {
  _id: Id<"products">;
  _creationTime: number;
  organizationId: Id<"organizations">;
  name: string;
  description: string;
  categoryId: Id<"categories">;
  brandId: Id<"brands">;
  storageRequirementTypeId: Id<"system_lookups">;
  trackingMethodTypeId: Id<"system_lookups">;
  shelfLifeDays?: number;
  reorderPoint?: number;
  reorderPointOverride?: number;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: number;
  // Joined data
  category?: {
    _id: Id<"categories">;
    name: string;
    path: string;
  } | null;
  brand?: {
    _id: Id<"brands">;
    name: string;
  } | null;
  storageRequirement?: {
    _id: Id<"system_lookups">;
    lookupValue: string;
    lookupCode: string;
  } | null;
  trackingMethod?: {
    _id: Id<"system_lookups">;
    lookupValue: string;
    lookupCode: string;
  } | null;
  variants?: ProductVariant[];
};

export type ProductVariant = {
  _id: Id<"product_variants">;
  _creationTime: number;
  productId: Id<"products">;
  skuCode: string;
  description: string;
  costPrice: number;
  sellingPrice: number;
  unitOfMeasureId: Id<"system_lookups">;
  weightKg?: number;
  volumeM3?: number;
  temperatureSensitive: boolean;
  stackingLimit?: number;
  customFields?: unknown;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: number;
  barcodes?: ProductBarcode[];
  unitOfMeasure?: {
    _id: Id<"system_lookups">;
    lookupValue: string;
    lookupCode: string;
  } | null;
};

export type ProductBarcode = {
  _id: Id<"product_barcodes">;
  _creationTime: number;
  skuId: Id<"product_variants">;
  barcodeTypeId: Id<"system_lookups">;
  barcodeValue: string;
  barcodeType?: {
    _id: Id<"system_lookups">;
    lookupValue: string;
    lookupCode: string;
  } | null;
};

// ============================================================================
// LIST PRODUCTS HOOK
// ============================================================================

export type UseProductsListOptions = {
  organizationId?: Id<"organizations">;
  categoryId?: Id<"categories">;
  brandId?: Id<"brands">;
  isActive?: boolean;
  includeDeleted?: boolean;
};

export function useProductsList(options: UseProductsListOptions = {}) {
  const { organizationId, categoryId, brandId, isActive, includeDeleted } =
    options;

  const queryResult = useQuery({
    ...convexQuery(
      api.products.listWithDetails,
      organizationId
        ? {
            organizationId,
            categoryId,
            brandId,
            isActive,
            includeDeleted,
          }
        : "skip",
    ),
  });

  return {
    products: queryResult.data ?? [],
    ...queryResult,
  };
}

// ============================================================================
// GET PRODUCT DETAILS HOOK
// ============================================================================

export function useProductDetails(productId?: Id<"products">) {
  const queryResult = useQuery({
    ...convexQuery(
      api.products.getWithDetails,
      productId ? { id: productId } : "skip",
    ),
  });

  return {
    product: queryResult.data,
    ...queryResult,
  };
}

// ============================================================================
// SEARCH PRODUCTS HOOK
// ============================================================================

export function useProductSearch(
  organizationId?: Id<"organizations">,
  searchTerm?: string,
  limit?: number,
) {
  const queryResult = useQuery({
    ...convexQuery(
      api.products.search,
      organizationId && searchTerm
        ? { organizationId, searchTerm, limit }
        : "skip",
    ),
  });

  return {
    results: queryResult.data ?? [],
    ...queryResult,
  };
}

// ============================================================================
// SEARCH BY BARCODE HOOK
// ============================================================================

export function useProductByBarcode(barcodeValue?: string) {
  const queryResult = useQuery({
    ...convexQuery(
      api.products.searchByBarcode,
      barcodeValue ? { barcodeValue } : "skip",
    ),
  });

  return {
    result: queryResult.data,
    ...queryResult,
  };
}

// ============================================================================
// PRODUCT MUTATIONS
// ============================================================================

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const mutationFn = useConvexMutation(api.products.create);

  return useMutation({
    mutationFn,
    onSuccess: () => {
      // Invalidate product list queries
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const mutationFn = useConvexMutation(api.products.update);

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const mutationFn = useConvexMutation(api.products.remove);

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// ============================================================================
// CREATE PRODUCT WITH VARIANTS (Complex mutation)
// ============================================================================

export type CreateProductWithVariantsInput = {
  // Product info
  organizationId: Id<"organizations">;
  name: string;
  description: string;
  categoryId: Id<"categories">;
  brandId: Id<"brands">;
  storageRequirementTypeId: Id<"system_lookups">;
  trackingMethodTypeId: Id<"system_lookups">;
  shelfLifeDays?: number;
  reorderPoint?: number;
  isActive?: boolean;
  // Variants to create
  variants: {
    skuCode: string;
    description: string;
    costPrice: number;
    sellingPrice: number;
    unitOfMeasureId: Id<"system_lookups">;
    weightKg?: number;
    volumeM3?: number;
    temperatureSensitive?: boolean;
    stackingLimit?: number;
    customFields?: unknown;
    isActive?: boolean;
    // Barcodes for this variant
    barcodes?: {
      barcodeTypeId?: Id<"system_lookups">;
      barcodeValue: string;
    }[];
  }[];
};

export function useCreateProductWithVariants() {
  const queryClient = useQueryClient();
  const createProductMutation = useConvexMutation(api.products.create);
  const createVariantMutation = useConvexMutation(api.products.createVariant);
  const addBarcodeMutation = useConvexMutation(api.products.addBarcode);

  return useMutation({
    mutationFn: async (input: CreateProductWithVariantsInput) => {
      const { variants, ...productData } = input;

      // 1. Create the product
      const productId = await createProductMutation(productData);

      // 2. Create variants and their barcodes
      for (const variant of variants) {
        const { barcodes, ...variantData } = variant;

        // Create variant
        const variantId = await createVariantMutation({
          productId,
          ...variantData,
        });

        // Create barcodes for this variant
        if (barcodes && barcodes.length > 0) {
          for (const barcode of barcodes) {
            await addBarcodeMutation({
              skuId: variantId,
              ...barcode,
            });
          }
        }
      }

      return productId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// ============================================================================
// VARIANT MUTATIONS
// ============================================================================

export function useCreateVariant() {
  const queryClient = useQueryClient();
  const mutationFn = useConvexMutation(api.products.createVariant);

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateVariant() {
  const queryClient = useQueryClient();
  const mutationFn = useConvexMutation(api.products.updateVariant);

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeleteVariant() {
  const queryClient = useQueryClient();
  const mutationFn = useConvexMutation(api.products.removeVariant);

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// ============================================================================
// BARCODE MUTATIONS
// ============================================================================

export function useAddBarcode() {
  const queryClient = useQueryClient();
  const mutationFn = useConvexMutation(api.products.addBarcode);

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useRemoveBarcode() {
  const queryClient = useQueryClient();
  const mutationFn = useConvexMutation(api.products.removeBarcode);

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// ============================================================================
// GET VARIANTS HOOK
// ============================================================================

export function useProductVariants(productId?: Id<"products">) {
  const queryResult = useQuery({
    ...convexQuery(
      api.products.getVariants,
      productId ? { productId } : "skip",
    ),
  });

  return {
    variants: queryResult.data ?? [],
    ...queryResult,
  };
}

// ============================================================================
// GET BARCODES HOOK
// ============================================================================

export function useVariantBarcodes(skuId?: Id<"product_variants">) {
  const queryResult = useQuery({
    ...convexQuery(api.products.getBarcodes, skuId ? { skuId } : "skip"),
  });

  return {
    barcodes: queryResult.data ?? [],
    ...queryResult,
  };
}
