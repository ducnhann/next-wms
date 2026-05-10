import type { Id } from "@wms/backend/convex/_generated/dataModel";
import React, { forwardRef, useCallback, useImperativeHandle } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Canvas3D } from "@/components/zones/canvas-3d";
import { EditorConsole } from "@/components/zones/debug/editor-console";
import { EntityBrowser } from "@/components/zones/entity-browser";
import { ErrorBoundary } from "@/components/zones/error-boundary";
import { SchemaPropertyPanel } from "@/components/zones/properties";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useSyncOnUndoRedo } from "@/hooks/use-sync-on-undo-redo";
import type {
  EditorConfig,
  EditorError,
  EditorState,
  ValidationResult,
  WarehouseEditorHandle,
} from "@/lib/types/layout-editor";
import type { StorageEntity } from "@/store/layout-editor-store";
import {
  canRedo,
  canUndo,
  redo,
  undo,
  useLayoutStore,
} from "@/store/layout-editor-store";

export interface WarehouseEditorProps {
  /** Editor configuration */
  config?: Partial<EditorConfig>;

  /** Callback when entity changes occur */
  onEntityChange?: (
    entity: StorageEntity,
    changeType: "create" | "update" | "delete",
  ) => void;

  /** Callback when errors occur */
  onError?: (error: EditorError) => void;

  /** CSS class name */
  className?: string;

  /** Inline styles */
  style?: React.CSSProperties;

  /** Show entity browser (left panel) */
  showEntityBrowser?: boolean;

  /** Show properties panel (right panel) */
  showPropertiesPanel?: boolean;

  /** Read-only mode */
  readOnly?: boolean;

  /** Show debug console panel (left panel) */
  showDebugPanel?: boolean;
}

/**
 * WarehouseEditor - Main component for 3D warehouse layout editing
 * Uses SmartStore architecture with real-time sync support
 *
 * @example
 * ```tsx
 * const editorRef = useRef<WarehouseEditorHandle>(null);
 *
 * <WarehouseEditor
 *   ref={editorRef}
 *   onEntityChange={(entity, type) => console.log(type, entity)}
 *   config={{ grid: { visible: true } }}
 * />
 * ```
 */
export const WarehouseEditor = forwardRef<
  WarehouseEditorHandle,
  WarehouseEditorProps
