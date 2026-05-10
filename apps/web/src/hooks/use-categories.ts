/**
 * Custom hooks for Categories API
 */

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";

export type Category = {
  _id: Id<"categories">;
  _creationTime: number;
  organizationId: Id<"organizations">;
  name: string;
  path: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: number;
};

/**
 * Get category tree for an organization
 */
export function useCategoryTree(organizationId?: Id<"organizations">) {
  const queryResult = useQuery({
    ...convexQuery(
      api.categories.getTree,
      organizationId ? { organizationId } : "skip",
    ),
  });

  return {
    categories: (queryResult.data ?? []) as Category[],
    ...queryResult,
  };
}

/**
 * Get a single category by ID
 */
export function useCategory(categoryId?: Id<"categories">) {
  const queryResult = useQuery({
    ...convexQuery(
      api.categories.get,
      categoryId ? { id: categoryId } : "skip",
    ),
  });

  return {
    category: queryResult.data as Category | undefined,
    ...queryResult,
  };
}
