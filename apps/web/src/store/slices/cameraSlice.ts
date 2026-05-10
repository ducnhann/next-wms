/**
 * Camera Slice - Camera state and controls
 * Part of the SmartStore state management system
 */

import type { StateCreator } from "zustand";

// ============================================================================
// Types
// ============================================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface CameraState {
  cameraPosition: Vector3 | null;
  resetCameraFn: (() => void) | null;
  zoomToEntityFn: ((entityId: string) => void) | null;
}

export interface CameraActions {
  updateCameraPosition: (position: Vector3) => void;
  registerResetCamera: (fn: () => void) => void;
  resetCamera: () => void;
  registerZoomToEntity: (fn: (entityId: string) => void) => void;
  zoomToEntity: (entityId: string) => void;
}

export type CameraSlice = CameraState & CameraActions;

// ============================================================================
// Slice Creator
// ============================================================================

export const createCameraSlice: StateCreator<
  CameraSlice,
  [["zustand/immer", never]],
  [],
  CameraSlice
> = (set, get) => ({
  // Initial state
  cameraPosition: null,
  resetCameraFn: null,
  zoomToEntityFn: null,

  // Actions
  updateCameraPosition: (position) => {
    set({ cameraPosition: position });
  },

  registerResetCamera: (fn) => {
    set({ resetCameraFn: fn });
  },

  resetCamera: () => {
    const fn = get().resetCameraFn;
    if (fn) fn();
  },

  registerZoomToEntity: (fn) => {
    set({ zoomToEntityFn: fn });
  },

  zoomToEntity: (entityId) => {
    const fn = get().zoomToEntityFn;
    if (fn) fn(entityId);
  },
});
