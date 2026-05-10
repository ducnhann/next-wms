/**
 * Custom hooks for Brands API
 */

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";

export type Brand = {
  _id: Id<"brands">;
  _creationTime: number;
  organizationId: string;
  name: string;
  isActive: boolean;
};

/**
 * Get all brands for an organization (for dropdowns)
 */
export function useBrands(organizationId?: string, isActive?: boolean) {
  const queryResult = useQuery({
    ...convexQuery(
      api.brands.listAll,
      organizationId ? { organizationId, isActive } : "skip",
    ),
  });

  return {
    brands: (queryResult.data ?? []) as Brand[],
    ...queryResult,
  };
}

/**
 * Get a single brand by ID
 */
export function useBrand(brandId?: Id<"brands">) {
  const queryResult = useQuery({
    ...convexQuery(api.brands.get, brandId ? { id: brandId } : "skip"),
  });

  return {
    brand: queryResult.data as Brand | undefined,
    ...queryResult,
  };
}
