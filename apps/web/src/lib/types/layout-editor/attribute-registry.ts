/**
 * SmartStore Attribute Registry
 * Centralized schema definitions for entity types with:
 * - Zod validation schemas for runtime type safety
 * - UI configuration for auto-generated property panels
 */

import { z } from "zod";

// ============================================================================
// Primitive Schemas
// ============================================================================

export const positionSchema = z.object({
  x: z.number(),
  z: z.number(),
});

export const rotationSchema = z.object({
  y: z.number().min(-Math.PI).max(Math.PI),
});

export const dimensionsSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive().optional(),
  depth: z.number().positive().optional(),
  length: z.number().positive().optional(),
});

export const colorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

// ============================================================================
// Block Type Enums
// ============================================================================

export const BLOCK_TYPES = [
  "floor",
  "rack",
  "shelf",
  "bin",
  "obstacle",
  "entrypoint",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export const STORAGE_TYPES = ["dry", "cold", "hazardous"] as const;

export type StorageType = (typeof STORAGE_TYPES)[number];

// ============================================================================
// Block Schemas (Zod validation)
// ============================================================================

export const BLOCK_SCHEMAS = {
  floor: z.object({
    name: z.string().min(1),
    dimensions: z.object({
      width: z.number().positive(),
      length: z.number().positive(),
    }),
    position: positionSchema.optional(),
    color: colorSchema.optional(),
  }),

  rack: z.object({
    name: z.string().min(1),
    position: positionSchema,
    rotation: rotationSchema,
    dimensions: dimensionsSchema,
    shelfCount: z.number().int().min(1).max(20),
    storageType: z.enum(STORAGE_TYPES),
    temperatureRange: z.object({ min: z.number(), max: z.number() }).optional(),
  }),

  shelf: z.object({
    binCount: z.number().int().min(1).max(8),
  }),

  bin: z.object({
    calculatedVolume: z.number().min(0).optional(),
    capacity: z.number().min(0).optional(),
    usagePercent: z.number().min(0).max(100).default(0),
    isFull: z.boolean().default(false),
  }),

  obstacle: z.object({
    position: positionSchema,
    rotation: rotationSchema,
    dimensions: dimensionsSchema,
    label: z.string().optional(),
    obstacleType: z.string(),
  }),

  entrypoint: z.object({
    name: z.string().min(1),
    position: positionSchema,
    label: z.string(),
  }),
} satisfies Record<BlockType, z.ZodObject<z.ZodRawShape>>;

// ============================================================================
// UI Configuration Types
// ============================================================================

export type AttributeInputType =
  | "string"
  | "number"
  | "boolean"
  | "position"
  | "dimensions"
  | "rotation"
  | "range"
  | "select"
  | "color";

export interface AttributeUIConfig {
  key: string;
  label: string;
  type: AttributeInputType;
  required?: boolean;
  // Number constraints
  min?: number;
  max?: number;
  step?: number;
  // Select options
  options?: { value: string; label: string }[];
  // Display
  unit?: string;
  placeholder?: string;
  description?: string;
}

export interface BlockUISchema {
  blockType: BlockType;
  displayName: string;
  icon: string;
  path: string;
  attributes: AttributeUIConfig[];
}

// ============================================================================
// UI Schemas per Block Type
// ============================================================================

export const BLOCK_UI_SCHEMAS: Record<BlockType, BlockUISchema> = {
  floor: {
    blockType: "floor",
    displayName: "Floor",
    icon: "Layers",
    path: "floor",
    attributes: [
      { key: "name", label: "Name", type: "string", required: true },
      { key: "dimensions", label: "Size", type: "dimensions", required: true },
      { key: "position", label: "Position", type: "position" },
      { key: "color", label: "Color", type: "color" },
    ],
  },

  rack: {
    blockType: "rack",
    displayName: "Rack",
    icon: "LayoutGrid",
    path: "floor.rack",
    attributes: [
      { key: "name", label: "Name", type: "string", required: true },
      { key: "position", label: "Position", type: "position", required: true },
      { key: "rotation", label: "Rotation", type: "rotation" },
      { key: "dimensions", label: "Size", type: "dimensions", required: true },
      {
        key: "shelfCount",
        label: "Shelves",
        type: "number",
        min: 1,
        max: 20,
        step: 1,
      },
      {
        key: "storageType",
        label: "Storage Type",
        type: "select",
        required: true,
        options: [
          { value: "dry", label: "Dry Storage" },
          { value: "cold", label: "Cold Storage" },
          { value: "hazardous", label: "Hazardous" },
        ],
      },
      {
        key: "temperatureRange",
        label: "Temp Range",
        type: "range",
        min: -40,
        max: 50,
        unit: "celsius",
      },
    ],
  },

  shelf: {
    blockType: "shelf",
    displayName: "Shelf",
    icon: "AlignHorizontalDistributeCenter",
    path: "floor.rack.shelf",
    attributes: [
      {
        key: "binCount",
        label: "Bins",
        type: "number",
        min: 1,
        max: 8,
        step: 1,
        required: true,
      },
    ],
  },

  bin: {
    blockType: "bin",
    displayName: "Bin",
    icon: "Box",
    path: "floor.rack.shelf.bin",
    attributes: [
      {
        key: "calculatedVolume",
        label: "Volume",
        type: "number",
        unit: "m³",
        description: "Auto-calculated from rack dimensions",
      },
      {
        key: "capacity",
        label: "Capacity",
        type: "number",
        min: 0,
        unit: "kg",
      },
      {
        key: "usagePercent",
        label: "Usage",
        type: "number",
        min: 0,
        max: 100,
        unit: "percent",
      },
      { key: "isFull", label: "Full", type: "boolean" },
    ],
  },

  obstacle: {
    blockType: "obstacle",
    displayName: "Obstacle",
    icon: "AlertTriangle",
    path: "floor.obstacle",
    attributes: [
      { key: "position", label: "Position", type: "position", required: true },
      { key: "rotation", label: "Rotation", type: "rotation" },
      { key: "dimensions", label: "Size", type: "dimensions", required: true },
      { key: "label", label: "Label", type: "string" },
      {
        key: "obstacleType",
        label: "Type",
        type: "select",
        required: true,
        options: [
          { value: "pillar", label: "Pillar" },
          { value: "wall", label: "Wall" },
          { value: "equipment", label: "Equipment" },
          { value: "other", label: "Other" },
        ],
      },
    ],
  },

  entrypoint: {
    blockType: "entrypoint",
    displayName: "Entry Point",
    icon: "LogIn",
    path: "floor.entrypoint",
    attributes: [
      { key: "name", label: "Name", type: "string", required: true },
      { key: "position", label: "Position", type: "position", required: true },
      { key: "label", label: "Label", type: "string", required: true },
    ],
  },
};

// ============================================================================
// Helpers
// ============================================================================

/** Get schema for a block type */
export function getBlockSchema<T extends BlockType>(blockType: T) {
  return BLOCK_SCHEMAS[blockType];
}

/** Get UI config for a block type */
export function getBlockUISchema(blockType: BlockType): BlockUISchema {
  return BLOCK_UI_SCHEMAS[blockType];
}

/** Validate attributes against block schema */
export function validateAttributes<T extends BlockType>(
  blockType: T,
  attributes: unknown,
) {
  return BLOCK_SCHEMAS[blockType].safeParse(attributes);
}

/** Get default attributes for a block type */
export function getDefaultAttributes(
  blockType: BlockType,
): Record<string, unknown> {
  const defaults: Record<BlockType, Record<string, unknown>> = {
    floor: {
      name: "",
      dimensions: { width: 50, length: 50 },
      color: "#E0E0E0",
    },
    rack: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      dimensions: { width: 2, height: 3, depth: 1 },
      shelfCount: 4,
      storageType: "dry",
    },
    shelf: { binCount: 4 },
    bin: { calculatedVolume: 0, capacity: 0, usagePercent: 0, isFull: false },
    obstacle: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      dimensions: { width: 1, height: 2, depth: 1 },
      obstacleType: "column",
    },
    entrypoint: { position: { x: 0, y: 0, z: 0 }, label: "Entry" },
    doorpoint: { position: { x: 0, y: 0, z: 0 }, label: "Door", width: 1.5 },
  };
  return defaults[blockType];
}
