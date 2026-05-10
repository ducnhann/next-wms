import { RackTypes } from "@/lib/types/layout-editor/definition";
import type { Entity } from "@/lib/types/layout-editor/entities";

/**
 * Utility to create and manage categorical types
 * Provides type guards, assertions, and exhaustive checks
 * @example
 * ```ts
 * const ColorCategory = createCategory(['red', 'green', 'blue'] as const);
 * type Color = typeof ColorCategory.values[number];
 * if (ColorCategory.is(someValue)) { ... }
 * ColorCategory.assert(someValue);
 * ColorCategory.exhaustive(someValue);
 * ```
 */
export function createCategory<T extends string>(values: readonly T[]) {
  const set = new Set(values);
  const is = (val: unknown): val is T =>
    typeof val === "string" && set.has(val as T);

  return {
    values: values as readonly T[],
    set,
    is,
    assert(val: unknown): T {
      if (!is(val)) {
        throw new Error(
          `Expected one of ${[...values].join(", ")}, got ${String(val)}`,
        );
      }
      return val;
    },
    exhaustive(_: never): never {
      throw new Error("Non-exhaustive match");
    },
  } as const;
}

declare const __brand: unique symbol;
type Brand<B> = { [__brand]: B };

/**
 * Branded type to create nominal typing in TypeScript
 * @example
 * ```ts
 * type UserId = Branded<string, "UserId">
 * const id: UserId = "abc123" as UserId;
 * function getUserById(id: UserId) { ... }
 * ```
 */
export type Branded<T, B> = T & Brand<B>;

/**
 * Helper to get display name for an entity
 *
 * @param entity - The entity (Rack or Obstacle)
 * @returns Display name string
 */
export function getEntityDisplayName(entity: Entity): string {
  if ("type" in entity && entity.type) {
    // Check if it's a Rack type or Obstacle type
    if (RackTypes.is(entity.type)) {
      return `Rack (${entity.type})`;
    }
    // Obstacle types or others implementation
    return entity.type.charAt(0).toUpperCase() + entity.type.slice(1);
  }
  return "Entity";
}
