# Data Model Specification: Warehouse Layout Editor

**Date**: 2025-12-02  
**Phase**: 1 (Design)  
**Version**: 1.0

---

## Overview

This document defines the complete data model for the Warehouse Layout Editor, covering both internal state representation (normalized for performance) and external API format (hierarchical JSON for interoperability).

---

## Entity Definitions

### 1. WarehouseLayout (Root Entity)

**Purpose**: Top-level container representing entire warehouse configuration

**Hierarchical Structure** (API/JSON format):

```typescript
interface WarehouseLayout {
  /** Schema version for compatibility checking */
  version: "1.0";
  
  /** Metadata about the layout */
  meta: LayoutMetadata;
  
  /** Editor configuration */
  config: LayoutConfig;
  
  /** Entry points for accessibility validation */
  entryPoints: EntryPoint[];
  
  /** Functional zones within warehouse */
  zones: Zone[];
}
```

**Field Descriptions**:

| Field | Type | Required | Validation | Purpose |
|-------|------|----------|------------|---------|
| version | string | Yes | Must be "1.0" | Schema version for migration support |
| meta | LayoutMetadata | Yes | - | Tracking info (author, timestamp) |
| config | LayoutConfig | Yes | gridSize > 0 | Editor behavior settings |
| entryPoints | EntryPoint[] | Yes | Length >= 1 | Origins for pathfinding |
| zones | Zone[] | Yes | Length >= 1 | Warehouse functional areas |

---

### 2. LayoutMetadata

**Purpose**: Track authorship and versioning

```typescript
interface LayoutMetadata {
  /** Unique identifier for this warehouse */
  warehouseId: string;
  
  /** ISO 8601 timestamp of last modification */
  lastUpdated: string;
  
  /** User ID who last modified */
  authorId: string;
  
  /** Optional warehouse name */
  name?: string;
  
  /** Optional description */
  description?: string;
}
```

**Validation Rules**:

- `warehouseId`: Must be UUID or valid identifier from host system
- `lastUpdated`: Must be valid ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
- `authorId`: Non-empty string

**State Transitions**:

- Auto-populated by editor on save
- `lastUpdated` refreshed on any modification
- `authorId` from host app authentication context

---

### 3. LayoutConfig

**Purpose**: Editor behavior settings

```typescript
interface LayoutConfig {
  /** Grid cell size in measurement units */
  gridSize: number;
  
  /** Unit of measurement */
  measurementUnit: "meters" | "feet";
  
  /** Enable/disable grid snapping */
  snapToGrid?: boolean;
  
  /** Warehouse floor dimensions */
  floorDimensions: {
    width: number;
    length: number;
  };
}
```

**Validation Rules**:

- `gridSize`: 0.1 ≤ gridSize ≤ 2.0
- `floorDimensions`: Both width and length must be > 0 and ≤ 500

**Defaults**:

- `gridSize`: 0.5
- `measurementUnit`: "meters"
- `snapToGrid`: true

---

### 4. EntryPoint

**Purpose**: Define warehouse entry/exit points for accessibility validation

```typescript
interface EntryPoint {
  /** Unique identifier */
  id: string;
  
  /** 3D position on warehouse floor */
  position: Vector3;
  
  /** Human-readable label */
  label: string;
  
  /** Type of entry point */
  type?: "door" | "dock" | "gate";
}
```

**Constraints**:

- Position Y coordinate should be 0 (floor level)
- Position X, Z must be within floor boundaries
- Minimum 1 entry point required per warehouse

**Rendering**:

