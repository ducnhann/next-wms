/**
 * useConvexLayoutSync - Bridge Convex real-time queries to Zustand store
 * Handles initial load, live updates, and staged entity commits
 *
 * Key concepts:
 * - Entities from Convex have _id, get assigned tempId locally
 * - Draft entities have tempId only, get _id after commit
 * - commitEntity validates placement before Convex insert
 */

import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { useCallback, useEffect, useRef } from "react";
import type { StorageZone } from "@/lib/types";
import { useEditorConsole } from "@/store/editor-console-store";
import { useLayoutStore } from "@/store/layout-editor-store";
import type { StorageEntity } from "@/store/slices/entitiesSlice";

// ============================================================================
// Types
// ============================================================================

interface UseConvexLayoutSyncOptions {
  /** Called when an entity is created locally (commit) */
  onMutateCreate?: (entity: StorageEntity) => Promise<Id<"storage_zones">>;
  /** Called when an entity is updated locally */
  onMutateUpdate?: (
    id: Id<"storage_zones">,
    updates: Record<string, unknown>,
  ) => Promise<void>;
  /** Called when an entity is deleted locally */
  onMutateDelete?: (id: Id<"storage_zones">) => Promise<void>;
}

interface UseConvexLayoutSyncReturn {
  /** Whether initial load is in progress */
  isLoading: boolean;
  /** Whether connected to Convex */
  isConnected: boolean;
  /** Commit a draft entity to Convex */
  commitEntity: (tempId: string) => Promise<void>;
  /** Sync an existing entity's changes to Convex */
  syncEntity: (tempId: string) => Promise<void>;
  /** Force reload from Convex */
  reload: () => void;
}

// ============================================================================
// Transform Functions
// ============================================================================

/**
 * Transform Convex document to StorageEntity
 * Assigns a tempId for local tracking
 */
function convexToEntity(doc: StorageZone): StorageEntity {
  return {
    tempId: crypto.randomUUID(), // Will be overwritten if already exists
    _id: doc._id,
    status: "committed",
    parentId: doc.parentId ?? null,
    branchId: doc.branchId,
    name: doc.name,
    path: doc.path,
    storageBlockType: doc.storageBlockType as StorageEntity["storageBlockType"],
    zoneAttributes: doc.zoneAttributes as Record<string, unknown>,
    isDeleted: doc.isDeleted,
    deletedAt: doc.deletedAt,
  };
}

/**
 * Transform StorageEntity to Convex mutation args
 * Strips local-only fields (tempId, status)
 */
