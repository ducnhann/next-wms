/**
 * useEntityMutation - Central hook for entity modifications
 * Implements: Validation → Collision Check → Optimistic Update → Convex Commit
 */

import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback } from "react";
import { toast } from "sonner";
import type { BlockType } from "@/lib/types/layout-editor/attribute-registry";
import { validateAttributes } from "@/lib/types/layout-editor/attribute-registry";
import { checkZoneOverlap } from "@/lib/utils/collision";
import { getCollisionService } from "@/lib/utils/collision-service";
import { logDebug } from "@/store/editor-console-store";
import { useLayoutStore } from "@/store/layout-editor-store";

// ============================================================================
// Types
// ============================================================================

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Dimensions {
  width: number;
  height: number;
  depth: number;
}

interface CommitResult {
  success: boolean;
  error?: string;
}

interface CommitOptions {
  /** Skip collision check (e.g., for non-geometric changes) */
  skipCollision?: boolean;
  /** Show toast on error */
  showToast?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if updates contain geometry-related changes
 */
function hasGeometryChange(updates: Record<string, unknown>): boolean {
  return (
    "position" in updates || "rotation" in updates || "dimensions" in updates
  );
}

/**
 * Validate floor resize - check if children would be outside new bounds
 */
function validateFloorResize(
  floorTempId: string,
  newDimensions: { width: number; length?: number; depth?: number },
): { valid: boolean; reason?: string } {
  const store = useLayoutStore.getState();
  const floor = store.getEntity(floorTempId);
  if (!floor || floor.storageBlockType !== "floor") {
    return { valid: true }; // Not a floor, skip check
  }

  // Get all children of this floor
  const children = store.getChildren(floorTempId);
  const newWidth = newDimensions.width;
  const newLength = newDimensions.length ?? newDimensions.depth ?? 50;

  for (const child of children) {
    const pos = child.zoneAttributes.position as Vec3 | undefined;
    const dims = child.zoneAttributes.dimensions as Dimensions | undefined;

    if (!pos || !dims) continue;

    // Check if child extends beyond new floor bounds
    const childMaxX = pos.x + dims.width;
    const childMaxZ = pos.z + dims.depth;

    if (childMaxX > newWidth || childMaxZ > newLength) {
      return {
        valid: false,
        reason: `Cannot resize: "${child.name}" would be outside floor bounds`,
      };
    }

    // Also check minimum bounds (position < 0)
    if (pos.x < 0 || pos.z < 0) {
      return {
        valid: false,
        reason: `Cannot resize: "${child.name}" is at negative position`,
      };
    }
  }

  // Check for overlap with other floors
  const floorPos = floor.zoneAttributes.position as Vec3 | undefined;
  const overlapCheck = checkZoneOverlap(
    floorPos ?? { x: 0, y: 0, z: 0 },
    { width: newWidth, length: newLength },
    floorTempId,
  );
  if (overlapCheck.hasOverlap) {
    return {
      valid: false,
      reason: `Cannot resize: would overlap with "${overlapCheck.overlappingZoneName}"`,
    };
  }

  return { valid: true };
}

/**
 * Get the 4 corners of an entity's bounding box in XZ plane (global coords)
 * Used for checking if entity is fully within a floor zone
 */
function getEntityCorners(
  position: Vec3,
  dimensions: Dimensions,
  rotationY = 0,
): { x: number; z: number }[] {
  const halfW = dimensions.width / 2;
  const halfD = dimensions.depth / 2;
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);

  // Entity center (position is at corner, shift to center)
  const centerX = position.x + halfW;
  const centerZ = position.z + halfD;

  // Calculate rotated corners
  const corners = [
    { localX: -halfW, localZ: -halfD }, // bottom-left
    { localX: halfW, localZ: -halfD }, // bottom-right
    { localX: halfW, localZ: halfD }, // top-right
    { localX: -halfW, localZ: halfD }, // top-left
  ];

  return corners.map(({ localX, localZ }) => ({
    x: localX * cos - localZ * sin + centerX,
    z: localX * sin + localZ * cos + centerZ,
  }));
}

/**
 * Check if all 4 corners of an entity are within a floor's bounds
 */
function isFullyWithinFloor(
  entityPosition: Vec3,
  entityDimensions: Dimensions,
  entityRotationY: number,
  floorPosition: Vec3,
  floorDimensions: { width: number; length: number },
): boolean {
  const corners = getEntityCorners(
    entityPosition,
    entityDimensions,
    entityRotationY,
  );

  const minX = floorPosition.x;
  const maxX = floorPosition.x + floorDimensions.width;
  const minZ = floorPosition.z;
  const maxZ = floorPosition.z + floorDimensions.length;

  return corners.every(
    (corner) =>
      corner.x >= minX &&
      corner.x <= maxX &&
      corner.z >= minZ &&
      corner.z <= maxZ,
  );
}

