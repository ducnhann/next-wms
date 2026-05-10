// Entity Types for Warehouse Layout Editor
// Zone, Rack, Shelf, Bin, EntryPoint, Obstacle

import type {
  ColorHex,
  EntityTypes,
  EntryPointTypes,
  ObstacleTypes,
  RackTypes,
  ZoneTypes,
} from "./definition";
import type { Dimension, Vector3 } from "./geometry";

// ============================================================================
// Entity Union Type
// ============================================================================

export type Entity = Rack | Obstacle;

export type EntityType = (typeof EntityTypes.values)[number];

// ============================================================================
// Zone
// ============================================================================

export type ZoneType = (typeof ZoneTypes.values)[number];

export interface Zone {
  _id: string;
  type: ZoneType;
  name: string;
  bounds: {
    x: number;
    z: number;
    width: number;
    length: number;
  };
  color: ColorHex;
  racks: Rack[];
  obstacles: Obstacle[];
}

// ============================================================================
// Rack
// ============================================================================

export type RackType = (typeof RackTypes.values)[number];

export interface Rack {
  _id: string;
  type: RackType;
  position: Vector3;
  rotation: Vector3; // Euler angles in radians
  dimensions: Dimension;
  isLocked?: boolean; // Computed field
  isAccessible?: boolean; // Computed field
  shelves: Shelf[];
  metadata?: RackMetadata;
}

export interface RackMetadata {
  manufacturer?: string;
  model?: string;
  capacity?: number; // Max weight in kg/lbs
}

// ============================================================================
// Shelf & Bin
// ============================================================================

export interface Shelf {
  _id: string;
  levelIndex: number; // 0 = ground level
  heightFromGround: number;
  dimensions?: Dimension;
  bins: Bin[];
}

export interface Bin {
  _id: string;
  capacity: number;
  currentLoad: number; // > 0 triggers parent rack lock
  position?: {
    indexX: number;
    indexZ: number;
  };
  dimensions?: Dimension;
}

// ============================================================================
// EntryPoint
// ============================================================================

export type EntryPointType = (typeof EntryPointTypes.values)[number];

export interface EntryPoint {
  _id: string;
  position: Vector3;
  label: string;
  type?: EntryPointType;
}

// ============================================================================
// Obstacle
// ============================================================================

export type ObstacleType = (typeof ObstacleTypes.values)[number];

export interface Obstacle {
  _id: string;
  type?: ObstacleType;
  position: Vector3;
  rotation: Vector3;
  dimensions: Dimension;
  label?: string;
}

// ============================================================================
// Collidable Entity Interface (for unified collision detection)
// ============================================================================

/**
 * Common interface for any entity that participates in collision detection.
 * Both Rack and Obstacle satisfy this interface.
 */
export interface CollidableEntity {
  _id: string;
  position: Vector3;
  rotation: Vector3;
  dimensions: Dimension;
  /** Display name for error messages (e.g., "Rack", "Column", "Wall") */
  displayName?: string;
}
