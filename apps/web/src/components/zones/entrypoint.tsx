// Entrypoint component - cylinder representation for warehouse entry/exit points
// Rendered as a transparent cylinder marker

import { Outlines, shaderMaterial, TransformControls } from "@react-three/drei";
import { extend } from "@react-three/fiber";
import type React from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useEntityMutation } from "@/hooks/use-entity-mutation";
import { TRANSLATION_SNAP } from "@/lib/utils/constants";
import { useLayoutStore } from "@/store/layout-editor-store";

export const EntryPointMaterial = shaderMaterial(
  {
    uColor: new THREE.Color("#fcc800"),
    uHeight: 4.0,
  },
  // Vertex Shader
  `
    varying vec3 vPosition;

    void main() {
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform vec3 uColor;
    uniform float uHeight;
    varying vec3 vPosition;

    void main() {
      // Calculate alpha based on height (fade from top to bottom)
      // vPosition.y ranges from -uHeight/2.0 to uHeight/2.0
      float alpha = (vPosition.y + uHeight / 2.0) / uHeight;
      alpha = 0.8 - smoothstep(0.0, 1.0, alpha);

      gl_FragColor = vec4(uColor, alpha * 0.8);
    }
  `,
);

// Extend to make it available as JSX element
extend({ EntryPointMaterial });

// Add TypeScript declaration
declare module "@react-three/fiber" {
  interface ThreeElements {
    entryPointMaterial: {
      uFillLevel: number;
      uLowColor: THREE.Color;
      uMidColor: THREE.Color;
      uHighColor: THREE.Color;
      uEmptyColor: THREE.Color;
      uLowThreshold: number;
      uHighThreshold: number;
      transparent?: boolean;
      side?: THREE.Side;
      depthWrite?: boolean;
    };
  }
}

// ============================================================================
// Types for entrypoint attributes
// ============================================================================

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// Entrypoint color
const ENTRYPOINT_COLOR = "#fcc800";

// ============================================================================
// Entrypoint Component
// ============================================================================

export const Entrypoint: React.FC<{ entrypointId: string }> = ({
  entrypointId,
}) => {
  // Get entity from store (entrypointId is tempId)
  const entity = useLayoutStore((s) => s.entities.get(entrypointId));
  const selectedEntityId = useLayoutStore((s) => s.selectedEntityId);
  const transformMode = useLayoutStore((s) => s.transformMode);
  const selectEntity = useLayoutStore((s) => s.selectEntity);

  // Use commit hook for validated updates
  const { commitUpdate } = useEntityMutation();

  const groupRef = useRef<THREE.Group>(null);
  const [isCommitting, setIsCommitting] = useState(false);

  const isSelected = selectedEntityId === entrypointId;

  // Store original position for rollback on collision
  const originalPositionRef = useRef<Vec3 | null>(null);

  // Callback to apply confirmed transforms with validation + collision + Convex sync
  const handleConfirm = useCallback(
    async (updates: { position?: Vec3 }) => {
      if (isCommitting) return;
      setIsCommitting(true);

      // Global position updates - only apply guardrails
      const globalUpdates = { ...updates };
      if (updates.position) {
        // Round to 2 decimal places to avoid floating-point precision issues
        globalUpdates.position = {
          x: Math.round(updates.position.x * 100) / 100,
          y: 0, // Guardrail: always ground level
          z: Math.round(updates.position.z * 100) / 100,
        };
      }

      // commitUpdate handles: validation, floor transfer detection, 4-corner bounds, collision
      const result = await commitUpdate(entrypointId, globalUpdates, {
        showToast: true,
      });

      if (!result.success && groupRef.current) {
        // Rollback visual position on failure
        if (originalPositionRef.current) {
          groupRef.current.position.set(
            originalPositionRef.current.x,
            height / 2,
            originalPositionRef.current.z,
          );
        }
      }

      setIsCommitting(false);
    },
    [entrypointId, commitUpdate, isCommitting],
  );

  // Extract attributes from entity
  const { position } = useMemo(() => {
    if (!entity?.zoneAttributes) {
      return {
        position: { x: 0, y: 0, z: 0 },
        label: "Entry",
      };
    }
    const attrs = entity.zoneAttributes;
    return {
      position: (attrs.position as Vec3) ?? { x: 0, y: 0, z: 0 },
      label: (attrs.label as string) ?? entity.name ?? "Entry",
    };
  }, [entity]);

  if (!entity || entity.isDeleted) return null;

  // Cylinder dimensions (same as ghost)
  const radius = 1; // 2m diameter
  const height = 4; // 4m tall

  const showTranslateControls = isSelected && transformMode === "translate";

  const handleClick = (
    e: React.MouseEvent | { stopPropagation: () => void },
  ) => {
    e.stopPropagation();
    selectEntity(entrypointId);
  };

  return (
    <>
      <group ref={groupRef} position={[position.x, height / 2, position.z]}>
        {/* Invisible hit box for selection */}
        <mesh onClick={handleClick} visible={false}>
          <cylinderGeometry args={[radius, radius, height, 32]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>

        {/* Visible cylinder */}
        <mesh>
          <cylinderGeometry args={[radius, radius, height, 32, 20]} />
          <entryPointMaterial
            transparent
            side={THREE.DoubleSide}
            depthWrite={false}
            uColor={new THREE.Color(ENTRYPOINT_COLOR)}
            uHeight={height}
          />
          {isSelected && (
            <Outlines thickness={0.1} color="#00ffff" screenspace={true} />
          )}
        </mesh>

        {/* Label text could be added here if needed */}
      </group>
      {showTranslateControls && groupRef.current && (
        <TransformControls
          object={groupRef.current}
          mode="translate"
          space="world"
          translationSnap={TRANSLATION_SNAP}
          showY={false}
          onMouseDown={() => {
            // Store original position when transform starts
            if (groupRef.current) {
              originalPositionRef.current = {
                x: groupRef.current.position.x,
                y: groupRef.current.position.y,
                z: groupRef.current.position.z,
              };
            }
          }}
          onMouseUp={() => {
            if (groupRef.current) {
              const pos = groupRef.current.position;
              handleConfirm({
                position: { x: pos.x, y: pos.y, z: pos.z },
              });
            }
          }}
        />
      )}
    </>
  );
};

export default Entrypoint;
