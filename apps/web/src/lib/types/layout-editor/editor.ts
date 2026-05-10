// Editor Types for Warehouse Layout Editor
// Editor configuration, state, and events

import type {
  ChangeEventTypes,
  EditorErrorSeverityTypes,
  EditorErrorTypes,
} from "./definition";
import type { Vector3 } from "./geometry";

// ============================================================================
// Editor Configuration
// ============================================================================

export interface EditorConfig {
  camera?: {
    type: "orthographic" | "perspective";
    initialPosition?: Vector3;
    initialTarget?: Vector3;
  };
  grid?: {
    visible: boolean;
    color: string;
    fadeDistance: number;
  };
  interaction?: {
    enableRotation: boolean;
    enableZoom: boolean;
    enablePan: boolean;
    dragSensitivity: number; // 0.1 - 2.0
  };
  visual?: {
    showLabels: boolean;
    showDimensions: boolean;
    highlightAccessible: boolean;
    lockedRackColor: string;
    inaccessibleRackColor: string;
  };
  performance?: {
    enableShadows: boolean;
    antialiasing: boolean;
    pixelRatio: number;
  };
  validation?: {
    enableAccessibilityCheck: boolean;
    enableCollisionCheck: boolean;
    autoValidateOnChange: boolean;
  };
}

// ============================================================================
// Editor State
// ============================================================================

export interface EditorState {
  selectedEntityId: string | null;
  cameraPosition: Vector3;
  isDirty: boolean;
  lockedRackCount: number;
  totalRackCount: number;
}

// ============================================================================
// Change Events
// ============================================================================

export type ChangeEventType = (typeof ChangeEventTypes.values)[number];

export interface ChangeEvent {
  type: ChangeEventType;
  entityId: string;
  timestamp: number;
  previousValue?: unknown;
  newValue?: unknown;
  zoneId?: string; // Zone relationship for undo/redo of entity removal
}

// ============================================================================
// Editor Errors
// ============================================================================

export type EditorErrorType = (typeof EditorErrorTypes.values)[number];
export type EditorErrorSeverityType =
  (typeof EditorErrorSeverityTypes.values)[number];

export interface EditorError {
  type: EditorErrorType;
  message: string;
  details?: unknown;
  timestamp: number;
  severity: EditorErrorSeverityType;
}
