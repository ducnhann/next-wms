// Reusable hook for TransformControls logic
// Handles pending transforms, collision checking, and confirmation flow
// Uses a state machine for predictable behavior

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Euler, type Group, Quaternion, Vector3 as ThreeVector3 } from "three";
import type {
  Dimension,
  Obstacle,
  Rack,
  Vector3,
  Zone,
} from "@/lib/types/layout-editor";
import { checkCollisions } from "@/lib/utils/collision";
import { useLayoutStore } from "@/store/layout-editor-store";

// Debug helper for transform controls
function debugLog(message: string, data?: unknown): void {
  // if (getLogLevel() === "debug") {
  const fullMessage = data
    ? `[TRANSFORM] ${message}: ${JSON.stringify(data)}`
    : `[TRANSFORM] ${message}`;
  toast(fullMessage, { duration: 1500 });
  // }
}

// ============================================================================
// State Machine Types
// ============================================================================

/**
 * Transform State Machine States:
 * - idle: No transform in progress, waiting for user to start dragging
 * - dragging: User is actively dragging the gizmo
 * - pending: Transform completed, showing visual feedback, can be undone
 */
type TransformMachineState = "idle" | "dragging" | "pending";

/**
 * Events that can trigger state transitions
 */
type TransformEvent =
  | { type: "DRAG_START" }
  | { type: "DRAG_END"; position?: Vector3; rotation?: Vector3 }
  | { type: "COLLISION_REJECT" }
  | { type: "COMMIT_SUCCESS" }
  | { type: "CLICK_ANYWHERE" }
  | { type: "DESELECT" }
  | { type: "MODE_CHANGE" };

export interface TransformState {
  position: Vector3;
  rotation: Vector3;
}

export interface UseTransformControlsOptions {
  currentTransform: TransformState;
  dimensions: Dimension;
  isSelected: boolean;
  transformMode: "translate" | "rotate" | null;
  groupRef: React.RefObject<Group | null>;
  // Collision check data
  racks: Map<string, Rack>;
  obstacles: Map<string, Obstacle>;
  zones: Map<string, Zone>;
  excludeFromCollision?: string; // Entity ID to exclude (self)
  // Callbacks
  onConfirm: (updates: Partial<TransformState>) => void;
}

export interface UseTransformControlsReturn {
  /** Current state machine state */
  machineState: TransformMachineState;
  /** Whether there's a pending transform (for visual feedback) */
  hasPendingTransform: boolean;
  /** Called when user starts dragging the gizmo */
  handleTransformStart: () => void;
  /** Called when user releases the translate gizmo */
  handleTranslateEnd: () => void;
  /** Called when user releases the rotate gizmo */
  handleRotateEnd: () => void;
  /** Called on any click - clears pending state */
  handleConfirmClick: () => boolean;
  /** Programmatically clear pending state */
  clearPendingState: () => void;
}

// ============================================================================
// State Machine Implementation
// ============================================================================

/**
 * Pure state machine transition function
 * Returns the next state based on current state and event
 */
