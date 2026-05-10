/**
 * CollisionService - Singleton collision detection with spatial grid partitioning
 * Groups entities by floor for optimized O(1) nearby entity lookup
 */

import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { logDebug } from "@/store/editor-console-store";
import { useLayoutStore } from "@/store/layout-editor-store";
import { checkOBBCollision, createOBB2D } from "./collision";

// ============================================================================
// Types
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

interface GridCell {
  key: string;
  x: number;
  z: number;
  entityCount: number;
  entityIds: string[];
}

interface CollisionResult {
  hasCollision: boolean;
  collidingWith?: string;
  reason?: string;
}

interface StorageEntity {
  tempId: string;
  _id?: Id<"storage_zones">;
  parentId?: Id<"storage_zones"> | string | null;
  storageBlockType: string;
  name: string;
  zoneAttributes: Record<string, unknown>;
  isDeleted?: boolean;
}

// ============================================================================
// SpatialGrid - Per-floor grid for O(1) entity lookup
// ============================================================================

class SpatialGrid {
  private cells: Map<string, Set<string>> = new Map();
  private entityCells: Map<string, Set<string>> = new Map();
  private cellSize: number;
  public floorId: string;
  public floorName: string;

  constructor(floorId: string, floorName: string, cellSize = 5) {
    this.floorId = floorId;
    this.floorName = floorName;
    this.cellSize = cellSize;
  }

  private getCellKey(x: number, z: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellZ = Math.floor(z / this.cellSize);
    return `${cellX},${cellZ}`;
  }

  private getEntityCells(position: Vec3, dimensions: Dimensions): Set<string> {
    const cells = new Set<string>();
    const halfWidth = dimensions.width / 2;
    const halfDepth = dimensions.depth / 2;

    // Get all cells that the entity overlaps
    const minX = position.x - halfWidth;
    const maxX = position.x + halfWidth;
    const minZ = position.z - halfDepth;
    const maxZ = position.z + halfDepth;

    for (let x = minX; x <= maxX; x += this.cellSize) {
      for (let z = minZ; z <= maxZ; z += this.cellSize) {
        cells.add(this.getCellKey(x, z));
      }
    }
    // Always include corners
    cells.add(this.getCellKey(minX, minZ));
    cells.add(this.getCellKey(maxX, minZ));
    cells.add(this.getCellKey(minX, maxZ));
    cells.add(this.getCellKey(maxX, maxZ));

    return cells;
  }

  addEntity(entityId: string, position: Vec3, dimensions: Dimensions): void {
    const cellKeys = this.getEntityCells(position, dimensions);
    this.entityCells.set(entityId, cellKeys);

    for (const key of cellKeys) {
      if (!this.cells.has(key)) {
        this.cells.set(key, new Set());
      }
      const cell = this.cells.get(key);
      if (cell) {
        cell.add(entityId);
      }
    }
  }

  removeEntity(entityId: string): void {
    const cellKeys = this.entityCells.get(entityId);
    if (!cellKeys) return;

    for (const key of cellKeys) {
      const cell = this.cells.get(key);
      if (cell) {
        cell.delete(entityId);
        if (cell.size === 0) {
          this.cells.delete(key);
        }
      }
    }
    this.entityCells.delete(entityId);
  }

  updateEntity(entityId: string, position: Vec3, dimensions: Dimensions): void {
    this.removeEntity(entityId);
    this.addEntity(entityId, position, dimensions);
  }

  getNearbyEntities(position: Vec3, dimensions: Dimensions): Set<string> {
    const nearby = new Set<string>();
    const cellKeys = this.getEntityCells(position, dimensions);

    for (const key of cellKeys) {
      const cell = this.cells.get(key);
      if (cell) {
        for (const entityId of cell) {
          nearby.add(entityId);
        }
      }
    }

    return nearby;
  }

  getCells(): GridCell[] {
    const result: GridCell[] = [];
    for (const [key, entityIds] of this.cells) {
      const [x, z] = key.split(",").map(Number);
      result.push({
        key,
        x: x * this.cellSize,
        z: z * this.cellSize,
        entityCount: entityIds.size,
        entityIds: Array.from(entityIds),
      });
    }
    return result;
  }

  getEntityCount(): number {
    return this.entityCells.size;
  }

  getCellCount(): number {
    return this.cells.size;
  }
}

// ============================================================================
// CollisionService Singleton
// ============================================================================

class CollisionService {
  private static instance: CollisionService | null = null;
  private floorGrids: Map<string, SpatialGrid> = new Map();
  private initialized = false;
  private debugMode = false;

  private constructor() {}

  static getInstance(): CollisionService {
    if (!CollisionService.instance) {
      CollisionService.instance = new CollisionService();
    }
    return CollisionService.instance;
  }

  static reset(): void {
    if (CollisionService.instance) {
      CollisionService.instance.floorGrids.clear();
      CollisionService.instance.initialized = false;
    }
    CollisionService.instance = null;
  }

