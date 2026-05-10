# API Contract: WarehouseEditor Component

**Date**: 2025-12-02  
**Version**: 1.0  
**Type**: React Component Props Interface

---

## Component Signature

```typescript
import { WarehouseEditor } from '@warehouse-editor/core';

<WarehouseEditor
  initialLayout={layout}
  inventoryMap={inventory}
  onLayoutChange={handleChange}
  onSave={handleSave}
  onError={handleError}
  config={editorConfig}
/>
```

---

## Props Specification

### Required Props

#### `initialLayout: WarehouseLayout`

**Type**: Object conforming to WarehouseLayout schema (see data-model.md)

**Description**: Initial warehouse layout to render in editor

**Example**:

```typescript
const layout: WarehouseLayout = {
  version: "1.0",
  meta: {
    warehouseId: "wh-001",
    lastUpdated: "2025-12-02T10:00:00Z",
    authorId: "user-123"
  },
  config: {
    gridSize: 0.5,
    measurementUnit: "meters",
    floorDimensions: { width: 100, length: 50 }
  },
  entryPoints: [
    { id: "entry-1", position: { x: 0, y: 0, z: 25 }, label: "Main Door" }
  ],
  zones: [/* ... */]
};
```

**Validation**:

- Must conform to JSON schema
- Invalid layout triggers `onError` callback
- Missing required fields cause immediate error

---

### Optional Props

#### `inventoryMap?: Record<string, InventoryData>`

**Type**: Map of bin IDs to inventory data

**Description**: External inventory data used to compute rack locking status

**Default**: `{}` (empty - no racks locked)

**Example**:

```typescript
const inventory = {
  "bin-1": { sku: "ITEM-A", qty: 50, unit: "pieces" },
  "bin-2": { sku: "ITEM-B", qty: 0, unit: "pieces" }
};
```

**Type Definition**:

```typescript
interface InventoryData {
  sku: string;      // Stock keeping unit
  qty: number;      // Quantity (>0 triggers lock)
  unit?: string;    // Optional unit (pieces, boxes, pallets)
  reserved?: number; // Optional reserved quantity
}
```

**Behavior**:

- Racks containing bins with `qty > 0` become locked
- Locked racks cannot be moved, rotated, or deleted
- Updates to this prop trigger lock status recomputation

---

#### `config?: EditorConfig`

**Type**: Editor configuration object

**Description**: Customize editor behavior and appearance

**Default**: See below

**Type Definition**:

```typescript
interface EditorConfig {
  /** Camera settings */
  camera?: {
    type: "orthographic" | "perspective";
    initialPosition?: Vector3;
    initialTarget?: Vector3;
  };
  
  /** Grid settings */
  grid?: {
    visible: boolean;
    color: string;
    fadeDistance: number;
  };
  
  /** Interaction settings */
  interaction?: {
    enableRotation: boolean;
    enableZoom: boolean;
    enablePan: boolean;
    dragSensitivity: number; // 0.1 - 2.0
  };
  
  /** Visual settings */
  visual?: {
    showLabels: boolean;
    showDimensions: boolean;
    highlightAccessible: boolean;
    lockedRackColor: string;
    inaccessibleRackColor: string;
  };
  
  /** Performance settings */
  performance?: {
    enableShadows: boolean;
    antialiasing: boolean;
    pixelRatio: number; // 1 = standard, 2 = retina
  };
  
  /** Validation settings */
  validation?: {
    enableAccessibilityCheck: boolean;
    enableCollisionCheck: boolean;
    autoValidateOnChange: boolean;
  };
}
```

**Defaults**:

```typescript
const defaultConfig: EditorConfig = {
  camera: {
    type: "orthographic",
    initialPosition: { x: 50, y: 100, z: 50 },
    initialTarget: { x: 50, y: 0, z: 25 }
  },
  grid: {
    visible: true,
    color: "#888888",
    fadeDistance: 100
  },
  interaction: {
    enableRotation: true,
    enableZoom: true,
    enablePan: true,
    dragSensitivity: 0.4
  },
  visual: {
    showLabels: true,
    showDimensions: false,
    highlightAccessible: true,
    lockedRackColor: "#EF4444",
    inaccessibleRackColor: "#F59E0B"
  },
  performance: {
    enableShadows: true,
    antialiasing: true,
    pixelRatio: window.devicePixelRatio
  },
  validation: {
    enableAccessibilityCheck: true,
    enableCollisionCheck: true,
    autoValidateOnChange: true
  }
};
```

