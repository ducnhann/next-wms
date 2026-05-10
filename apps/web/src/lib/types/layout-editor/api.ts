// API Types for Warehouse Layout Editor
// Component ref handle and external data interfaces

import type { Id } from "@wms/backend/convex/_generated/dataModel";
import type { EditorState } from "./editor";
import type { ValidationResult } from "./validation";

// ============================================================================
// Component Ref API
// ============================================================================

export interface WarehouseEditorHandle {
  // Core camera/view operations
  validateLayout: () => ValidationResult;
  resetCamera: () => void;
  zoomToEntity: (entityId: Id<"storage_zones">) => void;

  // Entity operations (now via storage_zone table)
  // Note: Returns tempId (string) until entity is committed to Convex
  addRack: (rackData: {
    position: object;
    dimensions: object;
    rotation?: object;
  }) => string | undefined;
  removeRack: (rackId: string) => boolean;
  getState: () => EditorState;
  captureScreenshot: () => Promise<Blob>;

  // SmartStore API
  getEntities: () => unknown[];
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

// ============================================================================
// External Data Interfaces
// ============================================================================

export interface InventoryData {
  sku: string;
  qty: number;
  unit?: string;
  reserved?: number;
}
