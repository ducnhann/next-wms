// Rack component - wireframe visualization with shelves
// Migrated to use new SmartStore with StorageEntity

import {
  Outlines,
  shaderMaterial,
  TransformControls,
  useCursor,
} from "@react-three/drei";
import { extend } from "@react-three/fiber";
import type React from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { Group } from "three";
import * as THREE from "three";
import { useDebugContext } from "@/components/zones/canvas-3d";
import { LockIcon } from "@/components/zones/entity-locked";
import { RackFrame } from "@/components/zones/rack-frame";
import { useEntityMutation } from "@/hooks/use-entity-mutation";
import { ROTATION_SNAP, TRANSLATION_SNAP } from "@/lib/utils/constants";
import { useLayoutStore } from "@/store/layout-editor-store";

const FillGaugeMaterial = shaderMaterial(
  {
    uFillLevel: 0.5,
    uLowColor: new THREE.Color("#22C55E"), // Green
    uMidColor: new THREE.Color("#FACC15"), // Yellow
    uHighColor: new THREE.Color("#EF4444"), // Red
    uEmptyColor: new THREE.Color("#1f2937"), // Dark gray
    uLowThreshold: 0.33,
    uHighThreshold: 0.66,
  },
  // Vertex Shader
  `
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      vPosition = position;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform float uFillLevel;
    uniform vec3 uLowColor;
    uniform vec3 uMidColor;
    uniform vec3 uHighColor;
    uniform vec3 uEmptyColor;
    uniform float uLowThreshold;
    uniform float uHighThreshold;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      // Normalize position from -0.5 to 0.5 range to 0 to 1
      float heightNormalized = vPosition.y + 0.5;
      
      // Soft edge transition (5% blur)
      float blurAmount = 0.05;
      float edgeSoftness = smoothstep(uFillLevel - blurAmount, uFillLevel, heightNormalized);
      
      // Check if this pixel is in the filled area
      bool isFilled = heightNormalized <= uFillLevel;
      
      if (isFilled) {
        // Calculate color based on fill level (not height position)
        vec3 fillColor;
        
        if (uFillLevel < uLowThreshold) {
          // Low fill: pure green
          fillColor = uLowColor;
        } else if (uFillLevel < uHighThreshold) {
          // Medium fill: transition from green to yellow
          float t = (uFillLevel - uLowThreshold) / (uHighThreshold - uLowThreshold);
          fillColor = mix(uLowColor, uMidColor, t);
        } else {
          // High fill: transition from yellow to red
          float t = (uFillLevel - uHighThreshold) / (1.0 - uHighThreshold);
          fillColor = mix(uMidColor, uHighColor, t);
        }
        
        // Add subtle rim lighting for depth
        float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
        rim = smoothstep(0.6, 1.0, rim);
        vec3 finalColor = fillColor + rim * fillColor * 0.2;
        
        // Apply soft edge fade
        float alpha = mix(0.7, 0.0, edgeSoftness);
        gl_FragColor = vec4(finalColor, alpha);
      } else {
        // Empty area - subtle dark gray with soft transition from fill edge
        float emptyAlpha = mix(0.2, 0.0, 1.0 - edgeSoftness);
        gl_FragColor = vec4(uEmptyColor, emptyAlpha);
      }
    }
  `,
);