function entityToConvex(
  entity: StorageEntity,
): Omit<StorageZone, "_id" | "_creationTime"> {
  return {
    name: entity.name,
    branchId: entity.branchId,
    parentId: entity.parentId ?? undefined,
    path: entity.path,
    storageBlockType: entity.storageBlockType,
    zoneAttributes: entity.zoneAttributes,
    isDeleted: entity.isDeleted,
    deletedAt: entity.deletedAt,
  };
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to sync Zustand store with Convex real-time database
 *
 * @param branchId - The branch to load entities for
 * @param convexData - Data from Convex useQuery (externally managed)
 * @param options - Mutation callbacks
 */
export function useConvexLayoutSync(
  branchId: string | null,
  convexData: StorageZone[] | undefined,
  options: UseConvexLayoutSyncOptions = {},
): UseConvexLayoutSyncReturn {
  const { onMutateCreate, onMutateUpdate, onMutateDelete } = options;

  // Store actions
  const loadEntities = useLayoutStore((s) => s.loadEntities);
  const mergeEntities = useLayoutStore((s) => s.mergeEntities);
  const getEntity = useLayoutStore((s) => s.getEntity);
  const setEntityPending = useLayoutStore((s) => s.setEntityPending);
  const setEntityCommitted = useLayoutStore((s) => s.setEntityCommitted);
  const setEntityError = useLayoutStore((s) => s.setEntityError);
  const connect = useLayoutStore((s) => s.connect);
  const disconnect = useLayoutStore((s) => s.disconnect);
  const markSynced = useLayoutStore((s) => s.markSynced);
  const isConnected = useLayoutStore((s) => s.isConnected);
  const addPendingMutation = useLayoutStore((s) => s.addPendingMutation);
  const removePendingMutation = useLayoutStore((s) => s.removePendingMutation);
  const addSyncError = useLayoutStore((s) => s.addSyncError);
  const registerCommitCallback = useLayoutStore(
    (s) => s.registerCommitCallback,
  );

  // Track if initial load happened
  const hasLoadedRef = useRef(false);
  const isLoading = convexData === undefined;

  // Connect/disconnect on mount/unmount
  useEffect(() => {
    if (branchId) {
      connect(branchId);
    }
    return () => {
      disconnect();
      hasLoadedRef.current = false;
    };
  }, [branchId, connect, disconnect]);

  // Sync Convex data to store when it changes
  useEffect(() => {
    if (!convexData || !branchId) return;

    // Transform Convex data to entities
    const entities = convexData.map(convexToEntity);

    if (!hasLoadedRef.current) {
      // Initial load - replace all
      loadEntities(entities);
      hasLoadedRef.current = true;

      // Log loaded entities to console
      const log = useEditorConsole.getState();
      log.info(`Loaded ${entities.length} entities from Convex`, "sync");
    } else {
      // Subsequent update - merge to preserve local drafts
      mergeEntities(entities);

      const log = useEditorConsole.getState();
      log.debug(`Merged ${entities.length} entities from Convex`, "sync");
    }

    markSynced();
  }, [convexData, branchId, loadEntities, mergeEntities, markSynced]);

  /**
   * Commit a draft entity to Convex
   * Validates placement, then creates in Convex
   */
  const commitEntity = useCallback(
    async (tempId: string) => {
      const entity = getEntity(tempId);
      if (!entity) {
        console.warn(`commitEntity: entity ${tempId} not found`);
        return;
      }

      if (entity.status !== "draft" && entity.status !== "error") {
        console.warn(
          `commitEntity: entity ${tempId} is not a draft (status: ${entity.status})`,
        );
        return;
      }

      // Mark as pending
      setEntityPending(tempId);

      const mutationId = crypto.randomUUID();

      try {
        addPendingMutation({
          id: mutationId,
          entityId: tempId,
          type: "create",
          previousValue: entity.zoneAttributes,
        });

        if (onMutateCreate) {
          // Create in Convex
          const realId = await onMutateCreate(entity);
          // Update local entity with real ID
          setEntityCommitted(tempId, realId);
        }

        removePendingMutation(mutationId);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        setEntityError(tempId, errorMessage);
        addSyncError(`Failed to commit entity: ${errorMessage}`);
        removePendingMutation(mutationId);
        throw error;
      }
    },
    [
      getEntity,
      setEntityPending,
      setEntityCommitted,
      setEntityError,
      onMutateCreate,
      addPendingMutation,
      removePendingMutation,
      addSyncError,
    ],
  );

  // Register the commit callback so property panel can access it
  useEffect(() => {
    registerCommitCallback(commitEntity);
  }, [commitEntity, registerCommitCallback]);

  /**
   * Sync an existing entity's changes to Convex
   * For committed entities that have been modified
   */
  const syncEntity = useCallback(
    async (tempId: string) => {
      const entity = getEntity(tempId);
      if (!entity) {
        console.warn(`syncEntity: entity ${tempId} not found`);
        return;
      }

      // Must have a real ID to sync
      if (!entity._id) {
        console.warn(
          `syncEntity: entity ${tempId} has no Convex ID, use commitEntity instead`,
        );
        return;
      }

      const mutationId = crypto.randomUUID();

      try {
        addPendingMutation({
          id: mutationId,
          entityId: tempId,
          type: entity.isDeleted ? "delete" : "update",
          previousValue: entity.zoneAttributes,
        });

        if (entity.isDeleted) {
          // Delete mutation
          if (onMutateDelete) {
            await onMutateDelete(entity._id);
          }
        } else {
          // Update mutation
          if (onMutateUpdate) {
            await onMutateUpdate(entity._id, entity.zoneAttributes);
          }
        }

        removePendingMutation(mutationId);
      } catch (error) {
        addSyncError(`Failed to sync entity ${tempId}: ${String(error)}`);
        removePendingMutation(mutationId);
        throw error;
      }
    },
    [
      getEntity,
      onMutateUpdate,
      onMutateDelete,
      addPendingMutation,
      removePendingMutation,
      addSyncError,
    ],
  );

  // Force reload
  const reload = useCallback(() => {
    hasLoadedRef.current = false;
  }, []);

  return {
    isLoading,
    isConnected,
    commitEntity,
    syncEntity,
    reload,
  };
}

// ============================================================================
// Export transform functions for use in components
// ============================================================================

export { convexToEntity, entityToConvex };
