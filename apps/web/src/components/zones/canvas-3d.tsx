// Canvas3D Component
// Phase 2: Foundation - T021
// Main 3D rendering canvas with camera and lighting

import {
  Box,
  CameraControls,
  GizmoHelper,
  GizmoViewport,
} from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Leva, useControls } from "leva";
import type React from "react";
import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// ============================================================================
// Debug Context for sharing debug visualization state
// ============================================================================

interface DebugContextValue {
  showCollisionBounds: boolean;
  showSpatialGrid: boolean;
}

const DebugContext = createContext<DebugContextValue>({
  showCollisionBounds: false,
  showSpatialGrid: false,
});

export const useDebugContext = () => useContext(DebugContext);

import {
  CollisionDebugOverlay,
  SpatialGridOverlay,
} from "@/components/zones/debug/collision-overlay";
import { CameraTargetHelper } from "@/components/zones/debug/helper";
import { Entrypoint } from "@/components/zones/entrypoint";
import { GhostPreview } from "@/components/zones/ghost-preview";
import { Obstacle } from "@/components/zones/obstacle";
import { Rack } from "@/components/zones/rack";
import { ShortcutPreview } from "@/components/zones/shortcut-preview";
import {
  logCameraReset,
  logCameraZoomToEntity,
} from "@/store/editor-console-store";
import { useLayoutStore } from "@/store/layout-editor-store";
import { Zone } from "./zone";
import { ZoneGrid } from "./zone-grid";

// ============================================================================
// Scene Content Component (must be inside Canvas)
// ============================================================================

