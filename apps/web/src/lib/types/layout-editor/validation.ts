// Validation Types for Warehouse Layout Editor
// Validation results, errors, warnings, and accessibility

import type { Vector2 } from "./geometry";

// ============================================================================
// Validation Results
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// ============================================================================
// Accessibility Results
// ============================================================================

export interface AccessibilityResults {
  inaccessibleRacks: string[];
  blockedPaths: PathSegment[];
  computationTime: number;
  gridSize: { width: number; height: number };
}

export interface PathSegment {
  from: Vector2;
  to: Vector2;
  blocked: boolean;
}
