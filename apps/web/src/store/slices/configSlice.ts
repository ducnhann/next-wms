/**
 * Config Slice - Editor configuration and UI state
 * Part of the SmartStore state management system
 */

import type { StateCreator } from "zustand";
import type { EditorConfig, EditorError } from "@/lib/types/layout-editor";

// ============================================================================
// Types
// ============================================================================

export interface ConfigState {
  editorConfig: EditorConfig;
  isLoading: boolean;
  errors: EditorError[];
}

export interface ConfigActions {
  setEditorConfig: (config: Partial<EditorConfig>) => void;
  setLoading: (loading: boolean) => void;
  recordError: (error: EditorError) => void;
  clearErrors: () => void;
}

export type ConfigSlice = ConfigState & ConfigActions;

// ============================================================================
// Default Config
// ============================================================================

const defaultEditorConfig: EditorConfig = {
  camera: {
    type: "perspective",
    initialPosition: { x: 20, y: 20, z: 20 },
    initialTarget: { x: 0, y: 0, z: 0 },
  },
  grid: {
    visible: true,
    color: "#888888",
    fadeDistance: 100,
  },
  interaction: {
    enableRotation: true,
    enableZoom: true,
    enablePan: true,
    dragSensitivity: 0.4,
  },
  visual: {
    showLabels: true,
    showDimensions: false,
    highlightAccessible: true,
    lockedRackColor: "#FF6B6B",
    inaccessibleRackColor: "#FFA500",
  },
  performance: {
    enableShadows: true,
    antialiasing: true,
    pixelRatio:
      typeof window !== "undefined" ? Math.min(window.devicePixelRatio, 2) : 1,
  },
  validation: {
    enableAccessibilityCheck: true,
    enableCollisionCheck: true,
    autoValidateOnChange: true,
  },
};

// ============================================================================
// Slice Creator
// ============================================================================

export const createConfigSlice: StateCreator<
  ConfigSlice,
  [["zustand/immer", never]],
  [],
  ConfigSlice
> = (set) => ({
  // Initial state
  editorConfig: defaultEditorConfig,
  isLoading: false,
  errors: [],

  // Actions
  setEditorConfig: (config) => {
    set((state) => {
      state.editorConfig = { ...state.editorConfig, ...config };
    });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  recordError: (error) => {
    set((state) => {
      state.errors.push(error);
      // Keep only last 50 errors
      if (state.errors.length > 50) {
        state.errors.shift();
      }
    });
  },

  clearErrors: () => {
    set({ errors: [] });
  },
});
