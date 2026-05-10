/**
 * Sync Slice - Convex connection and optimistic updates
 * Part of the SmartStore state management system
 */

import type { StateCreator } from "zustand";

// ============================================================================
// Types
// ============================================================================

export interface PendingMutation {
  id: string;
  entityId: string;
  type: "create" | "update" | "delete";
  timestamp: number;
  previousValue?: Record<string, unknown>;
}

export interface SyncState {
  branchId: string | null;
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncAt: number | null;
  pendingMutations: Map<string, PendingMutation>;
  syncErrors: string[];
  commitEntityCallback: ((tempId: string) => Promise<void>) | null;
}

export interface SyncActions {
  // Connection
  connect: (branchId: string) => void;
  disconnect: () => void;

  // Sync status
  setSyncing: (syncing: boolean) => void;
  setConnected: (connected: boolean) => void;
  markSynced: () => void;

  // Optimistic updates
  addPendingMutation: (mutation: Omit<PendingMutation, "timestamp">) => void;
  removePendingMutation: (id: string) => void;
  rollbackMutation: (id: string) => void;

  // Errors
  addSyncError: (error: string) => void;
  clearSyncErrors: () => void;

  // Commit callback (set by sync hook, called by property panel)
  registerCommitCallback: (callback: (tempId: string) => Promise<void>) => void;
  callCommitEntity: (tempId: string) => Promise<void>;
}

export type SyncSlice = SyncState & SyncActions;

// ============================================================================
// Slice Creator
// ============================================================================

export const createSyncSlice: StateCreator<
  SyncSlice,
  [["zustand/immer", never]],
  [],
  SyncSlice
> = (set, get) => ({
  branchId: null,
  isConnected: false,
  isSyncing: false,
  lastSyncAt: null,
  pendingMutations: new Map(),
  syncErrors: [],
  commitEntityCallback: null,

  // Connection
  connect: (branchId) => {
    set({ branchId, isConnected: true });
  },

  disconnect: () => {
    set({ branchId: null, isConnected: false, isSyncing: false });
  },

  // Sync status
  setSyncing: (syncing) => {
    set({ isSyncing: syncing });
  },

  setConnected: (connected) => {
    set({ isConnected: connected });
  },

  markSynced: () => {
    set({ lastSyncAt: Date.now(), isSyncing: false });
  },

  // Optimistic updates
  addPendingMutation: (mutation) => {
    set((state) => {
      state.pendingMutations.set(mutation.id, {
        ...mutation,
        timestamp: Date.now(),
      });
    });
  },

  removePendingMutation: (id) => {
    set((state) => {
      state.pendingMutations.delete(id);
    });
  },

  rollbackMutation: (id) => {
    const mutation = get().pendingMutations.get(id);
    if (!mutation) return;

    // TODO: Rollback the entity to previousValue
    // This would typically call back into entitiesSlice

    set((state) => {
      state.pendingMutations.delete(id);
    });
  },

  // Errors
  addSyncError: (error) => {
    set((state) => {
      state.syncErrors.push(error);
      // Keep only last 10 errors
      if (state.syncErrors.length > 10) {
        state.syncErrors.shift();
      }
    });
  },

  clearSyncErrors: () => {
    set({ syncErrors: [] });
  },

  // Commit callback
  registerCommitCallback: (callback) => {
    set({ commitEntityCallback: callback });
  },

  callCommitEntity: async (tempId) => {
    const callback = get().commitEntityCallback;
    if (!callback) {
      console.warn("No commit callback registered");
      return;
    }
    await callback(tempId);
  },
});
