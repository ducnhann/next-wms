# Tasks: Warehouse Layout Editor

**Input**: Design documents from `/specs/main/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/component-api.md

**Tests**: Not explicitly requested in specification - focusing on implementation tasks with test infrastructure setup.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Last Updated**: 2025-12-09

---

## Implementation Status Summary

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Setup | ✅ Complete | 100% |
| Phase 2: Foundation | ✅ Complete | 100% |
| Phase 3: US1 - Load Layout | 🔄 Partial | ~70% |
| Phase 4: US2 - Transform & Properties | 🔄 Partial | ~80% |
| Phase 5: US3 - Inventory Locking | ✅ Complete | 100% |
| Phase 6: US4 - Accessibility | ⏳ Not Started | 0% |
| Phase 7: US5 - Export | ⏳ Not Started | 0% |
| Phase 8: Performance | ⏳ Not Started | 0% |
| Phase 9: Polish | ⏳ Not Started | 0% |

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and monorepo structure

- [X] T001 Initialize monorepo with npm workspaces in root package.json
- [X] T002 Create packages/warehouse-editor directory structure with src/, tests/, package.json
- [X] T003 Create packages/demo-app directory structure with src/, package.json
- [X] T004 Configure TypeScript 5.0+ with strict mode in packages/warehouse-editor/tsconfig.json
- [X] T005 [P] Configure ESLint + Prettier in packages/warehouse-editor/.eslintrc.json
- [X] T006 [P] Setup Vite library mode config in packages/warehouse-editor/vite.config.ts
- [X] T007 [P] Setup Vitest config in packages/warehouse-editor/vitest.config.ts
- [X] T008 Install core dependencies (React 18, Three.js, R3F, Zustand, Immer, drei, three-mesh-bvh) in warehouse-editor
- [X] T009 [P] Create .github/workflows/test.yml for CI testing
- [X] T010 [P] Create .github/workflows/build.yml for library builds
- [X] T011 Create packages/warehouse-editor/src/index.ts with placeholder exports

**Checkpoint**: Project structure established, dependencies installed, build/test pipelines configured

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core TypeScript types, state management, and rendering infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T012 [P] Define Vector3, Dimension types in packages/warehouse-editor/src/models/types.ts
- [X] T013 [P] Define WarehouseLayout interface in packages/warehouse-editor/src/models/types.ts
- [X] T014 [P] Define Zone, Rack, Shelf, Bin interfaces in packages/warehouse-editor/src/models/types.ts
- [X] T015 [P] Define EntryPoint, Obstacle interfaces in packages/warehouse-editor/src/models/types.ts
- [X] T016 [P] Define EditorConfig, InventoryData interfaces in packages/warehouse-editor/src/models/types.ts
- [X] T017 Create Zustand store skeleton in packages/warehouse-editor/src/store/layoutStore.ts
- [X] T018 Implement JSON hydration function (hierarchical → normalized) in packages/warehouse-editor/src/utils/hydration.ts
- [X] T019 Implement JSON dehydration function (normalized → hierarchical) in packages/warehouse-editor/src/utils/dehydration.ts
- [X] T020 Create WarehouseEditor component wrapper in packages/warehouse-editor/src/components/WarehouseEditor.tsx
- [X] T021 Setup R3F Canvas with camera and lighting in packages/warehouse-editor/src/components/Canvas3D.tsx
- [X] T022 [P] Implement grid floor component in packages/warehouse-editor/src/components/GridFloor.tsx
- [X] T023 [P] Create validation utilities in packages/warehouse-editor/src/utils/validation.ts
- [X] T024 Export all public APIs from packages/warehouse-editor/src/index.ts

**Checkpoint**: Foundation ready - data models defined, state management working, basic 3D canvas renders

---

## Phase 3: User Story 1 - Load Layout from JSON (Priority: P1) 🎯 MVP

**Goal**: As a Warehouse Planner, load an existing warehouse layout from JSON file to continue previous design work

**Independent Test**: Import sample JSON, verify zones/racks render at correct positions with correct rotations

### Implementation for User Story 1

- [X] T025 [P] [US1] Create sample warehouse layout JSON in packages/demo-app/src/layouts/sample-warehouse.json
- [X] T026 [P] [US1] Implement validateLayout function in packages/warehouse-editor/src/utils/validation.ts
- [X] T027 [US1] Add layout loading to Zustand store action in packages/warehouse-editor/src/store/layoutStore.ts
- [X] T028 [US1] Create Zone component in packages/warehouse-editor/src/components/Zone.tsx
- [ ] T028.1 [US1] Add zone boundary walls (5m height, 20cm thickness) to Zone component in packages/warehouse-editor/src/components/Zone.tsx
- [X] T029 [US1] Create Rack mesh component in packages/warehouse-editor/src/components/Rack.tsx
- [ ] T029.1 [US1] Add rack type color differentiation (standard=blue, cantilever=green, drive-in=purple, pallet=orange) in packages/warehouse-editor/src/components/Rack.tsx
- [ ] T029.2 [US1] Render shelves as horizontal planes (5cm thickness) within rack bounds in packages/warehouse-editor/src/components/Rack.tsx
- [ ] T029.3 [US1] Render bins as small boxes on shelves using InstancedMesh in packages/warehouse-editor/src/components/Rack.tsx
- [ ] T029.4 [P] [US1] Create EntryPoint/Door component as thin vertical box (~10cm depth) in packages/warehouse-editor/src/components/EntryPoint.tsx
- [X] T030 [US1] Create Obstacle component in packages/warehouse-editor/src/components/Obstacle.tsx
- [X] T031 [US1] Implement error boundary for invalid JSON in packages/warehouse-editor/src/components/ErrorBoundary.tsx
- [X] T032 [US1] Add error callback handling (onError prop) in packages/warehouse-editor/src/components/WarehouseEditor.tsx
- [X] T033 [US1] Wire up initialLayout prop to hydration + store in packages/warehouse-editor/src/components/WarehouseEditor.tsx
- [X] T034 [US1] Create demo app that loads sample JSON in packages/demo-app/src/App.tsx

**Checkpoint**: Can load valid JSON layouts, render 3D warehouse with zones/racks/obstacles, show errors for invalid JSON

---

## Phase 4: User Story 2 - Context Menu, Transform Gizmo & Properties Panel (Priority: P1) 🎯 MVP

**Goal**: As a Warehouse Planner, add racks/obstacles via right-click context menu, move them with transform gizmo, and edit properties via selection panel

**Independent Test**: Right-click on floor → Add Rack → rack appears at cursor; Click rack → gizmo appears for move; Drag gizmo → rack moves with snap; Properties panel shows size/levels/bins

**Status**: 🔄 ~80% Complete

### Implementation for User Story 2

- [X] T035 [P] [US2] Implement snapToGrid utility in packages/warehouse-editor/src/utils/gridSnapping.ts
- [X] T036 [P] [US2] Implement OBB/SAT collision detection (upgraded from AABB) in packages/warehouse-editor/src/utils/collision.ts
  - ✅ **Enhancement**: Uses Separating Axis Theorem for rotated bounding boxes
  - ✅ **Enhancement**: Unified `CollidableEntity` interface for racks and obstacles
  - ✅ **Enhancement**: `checkCollisions()` function handles all collision scenarios
  - ✅ **Enhancement**: Debug visualization callback for collision boxes
- [X] T037 [P] [US2] Create ContextMenu component with nested submenus in packages/warehouse-editor/src/components/ContextMenu.tsx (EntityList panel only for adding entities)
- [X] T038 [US2] Add raycaster for floor intersection (cursor position) in packages/warehouse-editor/src/utils/raycasting.ts
- [X] T039 [US2] Implement right-click handler on Canvas3D for context menu in packages/warehouse-editor/src/components/Canvas3D.tsx
- [X] T040 [US2] Add "Add Object" submenu with Rack/Obstacle options in packages/warehouse-editor/src/components/ContextMenu.tsx
- [X] T041 [US2] Implement addRack/addObstacle actions in Zustand store in packages/warehouse-editor/src/store/layoutStore.ts
- [X] T042 [P] [US2] Create edge highlight shader/material for selection in packages/warehouse-editor/src/components/SelectionOutline.tsx (using drei Outlines)
- [X] T043 [US2] Implement click-to-select on Rack/Obstacle meshes in packages/warehouse-editor/src/components/Rack.tsx
- [X] T044 [US2] Add selectedEntityId state and selectEntity action to store in packages/warehouse-editor/src/store/layoutStore.ts
- [X] T045 [P] [US2] Create useTransformControls hook (extracted reusable logic) in packages/warehouse-editor/src/hooks/useTransformControls.ts
  - ✅ **Enhancement**: State machine pattern (idle → dragging → pending → idle)
  - ✅ **Enhancement**: Quaternion-based rotation extraction to avoid gimbal lock
  - ✅ **Enhancement**: Rotation normalization to 0-359° range
  - ✅ **Enhancement**: Skip sync ref to prevent race conditions on commit
- [X] T046 [US2] Integrate TransformControls from drei for selected entity - in Rack.tsx and Obstacle.tsx
- [X] T047 [US2] Add gizmo mode state (translate/rotate) in packages/warehouse-editor/src/store/layoutStore.ts (transformMode state)
- [X] T048 [US2] Handle gizmo drag events with grid snapping in Rack.tsx and Obstacle.tsx TransformControls
  - ✅ **Enhancement**: 15° rotation snap
  - ✅ **Enhancement**: 0.1m translation snap
- [ ] T048.1 [US2] Enforce zone boundary limits during transform - clamp entity position to parent zone bounds in packages/warehouse-editor/src/hooks/useTransformControls.ts
- [X] T049 [US2] Update entity position in store on gizmo drag end in Rack.tsx and Obstacle.tsx
  - ✅ **Enhancement**: Success toast with position/rotation feedback
- [X] T050 [P] [US2] Create PropertiesPanel component shell in packages/warehouse-editor/src/components/PropertiesPanel.tsx (shadcn)
- [ ] T051 [US2] Implement RackProperties form (editable dimensions, levels, bins per level, rack type) in packages/warehouse-editor/src/components/PropertiesPanel.tsx
- [ ] T052 [US2] Implement ObstacleProperties form (editable type, dimensions, label) in packages/warehouse-editor/src/components/PropertiesPanel.tsx
- [X] T053 [US2] Wire PropertiesPanel to selected entity from store in packages/warehouse-editor/src/components/PropertiesPanel.tsx
  - ✅ **Enhancement**: Move/Rotate buttons toggle transform mode
  - ✅ **Enhancement**: Reset rotation button
  - ✅ **Enhancement**: Delete button with unified removeEntity action
- [ ] T053.1 [US2] Render entity labels via drei Html component when selected in packages/warehouse-editor/src/components/EntityLabel.tsx
- [X] T054 [US2] Add updateRack/updateObstacle actions for property changes in packages/warehouse-editor/src/store/layoutStore.ts
- [X] T055 [US2] Add delete option to context menu (when entity selected) in packages/warehouse-editor/src/components/ContextMenu.tsx
- [X] T056 [US2] Implement removeRack/removeObstacle/removeEntity actions in store in packages/warehouse-editor/src/store/layoutStore.ts
  - ✅ **Enhancement**: Unified `removeEntity()` function detects entity type
  - ✅ **Enhancement**: Tracks zoneId for undo/redo zone relationship restoration
- [X] T057 [US2] Integrate PropertiesPanel into WarehouseEditor layout in packages/warehouse-editor/src/components/WarehouseEditor.tsx
- [X] T058 [US2] Add UUID generation for new entities - using crypto.randomUUID() inline in store actions
- [X] T059 [US2] Wire up onLayoutChange callback in packages/warehouse-editor/src/components/WarehouseEditor.tsx (via onChange prop)
- [ ] T059.1 [US2] Implement ghost placement mode for new entities - semi-transparent preview follows cursor, click confirms, recorded as undo-able history item in packages/warehouse-editor/src/components/GhostPlacement.tsx
- [X] T060 [US2] Add keyboard shortcuts (M for move, R for rotate, Ctrl+Z undo, Ctrl+Y redo, Delete) in packages/warehouse-editor/src/hooks/useKeyboardShortcuts.ts
  - ✅ **Enhancement**: ShortcutPreview component shows available shortcuts
- [X] T060.1 [US2] Implement undo/redo functionality in packages/warehouse-editor/src/store/layoutStore.ts
  - ✅ **Enhancement**: Full support for rack-added, rack-modified, rack-removed events
  - ✅ **Enhancement**: Full support for obstacle-added, obstacle-modified, obstacle-removed events
  - ✅ **Enhancement**: Zone relationship restoration on undo of removal
  - ✅ **Enhancement**: 30-event undo stack limit

**Checkpoint**: Right-click adds racks/obstacles at cursor, click selects with edge highlight, gizmo enables plane/axis movement with snap, properties panel edits size/levels/bins, delete removes entities

---

## Phase 5: User Story 3 - Inventory Locking (Priority: P2)

**Goal**: As a System Admin, prevent moving racks containing inventory to avoid data inconsistency

**Independent Test**: Load layout with inventory data, verify racks with inventory show lock icon and cannot be edited/moved

### Implementation for User Story 3

- [X] T061 [P] [US3] Implement computeLockStatus function in packages/warehouse-editor/src/services/lockingService.ts
- [X] T062 [P] [US3] Create LockIcon component in packages/warehouse-editor/src/components/LockIcon.tsx
- [X] T063 [US3] Add inventoryMap prop handling in packages/warehouse-editor/src/components/WarehouseEditor.tsx
- [X] T064 [US3] Add locked state to normalized store in packages/warehouse-editor/src/store/layoutStore.ts
- [X] T065 [US3] Integrate lock computation on inventory change in packages/warehouse-editor/src/store/layoutStore.ts
- [X] T066 [US3] Add visual lock indicator to Rack component in packages/warehouse-editor/src/components/Rack.tsx
- [X] T067 [US3] Disable gizmo and property editing for locked racks in packages/warehouse-editor/src/components/Rack.tsx
- [X] T068 [US3] Add toast notification component in packages/warehouse-editor/src/components/WarehouseEditor.tsx
- [X] T069 [US3] Show warning toast on locked rack interaction in packages/warehouse-editor/src/components/Rack.tsx
- [X] T070 [US3] Add sample inventory data to demo app in packages/warehouse-editor/src/dev/DevApp.tsx
- [X] T070.1 [P] [US3] Create unit tests for locking service in packages/warehouse-editor/tests/unit/lockingService.test.ts
- [X] T070.2 [P] [US3] Create integration tests for inventory locking in packages/warehouse-editor/tests/integration/inventory-locking.test.tsx

**Checkpoint**: Racks with inventory are locked, show visual indicator, gizmo disabled, prevent editing, display warning message

---

## Phase 6: User Story 4 - Accessibility Validation (Priority: P2)

**Goal**: As a Warehouse Planner, see immediate warnings if rack placement blocks pathways

**Independent Test**: Place rack blocking path, verify inaccessible racks highlighted red, save button disabled

### Implementation for User Story 4

- [ ] T071 [P] [US4] Create GridMap class for 2D rasterization in packages/warehouse-editor/src/services/GridMap.ts
- [ ] T072 [P] [US4] Implement BFS flood fill algorithm in packages/warehouse-editor/src/services/pathfinding.ts
- [ ] T073 [P] [US4] Create pathfinding Web Worker in packages/warehouse-editor/src/workers/pathfinding.worker.ts
- [ ] T074 [US4] Implement rack interaction zone calculation in packages/warehouse-editor/src/utils/interactionZones.ts
- [ ] T075 [US4] Add accessibility check to Zustand store in packages/warehouse-editor/src/store/layoutStore.ts
- [ ] T076 [US4] Create AccessibilityHeatmap component in packages/warehouse-editor/src/components/AccessibilityHeatmap.tsx
- [ ] T077 [US4] Add red highlight for inaccessible racks in packages/warehouse-editor/src/components/Rack.tsx
- [ ] T078 [US4] Create SaveButton component with validation in packages/warehouse-editor/src/components/SaveButton.tsx
- [ ] T079 [US4] Add onAccessibilityChange callback in packages/warehouse-editor/src/components/WarehouseEditor.tsx
- [ ] T080 [US4] Add debounced accessibility check on layout change in packages/warehouse-editor/src/store/layoutStore.ts
- [ ] T081 [US4] Wire up accessibility warnings to save button state in packages/warehouse-editor/src/components/SaveButton.tsx

**Checkpoint**: Pathfinding validates accessibility, highlights blocked racks, shows heatmap, disables save when issues exist

---

## Phase 7: User Story 5 - Export Layout (Priority: P3)

**Goal**: As a Warehouse Planner, export modified layout as JSON to update WMS system

**Independent Test**: Modify layout, click save, verify exported JSON matches schema with updated positions

### Implementation for User Story 5

- [ ] T082 [P] [US5] Implement metadata update utility in packages/warehouse-editor/src/utils/metadata.ts
- [ ] T082.1 [P] [US5] Implement layout version migration utility (v1.0 → future versions) in packages/warehouse-editor/src/utils/migration.ts
- [ ] T083 [US5] Add onSave callback handler in packages/warehouse-editor/src/components/WarehouseEditor.tsx
- [ ] T084 [US5] Create export functionality using dehydration in packages/warehouse-editor/src/store/layoutStore.ts
- [ ] T085 [US5] Add save button click handler in packages/warehouse-editor/src/components/SaveButton.tsx
- [ ] T086 [US5] Implement JSON schema validation on export in packages/warehouse-editor/src/utils/validation.ts
- [ ] T087 [US5] Add success/error feedback to save button in packages/warehouse-editor/src/components/SaveButton.tsx
- [ ] T088 [US5] Create demo save handler with file download in packages/demo-app/src/App.tsx
- [ ] T089 [US5] Add dirty state tracking to store in packages/warehouse-editor/src/store/layoutStore.ts

**Checkpoint**: Layouts can be exported as valid JSON, metadata updated, save state tracked, success/error feedback shown

---

## Phase 8: Performance Optimization (Weeks 7-8)

**Purpose**: Achieve 60 FPS with 5,000+ objects and optimize bundle size

**Note**: Shelves and bins already use InstancedMesh from T029.2/T029.3. This phase focuses on additional optimizations.

- [ ] T090 [P] Optimize bin InstancedMesh batching strategy in packages/warehouse-editor/src/components/Rack.tsx
- [ ] T091 [P] Optimize shelf InstancedMesh batching strategy in packages/warehouse-editor/src/components/Rack.tsx
- [ ] T092 [P] Add BVH acceleration to static geometry in packages/warehouse-editor/src/components/Rack.tsx
- [ ] T093 Add transient updates pattern for gizmo dragging in packages/warehouse-editor/src/components/TransformGizmo.tsx
- [ ] T094 [P] Implement geometry disposal on unmount in packages/warehouse-editor/src/components/Rack.tsx
- [ ] T095 [P] Add shadows with performance toggle in packages/warehouse-editor/src/components/Canvas3D.tsx
- [ ] T096 Optimize pathfinding Web Worker communication in packages/warehouse-editor/src/workers/pathfinding.worker.ts
- [ ] T097 [P] Add FPS monitoring utility in packages/warehouse-editor/src/utils/performance.ts
- [ ] T097.1 [P] Implement onPerformanceUpdate callback for host application in packages/warehouse-editor/src/components/WarehouseEditor.tsx
- [ ] T098 Configure bundle size limits in packages/warehouse-editor/vite.config.ts
- [ ] T099 Add performance benchmarks in packages/warehouse-editor/tests/performance/benchmark.test.ts
- [ ] T100 [P] Create large warehouse test fixture (5000+ objects) in packages/warehouse-editor/tests/fixtures/large-warehouse.json
- [ ] T101 Validate 60 FPS target with large warehouse in packages/warehouse-editor/tests/performance/fps.test.ts

**Checkpoint**: Maintains 60 FPS with 5,000 objects, bundle size <100KB gzipped, memory usage optimized

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, developer experience, and final touches

- [ ] T102 [P] Create TypeScript declaration files (.d.ts) via vite-plugin-dts in packages/warehouse-editor/vite.config.ts
- [ ] T103 [P] Write API documentation in docs/api-reference.md
- [ ] T104 [P] Create integration examples in docs/examples/
- [ ] T105 [P] Add keyboard shortcuts for common operations in packages/warehouse-editor/src/utils/keyboardShortcuts.ts
- [ ] T106 [P] Add tooltips to context menu items in packages/warehouse-editor/src/components/ContextMenu.tsx
- [ ] T107 [P] Implement undo/redo functionality in packages/warehouse-editor/src/store/historyStore.ts
- [ ] T108 [P] Add camera reset button in packages/warehouse-editor/src/components/CameraControls.tsx
- [ ] T109 [P] Create screenshot capture utility in packages/warehouse-editor/src/utils/screenshot.ts
- [ ] T110 Implement ref API (WarehouseEditorHandle) in packages/warehouse-editor/src/components/WarehouseEditor.tsx
- [ ] T111 [P] Add WebGL compatibility check in packages/warehouse-editor/src/utils/webglCheck.ts
- [ ] T112 Validate quickstart.md guide with fresh install
- [ ] T113 [P] Setup NPM package metadata in packages/warehouse-editor/package.json
- [ ] T114 [P] Create README.md with badges and quick start in packages/warehouse-editor/README.md

**Checkpoint**: Library polished, documented, ready for NPM publication

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion - BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 completion
- **Phase 4 (US2)**: Depends on Phase 2 completion (can run parallel with US1 if staffed)
- **Phase 5 (US3)**: Depends on Phase 2 completion, benefits from US2 (TransformControls)
- **Phase 6 (US4)**: Depends on Phase 2 completion, needs rack placement from US2
- **Phase 7 (US5)**: Depends on Phase 2 completion, validates all changes from US1-4
- **Phase 8 (Performance)**: Depends on US1-5 basic functionality
- **Phase 9 (Polish)**: Depends on all desired features being complete

### User Story Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundation) ← BLOCKS everything below
    ↓
    ├─→ US1 (Load JSON) ← MVP Core
    ├─→ US2 (Drag/Drop) ← MVP Core, integrates with US1
    ├─→ US3 (Locking) ← Needs US2 (transform controls)
    ├─→ US4 (Accessibility) ← Needs US2 (rack placement)
    └─→ US5 (Export) ← Uses dehydration from US1
    ↓
Phase 8 (Performance)
    ↓
Phase 9 (Polish)
```

