# Feature Specification: Warehouse Layout Editor

**Date**: 2025-12-02  
**Author**: Salad  
**Version**: 1.1  
**Last Updated**: 2025-12-09

## Executive Summary

Build a professional 3D Warehouse Layout Editor as a standalone React library using the "Abstract Box" architecture pattern. This module enables warehouse planners to visually design and optimize storage layouts while enforcing critical business logic: inventory locking (prevent moving racks containing goods) and accessibility validation (ensure all racks remain reachable from entry points).

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| 3D Canvas with R3F | ✅ Complete | OrbitControls, lighting, shadows |
| JSON Layout Loading | ✅ Complete | Hydration/dehydration utilities |
| Zone Rendering | ✅ Complete | Floor plane with color overlay |
| Rack Rendering | ✅ Complete | Box mesh with selection outline |
| Obstacle Rendering | ✅ Complete | Box mesh with type colors |
| Entity Selection | ✅ Complete | Click-to-select with Outlines |
| Transform Controls | ✅ Complete | Translate + Rotate with snapping |
| Collision Detection | ✅ Complete | SAT/OBB for rotated entities |
| Undo/Redo | ✅ Complete | 30-event stack with zone restoration |
| Keyboard Shortcuts | ✅ Complete | M, R, Delete, Ctrl+Z/Y |
| Properties Panel | 🔄 Partial | Read-only, needs editable forms |
| Ghost Placement | ⏳ Pending | Semi-transparent preview mode |
| Inventory Locking | ⏳ Pending | Rack locking based on inventory |
| Accessibility BFS | ⏳ Pending | Pathfinding from entry points |
| Zone Boundaries | ⏳ Pending | Wall rendering, movement limits |

## Clarifications

### Session 2025-12-03

- Q: How are entities added to the layout? → A: Context menu on EntityList panel only (toolbar deprecated)
- Q: What keyboard shortcuts are used? → A: M=move, R=rotate, Ctrl+Z=undo, Ctrl+Y=redo, Delete=remove
- Q: Are obstacles editable/movable? → A: Yes, fully mutable via transform controls
- Q: Is Storybook or separate demo app needed? → A: No, dev environment merged into main package
- Q: How does new entity placement work? → A: Ghost placement mode with click-to-confirm, recorded as undo-able history item
- Q: Is tutorial mode needed for MVP? → A: No, deferred to post-MVP
- Q: Can entities be moved outside zone boundaries? → A: No, transform controls enforce zone boundary limits
- Q: How are shelves/bins/doors rendered? → A: Shelves as 5cm horizontal planes, bins as small boxes (InstancedMesh), doors as thin vertical boxes
- Q: How are rack types visually differentiated? → A: Different colors per type (standard=blue, cantilever=green, drive-in=purple, pallet=orange)
- Q: How are labels displayed? → A: drei Html component shown when entity is selected
- Q: What do zone boundaries look like? → A: 5m tall walls with 20cm thickness around zone edges

### Session 2025-12-09 (Implementation Notes)

- Collision detection upgraded from AABB to SAT/OBB for accurate rotated entity collision
- `CollidableEntity` interface created for unified rack/obstacle collision handling
- Transform controls use state machine pattern: idle → dragging → pending → idle
- Rotation uses quaternion extraction to avoid gimbal lock at 90° boundaries
- Rotation values normalized to 0-359° range with proper wrapping
- Undo/redo supports entity removal with zone relationship restoration
- `removeEntity()` unified action detects entity type automatically
- Success toasts show position (X, Z) and rotation (degrees) after transform
- ShortcutPreview component displays available keyboard shortcuts

## Vision & Context

In the Logistics 4.0 era, warehouse management demands interactive 3D visualization tools that go beyond static 2D diagrams. This editor serves as a digital twin foundation, allowing planners to model physical warehouse spaces with real-time constraint validation.

### Key Business Goals

1. **Safety First**: Prevent physical-digital desynchronization by locking racks with inventory
2. **Operational Efficiency**: Validate accessibility before committing layout changes
3. **Reusability**: Build as standalone library for integration into any WMS/ERP system
4. **Performance**: Maintain 60 FPS even with 5,000+ warehouse objects

## Core Requirements

### Functional Requirements

#### FR-01: 3D Layout Editing

