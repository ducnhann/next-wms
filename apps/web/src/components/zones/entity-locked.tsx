/**
 * LockIcon Component
 *
 * Displays a 3D lock icon above racks that contain inventory.
 * Uses drei's Html component to render a CSS-based lock symbol
 * that always faces the camera.
 */

import { Html } from "@react-three/drei";
import { Lock } from "lucide-react";

interface LockIconProps {
  /** Position offset above the rack (Y coordinate) */
  heightOffset?: number;
  /** Icon size in pixels */
  size?: number;
  /** Icon color */
  color?: string;
}

/**
 * LockIcon component
 *
 * Renders a lock icon that hovers above locked racks.
 * Always faces the camera using drei's Html component.
 */
export function LockIcon({
  heightOffset = 2.0,
  size = 24,
  color = "#EF4444",
}: LockIconProps) {
  return (
    <Html
      position={[0, heightOffset, 0]}
      center
      distanceFactor={10}
      zIndexRange={[100, 0]}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: size + 8,
          height: size + 8,
          borderRadius: "50%",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
          border: `2px solid ${color}`,
          cursor: "not-allowed",
        }}
        title="Rack is locked due to inventory"
      >
        <Lock size={size} color={color} strokeWidth={2.5} />
      </div>
    </Html>
  );
}
