# Research Document: Warehouse Layout Editor

**Date**: 2025-12-02  
**Phase**: 0 (Pre-Implementation Research)  
**Purpose**: Resolve all technical unknowns and establish best practices

---

## 1. Technology Stack Decisions

### 1.1 React Three Fiber vs. Vanilla Three.js

**Decision**: Use React Three Fiber (R3F)

**Rationale**:

- **Declarative Scene Graph**: R3F allows defining 3D scenes using JSX, making the code more readable and maintainable compared to imperative Three.js code
- **Automatic Lifecycle Management**: R3F automatically handles object disposal (geometry, materials, textures) when components unmount, preventing memory leaks - a critical issue in long-running 3D applications
- **React Integration**: Seamless integration with React state management and component lifecycle, enabling composition patterns familiar to React developers
- **Performance**: R3F uses React's reconciler to efficiently update only changed parts of the scene graph, avoiding unnecessary re-renders

**Alternatives Considered**:

- **Vanilla Three.js**: More verbose, requires manual memory management, harder to integrate with React state
- **Babylon.js**: Excellent engine but larger bundle size (~1.5MB vs ~600KB for Three.js), less React ecosystem support
- **PlayCanvas**: Game engine focused, overkill for warehouse visualization

**References**:

- React Three Fiber docs: <https://docs.pmnd.rs/react-three-fiber/>
- Three.js comparison: <https://discourse.threejs.org/t/react-three-fiber-vs-vanilla-three-js/>

---

### 1.2 State Management: Zustand vs. Redux vs. Context

**Decision**: Zustand with Immer middleware

**Rationale**:

- **Performance**: Zustand doesn't use Context, avoiding the re-render cascade that affects all consumers when state changes. Critical for 60Hz drag-and-drop operations
- **Transient Updates**: Zustand allows direct state reads via `getState()` without subscribing, enabling smooth animations without triggering React re-renders
- **Bundle Size**: 1.2KB gzipped vs. Redux's 3KB (with toolkit) or Context's overhead
- **Immutability**: Immer middleware provides draft-based mutations for complex nested JSON structures (warehouse → zones → racks → shelves → bins)
- **DevTools**: Excellent browser extension for state debugging

**Alternatives Considered**:

- **Redux Toolkit**: Excellent for large apps, but unidirectional flow creates performance issues with high-frequency updates (drag events at 60Hz cause frame drops)
- **React Context**: Simple but causes re-render of all consumers on any state change, unacceptable for 3D scenes
- **Jotai/Recoil**: Atomic state management is elegant but adds complexity for deeply nested data structures

**Code Pattern**:

```typescript
// store/layoutStore.ts
import create from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface LayoutStore {
  layout: WarehouseLayout;
  updateRackPosition: (rackId: string, position: Vector3) => void;
}

export const useLayoutStore = create<LayoutStore>()(
  immer((set) => ({
    layout: initialLayout,
    updateRackPosition: (rackId, position) =>
      set((state) => {
        const rack = findRackById(state.layout, rackId);
        if (rack && !rack.isLocked) {
          rack.position = position;
        }
      }),
  }))
);
```

**References**:

- Zustand performance comparison: <https://github.com/pmndrs/zustand#comparison>
- Immer with Zustand: <https://github.com/pmndrs/zustand/blob/main/docs/integrations/immer-middleware.md>

---

### 1.3 Build Tool: Vite vs. Webpack vs. Rollup

**Decision**: Vite in Library Mode

**Rationale**:

- **Development Speed**: Vite's ESBuild-powered HMR updates in <100ms vs. Webpack's seconds, critical for rapid 3D iteration
- **Library Mode**: Built-in support for building libraries with proper externalization and multiple output formats (ESM, UMD)
- **Tree Shaking**: Excellent dead code elimination, reducing bundle size
- **Modern Defaults**: Targets ES2020 by default, no need for legacy transpilation