function transition(
  state: TransformMachineState,
  event: TransformEvent,
): TransformMachineState {
  switch (state) {
    case "idle":
      switch (event.type) {
        case "DRAG_START":
          return "dragging";
        default:
          return state;
      }

    case "dragging":
      switch (event.type) {
        case "DRAG_END":
          return "pending"; // Will transition based on collision check result
        case "COLLISION_REJECT":
          return "idle";
        case "COMMIT_SUCCESS":
          return "idle"; // Go directly to idle after successful commit
        default:
          return state;
      }

    case "pending":
      switch (event.type) {
        case "CLICK_ANYWHERE":
        case "DESELECT":
        case "MODE_CHANGE":
        case "DRAG_START":
          return event.type === "DRAG_START" ? "dragging" : "idle";
        default:
          return state;
      }

    default:
      return state;
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useTransformControls({
  currentTransform,
  dimensions,
  isSelected,
  transformMode,
  groupRef,
  racks,
  obstacles,
  zones,
  excludeFromCollision,
  onConfirm,
}: UseTransformControlsOptions): UseTransformControlsReturn {
  // State machine state
  const [machineState, setMachineState] =
    useState<TransformMachineState>("idle");

  // Ref to track state for use in effects (avoids stale closures)
  const machineStateRef = useRef<TransformMachineState>("idle");

  // Ref to skip the next sync effect after a successful commit
  // This prevents the sync effect from reverting to stale store values
  const skipNextSyncRef = useRef(false);

  // Get store action for setting transform active state
  const setTransformActive = useLayoutStore((s) => s.setTransformActive);

  // Dispatch an event to the state machine
  const dispatch = useCallback((event: TransformEvent) => {
    setMachineState((currentState) => {
      const nextState = transition(currentState, event);
      machineStateRef.current = nextState;
      return nextState;
    });
  }, []);

  // Derived state
  const hasPendingTransform = machineState === "pending";
  const isDragging = machineState === "dragging";

  // Sync isTransformActive with dragging state
  useEffect(() => {
    setTransformActive(isDragging);
  }, [isDragging, setTransformActive]);

  // Sync Three.js group with store data ONLY when not dragging
  // Skip sync if we just committed a transform (to avoid reverting to stale values)
  useEffect(() => {
    if (groupRef.current && !isDragging) {
      // Skip this sync if we just committed - the group already has the correct values
      if (skipNextSyncRef.current) {
        skipNextSyncRef.current = false;
        return;
      }
      groupRef.current.position.set(
        currentTransform.position.x,
        dimensions.height / 2,
        currentTransform.position.z,
      );
      groupRef.current.rotation.set(
        currentTransform.rotation.x,
        currentTransform.rotation.y,
        currentTransform.rotation.z,
      );
    }
  }, [
    currentTransform.position.x,
    currentTransform.position.z,
    currentTransform.rotation.x,
    currentTransform.rotation.y,
    currentTransform.rotation.z,
    dimensions.height,
    isDragging,
    groupRef,
  ]);

  // Handle deselection or mode change - clear pending state
  useEffect(() => {
    if (!isSelected || !transformMode) {
      if (machineStateRef.current === "pending") {
        dispatch({ type: "DESELECT" });
      }
    }
  }, [isSelected, transformMode, dispatch]);

  // ---- Event Handlers ----

  const handleTransformStart = useCallback(() => {
    debugLog("handleTransformStart");
    dispatch({ type: "DRAG_START" });
  }, [dispatch]);

  const handleTranslateEnd = useCallback(() => {
    debugLog("handleTranslateEnd START");
    const startTime = performance.now();

    if (!groupRef.current) {
      debugLog("handleTranslateEnd - no groupRef");
      dispatch({ type: "COLLISION_REJECT" });
      return;
    }

    // Get the world position of the group (in case it has parent transforms)
    const worldPosition = new ThreeVector3();
    groupRef.current.getWorldPosition(worldPosition);

    // Get the current rotation from the group (may differ from store if previously rotated)
    const currentRotationY = groupRef.current.rotation.y;

    const newPos: Vector3 = {
      x: worldPosition.x,
      y: 0, // Always snap to ground
      z: worldPosition.z,
    };

    // Run collision check - use Maps directly to avoid Array.from() overhead
    debugLog("handleTranslateEnd - collision check START");
    const collisionStartTime = performance.now();

    const zonesArray = zones;
    const zone = zonesArray.values().next().value;
    const bounds = zone
      ? {
          x: zone.bounds.x,
          z: zone.bounds.z,
          width: zone.bounds.width,
          length: zone.bounds.length,
        }
      : { x: 0, z: 0, width: 50, length: 50 };

    const collision = checkCollisions(
      {
        position: newPos,
        dimensions,
        rotationY: currentRotationY,
        bounds,
        excludeEntityId: excludeFromCollision,
      },
      racks,
      obstacles,
    );

    debugLog("handleTranslateEnd - collision check DONE", {
      elapsed: `${(performance.now() - collisionStartTime).toFixed(2)}ms`,
      hasCollision: collision.hasCollision,
    });

    if (collision.hasCollision) {
      // Collision detected - revert to store position
      groupRef.current.position.set(
        currentTransform.position.x,
        dimensions.height / 2,
        currentTransform.position.z,
      );
      toast.error(`Cannot place: ${collision.reason}`);
      dispatch({ type: "COLLISION_REJECT" });
      debugLog("handleTranslateEnd - REJECTED");
      return;
    }

    // Commit to store (adds to undo stack)
    debugLog("handleTranslateEnd - calling onConfirm");
    onConfirm({ position: newPos });

    // Skip the next sync effect to avoid reverting to stale store values
    skipNextSyncRef.current = true;

    // Go directly to idle - pending state not needed for simple transforms
    dispatch({ type: "COMMIT_SUCCESS" });

    toast.success(`Moved to (${newPos.x.toFixed(2)}, ${newPos.z.toFixed(2)})`);

    debugLog("handleTranslateEnd DONE", {
      totalTime: `${(performance.now() - startTime).toFixed(2)}ms`,
    });
  }, [
    groupRef,
    zones,
    racks,
    obstacles,
    dimensions,
    excludeFromCollision,
    currentTransform.position.x,
    currentTransform.position.z,
    onConfirm,
    dispatch,
  ]);

  const handleRotateEnd = useCallback(() => {
    debugLog("handleRotateEnd START");
    const startTime = performance.now();

    if (!groupRef.current) {
      debugLog("handleRotateEnd - no groupRef");
      dispatch({ type: "COLLISION_REJECT" });
      return;
    }

    // Extract Y rotation using quaternion to avoid gimbal lock issues
    // When using Euler angles with default XYZ order, rotations past 90° can flip unexpectedly
    const quaternion = new Quaternion();
    groupRef.current.getWorldQuaternion(quaternion);

    // Convert quaternion to Euler with YXZ order (Y rotation first, no gimbal lock for Y-only rotation)
    const euler = new Euler().setFromQuaternion(quaternion, "YXZ");

    // Normalize rotation to 0 to 2π range (0° to 359°)
    let normalizedY = euler.y % (2 * Math.PI);
    if (normalizedY < 0) {
      normalizedY += 2 * Math.PI;
    }

    // Update the Three.js group to use the normalized Y-only rotation
    // This prevents accumulation and ensures clean rotation state
    groupRef.current.rotation.set(0, normalizedY, 0);

    const newRot: Vector3 = {
      x: 0,
      y: normalizedY,
      z: 0,
    };

    // Run collision check with new rotation - use Maps directly
    debugLog("handleRotateEnd - collision check START");
    const collisionStartTime = performance.now();

    const zone = zones.values().next().value;
    const bounds = zone
      ? {
          x: zone.bounds.x,
          z: zone.bounds.z,
          width: zone.bounds.width,
          length: zone.bounds.length,
        }
      : { x: 0, z: 0, width: 50, length: 50 };

    const collision = checkCollisions(
      {
        position: currentTransform.position,
        dimensions,
        rotationY: newRot.y,
        bounds,
        excludeEntityId: excludeFromCollision,
      },
      racks,
      obstacles,
    );

    debugLog("handleRotateEnd - collision check DONE", {
      elapsed: `${(performance.now() - collisionStartTime).toFixed(2)}ms`,
      hasCollision: collision.hasCollision,
    });

    if (collision.hasCollision) {
      // Collision detected - revert to store rotation
      groupRef.current.rotation.set(
        currentTransform.rotation.x,
        currentTransform.rotation.y,
        currentTransform.rotation.z,
      );
      toast.error(`Cannot rotate: ${collision.reason}`);
      dispatch({ type: "COLLISION_REJECT" });
      debugLog("handleRotateEnd - REJECTED");
      return;
    }

    // Commit to store (adds to undo stack)
    debugLog("handleRotateEnd - calling onConfirm");
    onConfirm({ rotation: newRot });

    // Skip the next sync effect to avoid reverting to stale store values
    skipNextSyncRef.current = true;

    // Go directly to idle - pending state not needed for simple transforms
    dispatch({ type: "COMMIT_SUCCESS" });

    // Convert radians to degrees for user-friendly display (0-359 range)
    let degrees = Math.round((newRot.y * 180) / Math.PI);
    degrees = ((degrees % 360) + 360) % 360; // Normalize to 0-359 range
    toast.success(`Rotated to ${degrees}°`);

    debugLog("handleRotateEnd DONE", {
      totalTime: `${(performance.now() - startTime).toFixed(2)}ms`,
    });
  }, [
    groupRef,
    zones,
    racks,
    obstacles,
    dimensions,
    excludeFromCollision,
    currentTransform.position,
    currentTransform.rotation,
    onConfirm,
    dispatch,
  ]);

  const handleConfirmClick = useCallback((): boolean => {
    if (machineState === "pending") {
      dispatch({ type: "CLICK_ANYWHERE" });
      return true;
    }
    return false;
  }, [machineState, dispatch]);

  const clearPendingState = useCallback(() => {
    if (machineState === "pending") {
      dispatch({ type: "CLICK_ANYWHERE" });
    }
  }, [machineState, dispatch]);

  return {
    machineState,
    hasPendingTransform,
    handleTransformStart,
    handleTranslateEnd,
    handleRotateEnd,
    handleConfirmClick,
    clearPendingState,
  };
}