  initialize(): void {
    if (this.initialized) return;

    const store = useLayoutStore.getState();
    const entities = store.entities;

    // First pass: create grids for floors
    for (const [, entity] of entities) {
      if (entity.storageBlockType === "floor" && !entity.isDeleted) {
        const grid = new SpatialGrid(entity.tempId, entity.name);
        this.floorGrids.set(entity.tempId, grid);
        // Also map by _id if available
        if (entity._id) {
          this.floorGrids.set(entity._id, grid);
        }
      }
    }

    // Second pass: add collidable entities to their floor grids
    let entityCount = 0;
    for (const [, entity] of entities) {
      if (this.isCollidable(entity) && !entity.isDeleted) {
        this.addEntityToGrid(entity);
        entityCount++;
      }
    }

    this.initialized = true;
    logDebug(
      `Initialized with ${this.floorGrids.size} floors, ${entityCount} collidable entities`,
      "collision",
    );

    // Log per-floor stats
    for (const [floorId, grid] of this.floorGrids) {
      if (!floorId.includes("-")) continue; // Skip _id duplicates
      logDebug(
        `Floor "${grid.floorName}": ${grid.getCellCount()} cells, ${grid.getEntityCount()} entities`,
        "collision",
      );
    }
  }

  private isCollidable(entity: StorageEntity): boolean {
    return (
      entity.storageBlockType === "rack" ||
      entity.storageBlockType === "obstacle"
    );
  }

  private addEntityToGrid(entity: StorageEntity): void {
    if (!entity.parentId) return;

    const grid = this.floorGrids.get(entity.parentId as string);
    if (!grid) return;

    const pos = entity.zoneAttributes.position as Vec3 | undefined;
    const dims = entity.zoneAttributes.dimensions as Dimensions | undefined;
    if (!pos || !dims) return;

    grid.addEntity(entity.tempId, pos, dims);
  }

  addEntity(entity: StorageEntity): void {
    if (!this.isCollidable(entity)) return;
    this.addEntityToGrid(entity);
  }

  removeEntity(tempId: string): void {
    // Remove from all grids (we don't know which floor it was in)
    for (const [, grid] of this.floorGrids) {
      grid.removeEntity(tempId);
    }
  }

  updateEntity(entity: StorageEntity, newPosition: Vec3): void {
    if (!this.isCollidable(entity)) return;
    if (!entity.parentId) return;

    const grid = this.floorGrids.get(entity.parentId as string);
    if (!grid) return;

    const dims = entity.zoneAttributes.dimensions as Dimensions | undefined;
    if (!dims) return;

    grid.updateEntity(entity.tempId, newPosition, dims);
  }

  checkCollision(
    entityId: string,
    proposedPosition: Vec3,
    dimensions: Dimensions,
    rotationY: number,
    floorId: string,
  ): CollisionResult {
    if (!this.initialized) {
      this.initialize();
    }

    const grid = this.floorGrids.get(floorId);
    if (!grid) {
      logDebug(`No grid found for floor ${floorId}`, "collision");
      return { hasCollision: false };
    }

    // Get nearby entities from spatial grid
    const nearbyIds = grid.getNearbyEntities(proposedPosition, dimensions);

    if (this.debugMode) {
      logDebug(
        `Checking ${entityId} against ${nearbyIds.size} nearby entities in "${grid.floorName}"`,
        "collision",
      );
    }

    // Create OBB for proposed position
    const proposedOBB = createOBB2D(proposedPosition, dimensions, rotationY);

    // Check collision against nearby entities
    const store = useLayoutStore.getState();
    for (const nearbyId of nearbyIds) {
      if (nearbyId === entityId) continue;

      const other = store.getEntity(nearbyId);
      if (!other || other.isDeleted) continue;

      const otherPos = other.zoneAttributes.position as Vec3 | undefined;
      const otherDims = other.zoneAttributes.dimensions as
        | Dimensions
        | undefined;
      const otherRot = other.zoneAttributes.rotation as Vec3 | undefined;

      if (!otherPos || !otherDims) continue;

      const otherOBB = createOBB2D(otherPos, otherDims, otherRot?.y ?? 0);

      if (checkOBBCollision(proposedOBB, otherOBB)) {
        const otherName = other.name ?? other.storageBlockType;
        logDebug(`Collision detected with "${otherName}"`, "collision");
        return {
          hasCollision: true,
          collidingWith: otherName,
          reason: `Collision with ${otherName}`,
        };
      }
    }

    return { hasCollision: false };
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  getFloorGridCells(floorId: string): GridCell[] {
    const grid = this.floorGrids.get(floorId);
    return grid ? grid.getCells() : [];
  }

  getAllGridCells(): Map<string, GridCell[]> {
    const result = new Map<string, GridCell[]>();
    for (const [floorId, grid] of this.floorGrids) {
      if (!floorId.includes("-")) continue; // Skip _id duplicates
      result.set(floorId, grid.getCells());
    }
    return result;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getStats(): { floors: number; entities: number; cells: number } {
    let entities = 0;
    let cells = 0;
    const floors = new Set<string>();

    for (const [floorId, grid] of this.floorGrids) {
      if (!floorId.includes("-")) continue;
      floors.add(floorId);
      entities += grid.getEntityCount();
      cells += grid.getCellCount();
    }

    return { floors: floors.size, entities, cells };
  }
}

// Export singleton accessor
export const getCollisionService = (): CollisionService => {
  return CollisionService.getInstance();
};

export const resetCollisionService = (): void => {
  CollisionService.reset();
};

export type { CollisionResult, GridCell };
