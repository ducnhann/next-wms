/**
 * EditorConsole Slice - Manages console log entries for the layout editor
 * Provides structured logging with levels, filtering, and entity context
 */

import type { StateCreator } from "zustand";

// ============================================================================
// Types
// ============================================================================

export type LogLevel = "debug" | "info" | "warn" | "error" | "success";

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  /** Optional category for grouping (e.g., 'entity', 'sync', 'collision') */
  category?: string;
  /** Optional structured data */
  data?: Record<string, unknown>;
}

export interface ConsoleFilters {
  debug: boolean;
  info: boolean;
  warn: boolean;
  error: boolean;
  success: boolean;
}

export interface EditorConsoleState {
  logs: LogEntry[];
  filters: ConsoleFilters;
  maxLogs: number;
  isExpanded: boolean;
}

export interface EditorConsoleActions {
  // Logging actions
  log: (
    level: LogLevel,
    message: string,
    category?: string,
    data?: Record<string, unknown>,
  ) => void;
  debug: (
    message: string,
    category?: string,
    data?: Record<string, unknown>,
  ) => void;
  info: (
    message: string,
    category?: string,
    data?: Record<string, unknown>,
  ) => void;
  warn: (
    message: string,
    category?: string,
    data?: Record<string, unknown>,
  ) => void;
  error: (
    message: string,
    category?: string,
    data?: Record<string, unknown>,
  ) => void;
  success: (
    message: string,
    category?: string,
    data?: Record<string, unknown>,
  ) => void;

  // Filter actions
  setFilter: (level: LogLevel, enabled: boolean) => void;
  toggleFilter: (level: LogLevel) => void;
  resetFilters: () => void;

  // Console actions
  clearLogs: () => void;
  setExpanded: (expanded: boolean) => void;
  toggleExpanded: () => void;
}

export type EditorConsoleSlice = EditorConsoleState & EditorConsoleActions;

// ============================================================================
// Initial State
// ============================================================================

const DEFAULT_FILTERS: ConsoleFilters = {
  debug: false,
  info: true,
  warn: true,
  error: true,
  success: true,
};

// ============================================================================
// Slice Creator
// ============================================================================

let logIdCounter = 0;

export const createEditorConsoleSlice: StateCreator<
  EditorConsoleSlice,
  [["zustand/immer", never]],
  [],
  EditorConsoleSlice
> = (set, get) => ({
  // State
  logs: [],
  filters: { ...DEFAULT_FILTERS },
  maxLogs: 500,
  isExpanded: true,

  // Logging actions
  log: (level, message, category, data) => {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${++logIdCounter}`,
      timestamp: Date.now(),
      level,
      message,
      category,
      data,
    };

    set((state) => {
      state.logs.push(entry);
      // Trim old logs if exceeding max
      if (state.logs.length > state.maxLogs) {
        state.logs = state.logs.slice(-state.maxLogs);
      }
    });

    // Also log to browser console in development
    if (process.env.NODE_ENV === "development") {
      const prefix = category ? `[${category}]` : "";
      const consoleMethod = level === "success" ? "log" : level;
      console[consoleMethod]?.(`${prefix} ${message}`, data ?? "");
    }
  },

  debug: (message, category, data) =>
    get().log("debug", message, category, data),
  info: (message, category, data) => get().log("info", message, category, data),
  warn: (message, category, data) => get().log("warn", message, category, data),
  error: (message, category, data) =>
    get().log("error", message, category, data),
  success: (message, category, data) =>
    get().log("success", message, category, data),

  // Filter actions
  setFilter: (level, enabled) => {
    set((state) => {
      state.filters[level] = enabled;
    });
  },

  toggleFilter: (level) => {
    set((state) => {
      state.filters[level] = !state.filters[level];
    });
  },

  resetFilters: () => {
    set((state) => {
      state.filters = { ...DEFAULT_FILTERS };
    });
  },

  // Console actions
  clearLogs: () => {
    set((state) => {
      state.logs = [];
    });
  },

  setExpanded: (expanded) => {
    set((state) => {
      state.isExpanded = expanded;
    });
  },

  toggleExpanded: () => {
    set((state) => {
      state.isExpanded = !state.isExpanded;
    });
  },
});
