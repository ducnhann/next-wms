// Geometric Types for Warehouse Layout Editor
// Basic geometric primitives used throughout the application

import type { EntityType } from "./entities";

// ============================================================================
// Basic Geometric Types
// ============================================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}
export type Vec3 = Vector3;

export interface Vector2 {
  x: number;
  z: number;
}
export type Vec2 = Vector2;

export interface Dimension {
  width: number;
  height: number;
  depth: number;
}

// ============================================================================
// Utility Geometric Types
// ============================================================================

export interface AABB {
  min: Vector3;
  max: Vector3;
}

export interface GridCell {
  x: number;
  z: number;
  state: "walkable" | "blocked" | "visited";
}

/**
 * Oriented Bounding Box on XZ plane (optimized for Y-axis rotation)
 * Pre-computes sin/cos for performance
 */
export interface OBB2D {
  centerX: number;
  centerZ: number;
  halfWidth: number; // half extent along local X
  halfDepth: number; // half extent along local Z
  cos: number; // pre-computed cos(rotation)
  sin: number; // pre-computed sin(rotation)
}

// ============================================================================
// Collision Types
// ============================================================================

/**
 * Zone bounds type for spatial grid initialization and boundary checks
 */
export interface ZoneBounds {
  x: number;
  z: number;
  width: number;
  length: number;
}

/**
 * Information about a collision
 */
export interface CollisionInfo {
  entityId: string;
  entityType: EntityType;
  displayName: string;
}

/**
 * Comprehensive collision check result
 */
export interface CollisionResult {
  hasCollision: boolean;
  collidingEntities: CollisionInfo[];
  outOfBounds: boolean;
  reason: string | null;
}

/**
 * Options for collision checking
 */
export interface CollisionCheckOptions {
  /** Position to check */
  position: Vector3;
  /** Dimensions of the entity being checked */
  dimensions: Dimension;
  /** Y-axis rotation in radians */
  rotationY: number;
  /** Zone bounds to check against */
  bounds: ZoneBounds;
  /** Entity ID to exclude from collision (self) */
  excludeEntityId?: string;
  /** Whether to trigger debug visualization */
  enableDebug?: boolean;
}

export interface SpatialGridEntry {
  entityId: string;
  entityType: EntityType;
  position: Vector3;
  dimensions: Dimension;
  rotationY: number;
}
