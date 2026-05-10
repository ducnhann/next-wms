/**
 * useSyncOnUndoRedo - Syncs temporal store (undo/redo) changes to Convex
 * Subscribes to zundo temporal store and triggers Convex mutations on state changes
 *
 * Updated to work with dual ID system:
 * - Entities are keyed by tempId (string)
 * - Only sync entities that have a real _id (committed to Convex)
 */

import { api } from "@wms/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import type { StorageEntity } from "@/store/layout-editor-store";
import { useLayoutStore } from "@/store/layout-editor-store";

// ============================================================================
// Types
// ============================================================================

type EntitiesMap = Map<string, StorageEntity>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Diff two entity maps and return tempIds of changed entities
 * Only returns entities that have a real _id (can be synced to Convex)
 */
function diffEntities(
  prevEntities: EntitiesMap,
  currEntities: EntitiesMap,
): string[] {
  const changedIds: string[] = [];
  const allIds = new Set([...prevEntities.keys(), ...currEntities.keys()]);

  for (const id of allIds) {
    const prev = prevEntities.get(id);
    const curr = currEntities.get(id);

    // Skip if current entity doesn't have a real _id (draft/uncommitted)
    if (curr && !curr._id) continue;
    if (prev && !prev._id && !curr) continue;

    // Entity added or removed
    if (!prev || !curr) {
      changedIds.push(id);
      continue;
    }

    // Entity attributes changed
    if (
      JSON.stringify(prev.zoneAttributes) !==
      JSON.stringify(curr.zoneAttributes)
    ) {
      changedIds.push(id);
      continue;
    }

    // Deletion status changed
    if (prev.isDeleted !== curr.isDeleted) {
      changedIds.push(id);
    }
  }

  return changedIds;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook that syncs undo/redo operations to Convex
 * Should be mounted once at the layout editor level
 */
export function useSyncOnUndoRedo() {
  const updateMutation = useMutation(api.storageZones.update);
  const deleteMutation = useMutation(api.storageZones.softDelete);

  // Track previous state for diffing
  const prevEntitiesRef = useRef<EntitiesMap>(new Map());
  const isSyncingRef = useRef(false);

  useEffect(() => {
    // Initialize previous state
    prevEntitiesRef.current = new Map(useLayoutStore.getState().entities);

    // Subscribe to store changes
    const unsubscribe = useLayoutStore.subscribe((state) => {
      // Skip if we're currently syncing (avoid loops)
      if (isSyncingRef.current) return;

      const currentEntities = state.entities;
      const prevEntities = prevEntitiesRef.current;

      // Find changed entities
      const changedIds = diffEntities(prevEntities, currentEntities);

      if (changedIds.length > 0) {
        // Mark as syncing
        isSyncingRef.current = true;

        // Sync each changed entity to Convex
        const syncPromises = changedIds.map(async (tempId) => {
          const entity = currentEntities.get(tempId);
          if (!entity) return;

          // Only sync if entity has a real Convex ID
          const realId = entity._id;
          if (!realId) return;

          try {
            if (entity.isDeleted) {
              await deleteMutation({ id: realId });
            } else {
              await updateMutation({
                id: realId,
                zoneAttributes: entity.zoneAttributes,
                name: entity.name,
              });
            }
          } catch (err) {
            console.error(
              `[useSyncOnUndoRedo] Failed to sync entity ${tempId}:`,
              err,
            );
          }
        });

        // Wait for all syncs to complete
        Promise.all(syncPromises).finally(() => {
          isSyncingRef.current = false;
        });
      }

      // Update previous state
      prevEntitiesRef.current = new Map(currentEntities);
    });

    return unsubscribe;
  }, [updateMutation, deleteMutation]);
}

/**
 * Alternative: Hook that specifically listens to undo/redo events
 * Uses zundo's temporal store subscription
 */
export function useSyncOnTemporalChange() {
  const updateMutation = useMutation(api.storageZones.update);
  const deleteMutation = useMutation(api.storageZones.softDelete);

  useEffect(() => {
    let prevPastLength = useLayoutStore.temporal.getState().pastStates.length;
    let prevFutureLength =
      useLayoutStore.temporal.getState().futureStates.length;

    // Subscribe to temporal store
    const unsubscribe = useLayoutStore.temporal.subscribe((temporalState) => {
      const currentPastLength = temporalState.pastStates.length;
      const currentFutureLength = temporalState.futureStates.length;

      // Detect undo: past shrinks, future grows
      const wasUndo =
        currentPastLength < prevPastLength &&
        currentFutureLength > prevFutureLength;

      // Detect redo: past grows, future shrinks
      const wasRedo =
        currentPastLength > prevPastLength &&
        currentFutureLength < prevFutureLength;

      if (wasUndo || wasRedo) {
        // Get current entities and sync changed ones
        const currentEntities = useLayoutStore.getState().entities;

        // For simplicity, we sync ALL entities that have pending changes
        // A more efficient approach would track which entities changed
        const pendingChanges = useLayoutStore.getState().pendingChanges;

        for (const tempId of pendingChanges) {
          const entity = currentEntities.get(tempId);
          if (!entity) continue;

          // Only sync if entity has a real Convex ID
          const realId = entity._id;
          if (!realId) continue;

          if (entity.isDeleted) {
            deleteMutation({ id: realId }).catch(console.error);
          } else {
            updateMutation({
              id: realId,
              zoneAttributes: entity.zoneAttributes,
              name: entity.name,
            }).catch(console.error);
          }
        }
      }

      prevPastLength = currentPastLength;
      prevFutureLength = currentFutureLength;
    });

    return unsubscribe;
  }, [updateMutation, deleteMutation]);
}
