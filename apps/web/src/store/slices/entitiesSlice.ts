/**
 * Entities Slice - Normalized entity maps with CRUD operations
 * Part of the SmartStore state management system
 *
 * Dual ID System:
 * - tempId: Always present, created locally via crypto.randomUUID()
 * - _id: Only present after Convex commit
 *
 * Entity Status Lifecycle:
 * ghost → draft → pending → committed
 *                 └→ error
 */

import type { Id } from "@wms/backend/convex/_generated/dataModel";
import type { StateCreator } from "zustand";
import type { BlockType } from "@/lib/types/layout-editor/attribute-registry";
import {
  getDefaultAttributes,
  validateAttributes,
} from "@/lib/types/layout-editor/attribute-registry";
import { getCollisionDetector } from "@/lib/utils/collision";

// ============================================================================
// Types
// ============================================================================

/** Entity status in the lifecycle */
export type EntityStatus =
  | "ghost"
  | "draft"
  | "pending"
  | "committed"
  | "error";

export interface StorageEntity {
  /** Local temp ID - always present, used as map key until committed */
  tempId: string;
  /** Convex ID - only present after successful commit */
  _id?: Id<"storage_zones">;
  /** Current lifecycle status */
  status: EntityStatus;
  /** Error message when status is 'error' */
  validationError?: string;

  name: string;
  parentId: Id<"storage_zones"> | null;
  branchId: Id<"branches">;
  path: string;
  storageBlockType: BlockType;
  zoneAttributes: Record<string, unknown>;
  isDeleted: boolean;
  deletedAt?: number;
}

export interface EntitiesState {
  /** Normalized entity map - keyed by tempId */
  entities: Map<string, StorageEntity>;
  /** Mapping from tempId to real Convex ID after commit */
  tempIdToRealId: Map<string, Id<"storage_zones">>;
  /** Mapping from real Convex ID to tempId for reverse lookups */
  realIdToTempId: Map<Id<"storage_zones">, string>;

  /** Current ghost entity for placement preview (not in entities map) */
  ghostEntity: StorageEntity | null;

  // Indices for fast lookups
  entitiesByType: Map<BlockType, Set<string>>;
  entitiesByParent: Map<string, Set<string>>;
  entitiesByPath: Map<string, Set<string>>;

  // Dirty tracking for sync
  isDirty: boolean;
  pendingChanges: Set<string>;
}

export interface EntitiesActions {
  // ============ Ghost Preview ============
  /** Create a ghost entity for placement preview */
  setGhostEntity: (
    blockType: BlockType,
    parentId: Id<"storage_zones"> | null,
  ) => void;
  /** Update ghost entity position */
  updateGhostPosition: (position: { x: number; y: number; z: number }) => void;
  /** Update ghost entity attributes */
  updateGhostAttributes: (attrs: Partial<Record<string, unknown>>) => void;
  /** Confirm ghost placement - converts ghost to draft entity */
  confirmGhost: () => string | undefined;
  /** Cancel ghost - removes ghost entity */
  cancelGhost: () => void;

  // ============ CRUD Operations ============
  /** Add a new entity (creates with status='draft') */
  addEntity: (
    blockType: BlockType,
    parentId: Id<"storage_zones"> | null,
    name: string,
    attributes?: Partial<Record<string, unknown>>,
  ) => string | undefined;
  /** Update entity attributes */
  updateEntity: (
    tempId: string,
    updates: Partial<Record<string, unknown>>,
  ) => void;
  /** Remove/delete an entity */
  removeEntity: (tempId: string, soft?: boolean) => void;
  /** Discard a draft entity (hard delete, no sync) */
  discardEntity: (tempId: string) => void;

  // ============ Commit Flow ============
  /** Mark entity as pending commit */
  setEntityPending: (tempId: string) => void;
  /** Mark entity as committed with real Convex ID */
  setEntityCommitted: (tempId: string, realId: Id<"storage_zones">) => void;
  /** Mark entity with error status */
  setEntityError: (tempId: string, error: string) => void;
  /** Update entity's real ID after Convex returns it (legacy support) */
  updateEntityId: (tempId: string, realId: Id<"storage_zones">) => void;

  // ============ Batch Operations ============
  addEntityBatch: (
    entities: Omit<StorageEntity, "tempId" | "status">[],
  ) => string[];