### Critical Path (MVP = US1 + US2)

1. **T001-T011**: Setup (Phase 1)
2. **T012-T024**: Foundational (Phase 2) - CRITICAL BLOCKER
3. **T025-T034**: US1 - Load layout
4. **T035-T054**: US2 - Context menu & properties panel
5. **MILESTONE**: MVP complete - can load layouts, add/edit entities via context menu

### Parallel Opportunities

**Within Phase 1 (Setup)**:

- T005, T006, T007, T009, T010 can run parallel (different config files)

**Within Phase 2 (Foundation)**:

- T012-T016 (all type definitions) can run parallel
- T018, T019 (hydration/dehydration) can run parallel after types done
- T022, T023 (grid floor, validation) can run parallel

**Within User Stories**:

- US1: T025, T026, T031 can start parallel
- US2: T035, T036, T037, T042, T045 can run parallel (utilities & components)
- US3: T055, T056, T062 can run parallel
- US4: T065, T066, T067 can run parallel (different algorithms)
- US5: T076 can run parallel with others

**Across User Stories** (if multiple developers):

- After Phase 2, US1 and US2 can progress in parallel
- US3, US4, US5 can start in parallel after their prerequisites met

**Phase 8 (Performance)**:

- T084, T085, T088, T089, T091, T094 all parallelizable