/**
 * Find the closest floor to a given position
 * Returns the floor that contains most of the entity, or the nearest one
 */
function findClosestFloor(
  entityPosition: Vec3,
  entityDimensions: Dimensions,
  entityRotationY: number,
  excludeFloorTempId?: string,
): {
  floorTempId: string;
  floorRealId: Id<"storage_zones"> | undefined;
} | null {
  const store = useLayoutStore.getState();

  // Get entity center position
  const centerX = entityPosition.x + entityDimensions.width / 2;
  const centerZ = entityPosition.z + entityDimensions.depth / 2;

  let bestFloor: {
    tempId: string;
    realId: Id<"storage_zones"> | undefined;
    distance: number;
    containsCenter: boolean;
    cornerCount: number;
  } | null = null;

  for (const [tempId, entity] of store.entities) {
    if (entity.storageBlockType !== "floor") continue;
    if (entity.isDeleted) continue;
    if (excludeFloorTempId && tempId === excludeFloorTempId) continue;

    const floorPos = entity.zoneAttributes.position as Vec3 | undefined;
    const floorDims = entity.zoneAttributes.dimensions as
      | { width: number; length: number }
      | undefined;

    if (!floorPos || !floorDims) continue;

    const floorMinX = floorPos.x;
    const floorMaxX = floorPos.x + floorDims.width;
    const floorMinZ = floorPos.z;
    const floorMaxZ = floorPos.z + floorDims.length;

    // Check if entity center is within this floor
    const containsCenter =
      centerX >= floorMinX &&
      centerX <= floorMaxX &&
      centerZ >= floorMinZ &&
      centerZ <= floorMaxZ;

    // Count how many corners are within this floor
    const corners = getEntityCorners(
      entityPosition,
      entityDimensions,
      entityRotationY,
    );
    const cornerCount = corners.filter(
      (c) =>
        c.x >= floorMinX &&
        c.x <= floorMaxX &&
        c.z >= floorMinZ &&
        c.z <= floorMaxZ,
    ).length;

    // Calculate distance from entity center to floor center
    const floorCenterX = (floorMinX + floorMaxX) / 2;
    const floorCenterZ = (floorMinZ + floorMaxZ) / 2;
    const dx = centerX - floorCenterX;
    const dz = centerZ - floorCenterZ;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Prioritize: center contained > more corners > closer distance
    if (!bestFloor) {
      bestFloor = {
        tempId,
        realId: entity._id,
        distance,
        containsCenter,
        cornerCount,
      };
    } else {
      const betterCenter = containsCenter && !bestFloor.containsCenter;
      const sameCenter = containsCenter === bestFloor.containsCenter;
      const moreCorners = sameCenter && cornerCount > bestFloor.cornerCount;
      const closer =
        sameCenter &&
        cornerCount === bestFloor.cornerCount &&
        distance < bestFloor.distance;

      if (betterCenter || moreCorners || closer) {
        bestFloor = {
          tempId,
          realId: entity._id,
          distance,
          containsCenter,
          cornerCount,
        };
      }
    }
  }

  if (!bestFloor) return null;

  return {
    floorTempId: bestFloor.tempId,
    floorRealId: bestFloor.realId,
  };
}

/**
 * Clamp position so all 4 corners stay within floor bounds
 */
function clampToFloorBounds(
  entityPosition: Vec3,
  entityDimensions: Dimensions,
  entityRotationY: number,
  floorPosition: Vec3,
  floorDimensions: { width: number; length: number },
): Vec3 {
  // For simplicity with rotation, use bounding box approach
  const corners = getEntityCorners(
    entityPosition,
    entityDimensions,
    entityRotationY,
  );

  // Find min/max of corners
  let minCornerX = corners[0].x;
  let maxCornerX = corners[0].x;
  let minCornerZ = corners[0].z;
  let maxCornerZ = corners[0].z;
  for (const c of corners) {
    minCornerX = Math.min(minCornerX, c.x);
    maxCornerX = Math.max(maxCornerX, c.x);
    minCornerZ = Math.min(minCornerZ, c.z);
    maxCornerZ = Math.max(maxCornerZ, c.z);
  }

  // Floor bounds
  const floorMinX = floorPosition.x;
  const floorMaxX = floorPosition.x + floorDimensions.width;
  const floorMinZ = floorPosition.z;
  const floorMaxZ = floorPosition.z + floorDimensions.length;

  // Calculate how much to shift
  let shiftX = 0;
  let shiftZ = 0;

  if (minCornerX < floorMinX) shiftX = floorMinX - minCornerX;
  else if (maxCornerX > floorMaxX) shiftX = floorMaxX - maxCornerX;

  if (minCornerZ < floorMinZ) shiftZ = floorMinZ - minCornerZ;
  else if (maxCornerZ > floorMaxZ) shiftZ = floorMaxZ - maxCornerZ;

  return {
    x: entityPosition.x + shiftX,
    y: entityPosition.y,
    z: entityPosition.z + shiftZ,
  };
}

