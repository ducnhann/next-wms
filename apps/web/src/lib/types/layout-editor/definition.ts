import { type Branded, createCategory } from "@/lib/utils/typeUtils";

export const EntityTypes = createCategory([
  "rack",
  "obstacle",
  "zone",
  "entry-point",
] as const);

export const ZoneTypes = createCategory([
  "storage",
  "staging",
  "packing",
  "office",
  "other",
] as const);

export const RackTypes = createCategory([
  "standard",
  "cantilever",
  "drive-in",
  "pallet",
] as const);

export const EntryPointTypes = createCategory([
  "door",
  "dock",
  "gate",
  "other",
] as const);

export const ObstacleTypes = createCategory([
  "column",
  "wall",
  "equipment",
  "other",
] as const);

export const ChangeEventTypes = createCategory([
  "rack-added",
  "rack-moved",
  "rack-removed",
  "rack-modified",
  "obstacle-added",
  "obstacle-modified",
  "obstacle-removed",
  "zone-modified",
  "config-changed",
  "shelf-added",
  "shelf-modified",
  "shelf-removed",
  "bin-added",
  "bin-modified",
  "bin-removed",
] as const);

export const EditorErrorTypes = createCategory([
  "validation",
  "rendering",
  "performance",
  "user-action",
] as const);

export const EditorErrorSeverityTypes = createCategory([
  "error",
  "warning",
  "info",
] as const);

export type ColorHex = Branded<string, "ColorHex">;