function SceneContent() {
  const editorConfig = useLayoutStore((state) => state.editorConfig);
  const registerResetCamera = useLayoutStore((s) => s.registerResetCamera);
  const registerZoomToEntity = useLayoutStore((s) => s.registerZoomToEntity);
  const cameraControlsRef = useRef<CameraControls>(null);

  // Subscribe to entities to trigger re-render when data changes
  // The function selector alone doesn't trigger reactivity
  const entities = useLayoutStore((s) => s.entities);
  const entitiesByType = useLayoutStore((s) => s.entitiesByType);

  // Get floor entities from the new store
  const floorEntities = useMemo(() => {
    // These dependencies ensure we re-compute when data changes
    const floorIds = entitiesByType.get("floor");
    if (!floorIds) return [];
    return Array.from(floorIds)
      .map((id) => entities.get(id))
      .filter(
        (e): e is NonNullable<typeof e> => e !== undefined && !e.isDeleted,
      );
  }, [entities, entitiesByType]);

  // Default floor dimensions (used when no floor entity exists)
  const floorDimensions = useMemo(() => {
    const floor = floorEntities[0];
    if (floor?.zoneAttributes) {
      const dims = floor.zoneAttributes.dimensions as
        | { width: number; length: number }
        | undefined;
      if (dims) {
        return { width: dims.width, length: dims.length };
      }
    }
    return { width: 50, length: 50 };
  }, [floorEntities]);

  // Get floor entity IDs for rendering (use tempId since entities are keyed by tempId)
  const floorIds = useMemo(
    () => floorEntities.map((e) => e.tempId),
    [floorEntities],
  );

  // Get all rack entities for rendering at canvas root (global positions)
  const rackEntities = useMemo(() => {
    const rackIds = entitiesByType.get("rack");
    if (!rackIds) return [];
    return Array.from(rackIds)
      .map((id) => entities.get(id))
      .filter(
        (e): e is NonNullable<typeof e> => e !== undefined && !e.isDeleted,
      );
  }, [entities, entitiesByType]);

  // Get all obstacle entities for rendering at canvas root (global positions)
  const obstacleEntities = useMemo(() => {
    const obstacleIds = entitiesByType.get("obstacle");
    if (!obstacleIds) return [];
    return Array.from(obstacleIds)
      .map((id) => entities.get(id))
      .filter(
        (e): e is NonNullable<typeof e> => e !== undefined && !e.isDeleted,
      );
  }, [entities, entitiesByType]);

  const entrypointEntities = useMemo(() => {
    const entrypointIds = entitiesByType.get("entrypoint");
    if (!entrypointIds) return [];
    return Array.from(entrypointIds)
      .map((id) => entities.get(id))
      .filter(
        (e): e is NonNullable<typeof e> => e !== undefined && !e.isDeleted,
      );
  }, [entities, entitiesByType]);

  // debug leva tools
  const {
    showCameraOrbitTarget,
    showCameraOrbitBoundary,
    showCollisionBounds,
    showSpatialGrid,
  } = useControls({
    showCameraOrbitTarget: {
      label: "Show Camera Orbit Target",
      value: false,
    },
    showCameraOrbitBoundary: {
      label: "Show Camera Orbit Boundary",
      value: false,
    },
    showCollisionBounds: {
      label: "Show Collision Bounds",
      value: false,
    },
    showSpatialGrid: {
      label: "Show Spatial Grid",
      value: false,
    },
  });

  // Get zone bounds for camera constraints (union of all floor zones)
  const zoneBounds = useMemo(() => {
    // Default bounds
    const defaultBounds = {
      minX: 0,
      maxX: floorDimensions.width,
      minZ: 0,
      maxZ: floorDimensions.length,
    };

    if (floorEntities.length === 0) {
      return defaultBounds;
    }

    // Compute union of all floor zones using min/max
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;
    let hasValidBounds = false;

    for (const floor of floorEntities) {
      if (!floor?.zoneAttributes) continue;

      const pos = floor.zoneAttributes.position as
        | { x: number; z: number }
        | undefined;
      const dims = floor.zoneAttributes.dimensions as
        | { width: number; length: number }
        | undefined;

      if (pos && dims) {
        hasValidBounds = true;
        // Compute this floor's bounds
        const floorMinX = pos.x;
        const floorMaxX = pos.x + dims.width;
        const floorMinZ = pos.z;
        const floorMaxZ = pos.z + dims.length;

        // Expand union bounds
        minX = Math.min(minX, floorMinX);
        maxX = Math.max(maxX, floorMaxX);
        minZ = Math.min(minZ, floorMinZ);
        maxZ = Math.max(maxZ, floorMaxZ);
      }
    }

    if (!hasValidBounds) {
      return defaultBounds;
    }

    return { minX, maxX, minZ, maxZ };
  }, [floorEntities, floorDimensions]);

  // Apply camera boundary constraints when zone bounds change
  useEffect(() => {
    if (!cameraControlsRef.current) return;

    cameraControlsRef.current.setBoundary(
      new THREE.Box3(
        new THREE.Vector3(zoneBounds.minX, 0, zoneBounds.minZ),
        new THREE.Vector3(zoneBounds.maxX, 2, zoneBounds.maxZ),
      ),
    );
  }, [zoneBounds]);

  // Register camera reset function with the store
  useEffect(() => {
    registerResetCamera(() => {
      if (!cameraControlsRef.current) return;

      // Calculate center of zone bounds
      const centerX = (zoneBounds.minX + zoneBounds.maxX) / 2;
      const centerZ = (zoneBounds.minZ + zoneBounds.maxZ) / 2;

      // Calculate appropriate distance based on zone size
      const boundsWidth = zoneBounds.maxX - zoneBounds.minX;
      const boundsDepth = zoneBounds.maxZ - zoneBounds.minZ;
      const maxDimension = Math.max(boundsWidth, boundsDepth);
      const cameraDistance = Math.max(maxDimension * 1.2, 30);

      // Set camera to look at center from above
      cameraControlsRef.current.setLookAt(
        centerX,
        cameraDistance,
        centerZ + cameraDistance * Math.tan(Math.PI / 6), // 30 degree angle
        centerX,
        0,
        centerZ,
        true,
      );

      logCameraReset();
    });
  }, [registerResetCamera, zoneBounds]);

  // Register zoom to entity function with the store
  useEffect(() => {
    registerZoomToEntity((entityId: string) => {
      if (!cameraControlsRef.current) return;

      const entity = entities.get(entityId);
      if (!entity) return;

      const pos = entity.zoneAttributes.position as
        | { x: number; z: number }
        | undefined;
      const dims = entity.zoneAttributes.dimensions as
        | { width: number; length: number }
        | undefined;

      if (!pos) return;
      if (
        typeof pos.x !== "number" ||
        typeof pos.z !== "number" ||
        Number.isNaN(pos.x) ||
        Number.isNaN(pos.z)
      ) {
        return;
      }

      let centerX: number;
      let centerZ: number;
      let cameraDistance: number;

      if (
        dims &&
        typeof dims.width === "number" &&
        typeof dims.length === "number" &&
        !Number.isNaN(dims.width) &&
        !Number.isNaN(dims.length)
      ) {
        // Calculate center of the entity
        centerX = pos.x + dims.width / 2;
        centerZ = pos.z + dims.length / 2;
        // Calculate appropriate distance based on entity size
        const maxDimension = Math.max(dims.width, dims.length);
        cameraDistance = Math.max(maxDimension * 1.5, 8);
      } else {
        // No dimensions, zoom to position directly
        centerX = pos.x;
        centerZ = pos.z;
        cameraDistance = 8; // Default distance
      }

      // Set camera to look at entity center from above
      cameraControlsRef.current.setLookAt(
        centerX,
        cameraDistance,
        centerZ + cameraDistance * Math.tan(Math.PI / 3), // 60 degree angle
        centerX,
        0,
        centerZ,
        true,
      );

      logCameraZoomToEntity(centerX, 0, centerZ);
    });
  }, [registerZoomToEntity, entities]);

  // Center camera on zoneBounds after initial load
  const hasInitializedCamera = useRef(false);
  useEffect(() => {
    if (!cameraControlsRef.current) return;
    if (hasInitializedCamera.current) return;
    if (floorEntities.length === 0) return;

    // Calculate center of zone bounds
    const centerX = (zoneBounds.minX + zoneBounds.maxX) / 2;
    const centerZ = (zoneBounds.minZ + zoneBounds.maxZ) / 2;

    // Calculate appropriate distance based on zone size
    const boundsWidth = zoneBounds.maxX - zoneBounds.minX;
    const boundsDepth = zoneBounds.maxZ - zoneBounds.minZ;
    const maxDimension = Math.max(boundsWidth, boundsDepth);
    const cameraDistance = Math.max(maxDimension * 1.2, 30); // At least 30 units away

    // Set camera to look at center from above
    cameraControlsRef.current.setLookAt(
      centerX,
      cameraDistance,
      centerZ + cameraDistance * Math.tan(Math.PI / 6), // 30 degree angle
      centerX,
      0,
      centerZ,
      true, // Enable animation
    );

    hasInitializedCamera.current = true;
  }, [zoneBounds, floorEntities.length]);

  const enableShadows = editorConfig.performance?.enableShadows ?? true;

  const debugContextValue = useMemo(
    () => ({ showCollisionBounds, showSpatialGrid }),
    [showCollisionBounds, showSpatialGrid],
  );

  return (
    <DebugContext.Provider value={debugContextValue}>
      {/* Ambient light for overall illumination */}
      <ambientLight intensity={0.4} />

      {/* Directional light with shadows */}
      <directionalLight
        position={[20, 40, 20]}
        intensity={0.8}
        castShadow={enableShadows}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={100}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />

      {/* Hemisphere light for soft fill */}
      <hemisphereLight args={["#87CEEB", "#444444", 0.3]} />

      {/* Grid floor */}
      <ZoneGrid />

      {/* Floor/Zone entities */}
      {floorIds.map((floorId) => (
        <Zone key={floorId} zoneId={floorId} />
      ))}

      {/* Rack entities - rendered at canvas root with global positions */}
      {rackEntities.map((rack) => (
        <Rack key={rack.tempId} rackId={rack.tempId} />
      ))}

      {/* Obstacle entities - rendered at canvas root with global positions */}
      {obstacleEntities.map((obstacle) => (
        <Obstacle key={obstacle.tempId} obstacleId={obstacle.tempId} />
      ))}

      {/* Entrypoint entities - rendered at canvas root with global positions */}
      {entrypointEntities.map((entrypoint) => (
        <Entrypoint key={entrypoint.tempId} entrypointId={entrypoint.tempId} />
      ))}

      {/* Camera controls with constraints */}
      <CameraControls
        makeDefault
        ref={cameraControlsRef}
        maxPolarAngle={Math.PI / 2 - 0.1} // Prevent camera going below floor
        minPolarAngle={0.1} // Prevent looking straight down
        minDistance={5}
        maxDistance={75}
      />

      <GizmoHelper
        alignment="bottom-right" // widget alignment within scene
        margin={[60, 60]} // widget margins (X, Y)
      >
        <GizmoViewport
          axisColors={["red", "green", "blue"]}
          labelColor="white"
        />
      </GizmoHelper>

      {/* Debugging views */}
      {showCameraOrbitBoundary && (
        <Box
          position={[
            (zoneBounds.minX + zoneBounds.maxX) / 2,
            1,
            (zoneBounds.minZ + zoneBounds.maxZ) / 2,
          ]}
          args={[
            zoneBounds.maxX - zoneBounds.minX,
            2,
            zoneBounds.maxZ - zoneBounds.minZ,
          ]}
        >
          <meshBasicMaterial
            color={0x00ff00}
            wireframe
            opacity={0.2}
            transparent
          />
        </Box>
      )}

      {showCameraOrbitTarget && (
        <CameraTargetHelper cameraControlsRef={cameraControlsRef} />
      )}

      {/* Ghost preview for entity placement */}
      <GhostPreview />

      {/* Collision debug visualization - shows fading boxes on collision */}
      <CollisionDebugOverlay enabled={showCollisionBounds} />

      {/* Spatial grid visualization - shows collision grid cells */}
      <SpatialGridOverlay enabled={showSpatialGrid} />
    </DebugContext.Provider>
  );
}

// ============================================================================
// Canvas3D Component
// ============================================================================

export const Canvas3D: React.FC = () => {
  const editorConfig = useLayoutStore((state) => state.editorConfig);

  const cameraType = editorConfig.camera?.type ?? "perspective";
  const initialPosition = editorConfig.camera?.initialPosition ?? {
    x: 20,
    y: 20,
    z: 20,
  };

  const enableShadows = editorConfig.performance?.enableShadows ?? true;
  const pixelRatio =
    editorConfig.performance?.pixelRatio ??
    Math.min(window.devicePixelRatio, 2);

  return (
    <div className="relative box-border h-full min-h-0 w-full overflow-hidden">
      <Leva hidden={true} />
      <Canvas
        shadows={enableShadows}
        dpr={pixelRatio}
        camera={{
          position: [initialPosition.x, initialPosition.y, initialPosition.z],
          fov: cameraType === "perspective" ? 50 : undefined,
          near: 0.1,
          far: 1000,
        }}
        className="block h-full w-full bg-secondary"
      >
        <SceneContent />
      </Canvas>
      <ShortcutPreview />
    </div>
  );
};
