// Constants for transform controls

import type { ObstacleType } from "@/lib/types/layout-editor";

export const TRANSLATION_SNAP = 0.1; // 0.1 meter steps
export const ROTATION_SNAP = Math.PI / 12; // 15 degree steps (in radians)

export const OBSTACLE_COLORS: Record<ObstacleType, string> = {
  column: "#888888",
  wall: "#666666",
  equipment: "#997755",
  other: "#555555",
};
