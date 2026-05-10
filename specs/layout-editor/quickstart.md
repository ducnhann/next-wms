# Quickstart Guide: Warehouse Layout Editor

**Target Audience**: Developers integrating the editor into their application  
**Time to Complete**: 15 minutes  
**Prerequisites**: React 18+, Node.js 18+, Basic TypeScript knowledge

---

## Installation

### Option 1: NPM Package (Recommended)

```bash
npm install @warehouse-editor/core three @react-three/fiber zustand
```

**Peer Dependencies**:

```json
{
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "three": "^0.160.0",
  "@react-three/fiber": "^8.15.0",
  "zustand": "^4.4.0"
}
```

### Option 2: Git Submodule

```bash
git submodule add https://github.com/your-org/warehouse-editor.git packages/warehouse-editor
cd packages/warehouse-editor
npm install
npm run build
```

---

## Basic Usage (5 minutes)

### Step 1: Import Component

```typescript
// App.tsx
import { WarehouseEditor } from '@warehouse-editor/core';
import '@warehouse-editor/core/styles.css'; // Optional: default styles
```

### Step 2: Prepare Layout Data

Create a minimal warehouse layout:

```typescript
const initialLayout = {
  version: "1.0",
  meta: {
    warehouseId: "demo-warehouse",
    lastUpdated: new Date().toISOString(),
    authorId: "current-user",
    name: "Demo Warehouse"
  },
  config: {
    gridSize: 0.5,
    measurementUnit: "meters" as const,
    snapToGrid: true,
    floorDimensions: {
      width: 50,
      length: 30
    }
  },
  entryPoints: [
    {
      id: "entry-main",
      position: { x: 0, y: 0, z: 15 },
      label: "Main Entrance",
      type: "door" as const
    }
  ],
  zones: [
    {
      id: "zone-storage",
      type: "storage" as const,
      name: "Storage Zone A",
      bounds: { x: 5, z: 5, width: 40, length: 20 },
      color: "#3B82F6",
      racks: [],
      obstacles: []
    }
  ]
};
```

### Step 3: Render Editor

```typescript
function App() {
  const handleSave = async (layout) => {
    console.log('Saving layout:', layout);
    // TODO: Send to your backend API
    await fetch('/api/warehouse/layout', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(layout)
    });
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <WarehouseEditor
        initialLayout={initialLayout}
        onSave={handleSave}
      />
    </div>
  );
}

export default App;
```

### Step 4: Run Application

```bash
npm run dev
```

Navigate to `http://localhost:5173` - you should see:

- 3D warehouse floor with grid
- Empty storage zone (blue boundary)
- Camera controls (orbit with mouse)

---

## Adding Inventory Integration (5 minutes)

### Step 1: Fetch Inventory Data

```typescript
import { useState, useEffect } from 'react';

function App() {
  const [inventory, setInventory] = useState({});

  useEffect(() => {
    // Fetch from your inventory system
    fetch('/api/inventory/current')
      .then(res => res.json())
      .then(data => {
        // Transform to editor format
        const inventoryMap = {};
        data.forEach(item => {
          inventoryMap[item.binId] = {
            sku: item.sku,
            qty: item.quantity,
            unit: item.unit
          };
        });
        setInventory(inventoryMap);
      });
  }, []);

  return (
    <WarehouseEditor
      initialLayout={initialLayout}
      inventoryMap={inventory} // Pass inventory
      onSave={handleSave}
    />
  );
}
```

**Result**: Racks with inventory will show lock icons and cannot be moved

---

## Customizing Appearance (5 minutes)

### Configure Editor Settings

```typescript
const editorConfig = {
  camera: {
    type: "orthographic" as const, // or "perspective"
    initialPosition: { x: 25, y: 80, z: 25 }
  },
  
  visual: {
    showLabels: true,          // Show rack/zone labels
    showDimensions: false,     // Hide dimension annotations
    highlightAccessible: true, // Highlight accessibility issues
    lockedRackColor: "#EF4444", // Red for locked racks
    inaccessibleRackColor: "#F59E0B" // Orange for blocked racks
  },
  
  grid: {
    visible: true,
    color: "#CCCCCC",
    fadeDistance: 50
  },
  
  performance: {
    enableShadows: true,       // Disable for low-end devices
    antialiasing: true,
    pixelRatio: window.devicePixelRatio
  },
  
  validation: {
    enableAccessibilityCheck: true,
    enableCollisionCheck: true,
    autoValidateOnChange: true // Validate on every change
  }
};

<WarehouseEditor
  initialLayout={initialLayout}
  config={editorConfig}
/>
```

