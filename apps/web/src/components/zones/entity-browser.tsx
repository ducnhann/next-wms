import type { Id } from "@wms/backend/convex/_generated/dataModel";
import {
  AlertTriangle,
  AlignHorizontalDistributeCenter,
  Box,
  DoorOpen,
  Eye,
  Layers,
  LayoutGrid,
  LogIn,
  X,
} from "lucide-react";
import type React from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  type TreeDataItem,
  type TreeRenderItemParams,
  TreeView,
  type TreeViewRef,
} from "@/components/tree-view";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ZoneDetailsDialog } from "@/components/zones/zone-details-dialog";
import { useBranches } from "@/hooks/use-branches";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  BLOCK_UI_SCHEMAS,
  type BlockType,
} from "@/lib/types/layout-editor/attribute-registry";
import { cn } from "@/lib/utils";
import {
  logEntitySelected,
  logGhostEntitySet,
} from "@/store/editor-console-store";
import type { StorageEntity } from "@/store/layout-editor-store";
import { useLayoutStore } from "@/store/layout-editor-store";

// ============================================================================
// Icons Map
// ============================================================================

const BLOCK_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  floor: Layers,
  rack: LayoutGrid,
  shelf: AlignHorizontalDistributeCenter,
  bin: Box,
  obstacle: AlertTriangle,
  entrypoint: LogIn,
  doorpoint: DoorOpen,
};

// ============================================================================
// Main Component
// ============================================================================

