// State Types for Warehouse Layout Editor
// Normalized internal state structure

import type { Bin, EntryPoint, Obstacle, Rack, Shelf, Zone } from "./entities";
import type { LayoutConfig, LayoutMetadata } from "./layout";

// ============================================================================
// Normalized State (Internal Store)
// ============================================================================

export interface NormalizedLayoutState {
  meta: LayoutMetadata;
  config: LayoutConfig;

  // Flat entity maps
  entryPoints: Map<string, EntryPoint>;
  zones: Map<string, Zone>;
  racks: Map<string, Rack>;
  shelves: Map<string, Shelf>;
  bins: Map<string, Bin>;
  obstacles: Map<string, Obstacle>;

  // Relationship indices
  zoneRacks: Map<string, Set<string>>;
  rackShelves: Map<string, Set<string>>;
  shelfBins: Map<string, Set<string>>;
  zoneObstacles: Map<string, Set<string>>;

  // Computed indices
  lockedRacks: Set<string>;
  inaccessibleRacks: Set<string>;
}
