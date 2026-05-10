import { useEffect, useRef } from "react";
import {
  canRedo,
  canUndo,
  redo,
  undo,
  useLayoutStore,
} from "@/store/layout-editor-store";

const DEBOUNCE_MS = 150;

export function useKeyboardShortcuts() {
  const selectedEntityId = useLayoutStore((state) => state.selectedEntityId);
  const transformMode = useLayoutStore((state) => state.transformMode);
  const setTransformMode = useLayoutStore((state) => state.setTransformMode);
  const resetCamera = useLayoutStore((state) => state.resetCamera);
  const zoomToEntity = useLayoutStore((state) => state.zoomToEntity);
  const lastActionTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const now = Date.now();

      // Don't trigger shortcuts if user is typing in an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Debounce: ignore if within 300ms of last action
      if (now - lastActionTimeRef.current < DEBOUNCE_MS) {
        event.preventDefault();
        return;
      }

      // Check for Ctrl+Z (undo)
      if (event.ctrlKey && event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        lastActionTimeRef.current = now;
        if (canUndo()) {
          undo();
        }
      }
      // Check for Ctrl+Y or Ctrl+Shift+Z (redo)
      else if (
        (event.ctrlKey && event.key === "y") ||
        (event.ctrlKey && event.shiftKey && event.key === "z") ||
        (event.ctrlKey && event.shiftKey && event.key === "Z")
      ) {
        event.preventDefault();
        lastActionTimeRef.current = now;
        if (canRedo()) {
          redo();
        }
      }
      // Ctrl+Space - Reset camera view or zoom to selected entity
      else if (event.ctrlKey && event.code === "Space") {
        event.preventDefault();
        lastActionTimeRef.current = now;
        if (selectedEntityId) {
          zoomToEntity(selectedEntityId);
        } else {
          resetCamera();
        }
      }
      // M key - toggle Move mode (only when entity is selected)
      else if (
        (event.key === "m" || event.key === "M") &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        if (selectedEntityId) {
          event.preventDefault();
          lastActionTimeRef.current = now;
          // Toggle: if already in translate mode, clear it; otherwise set to translate
          setTransformMode(transformMode === "translate" ? null : "translate");
        }
      }
      // R key - toggle Rotate mode (only when entity is selected)
      else if (
        (event.key === "r" || event.key === "R") &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        if (selectedEntityId) {
          event.preventDefault();
          lastActionTimeRef.current = now;
          // Toggle: if already in rotate mode, clear it; otherwise set to rotate
          setTransformMode(transformMode === "rotate" ? null : "rotate");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    selectedEntityId,
    transformMode,
    setTransformMode,
    resetCamera,
    zoomToEntity,
  ]);
}
