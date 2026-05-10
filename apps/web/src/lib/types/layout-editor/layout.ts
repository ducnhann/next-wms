// Layout Types for Warehouse Layout Editor
// Root layout structure and configuration

import type { EntryPoint, Zone } from "./entities";

// ============================================================================
// Warehouse Layout Root
// ============================================================================

export interface WarehouseLayout {
  version: "1.0";
  meta: LayoutMetadata;
  config: LayoutConfig;
  entryPoints: EntryPoint[];
  zones: Zone[];
}

export interface LayoutMetadata {
  warehouseId: string;
  lastUpdated: string; // ISO 8601
  authorId: string;
  name?: string;
  description?: string;
}

export type MeasurementUnit = "meters" | "feet";

export interface LayoutConfig {
  gridSize: number; // 0.1 - 2.0 meters
  measurementUnit: MeasurementUnit;
  snapToGrid?: boolean;
  floorDimensions: {
    width: number;
    length: number;
  };
}