---

## Callback Props

### `onLayoutChange?: (layout: WarehouseLayout, changes: ChangeEvent) => void`

**Description**: Called whenever layout is modified (debounced to 300ms)

**Parameters**:

```typescript
interface ChangeEvent {
  type: "rack-added" | "rack-moved" | "rack-removed" | "zone-modified" | "config-changed";
  entityId: string;
  timestamp: number;
  previousValue?: any;
  newValue?: any;
}
```

**Example**:

```typescript
const handleChange = (layout, changes) => {
  console.log(`Layout changed: ${changes.type}`);
  // Optionally sync to backend
  autoSaveToBackend(layout);
};
```

**Debouncing**: Events are batched if multiple changes occur within 300ms

---

### `onSave?: (layout: WarehouseLayout) => Promise<void>`

**Description**: Called when user clicks "Save" button

**Parameters**:

- `layout`: Current layout (dehydrated to hierarchical JSON)

**Return**: Promise that resolves on successful save

**Example**:

```typescript
const handleSave = async (layout) => {
  try {
    await fetch('/api/warehouses/wh-001/layout', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(layout)
    });
    toast.success('Layout saved successfully');
  } catch (error) {
    toast.error('Failed to save layout');
    throw error; // Re-throw to let editor show error state
  }
};
```

**Button State**:

- Disabled if validation errors exist
- Shows loading spinner while promise pending
- Shows success checkmark on resolution

---

### `onError?: (error: EditorError) => void`

**Description**: Called when errors occur

**Parameters**:

```typescript
interface EditorError {
  type: "validation" | "rendering" | "performance" | "user-action";
  message: string;
  details?: any;
  timestamp: number;
  severity: "error" | "warning" | "info";
}
```

**Example**:

```typescript
const handleError = (error) => {
  if (error.severity === "error") {
    console.error('[Editor Error]', error.message, error.details);
    // Show user-facing error
    showNotification({
      type: 'error',
      title: 'Editor Error',
      message: error.message
    });
  }
};
```

**Error Types**:

- `validation`: Invalid layout data, constraint violations
- `rendering`: WebGL errors, browser compatibility
- `performance`: FPS drops below threshold, memory issues
- `user-action`: Invalid drag-drop, attempting to move locked rack

---

### `onAccessibilityChange?: (results: AccessibilityResults) => void`

**Description**: Called after pathfinding validation completes

**Parameters**:

```typescript
interface AccessibilityResults {
  inaccessibleRacks: string[]; // Rack IDs
  blockedPaths: PathSegment[];
  computationTime: number; // milliseconds
  gridSize: { width: number; height: number };
}

interface PathSegment {
  from: Vector2;
  to: Vector2;
  blocked: boolean;
}
```

**Example**:

```typescript
const handleAccessibilityChange = (results) => {
  if (results.inaccessibleRacks.length > 0) {
    console.warn(`${results.inaccessibleRacks.length} racks are inaccessible`);
    // Show warning UI
    setWarning(`⚠️ ${results.inaccessibleRacks.length} racks blocked`);
  } else {
    setWarning(null);
  }
};
```

**Trigger Timing**: Runs 500ms after last layout modification (debounced)

---

### `onPerformanceUpdate?: (metrics: PerformanceMetrics) => void`

**Description**: Called periodically with performance metrics for monitoring

**Parameters**:

```typescript
interface PerformanceMetrics {
  fps: number;                    // Current frames per second
  frameTime: number;              // Average frame time in ms
  drawCalls: number;              // Number of draw calls per frame
  triangles: number;              // Total triangles rendered
  memoryUsage?: number;           // Estimated memory usage in MB
  timestamp: number;              // Measurement timestamp
}
```

**Example**:

```typescript
const handlePerformanceUpdate = (metrics) => {
  if (metrics.fps < 30) {
    console.warn('Performance degradation detected:', metrics);
    // Consider reducing visual quality or alerting user
  }
  // Send to monitoring/analytics
  analytics.track('editor_performance', metrics);
};
```

**Trigger Timing**: Called every 1000ms when enabled via `config.performance.enableMetrics`

---

## Ref API (Imperative Handle)

For advanced use cases, expose imperative API via ref:

```typescript
const editorRef = useRef<WarehouseEditorHandle>(null);

<WarehouseEditor ref={editorRef} {...props} />

// Programmatic control
editorRef.current?.exportLayout(); // Get current layout as JSON
editorRef.current?.validateLayout(); // Trigger manual validation
editorRef.current?.resetCamera(); // Reset camera to initial position
editorRef.current?.zoomToRack(rackId); // Focus on specific rack
```

**Type Definition**:

```typescript
interface WarehouseEditorHandle {
  /** Export current layout (dehydrated JSON) */
  exportLayout: () => WarehouseLayout;
  
  /** Trigger validation and return results */
  validateLayout: () => ValidationResult;
  
  /** Reset camera to initial position */
  resetCamera: () => void;
  
  /** Focus camera on specific entity */
  zoomToRack: (rackId: string) => void;
  zoomToZone: (zoneId: string) => void;
  
  /** Programmatically add entities */
  addRack: (rack: Omit<Rack, "id">) => string; // Returns generated ID
  removeRack: (rackId: string) => boolean;
  
  /** Get current editor state */
  getState: () => EditorState;
  
  /** Take screenshot */
  captureScreenshot: () => Promise<Blob>;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface EditorState {
  selectedEntityId: string | null;
  cameraPosition: Vector3;
  isDirty: boolean; // Has unsaved changes
  lockedRackCount: number;
  totalRackCount: number;
}
```

---

## Usage Examples

### Basic Integration

```typescript
import { WarehouseEditor } from '@warehouse-editor/core';
import { useState } from 'react';

function WarehousePage() {
  const [layout, setLayout] = useState<WarehouseLayout>(initialLayout);
  const [inventory, setInventory] = useState<Record<string, InventoryData>>({});
  
  // Fetch inventory from API
  useEffect(() => {
    fetch('/api/inventory/current')
      .then(res => res.json())
      .then(data => setInventory(data));
  }, []);
  
  const handleSave = async (updatedLayout: WarehouseLayout) => {
    await fetch('/api/warehouse/layout', {
      method: 'PUT',
      body: JSON.stringify(updatedLayout)
    });
    setLayout(updatedLayout);
  };
  
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <WarehouseEditor
        initialLayout={layout}
        inventoryMap={inventory}
        onSave={handleSave}
        config={{ visual: { showLabels: true } }}
      />
    </div>
  );
}
```

---

### Advanced: Custom Toolbar

```typescript
import { WarehouseEditor, useWarehouseEditor } from '@warehouse-editor/core';

function CustomWarehousePage() {
  const editorRef = useRef<WarehouseEditorHandle>(null);
  
  const handleAddStandardRack = () => {
    const rackId = editorRef.current?.addRack({
      type: "standard",
      position: { x: 10, y: 0, z: 10 },
      rotation: { x: 0, y: 0, z: 0 },
      dimensions: { width: 2, height: 4, depth: 1 },
      shelves: [/* ... */]
    });
    console.log('Added rack:', rackId);
  };
  
  const handleExport = () => {
    const layout = editorRef.current?.exportLayout();
    if (layout) {
      const blob = new Blob([JSON.stringify(layout, null, 2)], {
        type: 'application/json'
      });
      saveAs(blob, 'warehouse-layout.json');
    }
  };
  
  return (
    <div>
      <div className="toolbar">
        <button onClick={handleAddStandardRack}>Add Standard Rack</button>
        <button onClick={handleExport}>Export JSON</button>
        <button onClick={() => editorRef.current?.resetCamera()}>
          Reset Camera
        </button>
      </div>
      
      <WarehouseEditor
        ref={editorRef}
        initialLayout={layout}
        onLayoutChange={(layout, changes) => {
          console.log('Change:', changes.type);
        }}
      />
    </div>
  );
}
```

---

### Error Handling

```typescript
function WarehousePageWithErrorHandling() {
  const [errors, setErrors] = useState<EditorError[]>([]);
  
  const handleError = (error: EditorError) => {
    setErrors(prev => [...prev, error]);
    
    // Auto-dismiss warnings after 5s
    if (error.severity === "warning") {
      setTimeout(() => {
        setErrors(prev => prev.filter(e => e !== error));
      }, 5000);
    }
  };
  
  return (
    <div>
      {errors.map((error, i) => (
        <div key={i} className={`alert alert-${error.severity}`}>
          {error.message}
        </div>
      ))}
      
      <WarehouseEditor
        initialLayout={layout}
        onError={handleError}
      />
    </div>
  );
}
```