export function EntityBrowser() {
  // State for right-clicked item context
  const [contextItem, setContextItem] = useState<StorageEntity | null>(null);

  // State for zone details dialog
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedZoneForDetails, setSelectedZoneForDetails] = useState<{
    id: Id<"storage_zones"> | null;
    name: string;
  }>({ id: null, name: "" });

  // TreeView ref
  const treeViewRef = useRef<TreeViewRef>(null);

  // Get current branch
  const { organizationId } = useCurrentUser();
  const { currentBranch } = useBranches({ organizationId });

  // Store state
  const entities = useLayoutStore((s) => s.entities);
  const selectedEntityId = useLayoutStore((s) => s.selectedEntityId);
  const selectEntity = useLayoutStore((s) => s.selectEntity);
  const setGhostEntity = useLayoutStore((s) => s.setGhostEntity);
  const clearSelection = useLayoutStore((s) => s.clearSelection);

  // Build tree data from entities - one tree per floor
  const { floorTrees } = useMemo(() => {
    // Build a lookup: realId -> tempId for parent matching
    const realIdMap = new Map<string, string>();
    for (const entity of entities.values()) {
      if (entity._id) {
        realIdMap.set(entity._id, entity.tempId);
      }
    }

    // Group entities by their parent's tempId (or null for root)
    const childrenByParentTempId = new Map<string | null, StorageEntity[]>();
    for (const entity of entities.values()) {
      if (entity.isDeleted) continue;

      // Find parent's tempId from parentId (which is a real _id)
      let parentTempId: string | null = null;
      if (entity.parentId) {
        parentTempId = realIdMap.get(entity.parentId) ?? null;
      }

      if (!childrenByParentTempId.has(parentTempId)) {
        childrenByParentTempId.set(parentTempId, []);
      }
      const parentChildren = childrenByParentTempId.get(parentTempId);
      if (parentChildren) {
        parentChildren.push(entity);
      }
    }

    // Build tree for a given parent
    const buildTree = (parentTempId: string | null): TreeDataItem[] => {
      const children = childrenByParentTempId.get(parentTempId) ?? [];
      return children.map((entity) => {
        const Icon = BLOCK_ICONS[entity.storageBlockType] ?? Box;
        const schema = BLOCK_UI_SCHEMAS[entity.storageBlockType as BlockType];
        const name =
          (entity.zoneAttributes.name as string) ||
          (entity.zoneAttributes.label as string) ||
          `${schema?.displayName || entity.storageBlockType}`;

        const childItems = buildTree(entity.tempId);
        return {
          id: entity.tempId,
          name,
          icon: Icon,
          children: childItems.length > 0 ? childItems : undefined,
        };
      });
    };

    // Get all floors (root entities)
    const floors = childrenByParentTempId.get(null) ?? [];

    // Build a separate tree for each floor
    const trees = floors.map((floor) => {
      const Icon = BLOCK_ICONS[floor.storageBlockType] ?? Box;
      const schema = BLOCK_UI_SCHEMAS[floor.storageBlockType as BlockType];
      const name =
        (floor.zoneAttributes.name as string) ||
        `${schema?.displayName || floor.storageBlockType}`;

      const children = buildTree(floor.tempId);
      return {
        id: floor.tempId,
        name,
        icon: Icon,
        children: children.length > 0 ? children : undefined,
      } as TreeDataItem;
    });

    return { floorTrees: trees, realIdToTempId: realIdMap };
  }, [entities]);

  // Handle tree selection
  const handleTreeSelect = useCallback(
    (item: TreeDataItem | undefined) => {
      if (item) {
        selectEntity(item.id);
        logEntitySelected(item.id);
      }
    },
    [selectEntity],
  );

  // Clear selection handler
  const handleClearSelection = useCallback(() => {
    treeViewRef.current?.clearSelection();
    clearSelection();
  }, [clearSelection]);

  // Get allowed child types based on entity type
  const getAllowedChildTypes = useCallback(
    (entity: StorageEntity | null): BlockType[] => {
      if (!entity) {
        // Root level - can only create floor/zone
        return ["floor"];
      }
      const parentType = entity.storageBlockType;
      switch (parentType) {
        case "floor":
          return ["rack", "obstacle", "entrypoint"];
        case "rack":
          return ["shelf"];
        case "shelf":
          return ["bin"];
        default:
          return [];
      }
    },
    [],
  );

  // Determine the effective context entity for context menu
  // Priority: right-clicked item > selected item > null (root)
  const contextEntity = useMemo(() => {
    if (contextItem) return contextItem;
    if (selectedEntityId) return entities.get(selectedEntityId) ?? null;
    return null;
  }, [contextItem, selectedEntityId, entities]);

  // Create new entity handler - use contextEntity for parent
  const handleCreateEntity = useCallback(
    (blockType: BlockType) => {
      // For setGhostEntity, use the real _id for parentId (Convex relationship)
      // If entity is a draft (no _id), it can't be a valid parent yet
      const parentId = contextEntity?._id ?? null;
      setGhostEntity(blockType, parentId);
      logGhostEntitySet(blockType, parentId);
      // Reset context item after action
      setContextItem(null);
    },
    [setGhostEntity, contextEntity],
  );

  // Custom render item for TreeView with context menu
  const renderTreeItem = useCallback(
    (params: TreeRenderItemParams) => {
      const { item, isSelected } = params;
      const entity = entities.get(item.id);

      return (
        <div
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded px-2 py-1",
            isSelected && "bg-accent",
          )}
          onContextMenu={() => {
            if (entity) {
              setContextItem(entity);
            }
          }}
        >
          {item.icon && (
            <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate text-sm">{item.name}</span>
        </div>
      );
    },
    [entities],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="h-8 font-semibold text-sm leading-8">Entity Browser</h3>
        {selectedEntityId && (
          <Button size={"sm"} onClick={handleClearSelection}>
            <X className="h-4 w-4" />
            Clear selection
          </Button>
        )}
      </div>

      <Separator />

      {/* Tree View with Context Menu */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <ScrollArea
            className="h-full"
            onContextMenu={() => setContextItem(null)}
          >
            {floorTrees.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">No zones defined</h4>
                  <p className="text-muted-foreground text-xs">
                    Right-click here to create your first floor zone
                  </p>
                </div>
                <div className="mt-2 rounded-md border border-muted-foreground/50 border-dashed px-3 py-2 text-muted-foreground text-xs">
                  💡 Tip: Create a <strong>Floor</strong> zone first, then add
                  racks and obstacles inside it
                </div>
              </div>
            ) : (
              <TreeView
                ref={treeViewRef}
                // key={selectedEntityId ?? "no-selection"}
                data={floorTrees}
                initialSelectedItemId={selectedEntityId || undefined}
                onSelectChange={handleTreeSelect}
                renderItem={renderTreeItem}
                expandAll={false}
              />
            )}
          </ScrollArea>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          {getAllowedChildTypes(contextEntity).length > 0 ? (
            getAllowedChildTypes(contextEntity).map((blockType) => {
              const Icon = BLOCK_ICONS[blockType] ?? Box;
              const label =
                blockType.charAt(0).toUpperCase() + blockType.slice(1);
              return (
                <ContextMenuItem
                  key={blockType}
                  onClick={() => handleCreateEntity(blockType)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  New {label}
                </ContextMenuItem>
              );
            })
          ) : (
            <ContextMenuItem disabled>No actions available</ContextMenuItem>
          )}
          {/* View Details option for zones with real IDs */}
          {contextEntity?._id && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => {
                  setSelectedZoneForDetails({
                    id: contextEntity._id as Id<"storage_zones">,
                    name:
                      (contextEntity.zoneAttributes.name as string) ||
                      contextEntity.storageBlockType,
                  });
                  setDetailsDialogOpen(true);
                  setContextItem(null);
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Footer with count */}
      <div className="border-t bg-muted/30 px-3 py-2 text-muted-foreground text-xs">
        {entities.size} items total
      </div>

      {/* Zone Details Dialog */}
      <ZoneDetailsDialog
        zoneId={selectedZoneForDetails.id}
        zoneName={selectedZoneForDetails.name}
        branchId={currentBranch?._id ?? null}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />
    </div>
  );
}

export default EntityBrowser;