/**
 * Check collision for proposed position/rotation/dimensions
 * Uses CollisionService with spatial grid for O(1) nearby entity lookup
 */
function checkCollisionForUpdate(
  entityId: string,
  currentAttrs: Record<string, unknown>,
  updates: Record<string, unknown>,
  blockType: BlockType,
  parentId?: Id<"storage_zones"> | string | null,
): { hasCollision: boolean; reason?: string } {
  // Only check collision for racks and obstacles
  if (blockType !== "rack" && blockType !== "obstacle") {
    return { hasCollision: false };
  }

  // Merge current with updates
  const newPosition =
    (updates.position as Vec3) ?? (currentAttrs.position as Vec3);
  const newRotation = (updates.rotation as Vec3) ??
    (currentAttrs.rotation as Vec3) ?? { x: 0, y: 0, z: 0 };
  const newDimensions =
    (updates.dimensions as Dimensions) ??
    (currentAttrs.dimensions as Dimensions);

  if (!newPosition || !newDimensions || !parentId) {
    return { hasCollision: false };
  }

  // Use CollisionService for optimized spatial grid lookup
  const collisionService = getCollisionService();
  const result = collisionService.checkCollision(
    entityId,
    newPosition,
    newDimensions,
    newRotation.y ?? 0,
    parentId as string,
  );

  return {
    hasCollision: result.hasCollision,
    reason: result.reason,
  };
}

// ============================================================================
// Hook
// ============================================================================