---

## Common Integration Patterns

### Pattern 1: Auto-Save

```typescript
import { useCallback, useEffect, useRef } from 'react';
import { debounce } from 'lodash';

function WarehousePage() {
  const autoSave = useRef(
    debounce(async (layout) => {
      await fetch('/api/warehouse/autosave', {
        method: 'POST',
        body: JSON.stringify(layout)
      });
      console.log('Auto-saved at', new Date().toLocaleTimeString());
    }, 2000) // Save 2 seconds after last change
  ).current;

  return (
    <WarehouseEditor
      initialLayout={initialLayout}
      onLayoutChange={(layout) => autoSave(layout)}
    />
  );
}
```

---

### Pattern 2: Error Notifications

```typescript
import { toast } from 'react-hot-toast'; // or your toast library

function WarehousePage() {
  const handleError = (error) => {
    if (error.severity === "error") {
      toast.error(`Error: ${error.message}`);
    } else if (error.severity === "warning") {
      toast.warning(error.message);
    }
  };

  return (
    <WarehouseEditor
      initialLayout={initialLayout}
      onError={handleError}
    />
  );
}
```

---

### Pattern 3: Accessibility Monitoring

```typescript
import { useState } from 'react';

function WarehousePage() {
  const [accessibilityIssues, setAccessibilityIssues] = useState([]);

  const handleAccessibilityChange = (results) => {
    setAccessibilityIssues(results.inaccessibleRacks);
  };

  return (
    <div>
      {accessibilityIssues.length > 0 && (
        <div className="alert alert-warning">
          ⚠️ {accessibilityIssues.length} rack(s) are not accessible.
          Please adjust layout before saving.
        </div>
      )}
      
      <WarehouseEditor
        initialLayout={initialLayout}
        onAccessibilityChange={handleAccessibilityChange}
      />
    </div>
  );
}
```

---

### Pattern 4: Imperative Control

```typescript
import { useRef } from 'react';

function WarehousePage() {
  const editorRef = useRef(null);

  const exportJSON = () => {
    const layout = editorRef.current?.exportLayout();
    const blob = new Blob([JSON.stringify(layout, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'warehouse-layout.json';
    a.click();
  };

  const resetView = () => {
    editorRef.current?.resetCamera();
  };

  const addStandardRack = () => {
    editorRef.current?.addRack({
      type: "standard",
      position: { x: 10, y: 0, z: 10 },
      rotation: { x: 0, y: 0, z: 0 },
      dimensions: { width: 2, height: 4, depth: 1 },
      shelves: [
        {
          id: crypto.randomUUID(),
          levelIndex: 0,
          heightFromGround: 0.5,
          bins: [
            {
              id: crypto.randomUUID(),
              capacity: 100,
              currentLoad: 0
            }
          ]
        }
      ]
    });
  };

  return (
    <div>
      <div className="toolbar">
        <button onClick={addStandardRack}>Add Rack</button>
        <button onClick={resetView}>Reset Camera</button>
        <button onClick={exportJSON}>Export JSON</button>
      </div>
      
      <WarehouseEditor ref={editorRef} initialLayout={initialLayout} />
    </div>
  );
}
```

---

## Testing Your Integration

### Unit Test Example

```typescript
import { render, screen } from '@testing-library/react';
import { WarehouseEditor } from '@warehouse-editor/core';

describe('WarehouseEditor Integration', () => {
  it('renders canvas with initial layout', () => {
    const { container } = render(
      <WarehouseEditor initialLayout={minimalLayout} />
    );
    
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('calls onSave when save button clicked', async () => {
    const handleSave = jest.fn();
    render(
      <WarehouseEditor
        initialLayout={minimalLayout}
        onSave={handleSave}
      />
    );
    
    const saveButton = screen.getByText(/save/i);
    saveButton.click();
    
    expect(handleSave).toHaveBeenCalled();
  });
});
```