**Configuration**:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react(),
    dts({ include: ['src'] }) // Generate TypeScript definitions
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'WarehouseEditor',
      formats: ['es', 'umd'],
      fileName: (format) => `warehouse-editor.${format}.js`
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'three', '@react-three/fiber'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          three: 'THREE',
          '@react-three/fiber': 'ReactThreeFiber'
        }
      }
    },
    sourcemap: true,
    minify: 'terser'
  }
});
```

**Alternatives Considered**:

- **Webpack**: Industry standard but slow HMR, complex configuration
- **Rollup**: Excellent for libraries but requires more manual setup vs. Vite's library mode
- **ESBuild**: Ultra-fast but lacks plugin ecosystem for React transformations

**References**:

- Vite library mode docs: <https://vitejs.dev/guide/build.html#library-mode>
- Performance comparison: <https://blog.logrocket.com/vite-3-vs-create-react-app-comparison-migration-guide/>

---

## 2. Algorithm Deep Dives

### 2.1 Grid Rasterization Strategy

**Decision**: Use typed arrays (Uint8Array) for grid representation

**Rationale**:

- **Memory Efficiency**: Uint8Array uses 1 byte per cell vs. 8 bytes for number[], reducing memory footprint by 87% for large grids
- **Cache Locality**: Contiguous memory layout improves CPU cache hits during BFS traversal
- **Performance**: Bitwise operations on Uint8 are faster than general number operations

**Implementation**:

```typescript
class GridMap {
  private grid: Uint8Array;
  private width: number;
  private height: number;
  
  constructor(warehouseWidth: number, warehouseHeight: number, gridSize: number) {
    this.width = Math.ceil(warehouseWidth / gridSize);
    this.height = Math.ceil(warehouseHeight / gridSize);
    this.grid = new Uint8Array(this.width * this.height);
  }
  
  set(x: number, z: number, value: number) {
    const index = z * this.width + x;
    this.grid[index] = value;
  }
  
  get(x: number, z: number): number {
    const index = z * this.width + x;
    return this.grid[index];
  }
  
  isWalkable(x: number, z: number): boolean {
    if (x < 0 || x >= this.width || z < 0 || z >= this.height) return false;
    return this.get(x, z) === 0; // 0 = WALKABLE
  }
}
```

**Alternatives Considered**:

- **2D Array (number[][])**: Simple but memory-intensive, pointer chasing hurts cache
- **Bitfield**: Ultimate memory efficiency (1 bit per cell) but slower access due to bit manipulation
- **Sparse Grid (Map)**: Good for sparse data but warehouse floors are mostly dense

**References**:

- Typed arrays performance: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays>
- Cache locality in JS: <https://mrale.ph/blog/2018/02/03/maybe-you-dont-need-rust-to-speed-up-your-js.html>

---

### 2.2 Pathfinding Algorithm Selection

**Decision**: Breadth-First Search (BFS) over A* or Dijkstra

**Rationale**:

- **Uniform Cost**: All grid cells have equal traversal cost (no weighted edges), making BFS optimal
- **Simplicity**: BFS is simpler to implement and debug than A*, reducing bug surface area
- **Performance**: For unweighted grids, BFS is faster than A* (no heuristic calculation overhead)
- **Completeness**: BFS guarantees finding shortest path if one exists

**Algorithm Pseudocode**:

```typescript
function floodFillAccessibility(
  grid: GridMap,
  entryPoints: Vector2[],
  requiredTargets: Map<string, Vector2[]>
): Set<string> {
  const visited = new Set<string>();
  const queue: Vector2[] = [...entryPoints];
  const inaccessible = new Set<string>();
  
  // Mark entry points as visited
  entryPoints.forEach(p => visited.add(`${p.x},${p.z}`));
  
  // BFS
  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = [
      { x: current.x + 1, z: current.z },
      { x: current.x - 1, z: current.z },
      { x: current.x, z: current.z + 1 },
      { x: current.x, z: current.z - 1 }
    ];
    
    for (const neighbor of neighbors) {
      const key = `${neighbor.x},${neighbor.z}`;
      if (!visited.has(key) && grid.isWalkable(neighbor.x, neighbor.z)) {
        visited.add(key);
        queue.push(neighbor);
      }
    }
  }
  
  // Check which racks have inaccessible interaction zones
  requiredTargets.forEach((targets, rackId) => {
    const accessible = targets.some(t => visited.has(`${t.x},${t.z}`));
    if (!accessible) {
      inaccessible.add(rackId);
    }
  });
  
  return inaccessible;
}
```

**Optimization**: Run pathfinding in Web Worker to avoid blocking UI thread:

```typescript
// workers/pathfinding.worker.ts
self.onmessage = (e) => {
  const { grid, entryPoints, requiredTargets } = e.data;
  const result = floodFillAccessibility(grid, entryPoints, requiredTargets);
  self.postMessage({ inaccessible: Array.from(result) });
};
```

**Alternatives Considered**:

- **A* (A-Star)**: Overkill for unweighted grids, adds heuristic calculation overhead
- **Dijkstra**: Same as BFS for unweighted graphs but more complex implementation
- **Jump Point Search**: Good for large grids with obstacles but unnecessary complexity for 200x200 max grid

**References**:

- BFS vs A*: <https://www.redblobgames.com/pathfinding/a-star/introduction.html>
- Web Workers for pathfinding: <https://web.dev/workers-overview/>

---

### 2.3 Collision Detection Optimization

**Decision**: Use three-mesh-bvh for raycasting, AABB for placement collision

**Rationale**:

- **BVH for Selection**: Bounding Volume Hierarchy reduces raycasting complexity from O(n) to O(log n) for mouse picking in dense scenes
- **AABB for Placement**: Axis-Aligned Bounding Box collision is sufficient for grid-aligned objects, much faster than complex polygon intersection
- **Hybrid Approach**: Use appropriate algorithm for each use case rather than one-size-fits-all

**Implementation**:

```typescript
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