>(
  (
    {
      config,
      onEntityChange,
      onError,
      className,
      showEntityBrowser = true,
      showPropertiesPanel = true,
      readOnly = false,
      showDebugPanel = false,
    },
    ref,
  ) => {
    // Store actions
    const setEditorConfig = useLayoutStore((s) => s.setEditorConfig);
    const addEntity = useLayoutStore((s) => s.addEntity);
    const removeEntity = useLayoutStore((s) => s.removeEntity);
    const entities = useLayoutStore((s) => s.entities);
    const selectedEntityId = useLayoutStore((s) => s.selectedEntityId);
    const cameraPosition = useLayoutStore((s) => s.cameraPosition);
    const isDirty = useLayoutStore((s) => s.isDirty);

    // Enable keyboard shortcuts (Ctrl+Z, Ctrl+Y)
    useKeyboardShortcuts();

    // Enable Convex sync on undo/redo operations
    useSyncOnUndoRedo();

    // ========================================================================
    // Initialization
    // ========================================================================

    React.useEffect(() => {
      if (config) {
        setEditorConfig(config);
      }
    }, [config, setEditorConfig]);

    // ========================================================================
    // Event Handlers
    // ========================================================================

    React.useEffect(() => {
      if (!onEntityChange) return;

      // Subscribe to pending changes using comparison
      let previousPendingChanges = new Set<string>();
      const unsubscribe = useLayoutStore.subscribe((state) => {
        const newChanges = Array.from(state.pendingChanges).filter(
          (id) => !previousPendingChanges.has(id),
        );

        newChanges.forEach((entityId) => {
          const entity = state.entities.get(entityId);
          if (entity) {
            const changeType = entity.isDeleted ? "delete" : "update";
            onEntityChange(entity, changeType);
          }
        });

        previousPendingChanges = new Set(state.pendingChanges);
      });

      return unsubscribe;
    }, [onEntityChange]);

    React.useEffect(() => {
      if (!onError) return;

      // Subscribe to errors
      let previousLength = 0;
      const unsubscribe = useLayoutStore.subscribe((state) => {
        const errors = state.errors;
        if (errors.length > previousLength) {
          const lastError = errors[errors.length - 1];
          if (lastError) {
            onError(lastError);
          }
          previousLength = errors.length;
        }
      });

      return unsubscribe;
    }, [onError]);

    // ========================================================================
    // Imperative Handle (Ref API)
    // ========================================================================

    const validateLayout = useCallback((): ValidationResult => {
      // TODO: Implement full validation using new entity system
      return {
        valid: true,
        errors: [],
        warnings: [],
      };
    }, []);

    const resetCamera = useCallback(() => {
      useLayoutStore.getState().resetCamera();
    }, []);

    const zoomToEntity = useCallback((entityId: Id<"storage_zones">) => {
      // Find tempId by _id
      const entities = useLayoutStore.getState().entities;
      for (const [tempId, entity] of entities) {
        if (entity._id === entityId) {
          useLayoutStore.getState().zoomToEntity(tempId);
          return;
        }
      }
    }, []);

    const addRack = useCallback(
      (rackData: {
        position: object;
        dimensions: object;
        rotation?: object;
      }): string | undefined => {
        const id = addEntity("rack", null, "New Rack", {
          position: rackData.position,
          dimensions: rackData.dimensions,
          rotation: rackData.rotation ?? { x: 0, y: 0, z: 0 },
          shelfCount: 4,
          storageType: "dry",
        });
        return id;
      },
      [addEntity],
    );

    const removeRackById = useCallback(
      (rackId: string): boolean => {
        try {
          removeEntity(rackId);
          return true;
        } catch {
          return false;
        }
      },
      [removeEntity],
    );

    const getState = useCallback((): EditorState => {
      const racks = useLayoutStore.getState().getEntitiesByType("rack");
      const lockedRacks = racks.filter(
        (r) => r.zoneAttributes.isLocked === true,
      );

      return {
        selectedEntityId,
        cameraPosition: cameraPosition ?? { x: 0, y: 0, z: 0 },
        isDirty,
        lockedRackCount: lockedRacks.length,
        totalRackCount: racks.length,
      };
    }, [selectedEntityId, cameraPosition, isDirty]);

    const captureScreenshot = useCallback(async (): Promise<Blob> => {
      // TODO: Implement screenshot capture
      return new Blob([], { type: "image/png" });
    }, []);

    // New SmartStore-specific methods
    const getEntities = useCallback(() => {
      return Array.from(entities.values()).filter((e) => !e.isDeleted);
    }, [entities]);

    const undoAction = useCallback(() => {
      if (canUndo()) undo();
    }, []);

    const redoAction = useCallback(() => {
      if (canRedo()) redo();
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        // Core API
        validateLayout,
        resetCamera,
        zoomToEntity,
        addRack,
        removeRack: removeRackById,
        getState,
        captureScreenshot,
        // New SmartStore API
        getEntities,
        undo: undoAction,
        redo: redoAction,
        canUndo,
        canRedo,
      }),
      [
        validateLayout,
        resetCamera,
        zoomToEntity,
        addRack,
        removeRackById,
        getState,
        captureScreenshot,
        getEntities,
        undoAction,
        redoAction,
      ],
    );

    // ========================================================================
    // Render
    // ========================================================================

    // const logLevel: "info" | "debug" = "info"; // Default log level

    return (
      <div
        className={`relative h-full min-h-0 w-full overflow-hidden border-t ${className ?? ""}`}
      >
        <ErrorBoundary onError={onError}>
          <ResizablePanelGroup direction="horizontal">
            {/* Left Sidebar: Console Log */}
            {showDebugPanel && (
              <>
                <ResizablePanel defaultSize={35} minSize={10} maxSize={35}>
                  <EditorConsole />
                </ResizablePanel>

                <ResizableHandle withHandle />
              </>
            )}

            {/* Main 3D Canvas */}
            <ResizablePanel defaultSize={55} minSize={40}>
              <Canvas3D />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Right Sidebar: Entity List + Properties */}
            <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
              <ResizablePanelGroup direction="vertical" className="h-full">
                {/* Entity List */}
                {showEntityBrowser && (
                  <ResizablePanel defaultSize={50} minSize={20}>
                    <div className="h-full overflow-hidden">
                      <EntityBrowser />
                    </div>
                  </ResizablePanel>
                )}

                {showEntityBrowser && showPropertiesPanel && (
                  <ResizableHandle withHandle />
                )}

                {/* Properties Panel */}
                {showPropertiesPanel && (
                  <ResizablePanel defaultSize={50} minSize={20}>
                    <div className="h-full overflow-hidden">
                      <SchemaPropertyPanel readOnly={readOnly} />
                    </div>
                  </ResizablePanel>
                )}
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ErrorBoundary>
      </div>
    );
  },
);

WarehouseEditor.displayName = "WarehouseEditor";
