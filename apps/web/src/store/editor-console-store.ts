/**
 * Editor Console Store - Standalone store for logging
 * Separate from main layout store to avoid temporal/undo history pollution
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  createEditorConsoleSlice,
  type EditorConsoleSlice,
} from "./slices/editorConsoleSlice";

// ============================================================================
// Console Store
// ============================================================================

export const useEditorConsole = create<EditorConsoleSlice>()(
  immer(createEditorConsoleSlice),
);

// ============================================================================
// Convenience Logging Functions
// ============================================================================

/** Log entity loading events */
export const logEntityLoaded = (
  entityName: string,
  entityType: string,
  parentName?: string,
  parentType?: string,
) => {
  const message = parentName
    ? `${entityType} "${entityName}" loaded as child of ${parentType} "${parentName}"`
    : `${entityType} "${entityName}" loaded`;
  useEditorConsole.getState().info(message, "entity");
};

/** Log entity creation events */
export const logEntityCreated = (
  entityName: string,
  entityType: string,
  parentName?: string,
) => {
  const message = parentName
    ? `${entityType} "${entityName}" created under "${parentName}"`
    : `${entityType} "${entityName}" created`;
  useEditorConsole.getState().success(message, "entity");
};

/** Log entity update events */
export const logEntityUpdated = (
  entityName: string,
  entityType: string,
  field: string,
) => {
  const message = `${entityType} "${entityName}" updated: ${field}`;
  useEditorConsole.getState().info(message, "entity");
};

/** Log sync events */
export const logSyncEvent = (message: string, isError = false) => {
  if (isError) {
    useEditorConsole.getState().error(message, "sync");
  } else {
    useEditorConsole.getState().info(message, "sync");
  }
};

/** Log collision events */
export const logCollision = (entityName: string, collidedWith: string) => {
  const message = `Collision detected: "${entityName}" with "${collidedWith}"`;
  useEditorConsole.getState().warn(message, "collision");
};

/** Log validation events */
export const logValidation = (
  entityName: string,
  isValid: boolean,
  reason?: string,
) => {
  if (isValid) {
    useEditorConsole
      .getState()
      .success(`"${entityName}" validation passed`, "validation");
  } else {
    useEditorConsole
      .getState()
      .error(`"${entityName}" validation failed: ${reason}`, "validation");
  }
};

/** Debug log */
export const logDebug = (
  message: string,
  category?: string,
  data?: Record<string, unknown>,
) => {
  useEditorConsole.getState().debug(message, category, data);
};

export const logEntitySelected = (entityId: string) => {
  const message = `Entity "${entityId}" selected`;
  useEditorConsole.getState().debug(message, "entity");
};

export const logGhostEntitySet = (
  entityType: string,
  parentId: string | null,
) => {
  const message = `Ghost entity of type "${entityType}" set under parent "${parentId}"`;
  useEditorConsole.getState().debug(message, "entity");
};

export const logCollisionCheckInfo = (
  parentId: string,
  tempId: string,
  storageBlockType: string,
  valid: boolean,
  reason?: string,
) => {
  const message = `Collision check for storage block "${tempId}" of type "${storageBlockType}" under parent "${parentId}": ${valid ? "Valid" : "Invalid"}${reason ? ` - ${reason}` : ""}`;
  useEditorConsole.getState().debug(message, "collision");
};

export const logCameraReset = () => {
  const message = "Camera reset to default view";
  useEditorConsole.getState().info(message, "camera");
};

export const logCameraZoomToEntity = (x: number, y: number, z: number) => {
  const message = `Camera zoomed to entity at position (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`;
  useEditorConsole.getState().info(message, "camera");
};

// Re-export types
export type {
  ConsoleFilters,
  LogEntry,
  LogLevel,
} from "./slices/editorConsoleSlice";
