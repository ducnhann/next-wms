// ShortcutPreview Component
// Shows available keyboard shortcuts based on current context

import type React from "react";
import { useMemo } from "react";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { canRedo, canUndo, useLayoutStore } from "@/store/layout-editor-store";

interface ShortcutItem {
  keys: string[];
  label: string;
  available: boolean;
}

export const ShortcutPreview: React.FC = () => {
  const selectedEntityId = useLayoutStore((state) => state.selectedEntityId);
  const transformMode = useLayoutStore((state) => state.transformMode);
  const isTransformActive = useLayoutStore((state) => state.isTransformActive);
  const ghostEntity = useLayoutStore((state) => state.ghostEntity);

  const shortcuts = useMemo((): ShortcutItem[] => {
    const hasSelection = !!selectedEntityId;
    const hasGhost = !!ghostEntity;

    // Ghost placement mode - show placement shortcuts
    if (hasGhost) {
      return [
        {
          keys: ["LMB"],
          label: "Place",
          available: true,
        },
        {
          keys: ["Enter"],
          label: "Confirm",
          available: true,
        },
        {
          keys: ["ESC"],
          label: "Cancel",
          available: true,
        },
      ];
    }

    // Determine LMB label based on context
    let lmbLabel = "Orbit";
    if (isTransformActive) {
      lmbLabel = transformMode === "rotate" ? "Rotate Entity" : "Move Entity";
    } else if (transformMode) {
      lmbLabel = transformMode === "rotate" ? "Rotate Entity" : "Move Entity";
    }

    return [
      // Always available shortcuts
      {
        keys: ["Ctrl", "Z"],
        label: "Undo",
        available: canUndo(),
      },
      {
        keys: ["Ctrl", "Y"],
        label: "Redo",
        available: canRedo(),
      },
      // Selection-dependent shortcuts
      {
        keys: ["M"],
        label: transformMode === "translate" ? "Exit Move" : "Move",
        available: hasSelection,
      },
      {
        keys: ["R"],
        label: transformMode === "rotate" ? "Exit Rotate" : "Rotate",
        available: hasSelection,
      },
      // Mouse controls - context-aware
      {
        keys: ["LMB"],
        label: lmbLabel,
        available: true,
      },
      {
        keys: ["RMB"],
        label: "Pan",
        available: true,
      },
      {
        keys: ["MMB"],
        label: "Zoom",
        available: true,
      },
      {
        keys: ["Ctrl", "Space"],
        label: "Reset Camera",
        available: true,
      },
    ];
  }, [selectedEntityId, transformMode, isTransformActive, ghostEntity]);

  // Filter to only show available shortcuts
  const availableShortcuts = shortcuts.filter((s) => s.available);

  if (availableShortcuts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-10">
      <div className="flex w-52 flex-col gap-1.5 rounded-lg border border-border/50 bg-background/70 p-2.5 px-3 backdrop-blur-sm">
        {availableShortcuts.map((shortcut) => (
          <div key={shortcut.label} className="flex items-center gap-2">
            <KbdGroup>
              {shortcut.keys.map((key, keyIndex) => (
                <span
                  key={`${shortcut.label}-${key}-${keyIndex}`}
                  className="inline-flex items-center gap-0.5"
                >
                  {keyIndex > 0 && (
                    <span className="mx-0.5 text-[14px] text-muted-foreground">
                      +
                    </span>
                  )}
                  <Kbd className="border-b-2">{key}</Kbd>
                </span>
              ))}
            </KbdGroup>
            <span className="whitespace-nowrap text-muted-foreground text-xs">
              {shortcut.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