export function useEntityMutation() {
  // Convex mutations
  const createMutation = useMutation(api.storageZones.create);
  const updateMutation = useMutation(api.storageZones.update);
  const deleteMutation = useMutation(api.storageZones.softDelete);

  // Store actions
  const updateEntity = useLayoutStore((s) => s.updateEntity);
  const removeEntity = useLayoutStore((s) => s.removeEntity);
  const getEntity = useLayoutStore((s) => s.getEntity);

  /**
   * Commit an entity update with validation and collision checking
   */
  const commitUpdate = useCallback(
    async (
      id: string, // Now accepts tempId
      updates: Record<string, unknown>,
      options: CommitOptions = {},
    ): Promise<CommitResult> => {
      const { skipCollision = false, showToast = true } = options;

      logDebug(
        `commitUpdate called: ${id}, updates=${JSON.stringify(Object.keys(updates))}, skipCollision=${skipCollision}`,
        "collision",
      );

      // Get current entity
      const entity = getEntity(id);
      if (!entity) {
        return { success: false, error: "Entity not found" };
      }

      logDebug(
        `Entity found: ${entity.name} (${entity.storageBlockType})`,
        "collision",
      );

      // 1. VALIDATE - Merge and validate attributes
      const mergedAttrs = { ...entity.zoneAttributes, ...updates };
      const validation = validateAttributes(
        entity.storageBlockType,
        mergedAttrs,
      );

      if (!validation.success) {
        const error = `Validation failed: ${validation.error?.message ?? "Unknown error"}`;
        if (showToast) toast.error(error);
        return { success: false, error };
      }

      // 2. FLOOR RESIZE CHECK - Ensure children stay in bounds
      if (
        entity.storageBlockType === "floor" &&
        "dimensions" in updates &&
        !skipCollision
      ) {
        const newDims = updates.dimensions as {
          width: number;
          length?: number;
          depth?: number;
        };
        const floorCheck = validateFloorResize(id, newDims);
        if (!floorCheck.valid) {
          if (showToast) toast.error(floorCheck.reason ?? "Invalid resize");
          return { success: false, error: floorCheck.reason };
        }
      }

      // 3. FLOOR TRANSFER & 4-CORNER BOUNDS CHECK - For rack/obstacle/entrypoint/doorpoint position changes
      let finalUpdates = { ...updates };
      let newParentId = entity.parentId;

      const typesWithFloorTransfer = [
        "rack",
        "obstacle",
        "entrypoint",
        "doorpoint",
      ];
      if (
        typesWithFloorTransfer.includes(entity.storageBlockType) &&
        "position" in updates &&
        !skipCollision
      ) {
        const newPosition = updates.position as Vec3;
        // For point entities (entrypoint/doorpoint), use minimal dimensions for floor checks
        const isPointEntity =
          entity.storageBlockType === "entrypoint" ||
          entity.storageBlockType === "doorpoint";
        const dims = isPointEntity
          ? { width: 0.1, height: 0.1, depth: 0.1, length: 0.1 }
          : ((updates.dimensions ??
              entity.zoneAttributes.dimensions) as Dimensions);
        const rotY =
          (
            (updates.rotation ?? entity.zoneAttributes.rotation) as
              | Vec3
              | undefined
          )?.y ?? 0;

        // Get current parent floor
        const store = useLayoutStore.getState();
        const currentFloor = entity.parentId
          ? (store.getEntityByRealId(entity.parentId) ??
            store.getEntity(entity.parentId as string))
          : null;

        // Check if entity is fully within current floor
        let isWithinCurrentFloor = false;
        if (currentFloor?.storageBlockType === "floor") {
          const floorPos = currentFloor.zoneAttributes.position as Vec3;
          const floorDims = currentFloor.zoneAttributes.dimensions as {
            width: number;
            length: number;
          };
          isWithinCurrentFloor = isFullyWithinFloor(
            newPosition,
            dims,
            rotY,
            floorPos,
            floorDims,
          );
        }

        if (!isWithinCurrentFloor) {
          // Entity moved outside current floor - find closest floor
          const closestFloor = findClosestFloor(newPosition, dims, rotY);

          if (closestFloor) {
            // Get the floor entity
            const targetFloor = store.getEntity(closestFloor.floorTempId);
            if (targetFloor) {
              const targetFloorPos = targetFloor.zoneAttributes
                .position as Vec3;
              const targetFloorDims = targetFloor.zoneAttributes.dimensions as {
                width: number;
                length: number;
              };

              // Clamp position to target floor bounds using 4-corner check
              const clampedPosition = clampToFloorBounds(
                newPosition,
                dims,
                rotY,
                targetFloorPos,
                targetFloorDims,
              );
              finalUpdates.position = clampedPosition;

              // Use floor's _id (real Convex ID) - only set if floor has been saved
              // If floor is a draft (no _id), keep current parent until floor is saved
              if (targetFloor._id) {
                newParentId = targetFloor._id;

                // Trigger re-parent if floor changed
                if (entity.parentId !== newParentId) {
                  finalUpdates = {
                    ...finalUpdates,
                    __newParentId: newParentId,
                  };
                }
              }
            }
          } else {
            // No valid floor found - reject the move
            if (showToast)
              toast.error("Entity must be placed within a floor zone");
            return { success: false, error: "No valid floor zone found" };
          }
        }
      }

      // 4. COLLISION CHECK - For geometry changes
      const hasGeoChange = hasGeometryChange(finalUpdates);
      logDebug(
        `Collision check condition: hasGeometryChange=${hasGeoChange}, skipCollision=${skipCollision}, type=${entity.storageBlockType}`,
        "collision",
      );

      if (hasGeoChange && !skipCollision) {
        logDebug(`Entering collision check for ${entity.name}`, "collision");
        const collision = checkCollisionForUpdate(
          id,
          entity.zoneAttributes,
          finalUpdates,
          entity.storageBlockType,
          newParentId,
        );

        if (collision.hasCollision) {
          const error = collision.reason ?? "Collision detected";
          if (showToast) toast.error(error);
          return { success: false, error };
        }
      }

      // 5. OPTIMISTIC UPDATE - Update local state immediately
      // Remove internal __newParentId marker before updating
      const { __newParentId, ...cleanUpdates } = finalUpdates as Record<
        string,
        unknown
      > & { __newParentId?: unknown };
      updateEntity(id, cleanUpdates);

      // Handle parent change for cross-floor transfers
      if (__newParentId && __newParentId !== entity.parentId) {
        // Update parentId in the store (this needs to be handled by the store)
        // For now, include it in the updates sent to Convex
        console.log(
          `[commitUpdate] Floor transfer: ${entity.parentId} -> ${__newParentId}`,
        );
      }

      // Merge with original for Convex update
      const mergedAttrsForCommit = {
        ...entity.zoneAttributes,
        ...cleanUpdates,
      };

      // 6. COMMIT - Sync to Convex (only if entity has a real _id)
      if (!entity._id) {
        // Entity is a draft, no Convex ID yet - just update locally
        return { success: true };
      }

      try {
        // Sync name from zoneAttributes to entity name if present
        const entityName =
          (mergedAttrsForCommit.name as string | undefined) ?? entity.name;

        await updateMutation({
          id: entity._id,
          zoneAttributes: mergedAttrsForCommit,
          name: entityName,
          // Include new parentId if floor transfer occurred
          ...(__newParentId && {
            parentId: __newParentId as Id<"storage_zones">,
          }),
        });
        return { success: true };
      } catch (err) {
        // Rollback on error - revert to original attributes
        updateEntity(id, entity.zoneAttributes);
        const error =
          err instanceof Error ? err.message : "Failed to save changes";
        if (showToast) toast.error(error);
        return { success: false, error };
      }
    },
    [getEntity, updateEntity, updateMutation],
  );

  /**
   * Commit a new entity creation
   */
  const commitCreate = useCallback(
    async (
      blockType: BlockType,
      parentId: Id<"storage_zones"> | null,
      name: string,
      attributes: Record<string, unknown>,
      branchId: Id<"branches">,
      options: CommitOptions = {},
    ): Promise<CommitResult & { id?: Id<"storage_zones"> }> => {
      const { skipCollision = false, showToast = true } = options;

      // 1. VALIDATE
      const validation = validateAttributes(blockType, attributes);
      if (!validation.success) {
        const error = `Validation failed: ${validation.error?.message ?? "Unknown error"}`;
        if (showToast) toast.error(error);
        return { success: false, error };
      }

      // 2. COLLISION CHECK
      if (hasGeometryChange(attributes) && !skipCollision) {
        const collision = checkCollisionForUpdate(
          "" as Id<"storage_zones">, // No ID yet
          {},
          attributes,
          blockType,
          parentId,
        );

        if (collision.hasCollision) {
          const error = collision.reason ?? "Collision detected";
          if (showToast) toast.error(error);
          return { success: false, error };
        }
      }

      // 3. COMMIT to Convex first (get real ID)
      try {
        const parent = parentId
          ? useLayoutStore.getState().entities.get(parentId)
          : null;
        const path = parent ? `${parent.path}.${blockType}` : blockType;

        const mutationArgs = {
          branchId,
          name,
          path,
          storageBlockType: blockType,
          zoneAttributes: attributes,
          ...(parentId !== null && { parentId }),
        };

        const newId = await createMutation(mutationArgs);

        // 4. Add to local store with real ID
        // Note: The store will get updated via Convex subscription
        // but we can also add optimistically here

        return { success: true, id: newId };
      } catch (err) {
        const error =
          err instanceof Error ? err.message : "Failed to create entity";
        if (showToast) toast.error(error);
        return { success: false, error };
      }
    },
    [createMutation],
  );

  /**
   * Commit an entity deletion
   */
  const commitDelete = useCallback(
    async (
      id: string, // Now accepts tempId
      options: CommitOptions = {},
    ): Promise<CommitResult> => {
      const { showToast = true } = options;

      const entity = getEntity(id);
      if (!entity) {
        return { success: false, error: "Entity not found" };
      }

      // 1. OPTIMISTIC DELETE - Mark as deleted locally
      removeEntity(id, true); // soft delete

      // 2. COMMIT to Convex (only if entity has a real _id)
      if (!entity._id) {
        // Entity is a draft, just remove locally
        return { success: true };
      }

      try {
        await deleteMutation({ id: entity._id });
        return { success: true };
      } catch (err) {
        // Rollback - restore entity
        // Note: Would need to implement restore in entitiesSlice
        const error =
          err instanceof Error ? err.message : "Failed to delete entity";
        if (showToast) toast.error(error);
        return { success: false, error };
      }
    },
    [getEntity, removeEntity, deleteMutation],
  );

  /**
   * Sync an entity to Convex without validation/collision
   * Used for undo/redo operations
   */
  const syncToConvex = useCallback(
    async (id: Id<"storage_zones">): Promise<void> => {
      const entity = useLayoutStore.getState().entities.get(id);
      if (!entity) return;

      try {
        if (entity.isDeleted) {
          await deleteMutation({ id });
        } else {
          await updateMutation({
            id,
            zoneAttributes: entity.zoneAttributes,
            name: entity.name,
          });
        }
      } catch (err) {
        console.error("[useEntityMutation] Failed to sync entity:", err);
      }
    },
    [updateMutation, deleteMutation],
  );

  return {
    commitUpdate,
    commitCreate,
    commitDelete,
    syncToConvex,
  };
}