  // ============ Queries ============
  getEntity: (tempId: string) => StorageEntity | undefined;
  getEntityByRealId: (realId: Id<"storage_zones">) => StorageEntity | undefined;
  getEntitiesByType: (blockType: BlockType) => StorageEntity[];
  getEntitiesByParent: (
    parentId: Id<"storage_zones"> | string,
  ) => StorageEntity[];
  getEntitiesByPath: (path: string) => StorageEntity[];
  getChildren: (
    parentId: Id<"storage_zones"> | string,
    blockType?: BlockType,
  ) => StorageEntity[];
  /** Get all entities with 'draft' status */
  getDraftEntities: () => StorageEntity[];

  // ============ Sync Helpers ============
  markClean: () => void;
  setDirty: (dirty: boolean) => void;

  // ============ State Management ============
  /** Load entities from Convex (converts to internal format) - replaces all */
  loadEntities: (entities: StorageEntity[]) => void;
  /** Merge entities from Convex - preserves local drafts/pending */
  mergeEntities: (entities: StorageEntity[]) => void;
  clearEntities: () => void;
}

export type EntitiesSlice = EntitiesState & EntitiesActions;

// ============================================================================
// Path Helpers
// ============================================================================

function getPathForBlockType(
  parentPath: string | null,
  blockType: BlockType,
): string {
  if (!parentPath) return blockType;
  return `${parentPath}.${blockType}`;
}

// ============================================================================
// Slice Creator
// ============================================================================

export const createEntitiesSlice: StateCreator<
  EntitiesSlice,
  [["zustand/immer", never]],
  [],
  EntitiesSlice