// Enable BVH on static geometry
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

// AABB collision check for placement
function checkAABBCollision(
  posA: Vector3, sizeA: Vector3,
  posB: Vector3, sizeB: Vector3
): boolean {
  return (
    Math.abs(posA.x - posB.x) < (sizeA.x + sizeB.x) / 2 &&
    Math.abs(posA.y - posB.y) < (sizeA.y + sizeB.y) / 2 &&
    Math.abs(posA.z - posB.z) < (sizeA.z + sizeB.z) / 2
  );
}
```

**Alternatives Considered**:

- **Octree**: Good for dynamic scenes but warehouse layouts are mostly static, BVH is simpler
- **Physics Engine (Cannon.js/Ammo.js)**: Overkill for simple placement collision, adds 200KB+ to bundle
- **Grid-based collision**: Fast but less accurate, may miss edge cases with rotated objects

**References**:

- three-mesh-bvh: <https://github.com/gkjohnson/three-mesh-bvh>
- Collision detection techniques: <https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_collision_detection>

---

## 3. Performance Optimization Strategies

### 3.1 InstancedMesh for Repeated Objects

**Decision**: Use InstancedMesh for bins/shelves, regular Mesh for racks

**Rationale**:

- **Draw Call Reduction**: InstancedMesh renders thousands of identical objects in single draw call vs. one call per Mesh
- **GPU Instancing**: Leverages hardware instancing for massive performance boost (10x+ FPS improvement with 5000+ objects)
- **Selective Use**: Only applies to truly identical objects (bins, standard shelves), racks need individual transforms

**Implementation**:

```typescript
// Render 1000 bins as single InstancedMesh
function BinInstancedMesh({ bins }: { bins: Bin[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  
  useEffect(() => {
    if (!meshRef.current) return;
    
    bins.forEach((bin, i) => {
      tempObject.position.set(bin.position.x, bin.position.y, bin.position.z);
      tempObject.rotation.set(bin.rotation.x, bin.rotation.y, bin.rotation.z);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [bins]);
  
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, bins.length]}>
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshStandardMaterial color="orange" />
    </instancedMesh>
  );
}
```

**Benchmark Data** (hypothetical based on industry standards):

- 5000 Meshes: ~15 FPS
- 5000 InstancedMesh: ~60 FPS

**Alternatives Considered**:

- **LOD (Level of Detail)**: Good for very large scenes but adds complexity, not needed for warehouse scale
- **Frustum Culling**: Three.js already does this automatically
- **Merged Geometry**: Static approach, loses interactivity

**References**:

- InstancedMesh docs: <https://threejs.org/docs/#api/en/objects/InstancedMesh>
- Performance comparison: <https://discourse.threejs.org/t/instancedmesh-vs-merged-geometry/>

---

### 3.2 Zustand Transient Updates Pattern

**Decision**: Use direct Three.js mutations during drag, sync to Zustand on drag end

**Rationale**:

- **Frame Rate**: Updating Zustand 60 times/second during drag triggers React reconciliation, causing frame drops
- **Batching**: Accumulate changes in Three.js objects (via refs), only commit to store when interaction completes
- **Best of Both Worlds**: Smooth visual feedback + consistent state management

**Implementation**:

```typescript
function DraggableRack({ rack }: { rack: Rack }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const updateRackPosition = useLayoutStore(s => s.updateRackPosition);
  
  const bind = useDrag(({ offset: [x, z] }) => {
    // Direct mutation during drag (no Zustand update)
    if (meshRef.current) {
      meshRef.current.position.x = x;
      meshRef.current.position.z = z;
    }
  }, {
    // On drag end, sync to Zustand
    onEnd: () => {
      if (meshRef.current) {
        const snapped = snapToGrid(meshRef.current.position);
        updateRackPosition(rack.id, snapped);
      }
    }
  });
  
  return (
    <mesh ref={meshRef} {...bind()}>
      {/* geometry */}
    </mesh>
  );
}
```

**Alternatives Considered**:

- **Every-frame Zustand updates**: Causes re-render cascade, drops to <30 FPS
- **Throttled updates**: Better but still causes visual stutter every N frames
- **Separate drag state store**: Adds complexity, transient pattern is simpler

**References**:

- Zustand transient updates: <https://github.com/pmndrs/zustand/discussions/1937>
- React Three Fiber performance: <https://docs.pmnd.rs/react-three-fiber/advanced/pitfalls>

---

## 4. Data Architecture Decisions

### 4.1 Normalization Strategy

**Decision**: Hybrid approach - normalized for editor, denormalized for API

**Rationale**:

- **Editor Efficiency**: Flat Map<ID, Entity> enables O(1) lookup during drag operations, pathfinding
- **API Compatibility**: Hierarchical JSON matches industry standards, easier integration with WMS systems
- **Hydration/Dehydration**: Transform data at system boundaries, keeping best of both worlds

**Data Structures**:

```typescript
// Normalized (internal store)
interface NormalizedLayout {
  meta: LayoutMeta;
  zones: Map<string, Zone>;
  racks: Map<string, Rack>;
  shelves: Map<string, Shelf>;
  bins: Map<string, Bin>;
  obstacles: Map<string, Obstacle>;
  
  // Relationship indices
  zoneRacks: Map<string, Set<string>>;   // zoneId -> rackIds
  rackShelves: Map<string, Set<string>>; // rackId -> shelfIds
  shelfBins: Map<string, Set<string>>;   // shelfId -> binIds
}

// Denormalized (API/JSON)
interface WarehouseLayout {
  meta: LayoutMeta;
  zones: Zone[]; // Contains nested racks[]
}
```

**Hydration Function**:

```typescript
function hydrateLayout(json: WarehouseLayout): NormalizedLayout {
  const normalized: NormalizedLayout = {
    meta: json.meta,
    zones: new Map(),
    racks: new Map(),
    shelves: new Map(),
    bins: new Map(),
    obstacles: new Map(),
    zoneRacks: new Map(),
    rackShelves: new Map(),
    shelfBins: new Map()
  };
  
  json.zones.forEach(zone => {
    normalized.zones.set(zone.id, zone);
    const rackIds = new Set<string>();
    
    zone.racks.forEach(rack => {
      normalized.racks.set(rack.id, rack);
      rackIds.add(rack.id);
      const shelfIds = new Set<string>();
      
      rack.shelves.forEach(shelf => {
        normalized.shelves.set(shelf.id, shelf);
        shelfIds.add(shelf.id);
        const binIds = new Set<string>();
        
        shelf.bins.forEach(bin => {
          normalized.bins.set(bin.id, bin);
          binIds.add(bin.id);
        });
        
        normalized.shelfBins.set(shelf.id, binIds);
      });
      
      normalized.rackShelves.set(rack.id, shelfIds);
    });
    
    normalized.zoneRacks.set(zone.id, rackIds);
  });
  
  return normalized;
}
```

**Alternatives Considered**:

- **Always normalized**: Forces API consumers to normalize, bad DX
- **Always denormalized**: Inefficient lookups during editing (O(n) searches)
- **ORM-like library (normalizr)**: Adds dependency, overkill for this use case

**References**:

- Redux normalization: <https://redux.js.org/usage/structuring-reducers/normalizing-state-shape>
- Data modeling best practices: <https://www.patterns.dev/posts/data-fetching>

---

### 4.2 JSON Schema Versioning

**Decision**: Semantic versioning with migration functions

**Rationale**:

- **Forward Compatibility**: Version field enables handling multiple schema versions
- **Graceful Degradation**: Unknown fields ignored rather than causing errors
- **Migration Path**: Explicit upgrade functions when breaking changes needed

**Implementation**:

```typescript
// Type guards
function isV1Schema(json: any): json is WarehouseLayoutV1 {
  return json.version === "1.0";
}

// Migration
function migrateToV2(v1: WarehouseLayoutV1): WarehouseLayoutV2 {
  return {
    version: "2.0",
    meta: v1.meta,
    config: {
      ...v1.config,
      snapMode: "grid" // New field in v2
    },
    zones: v1.zones.map(zone => ({
      ...zone,
      color: zone.color || "#cccccc" // Default for missing field
    }))
  };
}

// Loader
function loadLayout(json: unknown): WarehouseLayout {
  if (!isV1Schema(json)) {
    throw new Error("Unsupported schema version");
  }
  
  // Auto-migrate if needed
  if (json.version === "1.0") {
    return migrateToV2(json);
  }
  
  return json;
}
```

**Alternatives Considered**:

- **No versioning**: Fragile, breaks on any change
- **JSON Schema validation**: Excellent but adds 50KB+ dependency (ajv)
- **Protobuf**: Binary format, overkill for human-readable configs

**References**:

- API versioning strategies: <https://www.freecodecamp.org/news/how-to-version-a-rest-api/>
- TypeScript type guards: <https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates>

---

## 5. Testing Strategy

### 5.1 Test Pyramid

**Decision**: 70% unit, 20% integration, 10% E2E

**Rationale**:

- **Unit Tests**: Algorithms (BFS, locking logic, grid snapping) are pure functions, easy to test exhaustively
- **Integration Tests**: Component interactions (drag-drop flow, state updates) need React Testing Library
- **E2E Tests**: Critical user journeys (load → edit → save) validated with Playwright, slow so minimal

**Test Examples**:

```typescript
// Unit test: Grid snapping
describe('snapToGrid', () => {
  it('snaps position to nearest grid point', () => {
    const gridSize = 0.5;
    expect(snapToGrid({ x: 1.23, y: 0, z: 4.67 }, gridSize))
      .toEqual({ x: 1.0, y: 0, z: 4.5 });
  });
  
  it('handles negative coordinates', () => {
    expect(snapToGrid({ x: -1.23, y: 0, z: -0.67 }, 0.5))
      .toEqual({ x: -1.0, y: 0, z: -0.5 });
  });
});

// Integration test: Locking
describe('Rack locking', () => {
  it('prevents drag when rack has inventory', async () => {
    const { container } = render(
      <WarehouseEditor
        layout={mockLayout}
        inventoryMap={{ "bin-1": { qty: 10 } }}
      />
    );
    
    const rack = screen.getByTestId('rack-1');
    const initialPos = rack.style.transform;
    
    fireEvent.mouseDown(rack);
    fireEvent.mouseMove(rack, { clientX: 100, clientY: 100 });
    fireEvent.mouseUp(rack);
    
    expect(rack.style.transform).toBe(initialPos); // Position unchanged
    expect(screen.getByText(/cannot modify rack/i)).toBeInTheDocument();
  });
});

// E2E test: Save workflow
test('complete edit and save workflow', async ({ page }) => {
  await page.goto('http://localhost:5173/demo');
  
  // Load layout
  await page.click('button:has-text("Load Sample")');
  await expect(page.locator('canvas')).toBeVisible();
  
  // Add rack
  await page.dragAndDrop('[data-asset="standard-rack"]', 'canvas', {
    targetPosition: { x: 300, y: 300 }
  });
  
  // Verify no accessibility errors
  await expect(page.locator('.accessibility-warning')).toHaveCount(0);
  
  // Save
  await page.click('button:has-text("Save Layout")');
  const download = await page.waitForEvent('download');
  const json = JSON.parse(await download.path());
  
  expect(json.zones[0].racks).toHaveLength(1);
});
```

**Alternatives Considered**:

- **Higher E2E percentage**: Too slow, brittle in CI
- **Snapshot testing**: Good for UI but fragile with 3D rendering randomness
- **Visual regression (Percy)**: Excellent but expensive, defer to later

**References**:

- Test pyramid: <https://martinfowler.com/articles/practical-test-pyramid.html>
- R3F testing: <https://docs.pmnd.rs/react-three-fiber/advanced/testing>

---

### 5.2 Performance Benchmarking

**Decision**: Continuous performance monitoring with regression alerts

**Tools**:

- **Chrome DevTools Performance API**: Measure FPS, frame time
- **Lighthouse CI**: Bundle size tracking
- **Custom metrics**: Pathfinding time, render time for N objects

**Implementation**:

```typescript
// Performance test suite
describe('Performance benchmarks', () => {
  it('maintains 60 FPS with 5000 objects', async () => {
    const layout = generateLargeWarehouse(5000);
    const { container } = render(<WarehouseEditor layout={layout} />);
    
    await waitFor(() => {
      const fps = measureFPS(container);
      expect(fps).toBeGreaterThan(55); // Allow 5 FPS margin
    });
  });
  
  it('completes pathfinding in <200ms for 200x200 grid', () => {
    const grid = new GridMap(200, 200, 1);
    const start = performance.now();
    floodFillAccessibility(grid, entryPoints, targets);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(200);
  });
});

// CI integration (.github/workflows/performance.yml)
// Fail build if bundle size > 150KB or FPS < 55
```

**Alternatives Considered**:

- **Manual testing**: Not repeatable, prone to human error
- **Profiling in production**: Too late, should catch regressions in CI

**References**:

- Web performance APIs: <https://developer.mozilla.org/en-US/docs/Web/API/Performance_API>
- Lighthouse CI: <https://github.com/GoogleChrome/lighthouse-ci>

---

## 6. Developer Experience Enhancements

### 6.1 TypeScript Strictness Configuration

**Decision**: Enable strict mode with additional checks

**Configuration**:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

**Rationale**:

- Catches 90% of bugs at compile time vs. runtime
- Forces explicit null handling (critical for pathfinding edge cases)
- Declaration maps enable "Go to Definition" across packages

---

### 6.2 Linting and Formatting

**Decision**: ESLint + Prettier with React/TypeScript plugins

**Rules**:

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  "rules": {
    "react/react-in-jsx-scope": "off",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

---

## 7. Conclusion

All technical unknowns have been resolved with concrete decisions backed by research. The chosen stack (React Three Fiber + Zustand + Vite) provides optimal balance of performance, developer experience, and maintainability. Algorithms (BFS pathfinding, AABB collision) are industry-proven for warehouse-scale applications. Performance optimizations (InstancedMesh, Web Workers, transient updates) ensure 60 FPS target is achievable.

**Next Steps**: Proceed to Phase 1 (Design) to translate these decisions into data models and API contracts.
