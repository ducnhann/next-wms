/**
 * Selection Slice - Entity selection and transform state
 * Part of the SmartStore state management system
 */

import type { Id } from "@wms/backend/convex/_generated/dataModel";
import type { StateCreator } from "zustand";
import { logEntitySelected } from "@/store/editor-console-store";

// ============================================================================
// Types
// ============================================================================

export type TransformMode = "translate" | "rotate" | null;

export interface SelectionState {
  selectedEntityId: Id<"storage_zones"> | string | null;
  transformMode: TransformMode;
  isTransformActive: boolean;
}

export interface SelectionActions {
  selectEntity: (entityId: Id<"storage_zones"> | string | null) => void;
  setTransformMode: (mode: TransformMode) => void;
  setTransformActive: (active: boolean) => void;
  clearSelection: () => void;
}

export type SelectionSlice = SelectionState & SelectionActions;

// ============================================================================
// Slice Creator
// ============================================================================

export const createSelectionSlice: StateCreator<
  SelectionSlice,
  [["zustand/immer", never]],
  [],
  SelectionSlice
> = (set, get) => ({
  // Initial state
  selectedEntityId: null,
  transformMode: null,
  isTransformActive: false,

  // Actions
  selectEntity: (entityId) => {
    const currentId = get().selectedEntityId;
    // Only clear transform mode when selecting a DIFFERENT entity
    if (entityId !== currentId) {
      set({ selectedEntityId: entityId, transformMode: null });
    }

    //Logging
    entityId && logEntitySelected(entityId as string);
  },

  setTransformMode: (mode) => {
    set({ transformMode: mode });
  },

  setTransformActive: (active) => {
    set({ isTransformActive: active });
  },

  clearSelection: () => {
    set({
      selectedEntityId: null,
      transformMode: null,
      isTransformActive: false,
    });
  },
});