> = (set, get) => ({
  // Initial state
  entities: new Map(),
  tempIdToRealId: new Map(),
  realIdToTempId: new Map(),
  ghostEntity: null,
  entitiesByType: new Map(),
  entitiesByParent: new Map(),
  entitiesByPath: new Map(),
  isDirty: false,
  pendingChanges: new Set(),

  // ========================================================================
  // Ghost Preview Operations
  // ========================================================================

  setGhostEntity: (blockType, parentId) => {
    const parent = parentId
      ? get().entities.get(get().realIdToTempId.get(parentId) ?? parentId)
      : undefined;
    const parentPath = parent?.path ?? null;
    const path = getPathForBlockType(parentPath, blockType);
    const branchId = parent?.branchId as Id<"branches">;

    const defaultAttrs = getDefaultAttributes(blockType);

    // Add random height for floor to avoid z-fighting with existing floors
    if (blockType === "floor") {
      (defaultAttrs as Record<string, unknown>).height =
        0.1 + Math.random() * 0.3; // 0.1 to 0.4
    }

    const ghost: StorageEntity = {
      tempId: crypto.randomUUID(),
      status: "ghost",
      parentId,
      branchId,
      name: `New ${blockType}`,
      path,
      storageBlockType: blockType,
      zoneAttributes: defaultAttrs,
      isDeleted: false,
    };

    set({ ghostEntity: ghost });
  },

  updateGhostPosition: (position) => {
    set((state) => {
      if (state.ghostEntity) {
        state.ghostEntity.zoneAttributes = {
          ...state.ghostEntity.zoneAttributes,
          position,
        };
      }
    });
  },

  updateGhostAttributes: (attrs) => {
    set((state) => {
      if (state.ghostEntity) {
        // Handle parentId separately since it's at entity level, not in zoneAttributes
        if ("parentId" in attrs) {
          state.ghostEntity.parentId =
            attrs.parentId as Id<"storage_zones"> | null;
          // Remove from attrs so it's not duplicated in zoneAttributes
          const { parentId: _, ...restAttrs } = attrs;
          state.ghostEntity.zoneAttributes = {
            ...state.ghostEntity.zoneAttributes,
            ...restAttrs,
          };
        } else {
          state.ghostEntity.zoneAttributes = {
            ...state.ghostEntity.zoneAttributes,
            ...attrs,
          };
        }
      }
    });
  },

  confirmGhost: () => {
    const ghost = get().ghostEntity;
    if (!ghost) return undefined;

    const tempId = ghost.tempId;

    set((state) => {
      // Change status to draft and add to entities map
      const draftEntity: StorageEntity = {
        ...ghost,
        status: "draft",
      };

      state.entities.set(tempId, draftEntity);

      // Update indices
      if (!state.entitiesByType.has(ghost.storageBlockType)) {
        state.entitiesByType.set(ghost.storageBlockType, new Set());
      }
      state.entitiesByType.get(ghost.storageBlockType)?.add(tempId);

      if (ghost.parentId) {
        const parentKey =
          state.realIdToTempId.get(ghost.parentId) ?? ghost.parentId;
        if (!state.entitiesByParent.has(parentKey)) {
          state.entitiesByParent.set(parentKey, new Set());
        }
        state.entitiesByParent.get(parentKey)?.add(tempId);
      }

      if (!state.entitiesByPath.has(ghost.path)) {
        state.entitiesByPath.set(ghost.path, new Set());
      }
      state.entitiesByPath.get(ghost.path)?.add(tempId);

      state.ghostEntity = null;
      state.isDirty = true;
      state.pendingChanges.add(tempId);
    });

    return tempId;
  },

  cancelGhost: () => {
    set({ ghostEntity: null });
  },

  // ========================================================================
  // CRUD Operations
  // ========================================================================

  addEntity: (blockType, parentId, name, attributes = {}) => {
    const parent = parentId
      ? get().entities.get(get().realIdToTempId.get(parentId) ?? parentId)
      : undefined;
    const parentPath = parent?.path ?? null;
    const path = getPathForBlockType(parentPath, blockType);
    const branchId = parent?.branchId as Id<"branches">;

    // Merge with defaults and validate
    const defaultAttrs = getDefaultAttributes(blockType);
    const mergedAttrs = { ...defaultAttrs, ...attributes };
    const validation = validateAttributes(blockType, mergedAttrs);

    if (!validation.success) {
      console.error(`Invalid attributes for ${blockType}:`, validation.error);
    }

    const tempId = crypto.randomUUID();

    const entity: StorageEntity = {
      tempId,
      status: "draft",
      parentId,
      branchId,
      name,
      path,
      storageBlockType: blockType,
      zoneAttributes: mergedAttrs,
      isDeleted: false,
    };

    set((state) => {
      // Add to main map using tempId as key
      state.entities.set(tempId, entity);

      // Update type index
      if (!state.entitiesByType.has(blockType)) {
        state.entitiesByType.set(blockType, new Set());
      }
      state.entitiesByType.get(blockType)?.add(tempId);

      // Update parent index
      if (parentId) {
        const parentKey = state.realIdToTempId.get(parentId) ?? parentId;
        if (!state.entitiesByParent.has(parentKey)) {
          state.entitiesByParent.set(parentKey, new Set());
        }
        state.entitiesByParent.get(parentKey)?.add(tempId);
      }

      // Update path index
      if (!state.entitiesByPath.has(path)) {
        state.entitiesByPath.set(path, new Set());
      }
      state.entitiesByPath.get(path)?.add(tempId);

      state.isDirty = true;
      state.pendingChanges.add(tempId);
    });

    // Update collision detection for collidable entities
    if (blockType === "rack" || blockType === "obstacle") {
      const detector = getCollisionDetector();
      const newEntity = get().entities.get(tempId);
      if (detector && newEntity) {
        const collidable = {
          _id: tempId,
          position: mergedAttrs.position as { x: number; y: number; z: number },
          rotation: mergedAttrs.rotation as { x: number; y: number; z: number },
          dimensions: mergedAttrs.dimensions as {
            width: number;
            height: number;
            depth: number;
          },
        };
        detector.addEntity(collidable, blockType);
      }
    }

    return tempId;
  },

  updateEntity: (tempId, updates) => {
    const entity = get().entities.get(tempId);
    if (!entity) return;

    // Validate merged attributes
    const mergedAttrs = { ...entity.zoneAttributes, ...updates };
    const validation = validateAttributes(entity.storageBlockType, mergedAttrs);
    if (!validation.success) {
      console.error(
        `Invalid update for ${entity.storageBlockType}:`,
        validation.error,
      );
    }

    set((state) => {
      const e = state.entities.get(tempId);
      if (e) {
        e.zoneAttributes = { ...e.zoneAttributes, ...updates };
        // Sync name attribute to entity.name if present
        if ("name" in updates && typeof updates.name === "string") {
          e.name = updates.name;
        }
        // Clear any previous validation error when user makes changes
        if (e.status === "error") {
          e.status = "draft";
          e.validationError = undefined;
        }
        state.isDirty = true;
        state.pendingChanges.add(tempId);
      }
    });

    // Update collision for position/dimension changes
    if (
      entity.storageBlockType === "rack" ||
      entity.storageBlockType === "obstacle"
    ) {
      const posOrDimChanged =
        "position" in updates ||
        "dimensions" in updates ||
        "rotation" in updates;
      if (posOrDimChanged) {
        const detector = getCollisionDetector();
        const updated = get().entities.get(tempId);
        if (detector && updated) {
          const attrs = updated.zoneAttributes;
          const collidable = {
            _id: tempId,
            position: attrs.position as { x: number; y: number; z: number },
            rotation: attrs.rotation as { x: number; y: number; z: number },
            dimensions: attrs.dimensions as {
              width: number;
              height: number;
              depth: number;
            },
          };
          detector.updateEntity(
            collidable,
            entity.storageBlockType as "rack" | "obstacle",
          );
        }
      }
    }
  },

  removeEntity: (tempId, soft = true) => {
    const entity = get().entities.get(tempId);
    if (!entity) return;

    // Remove from collision detection
    if (
      entity.storageBlockType === "rack" ||
      entity.storageBlockType === "obstacle"
    ) {
      const detector = getCollisionDetector();
      detector?.removeEntity(tempId);
    }

    set((state) => {
      if (soft) {
        const e = state.entities.get(tempId);
        if (e) {
          e.isDeleted = true;
          e.deletedAt = Date.now();
        }
      } else {
        state.entities.delete(tempId);

        // Remove from ID mappings
        const realId = state.tempIdToRealId.get(tempId);
        if (realId) {
          state.tempIdToRealId.delete(tempId);
          state.realIdToTempId.delete(realId);
        }

        // Remove from indices
        state.entitiesByType.get(entity.storageBlockType)?.delete(tempId);
        if (entity.parentId) {
          const parentKey =
            state.realIdToTempId.get(entity.parentId) ?? entity.parentId;
          state.entitiesByParent.get(parentKey)?.delete(tempId);
        }
        state.entitiesByPath.get(entity.path)?.delete(tempId);
      }

      state.isDirty = true;
      state.pendingChanges.add(tempId);
    });

    // Recursively soft-delete children
    const children = get().getEntitiesByParent(tempId);
    children.forEach((child) => {
      get().removeEntity(child.tempId, soft);
    });
  },

  discardEntity: (tempId) => {
    const entity = get().entities.get(tempId);
    if (!entity) return;

    // Only allow discarding draft/error entities
    if (entity.status !== "draft" && entity.status !== "error") {
      console.warn(`Cannot discard entity with status: ${entity.status}`);
      return;
    }

    // Remove from collision detection
    if (
      entity.storageBlockType === "rack" ||
      entity.storageBlockType === "obstacle"
    ) {
      const detector = getCollisionDetector();
      detector?.removeEntity(tempId);
    }

    set((state) => {
      state.entities.delete(tempId);

      // Remove from indices
      state.entitiesByType.get(entity.storageBlockType)?.delete(tempId);
      if (entity.parentId) {
        const parentKey =
          state.realIdToTempId.get(entity.parentId) ?? entity.parentId;
        state.entitiesByParent.get(parentKey)?.delete(tempId);
      }
      state.entitiesByPath.get(entity.path)?.delete(tempId);

      // Remove from pending changes since it was never committed
      state.pendingChanges.delete(tempId);
    });
  },

  // ========================================================================
  // Commit Flow
  // ========================================================================

  setEntityPending: (tempId) => {
    set((state) => {
      const e = state.entities.get(tempId);
      if (e && e.status === "draft") {
        e.status = "pending";
        e.validationError = undefined;
      }
    });
  },

  setEntityCommitted: (tempId, realId) => {
    set((state) => {
      const e = state.entities.get(tempId);
      if (e) {
        e.status = "committed";
        e._id = realId;
        e.validationError = undefined;

        // Update ID mappings
        state.tempIdToRealId.set(tempId, realId);
        state.realIdToTempId.set(realId, tempId);
      }
    });
  },

  setEntityError: (tempId, error) => {
    set((state) => {
      const e = state.entities.get(tempId);
      if (e) {
        e.status = "error";
        e.validationError = error;
      }
    });
  },

  updateEntityId: (tempId, realId) => {
    // Alias for setEntityCommitted for backward compatibility
    get().setEntityCommitted(tempId, realId);
  },

  // ========================================================================
  // Batch Operations
  // ========================================================================

  addEntityBatch: (entities) => {
    const ids: string[] = [];
    entities.forEach((e) => {
      const tempId = get().addEntity(
        e.storageBlockType,
        e.parentId,
        e.name,
        e.zoneAttributes,
      );
      if (tempId) {
        ids.push(tempId);
      }
    });
    return ids;
  },

  // ========================================================================
  // Queries
  // ========================================================================

  getEntity: (tempId) => get().entities.get(tempId),

  getEntityByRealId: (realId) => {
    const tempId = get().realIdToTempId.get(realId);
    if (tempId) {
      return get().entities.get(tempId);
    }
    // Fallback: search by _id field
    for (const entity of get().entities.values()) {
      if (entity._id === realId) {
        return entity;
      }
    }
    return undefined;
  },

  getEntitiesByType: (blockType) => {
    const ids = get().entitiesByType.get(blockType);
    if (!ids) return [];
    return Array.from(ids)
      .map((tempId) => get().entities.get(tempId))
      .filter((e): e is StorageEntity => e !== undefined && !e.isDeleted);
  },

  getEntitiesByParent: (parentId) => {
    // Try finding by tempId first, then by realId
    const parentTempId =
      typeof parentId === "string" && get().entities.has(parentId)
        ? parentId
        : get().realIdToTempId.get(parentId as Id<"storage_zones">);

    const ids = get().entitiesByParent.get(parentTempId ?? parentId);
    if (!ids) return [];
    return Array.from(ids)
      .map((tempId) => get().entities.get(tempId))
      .filter((e): e is StorageEntity => e !== undefined && !e.isDeleted);
  },

  getEntitiesByPath: (path) => {
    const ids = get().entitiesByPath.get(path);
    if (!ids) return [];
    return Array.from(ids)
      .map((tempId) => get().entities.get(tempId))
      .filter((e): e is StorageEntity => e !== undefined && !e.isDeleted);
  },

  getChildren: (parentId, blockType) => {
    const children = get().getEntitiesByParent(parentId);
    if (!blockType) return children;
    return children.filter((c) => c.storageBlockType === blockType);
  },

  getDraftEntities: () => {
    return Array.from(get().entities.values()).filter(
      (e) => e.status === "draft" && !e.isDeleted,
    );
  },

  // ========================================================================
  // Sync Helpers
  // ========================================================================

  markClean: () => {
    set((state) => {
      state.isDirty = false;
      state.pendingChanges.clear();
    });
  },

  setDirty: (dirty) => {
    set((state) => {
      state.isDirty = dirty;
    });
  },

  // ========================================================================
  // State Management
  // ========================================================================

  loadEntities: (entities) => {
    set((state) => {
      // Clear existing
      state.entities.clear();
      state.tempIdToRealId.clear();
      state.realIdToTempId.clear();
      state.entitiesByType.clear();
      state.entitiesByParent.clear();
      state.entitiesByPath.clear();

      // PASS 1: Load all entities and build ID mappings first
      // This ensures parent tempId is available when building parent index
      const loadedTempIds: string[] = [];
      entities.forEach((entity) => {
        // If entity comes from Convex, it has _id but may not have tempId
        const tempId = entity.tempId || crypto.randomUUID();
        const fullEntity: StorageEntity = {
          ...entity,
          tempId,
          status: entity._id ? "committed" : (entity.status ?? "draft"),
        };

        state.entities.set(tempId, fullEntity);
        loadedTempIds.push(tempId);

        // Update ID mappings if this entity has a real ID
        if (entity._id) {
          state.tempIdToRealId.set(tempId, entity._id);
          state.realIdToTempId.set(entity._id, tempId);
        }

        // Type index
        if (!state.entitiesByType.has(entity.storageBlockType)) {
          state.entitiesByType.set(entity.storageBlockType, new Set());
        }
        state.entitiesByType.get(entity.storageBlockType)?.add(tempId);

        // Path index
        if (!state.entitiesByPath.has(entity.path)) {
          state.entitiesByPath.set(entity.path, new Set());
        }
        state.entitiesByPath.get(entity.path)?.add(tempId);
      });

      // PASS 2: Build parent index (now all ID mappings are complete)
      loadedTempIds.forEach((tempId) => {
        const entity = state.entities.get(tempId);
        if (!entity?.parentId) return;

        // Convert parent's real ID to tempId
        const parentTempId = state.realIdToTempId.get(entity.parentId);
        if (!parentTempId) {
          console.warn(
            `[loadEntities] Parent not found for ${entity.name}: parentId=${entity.parentId}`,
          );
          return;
        }

        if (!state.entitiesByParent.has(parentTempId)) {
          state.entitiesByParent.set(parentTempId, new Set());
        }
        state.entitiesByParent.get(parentTempId)?.add(tempId);
      });

      state.isDirty = false;
      state.pendingChanges.clear();
    });
  },

  mergeEntities: (entities) => {
    set((state) => {
      // Build a map of incoming entities by their real ID
      const incomingByRealId = new Map<string, StorageEntity>();
      for (const entity of entities) {
        if (entity._id) {
          incomingByRealId.set(entity._id, entity);
        }
      }

      // Track which incoming entities we've processed
      const processedRealIds = new Set<string>();

      // Update existing committed entities that match incoming data
      for (const [tempId, existing] of state.entities) {
        // Skip drafts, pending, and error entities - preserve local state
        if (
          existing.status === "draft" ||
          existing.status === "pending" ||
          existing.status === "error"
        ) {
          continue;
        }

        // Skip entities without a real ID
        if (!existing._id) continue;

        const incoming = incomingByRealId.get(existing._id);
        if (incoming) {
          // Update the entity with Convex data (preserve tempId and status)
          const updated: StorageEntity = {
            ...incoming,
            tempId: existing.tempId,
            status: existing.status,
          };
          state.entities.set(tempId, updated);
          processedRealIds.add(existing._id);
        }
      }

      // Add new entities from Convex (not yet in local store)
      for (const entity of entities) {
        if (!entity._id) continue;
        if (processedRealIds.has(entity._id)) continue;

        // Check if we already have this by realId
        const existingTempId = state.realIdToTempId.get(entity._id);
        if (existingTempId) {
          processedRealIds.add(entity._id);
          continue;
        }

        // New entity from Convex - add it
        const tempId = entity.tempId || crypto.randomUUID();
        const newEntity: StorageEntity = {
          ...entity,
          tempId,
          status: "committed",
        };

        state.entities.set(tempId, newEntity);

        // Update ID mappings
        state.tempIdToRealId.set(tempId, entity._id);
        state.realIdToTempId.set(entity._id, tempId);

        // Update type index
        if (!state.entitiesByType.has(entity.storageBlockType)) {
          state.entitiesByType.set(entity.storageBlockType, new Set());
        }
        state.entitiesByType.get(entity.storageBlockType)?.add(tempId);

        // Update path index
        if (!state.entitiesByPath.has(entity.path)) {
          state.entitiesByPath.set(entity.path, new Set());
        }
        state.entitiesByPath.get(entity.path)?.add(tempId);
      }

      // PASS 2: Build parent index for newly added entities
      for (const entity of entities) {
        if (!entity._id) continue;
        if (!entity.parentId) continue;

        const tempId = state.realIdToTempId.get(entity._id);
        if (!tempId) continue;

        const parentTempId = state.realIdToTempId.get(entity.parentId);
        if (!parentTempId) continue;

        if (!state.entitiesByParent.has(parentTempId)) {
          state.entitiesByParent.set(parentTempId, new Set());
        }
        state.entitiesByParent.get(parentTempId)?.add(tempId);
      }
    });
  },

  clearEntities: () => {
    set((state) => {
      state.entities.clear();
      state.tempIdToRealId.clear();
      state.realIdToTempId.clear();
      state.ghostEntity = null;
      state.entitiesByType.clear();
      state.entitiesByParent.clear();
      state.entitiesByPath.clear();
      state.isDirty = false;
      state.pendingChanges.clear();
    });
  },
});
