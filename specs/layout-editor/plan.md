# Implementation Plan: Warehouse Layout Editor

**Branch**: `main` | **Date**: 2025-12-02 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/main/spec.md`  
**Last Updated**: 2025-12-09

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a professional 3D Warehouse Layout Editor as a standalone React library using the "Abstract Box" architecture pattern. This module enables warehouse planners to visually design storage layouts while enforcing critical business logic: inventory locking (prevent moving racks with goods) and accessibility validation (ensure all racks remain reachable via BFS pathfinding). Target performance: 60 FPS with 5,000+ objects using React Three Fiber, Zustand state management, and InstancedMesh optimization.

## Implementation Progress

| Phase | Status | Key Achievements |
|-------|--------|------------------|
| Phase 1: Setup | ✅ Complete | Vite library mode, TypeScript, Vitest, Biome |
| Phase 2: Foundation | ✅ Complete | Types, Zustand store, hydration/dehydration, R3F canvas |
| Phase 3: US1 Load Layout | 🔄 70% | JSON loading, zone/rack/obstacle rendering |
| Phase 4: US2 Editing | 🔄 80% | Transform controls, collision detection, undo/redo |
| Phase 5: US3 Locking | ⏳ 0% | Not started |
| Phase 6: US4 Accessibility | ⏳ 0% | Not started |
| Phase 7: US5 Export | ⏳ 0% | Not started |

### Key Implementation Highlights (2025-12-09)

1. **Collision Detection**: Upgraded from AABB to SAT/OBB for accurate rotated entity collision
2. **Transform Controls**: State machine pattern (idle → dragging → pending) with quaternion rotation
3. **Rotation Handling**: Gimbal lock avoided via quaternion extraction, values normalized to 0-359°
4. **Undo/Redo**: Full support for add/modify/remove with zone relationship restoration
5. **Unified Entity API**: `CollidableEntity` interface and `removeEntity()` action
6. **Debug Tools**: CollisionDebugOverlay, ShortcutPreview components

## Technical Context

**Language/Version**: TypeScript 5.0+, targeting ES2020  
**Primary Dependencies**: React 18+, Three.js (latest), React Three Fiber (R3F), Zustand, Immer, @react-three/drei, three-mesh-bvh  
**Storage**: JSON-based layout files (no database required for library itself)  
**Testing**: Vitest (unit tests), React Testing Library (component tests), Playwright (integration tests)  
**Target Platform**: Modern web browsers with WebGL 2.0 support (Chrome 56+, Firefox 51+, Safari 15+)  
**Project Type**: Web library (NPM package) with demo application  
**Performance Goals**: 60 FPS rendering, <200ms pathfinding computation for 200x200 grid, <100KB gzipped bundle size  
**Constraints**: Browser-only (no SSR), single-user editing (no real-time collaboration), max warehouse size 200m x 200m  
**Scale/Scope**: Support 5,000+ warehouse objects (racks/shelves/bins), configurable grid (0.1m-2m), 10+ simultaneous drag operations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: Constitution file is currently a template. Applying standard software engineering gates:

| Gate | Status | Notes |
|------|--------|-------|
| **Library-First Architecture** | ✅ PASS | Module designed as standalone NPM package with clear boundaries |
| **Dependency Management** | ✅ PASS | External dependencies (React, Three.js) properly externalized in build config |
| **Test Coverage** | ✅ PASS | Comprehensive test strategy defined (70% unit, 20% integration, 10% E2E) |
| **Performance Benchmarks** | ✅ PASS | 60 FPS target defined with InstancedMesh optimization, benchmarking suite planned |
| **API Contract Stability** | ✅ PASS | Props/callbacks interface fully specified in contracts/component-api.md |
| **Documentation Requirements** | ✅ PASS | Complete documentation: research.md, data-model.md, quickstart.md, API contracts |

**Post-Design Evaluation**: All gates PASS. Phase 1 design artifacts meet quality standards:

- Data model fully specified with validation rules and state transitions
- API contracts comprehensive with TypeScript types and usage examples  
- Quickstart guide provides clear integration path for developers
- Architecture decisions documented with rationale in research.md

**Constitution violations requiring justification**: None. All complexity justified by domain requirements (3D rendering necessitates Three.js, state management complexity justified by performance requirements).

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Unified warehouse editor package (demo merged into main package)
packages/
├── warehouse-editor/          # Core library package with integrated dev environment
│   ├── src/
│   │   ├── components/        # React components (Canvas, EntityList, PropertiesPanel, etc.)
│   │   ├── models/            # TypeScript interfaces & types
│   │   ├── services/          # Business logic (locking, pathfinding)
│   │   ├── store/             # Zustand state management
│   │   ├── utils/             # Helpers (grid snapping, collision)
│   │   ├── dev/               # Development environment (DevApp, sample layouts)
│   │   └── index.ts           # Public API exports
│   ├── tests/
│   │   ├── unit/              # Algorithm tests (BFS, locking logic)
│   │   ├── integration/       # Component interaction tests
│   │   └── contract/          # Props/callback contract tests
│   └── package.json           # Library dependencies

docs/                          # Documentation site (optional)
├── api/                       # API reference
├── guides/                    # Integration guides
└── examples/                  # Code examples

.github/
├── workflows/                 # CI/CD pipelines
│   ├── test.yml              # Run tests on PR
│   ├── build.yml             # Build library
│   └── publish.yml           # NPM publish workflow
└── prompts/                   # Copilot instructions
```

**Structure Decision**: Unified package structure with integrated dev environment. Demo app merged into warehouse-editor/src/dev/ for rapid iteration. No separate Storybook needed - dev environment serves as living documentation. Library can be published independently to NPM.