---

## Troubleshooting

### Issue: Canvas is blank / black screen

**Cause**: WebGL not supported or initialization failed

**Solution**:

```typescript
// Check WebGL support before rendering
const hasWebGL = (() => {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      canvas.getContext('webgl2') || 
      canvas.getContext('webgl')
    );
  } catch (e) {
    return false;
  }
})();

if (!hasWebGL) {
  return <div>Your browser does not support WebGL 2.0</div>;
}

return <WarehouseEditor {...props} />;
```

---

### Issue: Low FPS / Laggy performance

**Causes**:

1. Too many objects (>5000)
2. Shadows enabled on low-end device
3. High pixel ratio

**Solutions**:

```typescript
const config = {
  performance: {
    enableShadows: false,       // Disable shadows
    antialiasing: false,        // Disable AA
    pixelRatio: 1               // Force 1x resolution
  }
};

// Or detect device capability
const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
const config = {
  performance: {
    enableShadows: !isMobile,
    pixelRatio: isMobile ? 1 : window.devicePixelRatio
  }
};
```

---

### Issue: Layout not updating after prop change

**Cause**: React not detecting prop change (reference equality)

**Solution**: Ensure new object reference

```typescript
// ❌ Wrong - same reference
const [layout, setLayout] = useState(initialLayout);
layout.zones[0].name = "New Name";
setLayout(layout); // Won't trigger update

// ✅ Correct - new reference
setLayout({
  ...layout,
  zones: layout.zones.map((z, i) => 
    i === 0 ? { ...z, name: "New Name" } : z
  )
});
```

---

### Issue: TypeScript errors with types

**Solution**: Ensure types are imported correctly

```typescript
// Import types from /types subpath
import type {
  WarehouseLayout,
  EditorConfig,
  InventoryData
} from '@warehouse-editor/core/types';
```

If still failing, check `tsconfig.json`:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler", // or "node16"
    "skipLibCheck": true
  }
}
```

---

## Next Steps

1. **Read Full Documentation**: `/docs/api-reference.md`
2. **Explore Examples**: `/docs/examples/` directory
3. **Customize Rendering**: Learn about custom rack types in `/docs/advanced/custom-assets.md`
4. **Performance Tuning**: See `/docs/performance.md` for optimization tips
5. **Contribute**: Issues and PRs welcome at GitHub repository

---

## Support

- **Documentation**: <https://warehouse-editor.dev/docs>
- **GitHub Issues**: <https://github.com/your-org/warehouse-editor/issues>
- **Discord Community**: <https://discord.gg/warehouse-editor>
- **Email**: <support@warehouse-editor.dev>

---

## Minimal Complete Example

Save this as `warehouse-demo.tsx`:

```typescript
import { WarehouseEditor } from '@warehouse-editor/core';
import '@warehouse-editor/core/styles.css';

const minimalLayout = {
  version: "1.0" as const,
  meta: {
    warehouseId: "demo",
    lastUpdated: new Date().toISOString(),
    authorId: "demo-user"
  },
  config: {
    gridSize: 0.5,
    measurementUnit: "meters" as const,
    floorDimensions: { width: 50, length: 30 }
  },
  entryPoints: [
    {
      id: "entry-1",
      position: { x: 0, y: 0, z: 15 },
      label: "Main Door"
    }
  ],
  zones: [
    {
      id: "zone-1",
      type: "storage" as const,
      name: "Storage",
      bounds: { x: 5, z: 5, width: 40, length: 20 },
      color: "#3B82F6",
      racks: [],
      obstacles: []
    }
  ]
};

export default function WarehouseDemo() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <WarehouseEditor
        initialLayout={minimalLayout}
        onSave={async (layout) => {
          console.log('Saved:', layout);
          alert('Layout saved! Check console.');
        }}
      />
    </div>
  );
}
```

Run with:

```bash
npm run dev
```

**Expected Result**: Interactive 3D editor with draggable camera, grid floor, and empty storage zone ready for rack placement.