---

## TypeScript Import Paths

```typescript
// Main component
import { WarehouseEditor } from '@warehouse-editor/core';

// Types
import type {
  WarehouseLayout,
  WarehouseEditorHandle,
  EditorConfig,
  EditorError,
  InventoryData,
  CollidableEntity
} from '@warehouse-editor/core/types';

// Hooks (if exposed)
import { useWarehouseEditor } from '@warehouse-editor/core/hooks';
```

---

## Implemented Hooks (Internal)

### `useTransformControls`

**Purpose**: Reusable transform controls logic with state machine

**Location**: `src/hooks/useTransformControls.ts`

```typescript
interface UseTransformControlsOptions {
  currentTransform: TransformState;
  dimensions: Dimension;
  isSelected: boolean;
  transformMode: "translate" | "rotate" | null;
  groupRef: React.RefObject<Group | null>;
  racks: Map<string, Rack>;
  obstacles: Map<string, Obstacle>;
  zones: Map<string, Zone>;
  excludeFromCollision?: string;
  onConfirm: (updates: Partial<TransformState>) => void;
}

interface UseTransformControlsReturn {
  machineState: "idle" | "dragging" | "pending";
  hasPendingTransform: boolean;
  handleTransformStart: () => void;
  handleTranslateEnd: () => void;
  handleRotateEnd: () => void;
  handleConfirmClick: () => boolean;
  clearPendingState: () => void;
}
```

**Key Features**:

- State machine pattern prevents race conditions
- Quaternion-based rotation extraction avoids gimbal lock
- Rotation normalized to 0-359° range
- Skip sync ref prevents stale value issues on commit
- Success toasts with position/rotation feedback

### `useKeyboardShortcuts`

**Purpose**: Keyboard shortcut handling for editor actions

**Location**: `src/hooks/useKeyboardShortcuts.ts`

**Shortcuts**:

| Key | Action |
|-----|--------|
| M | Toggle translate mode |
| R | Toggle rotate mode |
| Delete | Remove selected entity |
| Escape | Clear selection / cancel |
| Ctrl+Z | Undo |
| Ctrl+Y / Ctrl+Shift+Z | Redo |

---

## Collision Detection API

### `checkCollisions`

**Purpose**: Unified collision detection for entity placement/movement

**Location**: `src/utils/collision.ts`

```typescript
interface CheckCollisionsOptions {
  position: Vector3;
  dimensions: Dimension;
  rotationY: number;
  bounds: { x: number; z: number; width: number; length: number };
  excludeEntityId?: string;
}

interface CollisionResult {
  hasCollision: boolean;
  reason?: string;
  collidingEntities?: string[];
}

function checkCollisions(
  options: CheckCollisionsOptions,
  racks: Map<string, Rack>,
  obstacles: Map<string, Obstacle>
): CollisionResult;
```

**Algorithm**: Separating Axis Theorem (SAT) for Oriented Bounding Boxes (OBB)

**Features**:

- Handles Y-axis rotated entities
- Checks bounds containment
- Returns descriptive collision reasons
- Debug visualization callback for development

---

## Browser Compatibility

| Browser | Minimum Version | Notes |
|---------|-----------------|-------|
| Chrome | 56+ | Full support |
| Firefox | 51+ | Full support |
| Safari | 15+ | Requires WebGL 2.0 |
| Edge | 79+ | Chromium-based |

**Fallback**: If WebGL 2.0 unavailable, show error message with browser upgrade instructions

---

## Performance Guarantees

- **Initial Render**: <2s for layouts with <1000 racks
- **Interaction**: 60 FPS during drag operations
- **Pathfinding**: <200ms for 200x200 grid
- **Memory**: <200MB for typical warehouse (1000 racks)

**Monitoring**: Editor exposes performance metrics via `onPerformanceUpdate` callback (optional)

---

## Versioning

This API follows semantic versioning:

- **Major**: Breaking changes to props or behavior
- **Minor**: New optional props, backward-compatible features
- **Patch**: Bug fixes, performance improvements

**Current Version**: 1.0.0  
**Last Updated**: 2025-12-09  
**Stability**: Experimental (subject to change until 2.0)
