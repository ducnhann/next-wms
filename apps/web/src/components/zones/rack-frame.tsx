// RackFrame Component
// Phase 2: 3D Rendering - Structural uprights and beams for rack visualization

import { Line } from "@react-three/drei";
import type React from "react";
import { useMemo } from "react";

interface Dimension {
  width: number;
  height: number;
  depth: number;
}

interface RackFrameProps {
  dimensions: Dimension;
  color?: string;
  showCrossBeams?: boolean;
}

/**
 * Renders the structural frame of a rack with corner uprights and optional cross beams.
 * Uses wireframe lines for a lightweight, transparent look.
 */
export const RackFrame: React.FC<RackFrameProps> = ({
  dimensions,
  color = "#3FA9F5",
  showCrossBeams = true,
}) => {
  const { width, height, depth } = dimensions;
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const halfHeight = height / 2;

  // Memoize frame geometry
  const frameGeometry = useMemo(() => {
    // Corner positions (at base level, y = -halfHeight relative to rack center)
    const corners: [number, number][] = [
      [-halfWidth, -halfDepth], // Front-left
      [halfWidth, -halfDepth], // Front-right
      [halfWidth, halfDepth], // Back-right
      [-halfWidth, halfDepth], // Back-left
    ];

    // Vertical uprights (4 corners)
    const uprights: [number, number, number][][] = corners.map(([x, z]) => [
      [x, -halfHeight, z],
      [x, halfHeight, z],
    ]);

    // Top frame (horizontal rectangle at top)
    const topFrame: [number, number, number][] = [
      [-halfWidth, halfHeight, -halfDepth],
      [halfWidth, halfHeight, -halfDepth],
      [halfWidth, halfHeight, halfDepth],
      [-halfWidth, halfHeight, halfDepth],
      [-halfWidth, halfHeight, -halfDepth], // Close loop
    ];

    // Bottom frame (horizontal rectangle at bottom)
    const bottomFrame: [number, number, number][] = [
      [-halfWidth, -halfHeight, -halfDepth],
      [halfWidth, -halfHeight, -halfDepth],
      [halfWidth, -halfHeight, halfDepth],
      [-halfWidth, -halfHeight, halfDepth],
      [-halfWidth, -halfHeight, -halfDepth], // Close loop
    ];

    // Cross beams (diagonal bracing on sides) - optional
    const crossBeams: [number, number, number][][] = [];
    if (showCrossBeams) {
      // Front face diagonal
      crossBeams.push([
        [-halfWidth, -halfHeight, -halfDepth],
        [halfWidth, halfHeight, -halfDepth],
      ]);
      // Back face diagonal
      crossBeams.push([
        [-halfWidth, -halfHeight, halfDepth],
        [halfWidth, halfHeight, halfDepth],
      ]);
    }

    return { uprights, topFrame, bottomFrame, crossBeams };
  }, [halfWidth, halfHeight, halfDepth, showCrossBeams]);

  return (
    <group>
      {/* Vertical uprights */}
      {frameGeometry.uprights.map((upright, idx) => (
        <Line
          key={`upright-${idx.toString()}`}
          points={upright}
          color={color}
          lineWidth={2}
        />
      ))}

      {/* Top frame */}
      <Line points={frameGeometry.topFrame} color={color} lineWidth={2} />

      {/* Bottom frame */}
      <Line points={frameGeometry.bottomFrame} color={color} lineWidth={2} />

      {/* Cross beams (optional) */}
      {frameGeometry.crossBeams.map((beam, idx) => (
        <Line
          key={`crossbeam-${idx.toString()}`}
          points={beam}
          color={color}
          lineWidth={1}
          transparent
          opacity={0.4}
          dashed
          dashSize={0.15}
          gapSize={0.1}
        />
      ))}
    </group>
  );
};
