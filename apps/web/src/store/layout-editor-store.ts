/**
 * SmartStore Layout Store
 * Combined store using slice pattern with zundo temporal middleware
 */

import { enableMapSet } from "immer";
import { temporal } from "zundo";
// Helper types for slice creators to accept the full store state/set/get
import type { StateCreator } from "zustand";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { BlockType } from "@/lib/types/layout-editor/attribute-registry";
import type {
  CameraSlice,
  ConfigSlice,
  EntitiesSlice,
  EntityStatus,
  SelectionSlice,
  StorageEntity,
  SyncSlice,
} from "./slices";
import {
  createCameraSlice,
  createConfigSlice,
  createEntitiesSlice,
  createSelectionSlice,
  createSyncSlice,
} from "./slices";

type LayoutStoreCreator<T> = StateCreator<
  LayoutStoreState,
  [["zustand/immer", never]],
  [],
  T
>;

// Enable Immer MapSet plugin for Map and Set support
enableMapSet();

// ============================================================================
// Combined Store Type
// ============================================================================

export type LayoutStoreState = EntitiesSlice &
  SelectionSlice &
  CameraSlice &
  SyncSlice &
  ConfigSlice;

// ============================================================================
// Create Combined Store with Zundo
// ============================================================================

export const useLayoutStore = create<LayoutStoreState>()(
  temporal(
    immer((...args) => ({
      ...(createEntitiesSlice as LayoutStoreCreator<EntitiesSlice>)(...args),
      ...(createSelectionSlice as LayoutStoreCreator<SelectionSlice>)(...args),
      ...(createCameraSlice as LayoutStoreCreator<CameraSlice>)(...args),
      ...(createSyncSlice as LayoutStoreCreator<SyncSlice>)(...args),
      ...(createConfigSlice as LayoutStoreCreator<ConfigSlice>)(...args),
    })),
    {
      // Zundo configuration
      limit: 20, // Keep last 20 states
      // Only track entity changes, not UI state
      partialize: (state) => ({
        entities: state.entities,
      }),
      // Custom equality check for Maps
      equality: (pastState, currentState) => {
        // Handle partialized state type
        const past = pastState as { entities: Map<string, StorageEntity> };
        const curr = currentState as { entities: Map<string, StorageEntity> };
        // Compare entity maps by size and content
        if (past.entities.size !== curr.entities.size) return false;
        for (const [id, entity] of past.entities) {
          const current = curr.entities.get(id);
          if (!current) return false;
          if (JSON.stringify(entity) !== JSON.stringify(current)) return false;
        }
        return true;
      },
    },
  ),
);

// ============================================================================
// Temporal Store Access (Undo/Redo)
// ============================================================================

export const useTemporalStore = () => useLayoutStore.temporal;

/** Undo the last entity change */
export const undo = () => {
  const temporal = useLayoutStore.temporal.getState();
  temporal.undo();
};

/** Redo the last undone change */
export const redo = () => {
  const temporal = useLayoutStore.temporal.getState();
  temporal.redo();
};

/** Check if undo is available */
export const canUndo = () => {
  const temporal = useLayoutStore.temporal.getState();
  return temporal.pastStates.length > 0;
};

/** Check if redo is available */
export const canRedo = () => {
  const temporal = useLayoutStore.temporal.getState();
  return temporal.futureStates.length > 0;
};

// ============================================================================
// Re-export Types
// ============================================================================

export type { StorageEntity, EntityStatus, BlockType };