extend({ FillGaugeMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    fillGaugeMaterial: {
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
// Types for rack attributes
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

// ============================================================================
// ShelvesVisual - Renders shelves and bins from child storage_zone entities
// ============================================================================

const PADDING = 0.05; // 5cm padding

interface ShelvesVisualProps {
  rackId: string;
  rackRealId: string | undefined;
  dimensions: Dimensions;
}

function ShelvesVisual({ rackId, rackRealId, dimensions }: ShelvesVisualProps) {
  const getChildren = useLayoutStore((s) => s.getChildren);

  // Get shelf children
  const shelves = useMemo(() => {
    return getChildren(rackRealId ?? rackId, "shelf");
  }, [rackId, rackRealId, getChildren]);

  const shelfCount = shelves.length;
  if (shelfCount === 0) return null;

  const { width, height, depth } = dimensions;
  const halfHeight = height / 2;

  // Calculate shelf height: 90% of rack height / shelfCount (10% gap at bottom)
  const usableHeight = height * 0.9;
  const shelfSpacing = usableHeight / shelfCount;
  const bottomGap = height * 0.1;

  // Determine longer side for bin division
  const longerSide = Math.max(width, depth);
  const isWidthLonger = width >= depth;

  return (
    <group>
      {shelves.map((shelf, shelfIndex) => {
        // Calculate shelf Y position (from bottom up)
        const shelfY = bottomGap + shelfIndex * shelfSpacing - halfHeight;

        // Get bins for this shelf
        const bins = getChildren(shelf._id ?? shelf.tempId, "bin");
        const binCount = bins.length;

        // Calculate bin dimensions
        const binWidth =
          binCount > 0
            ? (longerSide - PADDING * 2 - PADDING * (binCount - 1)) / binCount
            : longerSide - PADDING * 2;
        const binDepth = (isWidthLonger ? depth : width) - PADDING * 2;

        return (
          <group key={shelf.tempId}>
            {/* Bin dividers and indicators */}
            {bins.map((bin, binIndex) => {
              const usagePercent =
                (bin.zoneAttributes.usagePercent as number) ?? 0;
              // const isFull = bin.zoneAttributes.isFull as boolean;

              // Calculate bin center position
              const binOffset =
                -longerSide / 2 +
                PADDING +
                binWidth / 2 +
                binIndex * (binWidth + PADDING);
              const binX = isWidthLonger ? binOffset : 0;
              const binZ = isWidthLonger ? 0 : binOffset;

              return (
                <mesh
                  key={bin.tempId}
                  position={[binX, shelfY + shelfSpacing * 0.4, binZ]}
                >
                  <boxGeometry
                    args={[
                      isWidthLonger ? binWidth * 0.9 : binDepth * 0.9,
                      shelfSpacing * 0.8,
                      isWidthLonger ? binDepth * 0.9 : binWidth * 0.9,
                    ]}
                  />
                  <fillGaugeMaterial
                    transparent
                    side={THREE.DoubleSide}
                    depthWrite={false}
                    uFillLevel={usagePercent / 100}
                  />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

// ============================================================================
// Rack Component
// ============================================================================

export const Rack: React.FC<{ rackId: string }> = ({ rackId }) => {
  // Get entity from new store (rackId is now tempId)
  const entity = useLayoutStore((s) => s.entities.get(rackId));
  const selectedEntityId = useLayoutStore((s) => s.selectedEntityId);
  const transformMode = useLayoutStore((s) => s.transformMode);
  const selectEntity = useLayoutStore((s) => s.selectEntity);

  // Use the commit hook for validated updates
  const { commitUpdate } = useEntityMutation();

  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  const isSelected = selectedEntityId === rackId;

  // Debug visualization context
  const { showCollisionBounds } = useDebugContext();

  // Store original position for rollback on collision
  const originalPositionRef = useRef<Vec3 | null>(null);
  const originalRotationRef = useRef<Vec3 | null>(null);

  // Extract attributes from entity
  const { position, dimensions, rotation, isLocked, isAccessible } =
    useMemo(() => {
      if (!entity?.zoneAttributes) {
        return {
          position: { x: 0, y: 0, z: 0 },
          dimensions: { width: 1, height: 2, depth: 0.5 },
          rotation: { x: 0, y: 0, z: 0 },
          isLocked: false,
          isAccessible: true,
        };
      }
      const attrs = entity.zoneAttributes;
      return {
        position: (attrs.position as Vec3) ?? { x: 0, y: 0, z: 0 },
        dimensions: (attrs.dimensions as Dimensions) ?? {
          width: 1,
          height: 2,
          depth: 0.5,
        },
        rotation: (attrs.rotation as Vec3) ?? { x: 0, y: 0, z: 0 },
        isLocked: (attrs.isLocked as boolean) ?? false,
        isAccessible: (attrs.isAccessible as boolean) ?? true,
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
      const result = await commitUpdate(rackId, globalUpdates, {
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
    [rackId, commitUpdate, dimensions, isCommitting],
  );

  // Store original position when transform starts
  const handleTransformStart = useCallback(() => {
    originalPositionRef.current = position;
    originalRotationRef.current = rotation;
  }, [position, rotation]);

  useCursor(hovered);

  if (!entity || entity.isDeleted) return null;

  // Check if rack is locked (from zoneAttributes)
  const isRackLocked = isLocked;

  // Disable transform controls for locked racks
  const showTranslateControls =
    isSelected && transformMode === "translate" && !isRackLocked;
  const showRotateControls =
    isSelected && transformMode === "rotate" && !isRackLocked;

  const color = isRackLocked
    ? "#EF4444" // Red for locked
    : isAccessible === false
      ? "#FFA500"
      : "#3FA9F5";

  const handleClick = (
    e: React.MouseEvent | { stopPropagation: () => void },
  ) => {
    e.stopPropagation();
    selectEntity(rackId);
  };

  return (
    <>
      <group
        ref={groupRef}
        position={[position.x, dimensions.height / 2, position.z]}
        rotation={[rotation.x, rotation.y, rotation.z]}
      >
        {/* Structural frame */}
        <RackFrame
          dimensions={dimensions}
          color={color}
          showCrossBeams={!isSelected}
        />

        {/* Shelves and bins visualization from child entities */}
        <ShelvesVisual
          rackId={rackId}
          rackRealId={entity?._id}
          dimensions={dimensions}
        />

        {/* Invisible hit box for selection */}
        <mesh
          onClick={handleClick}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
          visible={isSelected}
        >
          <boxGeometry
            args={[dimensions.width, dimensions.height, dimensions.depth]}
          />
          <meshBasicMaterial opacity={0.01} transparent />
          {isSelected && (
            <Outlines thickness={0.1} color="#00ffff" screenspace={true} />
          )}
        </mesh>

        {/* Selection highlight outline */}
        {/* {isSelected && (
          <lineSegments>
            <edgesGeometry
              args={[
                new THREE.BoxGeometry(
                  dimensions.width,
                  dimensions.height,
                  dimensions.depth,
                ),
              ]}
            />
            <lineBasicMaterial color="#00ffff" linewidth={2} />
          </lineSegments>
        )} */}

        {/* Lock icon for locked racks */}
        {isRackLocked && (
          <LockIcon heightOffset={dimensions.height / 2 + 0.5} />
        )}
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
          <mesh>
            <boxGeometry
              args={[dimensions.width, dimensions.height, dimensions.depth]}
            />
            <meshBasicMaterial
              color={0x00ff00}
              wireframe
              opacity={0.5}
              transparent
            />
          </mesh>
        </group>
      )}
    </>
  );
};
