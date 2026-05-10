// CollisionDebugOverlay Component
// Shows fading wireframe boxes when collisions are detected for debugging

import { Box, Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import type { OBB2D } from "@/lib/types/layout-editor";
import { setCollisionDebugCallback } from "@/lib/utils/collision";
import { useLayoutStore } from "@/store/layout-editor-store";

// ============================================================================
// Collision Debug Store (simple module-level state)
// ============================================================================

interface CollisionDebugEntry {
  id: string;
  obbA: OBB2D;
  obbB: OBB2D;
  heightA: number;
  heightB: number;
  timestamp: number;
  duration: number; // in milliseconds
}

let debugEntries: CollisionDebugEntry[] = [];
const listeners: Set<() => void> = new Set();

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

function addCollisionDebug(
  obbA: OBB2D,
  obbB: OBB2D,
  heightA = 2,
  heightB = 2,
  duration = 2000,
) {
  const entry: CollisionDebugEntry = {
    id: crypto.randomUUID(),
    obbA,
    obbB,
    heightA,
    heightB,
    timestamp: Date.now(),
    duration,
  };
  debugEntries.push(entry);
  notifyListeners();
}

function removeExpiredEntries() {
  const now = Date.now();
  const before = debugEntries.length;
  debugEntries = debugEntries.filter(
    (entry) => now - entry.timestamp < entry.duration,
  );
  if (debugEntries.length !== before) {
    notifyListeners();
  }
}

function useCollisionDebugEntries() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return debugEntries;
}

// ============================================================================
// Debug Box Component (renders a single OBB as wireframe)
// ============================================================================

interface DebugOBBBoxProps {
  obb: OBB2D;
  height: number;
  color: number;
  opacity: number;
}

function DebugOBBBox({ obb, height, color, opacity }: DebugOBBBoxProps) {
  // Calculate rotation from cos/sin
  const rotationY = Math.atan2(obb.sin, obb.cos);

  return (
    <group
      position={[obb.centerX, height / 2, obb.centerZ]}
      rotation={[0, rotationY, 0]}
    >
      <Box args={[obb.halfWidth * 2, height, obb.halfDepth * 2]}>
        <meshBasicMaterial
          color={color}
          wireframe
          transparent
          opacity={opacity}
          depthTest={false}
        />
      </Box>
    </group>
  );
}

// ============================================================================
// Collision Debug Entry Component (handles fading)
// ============================================================================

interface CollisionDebugEntryViewProps {
  entry: CollisionDebugEntry;
}

function CollisionDebugEntryView({ entry }: CollisionDebugEntryViewProps) {
  const [opacity, setOpacity] = useState(1);

  useFrame(() => {
    const elapsed = Date.now() - entry.timestamp;
    const remaining = entry.duration - elapsed;

    if (remaining <= 0) {
      setOpacity(0);
      removeExpiredEntries();
    } else {
      // Fade out over the last 2 seconds
      const fadeStart = entry.duration - 2000;
      if (elapsed > fadeStart) {
        const fadeProgress = (elapsed - fadeStart) / 2000;
        setOpacity(1 - fadeProgress);
      } else {
        setOpacity(1);
      }
    }
  });

  if (opacity <= 0) return null;

  return (
    <>
      {/* Box A - Red (the moving box) */}
      <DebugOBBBox
        obb={entry.obbA}
        height={entry.heightA}
        color={0xff0000}
        opacity={opacity * 0.8}
      />
      {/* Box B - Orange (the stationary box) */}
      <DebugOBBBox
        obb={entry.obbB}
        height={entry.heightB}
        color={0xff8800}
        opacity={opacity * 0.8}
      />
    </>
  );
}

// ============================================================================
// Main Overlay Component
// ============================================================================

interface CollisionDebugOverlayProps {
  enabled?: boolean;
}

export function CollisionDebugOverlay({
  enabled = false,
}: CollisionDebugOverlayProps) {
  const entries = useCollisionDebugEntries();

  // Register the debug callback only when enabled
  useEffect(() => {
    if (enabled) {
      setCollisionDebugCallback((obbA, obbB, heightA, heightB) => {
        addCollisionDebug(obbA, obbB, heightA, heightB);
      });
    } else {
      setCollisionDebugCallback(null);
    }

    return () => {
      setCollisionDebugCallback(null);
    };
  }, [enabled]);

  // Periodic cleanup
  useEffect(() => {
    const interval = setInterval(removeExpiredEntries, 1000);
    return () => clearInterval(interval);
  }, []);

  if (entries.length === 0) return null;

  return (
    <>
      {entries.map((entry) => (
        <CollisionDebugEntryView key={entry.id} entry={entry} />
      ))}
    </>
  );
}

// ============================================================================
// Spatial Grid Overlay - Shows spatial partitioning grid
// ============================================================================

import {
  type GridCell,
  getCollisionService,
  resetCollisionService,
} from "@/lib/utils/collision-service";

function GridCellMesh({
  cell,
  cellSize,
}: {
  cell: GridCell;
  cellSize: number;
}) {
  // Color based on entity count: green=empty, yellow=1-2, red=3+
  const color = useMemo(() => {
    if (cell.entityCount >= 3) return "#EF4444"; // red
    if (cell.entityCount >= 1) return "#F59E0B"; // yellow
    return "#22C55E"; // green
  }, [cell.entityCount]);

  // Build wireframe box points using Line (no diagonals)
  const halfSize = cellSize / 2;
  const y = 0.5; // above ground
  const cx = cell.x + halfSize;
  const cz = cell.z + halfSize;

  // Four corners of the cell
  const points: [number, number, number][] = [
    [cx - halfSize, y, cz - halfSize],
    [cx + halfSize, y, cz - halfSize],
    [cx + halfSize, y, cz + halfSize],
    [cx - halfSize, y, cz + halfSize],
    [cx - halfSize, y, cz - halfSize], // Close the loop
  ];

  return (
    <group>
      {/* Wireframe box outline using Line */}
      <Line
        points={points}
        color={color}
        lineWidth={1.5}
        opacity={0.8}
        transparent
      />
      {/* Fill plane */}
      <mesh position={[cx, y, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[cellSize * 0.95, cellSize * 0.95]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={cell.entityCount > 0 ? 0.2 : 0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

interface SpatialGridOverlayProps {
  enabled?: boolean;
  cellSize?: number;
}

export function SpatialGridOverlay({
  enabled = false,
  cellSize = 5,
}: SpatialGridOverlayProps) {
  const [cells, setCells] = useState<GridCell[]>([]);

  // Subscribe to entity changes to trigger re-render
  const entities = useLayoutStore((s) => s.entities);

  // Update cells when enabled or entities change
  // biome-ignore lint/correctness/useExhaustiveDependencies: service.getAllGridCells() does use entities internally
  useEffect(() => {
    if (!enabled) {
      setCells([]);
      return;
    }

    const updateCells = () => {
      // Reset and reinitialize to pick up entity changes
      resetCollisionService();
      const service = getCollisionService();
      service.initialize();

      const allCells = service.getAllGridCells();
      const flatCells: GridCell[] = [];
      for (const [, gridCells] of allCells) {
        flatCells.push(...gridCells);
      }
      setCells(flatCells);
    };

    updateCells();
  }, [enabled, entities]);

  if (!enabled || cells.length === 0) return null;

  return (
    <>
      {cells.map((cell) => (
        <GridCellMesh key={cell.key} cell={cell} cellSize={cellSize} />
      ))}
    </>
  );
}