- Users can add racks and obstacles via context menu (right-click on EntityList panel only)
- New entities enter "ghost placement" mode: semi-transparent preview follows cursor, click confirms placement
- Ghost placement is recorded as a history stack item for undo support
- Objects snap to configurable grid (default 0.5m)
- Transform controls for move (M key), rotate (R key), delete operations
- **Zone boundaries enforce movement limits**: entities cannot be moved outside their parent zone bounds
- Support multiple zones (storage, staging, packing, office)
- Visual hierarchy: Warehouse → Zones → Racks → Shelves → Bins

##### Visual Rendering Specifications

- **Zones**: 5m tall walls with 20cm thickness around zone boundary edges
- **Racks**: Box mesh with color differentiation by type:
  - standard: blue (#3FA9F5)
  - cantilever: green (#4CAF50)
  - drive-in: purple (#9C27B0)
  - pallet: orange (#FF9800)
- **Shelves**: Horizontal planes with 5cm thickness, rendered within rack bounds
- **Bins**: Small boxes on shelves (use InstancedMesh for performance)
- **Entry Points/Doors**: Thin vertical boxes (door-like appearance, ~10cm depth)
- **Labels**: Rendered via drei Html component when entity is selected
- **Performance**: Use InstancedMesh for shelves, bins, and repeated geometry where possible

#### FR-02: Inventory Locking

- System prevents modification of any rack containing inventory (currentLoad > 0)
- Locked racks display visual indicator (padlock icon, colored border)
- Attempted interactions show toast notification: "Cannot modify rack with inventory"
- Lock status computed from external inventory data via props

#### FR-03: Accessibility Validation

- Real-time pathfinding validation using Flood Fill/BFS algorithm
- Entry points (doors, docks) serve as pathfinding origins
- System highlights inaccessible racks in red with pulsing warning
- Heatmap overlay shows reachable vs. blocked floor areas
- Save button disabled until all accessibility issues resolved

#### FR-04: Data Import/Export

- Accept warehouse layout as JSON (see Data Model section)
- Export modified layout preserving schema version
- Support layout versioning and metadata (author, timestamp)

### Non-Functional Requirements

#### NFR-01: Performance

- Maintain 60 FPS rendering for warehouses with 5,000+ objects
- Use InstancedMesh for identical objects (reduce draw calls)
- Grid rasterization max 200x200 cells for accessibility checks
- Web Worker for pathfinding to avoid UI thread blocking

#### NFR-02: Library Architecture

- Distributed as NPM package or git submodule
- Zero coupling with host application beyond props/callbacks
- Externalize dependencies (React, Three.js) in build output
- TypeScript with full type definitions
- Support ES Module and UMD formats

#### NFR-03: Developer Experience

- Hot Module Replacement (HMR) during development
- Comprehensive TypeScript interfaces
- Unit tests for all business logic
- Integration tests for user workflows
- Storybook or demo app for component showcase

## Technical Architecture

### Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| UI Library | React 18+ | Concurrent Mode for smooth heavy rendering |
| 3D Engine | Three.js | Industry standard WebGL library |
| React Reconciler | React Three Fiber (R3F) | Declarative 3D scene graph, automatic lifecycle management |
| State Management | Zustand + Immer | Performance (no Context overhead), immutable updates |
| Build Tool | Vite (Library Mode) | Fast HMR, optimized library bundling |
| Utility Libraries | @react-three/drei | Pre-built controls and helpers |
| Collision Detection | three-mesh-bvh | O(log n) raycasting performance |

### Data Model

See full TypeScript schema in research document. Key entities:

```typescript
interface WarehouseLayout {
  version: "1.0";
  meta: { warehouseId: string; lastUpdated: string; authorId: string };
  config: { gridSize: number; measurementUnit: "meters" | "feet" };
  entryPoints: Array<{ id: string; position: Vector3; label: string }>;
  zones: Zone[];
}

interface Zone {
  id: string;
  type: "storage" | "staging" | "packing" | "office";
  name: string;
  bounds: { x: number; z: number; width: number; length: number };
  racks: Rack[];
  obstacles: Obstacle[];
}

interface Rack {
  id: string;
  position: Vector3;
  rotation: Vector3;
  dimensions: Dimension;
  isLocked?: boolean; // Computed field
  shelves: Shelf[];
}

interface Bin {
  id: string;
  capacity: number;
  currentLoad: number; // > 0 triggers parent rack lock
}

// Note: Obstacles are mutable (can be moved/edited via transform controls)
```

### Algorithm Specifications

#### Inventory Locking Algorithm

```
function computeLockStatus(layout, inventoryMap):
  for each zone in layout.zones:
    for each rack in zone.racks:
      hasInventory = false
      for each shelf in rack.shelves:
        for each bin in shelf.bins:
          if inventoryMap[bin.id]?.qty > 0:
            hasInventory = true
      rack.isLocked = hasInventory
```

#### Accessibility Check (Grid Rasterization + Flood Fill)

```
1. Create 2D grid matrix (warehouse dimensions / gridSize)
2. Mark all obstacle/rack cells as BLOCKED (1)
3. For each rack, compute "interaction zone" cells (front access area)
4. Run BFS from all entryPoints:
   - Queue ← entry point coordinates
   - While queue not empty:
     - current ← dequeue
     - For each neighbor (up/down/left/right):
       - If in bounds, not BLOCKED, not VISITED:
         - Mark VISITED
         - Enqueue neighbor
5. Compare rack interaction zones with VISITED map
6. Racks with unvisited zones → INACCESSIBLE
```

## User Stories

| ID | As a... | I want to... | So that... | Acceptance Criteria |
|----|---------|--------------|------------|---------------------|
| US-01 | Warehouse Planner | Load existing layout from JSON | I can continue previous work | - Correct rendering of positions/rotations<br>- Error message if JSON invalid |
| US-02 | Warehouse Planner | Add rack via context menu | I can add storage capacity | - Ghost placement mode with preview<br>- Auto-snap to grid<br>- Collision prevention |
| US-03 | System Admin | Prevent moving racks with inventory | Avoid data inconsistency | - Locked racks show padlock icon<br>- Drag/rotate/delete disabled<br>- Warning toast on attempt |
| US-04 | Warehouse Planner | See immediate accessibility warnings | Fix layout issues before saving | - Red highlight on inaccessible racks<br>- Heatmap shows blocked areas<br>- Save button disabled |
| US-05 | Warehouse Planner | Export layout as JSON | Update WMS with new positions | - Valid schema output<br>- Preserved metadata<br>- Accurate position data |

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

- Vite library setup with TypeScript
- R3F canvas with basic camera/lighting
- Zustand store + JSON hydration
- Render static layout from hardcoded JSON

### Phase 2: Interaction (Weeks 3-4)

- OrbitControls + TransformControls
- HTML sidebar with asset library
- Drag & drop from HTML to 3D canvas
- Grid snapping + basic AABB collision

### Phase 3: Business Logic (Weeks 5-6)

- Inventory locking implementation
- Grid rasterization system
- BFS pathfinding algorithm
- Visual feedback (icons, heatmap)

### Phase 4: Optimization (Weeks 7-8)

- InstancedMesh for performance
- Web Worker for pathfinding
- Shadows + visual polish
- Library bundling + NPM publish

## Success Metrics

- **Performance**: 60 FPS with 5,000 objects (measure via Chrome DevTools)
- **Accuracy**: 100% pathfinding correctness (unit test coverage)
- **Usability**: Users can complete layout changes in <5 minutes (user testing)
- **Integration**: Successfully embedded in 2 different host applications

## Constraints & Assumptions

### Constraints

- Browser support: Modern browsers with WebGL 2.0 (Chrome 56+, Firefox 51+, Safari 15+)
- Maximum warehouse size: 200m x 200m (grid limitation)
- No real-time collaboration (single user editing)

### Assumptions

- Host application provides inventory data via props
- Host application handles authentication/authorization
- Layout saves are handled by host application backend
- Users have basic 3D navigation familiarity

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Performance degradation with large warehouses | Medium | High | InstancedMesh, LOD system, Web Workers |
| Complex state synchronization bugs | High | Medium | Comprehensive unit tests, state immutability |
| Browser compatibility issues | Low | Medium | WebGL feature detection, graceful degradation |
| Steep learning curve for 3D editing | Medium | Low | Tooltips, keyboard shortcuts (M=move, R=rotate, Ctrl+Z=undo, Ctrl+Y=redo) |

## References

1. Three.js Documentation: <https://threejs.org/docs/>
2. React Three Fiber: <https://docs.pmnd.rs/react-three-fiber/>
3. Zustand: <https://github.com/pmndrs/zustand>
4. Vite Library Mode: <https://vitejs.dev/guide/build.html#library-mode>
5. BVH Library: <https://github.com/gkjohnson/three-mesh-bvh>

## Appendix: Vietnamese Research Report

[Full Vietnamese technical specification document provided by user contains detailed algorithm pseudocode, architecture diagrams, and implementation guidelines - serves as reference material for implementation phase]
