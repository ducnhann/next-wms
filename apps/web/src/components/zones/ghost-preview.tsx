/**
 * GhostPreview - Transparent preview for entity placement
 * Shows a ghost mesh that follows mouse position before placement confirmation
 */

import { useFrame, useThree } from "@react-three/fiber";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import * as THREE from "three";
import { validatePlacement } from "@/lib/utils/collision";
import { useLayoutStore } from "@/store/layout-editor-store";

// ============================================================================
// Ghost Mesh Component
// ============================================================================

interface GhostMeshProps {
  dimensions: { width: number; height: number; depth: number };
  color?: string;
}

function GhostMesh({ dimensions, color = "#3b82f6" }: GhostMeshProps) {
  return (
    <mesh>
      <boxGeometry
        args={[dimensions.width, dimensions.height, dimensions.depth]}
      />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.4}
        depthWrite={false}
      />
    </mesh>
  );
}

// ============================================================================
// Ghost Preview Component
// ============================================================================

export const GhostPreview: React.FC = () => {
  const ghostEntity = useLayoutStore((s) => s.ghostEntity);
  const updateGhostPosition = useLayoutStore((s) => s.updateGhostPosition);
  const updateGhostAttributes = useLayoutStore((s) => s.updateGhostAttributes);
  const confirmGhost = useLayoutStore((s) => s.confirmGhost);
  const cancelGhost = useLayoutStore((s) => s.cancelGhost);
  const selectEntity = useLayoutStore((s) => s.selectEntity);
  const entities = useLayoutStore((s) => s.entities);

  const { raycaster, camera, gl } = useThree();
  const mouseRef = useRef(new THREE.Vector2());
  const floorPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    [],
  );
  const intersectionPoint = useMemo(() => new THREE.Vector3(), []);

  // Find closest floor to a position
  const findClosestFloor = useCallback(
    (position: { x: number; y: number; z: number }) => {
      let closestFloor: { tempId: string; realId: string | undefined } | null =
        null;
      let minDistance = Number.POSITIVE_INFINITY;

      for (const [tempId, entity] of entities) {
        if (entity.storageBlockType !== "floor" || entity.isDeleted) continue;

        const floorPos = entity.zoneAttributes.position as {
          x: number;
          z: number;
        };
        const floorDims = entity.zoneAttributes.dimensions as {
          width: number;
          length: number;
        };

        if (!floorPos || !floorDims) continue;

        // Check if position is within floor bounds
        const inBounds =
          position.x >= floorPos.x &&
          position.x <= floorPos.x + floorDims.width &&
          position.z >= floorPos.z &&
          position.z <= floorPos.z + floorDims.length;

        if (inBounds) {
          return { tempId, realId: entity._id };
        }

        // Calculate distance to floor center
        const floorCenterX = floorPos.x + floorDims.width / 2;
        const floorCenterZ = floorPos.z + floorDims.length / 2;
        const dx = position.x - floorCenterX;
        const dz = position.z - floorCenterZ;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance < minDistance) {
          minDistance = distance;
          closestFloor = { tempId, realId: entity._id };
        }
      }

      return closestFloor;
    },
    [entities],
  );

  // Track mouse position
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    },
    [gl.domElement],
  );

  // Handle click to place - with collision validation
  const handleClick = useCallback(() => {
    if (!ghostEntity) return;

    const position = ghostEntity.zoneAttributes.position as {
      x: number;
      y: number;
      z: number;
    };
    const dimensions = ghostEntity.zoneAttributes.dimensions as {
      width: number;
      height: number;
      depth: number;
    };
    const rotation = ghostEntity.zoneAttributes.rotation as {
      x: number;
      y: number;
      z: number;
    };

    // Floor entities don't need a parent floor - they ARE floors
    if (ghostEntity.storageBlockType === "floor") {
      // For floors, just validate placement (zone overlap check)
      const validation = validatePlacement(
        ghostEntity.tempId,
        ghostEntity.storageBlockType,
        ghostEntity.zoneAttributes,
        null,
      );
      if (!validation.valid) {
        toast.warning(
          validation.reason ?? "Cannot place here - overlaps existing zone",
        );
        return;
      }
      // Confirm floor placement
      const tempId = confirmGhost();
      if (tempId) {
        selectEntity(tempId);
      }
      return;
    }

    // Entrypoint/doorpoint - skip collision check, just find parent floor
    if (
      ghostEntity.storageBlockType === "entrypoint" ||
      ghostEntity.storageBlockType === "doorpoint"
    ) {
      const closestFloor = findClosestFloor(position);
      if (!closestFloor) {
        toast.warning("No floor zone found for placement");
        return;
      }
      // Update parent and confirm
      if (closestFloor.realId) {
        updateGhostAttributes({ parentId: closestFloor.realId });
      }
      const tempId = confirmGhost();
      if (tempId) {
        selectEntity(tempId);
      }
      return;
    }

    // Find closest floor and update parent (for non-floor entities)
    const closestFloor = findClosestFloor(position);
    if (!closestFloor) {
      toast.warning("No floor zone found for placement");
      return;
    }

    // Validate placement with collision check (using global positions)
    const validation = validatePlacement(
      ghostEntity.tempId,
      ghostEntity.storageBlockType,
      { position, dimensions, rotation },
      closestFloor.realId ?? null,
    );

    if (!validation.valid) {
      toast.warning(
        validation.reason ?? "Cannot place here - collision detected",
      );
      return;
    }

    // Update ghost's parentId to the closest floor before confirming
    if (closestFloor.realId) {
      updateGhostAttributes({ parentId: closestFloor.realId });
    }

    const tempId = confirmGhost();
    if (tempId) {
      selectEntity(tempId);
    }
  }, [
    ghostEntity,
    findClosestFloor,
    updateGhostAttributes,
    confirmGhost,
    selectEntity,
  ]);

  // Handle keyboard
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!ghostEntity) return;

      if (event.key === "Escape") {
        cancelGhost();
      } else if (event.key === "Enter") {
        // Reuse click handler which includes validation
        handleClick();
      }
    },
    [ghostEntity, cancelGhost, handleClick],
  );

  // Add event listeners
  useEffect(() => {
    if (!ghostEntity) return;

    const domElement = gl.domElement;
    domElement.addEventListener("mousemove", handleMouseMove);
    domElement.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleKeyDown);

    // Change cursor to crosshair
    domElement.style.cursor = "crosshair";

    return () => {
      domElement.removeEventListener("mousemove", handleMouseMove);
      domElement.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleKeyDown);
      domElement.style.cursor = "auto";
    };
  }, [ghostEntity, gl.domElement, handleMouseMove, handleClick, handleKeyDown]);

  // Update position every frame
  useFrame(() => {
    if (!ghostEntity) return;

    // Raycast to floor plane
    raycaster.setFromCamera(mouseRef.current, camera);
    raycaster.ray.intersectPlane(floorPlane, intersectionPoint);

    if (intersectionPoint) {
      // Snap to grid (1 unit grid)
      const snappedX = Math.round(intersectionPoint.x);
      const snappedZ = Math.round(intersectionPoint.z);

      // Get dimensions for centering
      const dims = ghostEntity.zoneAttributes.dimensions as
        | { width: number; depth: number }
        | undefined;
      const halfWidth = (dims?.width ?? 2) / 2;
      const halfDepth = (dims?.depth ?? 2) / 2;

      updateGhostPosition({
        x: snappedX - halfWidth,
        y: 0,
        z: snappedZ - halfDepth,
      });
    }
  });

  if (!ghostEntity) return null;

  const position = ghostEntity.zoneAttributes.position as
    | { x: number; y: number; z: number }
    | undefined;
  const dimensions = ghostEntity.zoneAttributes.dimensions as
    | { width: number; height?: number; depth?: number; length?: number }
    | undefined;

  // Get block-specific color
  const blockColors: Record<string, string> = {
    floor: "#22c55e", // green
    rack: "#3b82f6", // blue
    obstacle: "#ef4444", // red
    entrypoint: "#8b5cf6", // purple
  };
  const color = blockColors[ghostEntity.storageBlockType] ?? "#3b82f6";

  // Handle floor specifically - uses Plane with Wireframe like Zone component
  if (ghostEntity.storageBlockType === "floor") {
    const width = dimensions?.width ?? 50;
    const length = dimensions?.length ?? dimensions?.depth ?? 50;
    const pos = position ?? { x: 0, y: 0, z: 0 };

    return (
      // Position at ghost location, then offset to center the plane
      <group position={[pos.x, 0.1, pos.z]}>
        <mesh
          position={[width / 2, 0, length / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[width, length]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        {/* Wireframe outline */}
        <lineSegments
          position={[width / 2, 0, length / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <edgesGeometry args={[new THREE.PlaneGeometry(width, length)]} />
          <lineBasicMaterial color={color} linewidth={2} />
        </lineSegments>
      </group>
    );
  }

  // Handle entrypoint/doorpoint - transparent cylinder only (no wireframe)
  if (
    ghostEntity.storageBlockType === "entrypoint" ||
    ghostEntity.storageBlockType === "doorpoint"
  ) {
    const radius = 1; // 2m diameter = 1m radius
    const height = 4; // 4m tall
    const pos = position ?? { x: 0, y: 0, z: 0 };

    return (
      <group position={[pos.x, height / 2, pos.z]}>
        <mesh>
          <cylinderGeometry args={[radius, radius, height, 32]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={0.4}
            depthWrite={false}
          />
        </mesh>
      </group>
    );
  }

  // Default box geometry for rack, obstacle, etc.
  if (!position || !dimensions) return null;

  const boxDims = {
    width: dimensions.width ?? 2,
    height: dimensions.height ?? 2,
    depth: dimensions.depth ?? dimensions.length ?? 2,
  };

  return (
    <group
      position={[
        position.x + boxDims.width / 2,
        position.y + boxDims.height / 2,
        position.z + boxDims.depth / 2,
      ]}
    >
      <GhostMesh dimensions={boxDims} color={color} />
      {/* Wireframe outline for better visibility */}
      <lineSegments>
        <edgesGeometry
          args={[
            new THREE.BoxGeometry(boxDims.width, boxDims.height, boxDims.depth),
          ]}
        />
        <lineBasicMaterial color={color} linewidth={2} />
      </lineSegments>
    </group>
  );
};

export default GhostPreview;