- Entry points rendered as thin vertical boxes (door-like appearance)
- Dimensions: width based on type (door=1m, dock=3m, gate=4m), height=2.5m, depth=0.1m
- Color: Semi-transparent green (#4CAF50)
- Label displayed via drei Html when selected

---

### 5. Zone

**Purpose**: Functional area within warehouse (storage, staging, etc.)

```typescript
interface Zone {
  /** Unique identifier */
  id: string;
  
  /** Zone type */
  type: "storage" | "staging" | "packing" | "office" | "other";
  
  /** Human-readable name */
  name: string;
  
  /** 2D floor boundary (rectangle) */
  bounds: {
    x: number;      // Anchor X coordinate
    z: number;      // Anchor Z coordinate
    width: number;  // Extent along X axis
    length: number; // Extent along Z axis
  };
  
  /** Visual indicator color (hex) */
  color: string;
  
  /** Racks within this zone */
  racks: Rack[];
  
  /** Fixed obstacles in zone */
  obstacles: Obstacle[];
}
```

**Validation Rules**:

- `bounds`: All values must be non-negative
- `bounds`: Must fit within warehouse floor dimensions
- `color`: Valid hex color (#RRGGBB)
- Zone boundaries must not overlap (enforced by editor)
- **Entities within zone cannot be moved outside zone bounds** (enforced by transform controls)

**Rendering**:

- Zone floor rendered as colored plane at Y=0.01 (slightly above grid)
- **Zone boundary walls**: 5m height, 20cm thickness around zone edges
- Wall color matches zone color with 50% opacity
- **Label**: Zone name displayed via drei Html at zone center when selected

**Relationships**:

- Parent: WarehouseLayout
- Children: Rack[], Obstacle[]

---

### 6. Rack

**Purpose**: Storage structure (shelving unit)

```typescript
interface Rack {
  /** Unique identifier */
  id: string;
  
  /** Rack type */
  type: "standard" | "cantilever" | "drive-in" | "pallet";
  
  /** 3D position (relative to warehouse origin) */
  position: Vector3;
  
  /** 3D rotation (Euler angles in radians) */
  rotation: Vector3;
  
  /** Physical dimensions */
  dimensions: Dimension;
  
  /** Lock status (computed field, not persisted) */
  isLocked?: boolean;
  
  /** Accessibility status (computed field) */
  isAccessible?: boolean;
  
  /** Shelves contained in rack */
  shelves: Shelf[];
  
  /** Optional metadata */
  metadata?: {
    manufacturer?: string;
    model?: string;
    capacity?: number; // Max weight in kg/lbs
  };
}
```

**Computed Fields**:

- `isLocked`: Set to true if any child bin has inventory (currentLoad > 0)
- `isAccessible`: Set to false if pathfinding cannot reach interaction zone

**Validation Rules**:

- `dimensions`: All values > 0
- `rotation`: Values in range [0, 2π]
- `shelves`: Must have at least 1 shelf

**Interaction Zones**:
Each rack has implicit "interaction zone" calculated as:

- Rectangle in front of rack (based on rotation)
- Width: rack.dimensions.width
- Depth: 1.5m (configurable constant)
- Used for accessibility validation

**Rendering**:

- Rack rendered as box mesh with color based on type:
  - `standard`: Blue (#3FA9F5)
  - `cantilever`: Green (#4CAF50)
  - `drive-in`: Purple (#9C27B0)
  - `pallet`: Orange (#FF9800)
- Locked racks show red tint (#FF6B6B)
- Inaccessible racks show orange tint (#FFA500)
- Shelves and bins rendered as children (see below)
- **Label**: Rack label displayed via drei Html above rack when selected

---

### 7. Shelf

**Purpose**: Horizontal level within a rack

```typescript
interface Shelf {
  /** Unique identifier */
  id: string;
  
  /** Level index (0 = ground level) */
  levelIndex: number;
  
  /** Height from floor */
  heightFromGround: number;
  
  /** Optional dimensions (inherits from rack if omitted) */
  dimensions?: Dimension;
  
  /** Storage bins on this shelf */
  bins: Bin[];
}
```

**Rendering**:

- Horizontal plane with 5cm (0.05m) thickness
- Inherits width/depth from parent rack dimensions
- Positioned at `heightFromGround` relative to rack base
- Color: Light gray (#CCCCCC)
- Use InstancedMesh when multiple shelves share same dimensions

**Validation Rules**:

- `levelIndex`: Must be sequential starting from 0
- `heightFromGround`: Must increase with levelIndex
- `bins`: At least 1 bin per shelf

**Relationships**:

- Parent: Rack
- Children: Bin[]

---

### 8. Bin

**Purpose**: Individual storage location

```typescript
interface Bin {
  /** Unique identifier */
  id: string;
  
  /** Maximum capacity (volume or weight) */
  capacity: number;
  
  /** Current load (0 if empty) */
  currentLoad: number;
  
  /** Optional position within shelf (for visualization) */
  position?: {
    indexX: number; // Column index
    indexZ: number; // Row index
  };
  
  /** Physical dimensions */
  dimensions?: Dimension;
}
```

**Rendering**:

- Small boxes positioned on shelf surface
- Default dimensions: 0.3m × 0.2m × 0.2m (if not specified)
- Position calculated from `indexX`/`indexZ` with spacing
- Color based on load status:
  - Empty (currentLoad = 0): Light green (#90EE90)
  - Partial (0 < currentLoad < capacity): Yellow (#FFD700)
  - Full (currentLoad = capacity): Orange (#FFA500)
- Use InstancedMesh for performance when multiple bins share dimensions
- Only rendered when parent rack is selected or zoom level is high

**Validation Rules**:

- `currentLoad` ≤ `capacity`
- Both values ≥ 0

**Business Logic**:

- If `currentLoad > 0`, parent Rack's `isLocked` flag is set to true
- This data typically comes from external inventory system

---

### 9. Obstacle

**Purpose**: Fixed objects (columns, walls, equipment)

```typescript
interface Obstacle {
  /** Unique identifier */
  id: string;
  
  /** Obstacle type */
  type: "column" | "wall" | "equipment" | "other";
  
  /** 3D position */
  position: Vector3;
  
  /** Physical dimensions */
  dimensions: Dimension;
  
  /** Optional label */
  label?: string;
}
```

**Validation Rules**:

- `dimensions`: All values > 0
- Must not overlap with racks (validated on placement)

**Rendering**:

- Obstacles rendered with type-based colors:
  - `column`: Gray (#888888)
  - `wall`: Dark gray (#666666)
  - `equipment`: Brown (#997755)
  - `other`: Dim gray (#555555)
- Fully interactive: can be moved, rotated, and deleted via transform controls
- Rotation stored in radians, normalized to 0-2π range
- **Label**: Obstacle label (if present) displayed via drei Html above obstacle when selected

---

### 10. CollidableEntity (Unified Interface)

**Purpose**: Common interface for collision detection across entity types

```typescript
interface CollidableEntity {
  /** Unique identifier */
  id: string;
  
  /** 3D position */
  position: Vector3;
  
  /** 3D rotation (Euler angles in radians) */
  rotation: Vector3;
  
  /** Physical dimensions */
  dimensions: Dimension;
  
  /** Display name for error messages */
  displayName?: string;
}
```

**Usage**:

- Both `Rack` and `Obstacle` satisfy this interface
- Used by `checkCollisions()` function for unified collision checking
- Enables OBB (Oriented Bounding Box) collision with SAT algorithm

**Helper Function**:

```typescript
function getEntityDisplayName(entity: Entity): string {
  // Returns "Rack (standard)" or "Column", "Wall", etc.
}
```

---

### 11. ChangeEvent (History Tracking)

**Purpose**: Records state changes for undo/redo functionality

```typescript
interface ChangeEvent {
  type:
    | "rack-added"
    | "rack-moved"
    | "rack-removed"
    | "rack-modified"
    | "obstacle-added"
    | "obstacle-modified"
    | "obstacle-removed"
    | "zone-modified"
    | "config-changed";
  
  /** Entity that was changed */
  entityId: string;
  
  /** When the change occurred */
  timestamp: number;
  
  /** Previous entity state (for undo) */
  previousValue?: unknown;
  
  /** New entity state (for redo) */
  newValue?: unknown;
  
  /** Zone ID for entity removal (to restore zone relationship) */
  zoneId?: string;
}
```

**Zone Relationship Restoration**:

- When an entity is removed, the `zoneId` is stored in the ChangeEvent
- On undo, the entity is restored to both the entity Map AND the zone relationship Set
- This ensures the entity renders correctly after undo

---

## Supporting Types

### Vector3

```typescript
interface Vector3 {
  x: number;
  y: number;
  z: number;
}
```

**Units**: Based on `measurementUnit` in config (meters or feet)

---

### Dimension

```typescript
interface Dimension {
  width: number;  // X-axis extent
  height: number; // Y-axis extent
  depth: number;  // Z-axis extent
}
```

**Validation**: All values must be > 0

---

## Normalized State (Internal Store)

For performance, the editor maintains normalized state:

```typescript
interface NormalizedLayoutState {
  // Metadata
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
  zoneRacks: Map<string, Set<string>>;      // zoneId -> rackIds
  rackShelves: Map<string, Set<string>>;    // rackId -> shelfIds
  shelfBins: Map<string, Set<string>>;      // shelfId -> binIds
  zoneObstacles: Map<string, Set<string>>;  // zoneId -> obstacleIds
  
  // Computed indices (derived state)
  lockedRacks: Set<string>;                 // Racks with inventory
  inaccessibleRacks: Set<string>;           // Racks blocked by pathfinding
}
```

**Hydration** (JSON → Normalized):

- Performed on layout load
- Flattens nested structure into Maps
- Builds relationship indices
- ~O(n) complexity where n = total entities

**Dehydration** (Normalized → JSON):

- Performed on save/export
- Reconstructs hierarchical structure
- Filters out computed fields
- ~O(n) complexity

---

## Example Data

### Minimal Valid Layout

```json
{
  "version": "1.0",
  "meta": {
    "warehouseId": "wh-001",
    "lastUpdated": "2025-12-02T10:30:00.000Z",
    "authorId": "user-123",
    "name": "Small Warehouse A"
  },
  "config": {
    "gridSize": 0.5,
    "measurementUnit": "meters",
    "snapToGrid": true,
    "floorDimensions": {
      "width": 50,
      "length": 30
    }
  },
  "entryPoints": [
    {
      "id": "entry-1",
      "position": { "x": 0, "y": 0, "z": 15 },
      "label": "Main Door",
      "type": "door"
    }
  ],
  "zones": [
    {
      "id": "zone-1",
      "type": "storage",
      "name": "Zone A",
      "bounds": { "x": 5, "z": 5, "width": 40, "length": 20 },
      "color": "#3B82F6",
      "racks": [
        {
          "id": "rack-1",
          "type": "standard",
          "position": { "x": 10, "y": 0, "z": 10 },
          "rotation": { "x": 0, "y": 0, "z": 0 },
          "dimensions": { "width": 2, "height": 4, "depth": 1 },
          "shelves": [
            {
              "id": "shelf-1",
              "levelIndex": 0,
              "heightFromGround": 0.5,
              "bins": [
                {
                  "id": "bin-1",
                  "capacity": 100,
                  "currentLoad": 0
                }
              ]
            }
          ]
        }
      ],
      "obstacles": [
        {
          "id": "obs-1",
          "type": "column",
          "position": { "x": 25, "y": 0, "z": 15 },
          "dimensions": { "width": 0.5, "height": 5, "depth": 0.5 },
          "label": "Support Column"
        }
      ]
    }
  ]
}
```

---

## State Transitions

### 1. Adding a Rack

**Trigger**: User drags rack from toolbar to canvas

**State Changes**:

1. Generate new UUID for rack
2. Calculate snapped position from mouse coordinates
3. Check AABB collision with existing racks/obstacles
4. If valid:
   - Add to `racks` Map
   - Add to parent zone's `zoneRacks` Set
   - Create default shelf and bin
5. Trigger accessibility check
6. Update UI

**Validation**:

- Position within zone bounds
- No collision with existing objects
- Interaction zone remains accessible

---

### 2. Moving a Rack

**Trigger**: User drags existing rack

**State Changes**:

1. Check if rack is locked (`isLocked === true`)
2. If locked, show error toast and abort
3. If unlocked:
   - Update position in transient state (Three.js object)
   - On drag end, snap to grid
   - Update `racks` Map
   - Trigger accessibility check
   - If inaccessible, mark rack and disable save

**Validation**:

- Not locked
- New position within zone bounds
- No collision
- Accessibility maintained

---

### 3. Inventory Update (External)

**Trigger**: Host app updates `inventoryMap` prop

**State Changes**:

1. Run `computeLockStatus` function
2. For each bin with currentLoad > 0:
   - Mark parent rack as locked
   - Add rack ID to `lockedRacks` Set
3. Update rack visual indicators
4. Disable transform controls for locked racks

**Cascade Effects**:

- Locked racks cannot be moved/rotated/deleted
- Affects UI interaction layer
- Does not modify layout structure

---

## Validation Rules Summary

| Entity | Rule | Error Message |
|--------|------|---------------|
| WarehouseLayout | Must have ≥1 zone | "Layout must contain at least one zone" |
| WarehouseLayout | Must have ≥1 entry point | "Layout must have at least one entry point" |
| Zone | Bounds within floor | "Zone exceeds warehouse floor boundaries" |
| Zone | No overlap with other zones | "Zone overlaps with existing zone" |
| Rack | Within parent zone | "Rack must be placed within zone boundaries" |
| Rack | No collision | "Rack collides with existing object" |
| Rack | Accessible from entry point | "Rack is not accessible - blocked pathway" |
| Bin | currentLoad ≤ capacity | "Bin load exceeds capacity" |

---

## Performance Considerations

### Indexing Strategy

**Goal**: O(1) lookups for common operations

**Indices Maintained**:

1. **Entity Maps**: Direct ID lookup
2. **Parent-Child**: Quick access to children (zoneRacks, rackShelves, etc.)
3. **Locked Racks**: Fast check during drag operations
4. **Inaccessible Racks**: Cached pathfinding results

**Update Frequency**:

- Entity Maps: On add/remove/modify
- Locked Racks: On inventory change
- Inaccessible Racks: On layout change (debounced to avoid thrashing)

### Memory Estimates

For a warehouse with:

- 100 zones
- 1,000 racks
- 5,000 shelves
- 20,000 bins

**Normalized State**: ~5MB (JSON in memory)  
**Three.js Scene**: ~50MB (geometry buffers)  
**Total**: <100MB (acceptable for modern browsers)

---

## Migration Strategy

### Version 1.0 → 2.0 (Future)

If breaking changes needed:

```typescript
function migrateV1toV2(v1: WarehouseLayoutV1): WarehouseLayoutV2 {
  return {
    version: "2.0",
    meta: v1.meta,
    config: {
      ...v1.config,
      // New fields with defaults
      snapMode: "grid",
      collisionDetection: true
    },
    // ... rest of migration
  };
}
```

**Backward Compatibility**:

- Editor can read v1.0 and auto-migrate
- Save always uses latest version
- Warning shown if opening old version

---

## Appendix: TypeScript Definitions

Full type definitions are maintained in `packages/warehouse-editor/src/models/types.ts`

**Exports**:

- `WarehouseLayout`
- `Zone`, `Rack`, `Shelf`, `Bin`
- `Obstacle`, `EntryPoint`
- `Vector3`, `Dimension`
- `NormalizedLayoutState`

**Validation Functions**:

- `validateLayout(layout: unknown): WarehouseLayout | ValidationError[]`
- `isValidPosition(pos: Vector3, bounds: Bounds): boolean`
- `checkCollision(a: AABB, b: AABB): boolean`