## Complexity Tracking

> **No violations requiring justification at this stage.**

The constitution check passes all fundamental gates. The chosen technology stack (React Three Fiber, Zustand) represents industry-standard solutions for 3D web applications and does not introduce unnecessary complexity. All architectural decisions are directly traceable to functional requirements (3D editing, performance, reusability).

---

## New Feature Implementation Guide

This section documents the standard process and patterns for implementing new features in the Warehouse Layout Editor.

### 1. Feature Planning Checklist

Before implementing a new feature:

- [ ] Define the feature in `specs/master/spec.md` under Clarifications
- [ ] Add tasks to `specs/master/tasks.md` with appropriate phase and user story tags
- [ ] Update `specs/master/data-model.md` if new types/interfaces are needed
- [ ] Update `specs/master/contracts/component-api.md` if public API changes

### 2. Architecture Patterns

#### State Management (Zustand + Immer)

All state changes flow through the Zustand store in `src/store/layoutStore.ts`:

```typescript
// Adding a new entity action
addEntity: (entity: Omit<Entity, "id">, zoneId: string) => {
  const id = crypto.randomUUID();
  
  set((draft) => {
    // 1. Add to entity Map
    draft.state.entities.set(id, { ...entity, id });
    
    // 2. Update zone relationship
    const zoneSet = draft.state.zoneEntities.get(zoneId);
    if (zoneSet) zoneSet.add(id);
    
    // 3. Mark dirty
    draft.isDirty = true;
  });
  
  // 4. Record for undo/redo (include zoneId for relationship restoration)
  get().recordChange({
    type: "entity-added",
    entityId: id,
    timestamp: Date.now(),
    newValue: entity,
    zoneId, // Required for undo to restore zone relationship
  });
  
  return id;
};
```

#### Component Structure

New 3D components should follow this pattern:

```typescript
// src/components/NewEntity.tsx
export const NewEntity: React.FC<{ entityId: string }> = ({ entityId }) => {
  // 1. Select only needed state slices (performance)
  const entity = useLayoutStore((s) => s.state.entities.get(entityId));
  const isSelected = useLayoutStore((s) => s.selectedEntityId === entityId);
  const transformMode = useLayoutStore((s) => s.transformMode);
  
  // 2. Use refs for Three.js objects
  const groupRef = useRef<Group>(null);
  
  // 3. Use transform controls hook for movable entities
  const { handleTransformStart, handleTranslateEnd, handleRotateEnd } = 
    useTransformControls({
      currentTransform: { position: entity.position, rotation: entity.rotation },
      dimensions: entity.dimensions,
      isSelected,
      transformMode,
      groupRef,
      racks: useLayoutStore((s) => s.state.racks),
      obstacles: useLayoutStore((s) => s.state.obstacles),
      zones: useLayoutStore((s) => s.state.zones),
      excludeFromCollision: entityId,
      onConfirm: (updates) => updateEntity(entityId, updates),
    });
  
  // 4. Return Three.js JSX with TransformControls
  return (
    <>
      <group ref={groupRef} position={[...]} rotation={[...]}>
        <Box args={[...]} onClick={handleClick}>
          <meshStandardMaterial color={color} />
          {isSelected && <Outlines thickness={0.08} color={outlineColor} />}
        </Box>
      </group>
      {isSelected && transformMode === "translate" && (
        <TransformControls object={groupRef.current} mode="translate" ... />
      )}
    </>
  );
};
```

#### Collision Detection

New collidable entities must satisfy the `CollidableEntity` interface:

```typescript
interface CollidableEntity {
  id: string;
  position: Vector3;
  rotation: Vector3;
  dimensions: Dimension;
  displayName?: string;
}
```

Use `checkCollisions()` for placement/movement validation:

```typescript
const collision = checkCollisions(
  {
    position: newPosition,
    dimensions: entity.dimensions,
    rotationY: entity.rotation.y,
    bounds: zoneBounds,
    excludeEntityId: entity.id, // Exclude self from collision check
  },
  racks,
  obstacles
);

if (collision.hasCollision) {
  toast.error(`Cannot place: ${collision.reason}`);
  return;
}
```

### 3. Undo/Redo Requirements

All state-changing operations must support undo/redo:

1. **Store previous value** before mutation
2. **Track zone relationships** with `zoneId` field in ChangeEvent
3. **Implement both directions** in `undo()` and `redo()` switch cases

```typescript
// In undo() handler
case "entity-removed": {
  if (event.previousValue) {
    // 1. Restore entity to Map
    draft.state.entities.set(event.entityId, event.previousValue as Entity);
    
    // 2. Restore zone relationship (CRITICAL for rendering)
    if (event.zoneId) {
      const zoneSet = draft.state.zoneEntities.get(event.zoneId);
      if (zoneSet) zoneSet.add(event.entityId);
    }
  }
  break;
}
```

### 4. Keyboard Shortcuts

Add new shortcuts in `src/hooks/useKeyboardShortcuts.ts`:

```typescript
// Follow existing pattern
if (e.key === "n" && !e.ctrlKey && !e.metaKey) {
  e.preventDefault();
  // Trigger action
  doSomething();
}
```

Update `ShortcutPreview` component to display new shortcuts.

### 5. Testing Requirements

New features should include:

- **Unit tests** in `tests/unit/` for business logic
- **Component tests** for React component behavior
- Minimum coverage: 70% for new code

### 6. Documentation Updates

After implementing a feature:

- [ ] Update task status in `tasks.md` (mark [X] completed)
- [ ] Add implementation notes under relevant "Session YYYY-MM-DD" in `spec.md`
- [ ] Update `component-api.md` if new public APIs exposed
- [ ] Update `data-model.md` if new types added
