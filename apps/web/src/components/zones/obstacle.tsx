// Obstacle component - box representation
// Migrated to use new SmartStore with StorageEntity

import { Box, Outlines, TransformControls } from "@react-three/drei";
import type React from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { Group } from "three";
import { useDebugContext } from "@/components/zones/canvas-3d";
import { useEntityMutation } from "@/hooks/use-entity-mutation";
import { ROTATION_SNAP, TRANSLATION_SNAP } from "@/lib/utils/constants";
import { useLayoutStore } from "@/store/layout-editor-store";

// ============================================================================
// Types for obstacle attributes
// ============================================================================

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Dimensions {
  width: number;
  height: number;
  depth: number;
}

// Default obstacle colors by type
const OBSTACLE_COLORS: Record<string, string> = {
  pillar: "#6B7280",
  wall: "#9CA3AF",
  equipment: "#F59E0B",
  other: "#EF4444",
};

// ============================================================================
// Obstacle Component
// ============================================================================

export const Obstacle: React.FC<{ obstacleId: string }> = ({ obstacleId }) => {
  // Get entity from new store (obstacleId is now tempId)
  const entity = useLayoutStore((s) => s.entities.get(obstacleId));
  const selectedEntityId = useLayoutStore((s) => s.selectedEntityId);
  const transformMode = useLayoutStore((s) => s.transformMode);
  const selectEntity = useLayoutStore((s) => s.selectEntity);

  // Use commit hook for validated updates
  const { commitUpdate } = useEntityMutation();

  const groupRef = useRef<Group>(null);
  const [isCommitting, setIsCommitting] = useState(false);

  const isSelected = selectedEntityId === obstacleId;

  // Debug visualization context
  const { showCollisionBounds } = useDebugContext();

  // Store original position for rollback on collision
  const originalPositionRef = useRef<Vec3 | null>(null);
  const originalRotationRef = useRef<Vec3 | null>(null);

  // Extract attributes from entity
  const { position, dimensions, rotation, obstacleType } = useMemo(() => {
    if (!entity?.zoneAttributes) {
      return {
        position: { x: 0, y: 0, z: 0 },
        dimensions: { width: 1, height: 1, depth: 1 },
        rotation: { x: 0, y: 0, z: 0 },
        obstacleType: "other",
      };
    }
    const attrs = entity.zoneAttributes;
    return {
      position: (attrs.position as Vec3) ?? { x: 0, y: 0, z: 0 },
      dimensions: (attrs.dimensions as Dimensions) ?? {
        width: 1,
        height: 1,
        depth: 1,
      },
      rotation: (attrs.rotation as Vec3) ?? { x: 0, y: 0, z: 0 },
      obstacleType: (attrs.obstacleType as string) ?? "other",
    };
  }, [entity]);

  // Callback to apply confirmed transforms with validation + collision + Convex sync
  // Positions are now GLOBAL - TransformControls with space="world" returns world coords
  const handleConfirm = useCallback(
    async (updates: { position?: Vec3; rotation?: Vec3 }) => {
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

      // Enforce rotation guardrail: only y rotation allowed
      if (updates.rotation) {
        globalUpdates.rotation = {
          x: 0, // Guardrail: no x rotation
          y: updates.rotation.y,
          z: 0, // Guardrail: no z rotation
        };
      }

      // commitUpdate handles: validation, floor transfer detection, 4-corner bounds, collision
      const result = await commitUpdate(obstacleId, globalUpdates, {
        showToast: true,
      });

      if (!result.success && groupRef.current) {
        // Rollback visual position on failure
        if (originalPositionRef.current) {
          groupRef.current.position.set(
            originalPositionRef.current.x,
            dimensions.height / 2,
            originalPositionRef.current.z,
          );
        }
        if (originalRotationRef.current) {
          groupRef.current.rotation.set(
            originalRotationRef.current.x,
            originalRotationRef.current.y,
            originalRotationRef.current.z,
          );
        }
      }

      setIsCommitting(false);
    },
    [obstacleId, commitUpdate, dimensions, isCommitting],
  );

  // Store original position when transform starts
  const handleTransformStart = useCallback(() => {
    originalPositionRef.current = position;
    originalRotationRef.current = rotation;
  }, [position, rotation]);

  if (!entity || entity.isDeleted) return null;

  const showTranslateControls = isSelected && transformMode === "translate";
  const showRotateControls = isSelected && transformMode === "rotate";

  const color = OBSTACLE_COLORS[obstacleType] ?? OBSTACLE_COLORS.other;

  const handleClick = (
    e: React.MouseEvent | { stopPropagation: () => void },
  ) => {
    e.stopPropagation();
    selectEntity(obstacleId);
  };

  return (
    <>
      <group
        ref={groupRef}
        position={[position.x, dimensions.height / 2, position.z]}
        rotation={[rotation.x, rotation.y, rotation.z]}
      >
        <Box
          castShadow
          receiveShadow
          onClick={handleClick}
          args={[dimensions.width, dimensions.height, dimensions.depth]}
        >
          <meshStandardMaterial color={color} />
          {isSelected && (
            <Outlines thickness={0.1} color="#00ffff" screenspace={true} />
          )}
        </Box>
      </group>
      {showTranslateControls && groupRef.current && (
        <TransformControls
          object={groupRef.current}
          mode="translate"
          space="world"
          translationSnap={TRANSLATION_SNAP}
          showY={false}
          onMouseDown={handleTransformStart}
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
      {showRotateControls && groupRef.current && (
        <TransformControls
          object={groupRef.current}
          mode="rotate"
          space="world"
          rotationSnap={ROTATION_SNAP}
          showX={false}
          showZ={false}
          onMouseDown={handleTransformStart}
          onMouseUp={() => {
            if (groupRef.current) {
              const rot = groupRef.current.rotation;
              handleConfirm({
                rotation: { x: rot.x, y: rot.y, z: rot.z },
              });
            }
          }}
        />
      )}

      {/* Debug: Collision bounds wireframe */}
      {showCollisionBounds && (
        <group
          position={[position.x, dimensions.height / 2, position.z]}
          rotation={[rotation.x, rotation.y, rotation.z]}
        >
          <Box args={[dimensions.width, dimensions.height, dimensions.depth]}>
            <meshBasicMaterial
              color={0xff00ff}
              wireframe
              opacity={0.5}
              transparent
            />
          </Box>
        </group>
      )}
    </>
  );
};