**Phase 9 (Polish)**:

- T096-T103, T105, T107, T108 all parallelizable

---

## Parallel Example: Foundation Phase

```bash
# After Phase 1 complete, launch all type definitions together:
T012: "Define Vector3, Dimension types"
T013: "Define WarehouseLayout interface"
T014: "Define Zone, Rack, Shelf, Bin interfaces"
T015: "Define EntryPoint, Obstacle interfaces"
T016: "Define EditorConfig, InventoryData interfaces"

# Then launch utility functions in parallel:
T018: "Implement JSON hydration"
T019: "Implement JSON dehydration"
T022: "Implement grid floor component"
T023: "Create validation utilities"
```

---

## Parallel Example: User Story 2

```bash
# Launch utilities and components in parallel:
T035: "Implement snapToGrid utility"
T036: "Implement AABB collision"
T037: "Create ContextMenu component"
T042: "Create SelectionOutline component"
T045: "Create PropertiesPanel shell"

# Then wire up interactions sequentially:
T039: "Right-click handler on Canvas3D"
T043: "Click-to-select on Rack"
T048: "Wire PropertiesPanel to store"
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. **Weeks 1-2**: Complete Phase 1 (Setup) + Phase 2 (Foundation)
2. **Week 3**: Complete US1 (Load JSON)
   - **STOP and VALIDATE**: Test with various JSON files
3. **Week 4**: Complete US2 (Drag & Drop)
   - **STOP and VALIDATE**: Test editing workflow end-to-end
4. **MVP DELIVERY**: Can load and edit warehouse layouts (core value delivered)

### Incremental Delivery (Add Features Post-MVP)

1. **Week 5**: Add US3 (Inventory Locking)
   - **VALIDATE**: Test with inventory data, verify locking works
2. **Week 6**: Add US4 (Accessibility Validation)
   - **VALIDATE**: Test pathfinding with various layouts
3. **Week 7**: Add US5 (Export) + Start Performance (Phase 8)
   - **VALIDATE**: Export/import cycle works correctly
4. **Week 8**: Complete Performance + Polish (Phase 9)
   - **VALIDATE**: 60 FPS with 5,000 objects, all features polished

### Parallel Team Strategy (3 Developers)

**Weeks 1-2** (Together):

- All: Phase 1 (Setup) + Phase 2 (Foundation)

**Week 3** (Parallel):

- Dev A: US1 (T025-T034) - Load JSON
- Dev B: US2 (T035-T046) - Drag & Drop
- Dev C: Setup test infrastructure

**Week 4** (Parallel):

- Dev A: US3 (T047-T056) - Locking
- Dev B: US4 (T057-T067) - Accessibility
- Dev C: US5 (T068-T075) - Export

**Weeks 5-6** (Parallel):

- Dev A: Performance - InstancedMesh (T084-T085)
- Dev B: Performance - Optimization (T086-T090)
- Dev C: Performance - Benchmarks (T091-T095)

**Weeks 7-8** (Parallel):

- All: Phase 9 (Polish) - parallelizable tasks

---

## Notes

- **Test-First Approach**: Not explicitly required in spec, but test infrastructure (Vitest, React Testing Library) set up in Phase 1
- **[P] Marker**: Indicates tasks that can run in parallel (different files, no blocking dependencies)
- **[US#] Label**: Maps each task to its user story for traceability and independent validation
- **File Paths**: All paths are absolute from repository root using monorepo structure
- **Checkpoints**: Pause points for validation ensure each story works independently before proceeding
- **MVP = US1 + US2**: Minimum viable product delivers core load/edit functionality
- **Phases 5-7**: Additional value-add features (locking, accessibility, export)
- **Phase 8**: Performance optimization to meet 60 FPS target
- **Phase 9**: Polish for production-ready library

---

## Total Task Count

- **Phase 1 (Setup)**: 11 tasks
- **Phase 2 (Foundation)**: 13 tasks (CRITICAL BLOCKER)
- **Phase 3 (US1)**: 15 tasks - Load Layout (includes T028.1, T029.1-4)
- **Phase 4 (US2)**: 29 tasks - Context Menu & Properties Panel (includes T048.1, T053.1, T059.1)
- **Phase 5 (US3)**: 10 tasks - Inventory Locking
- **Phase 6 (US4)**: 11 tasks - Accessibility Validation
- **Phase 7 (US5)**: 9 tasks - Export Layout (includes T082.1)
- **Phase 8 (Performance)**: 14 tasks (includes T097.1)
- **Phase 9 (Polish)**: 13 tasks

**Total: 124 tasks** organized for incremental, testable delivery

---

## Suggested MVP Scope

**Minimum Viable Product (4 weeks)**:

- Phase 1: Setup (T001-T011)
- Phase 2: Foundation (T012-T024)
- Phase 3: US1 - Load Layout (T025-T034)
- Phase 4: US2 - Context Menu & Properties (T035-T054)

**Delivers**: Ability to load warehouse layouts from JSON, add/remove racks via context menu, select entities with edge highlighting, and edit properties via panel.

**Post-MVP Enhancements** (4 additional weeks):

- US3: Inventory locking for safety
- US4: Accessibility validation for operational efficiency
- US5: Export for WMS integration
- Performance optimization for scale
- Polish for production readiness
