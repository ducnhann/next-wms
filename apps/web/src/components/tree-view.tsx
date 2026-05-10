"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { cva } from "class-variance-authority";
import { ChevronRight } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";

const treeVariants = cva(
  "group mx-2 px-0 before:absolute before:left-0 before:-z-10 before:h-[2rem] before:w-full before:rounded-lg before:bg-accent/70 before:opacity-0 hover:before:opacity-100",
);

const selectedTreeVariants = cva(
  "text-accent-foreground before:bg-accent/70 before:opacity-100",
);

interface TreeDataItem {
  id: string;
  name: string;
  icon?: React.ComponentType<{ className?: string }>;
  selectedIcon?: React.ComponentType<{ className?: string }>;
  openIcon?: React.ComponentType<{ className?: string }>;
  children?: TreeDataItem[];
  actions?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

type TreeRenderItemParams = {
  item: TreeDataItem;
  level: number;
  isLeaf: boolean;
  isSelected: boolean;
  isOpen?: boolean;
  hasChildren: boolean;
};

interface TreeViewRef {
  clearSelection: () => void;
  element: HTMLDivElement | null;
}

type TreeProps = React.HTMLAttributes<HTMLDivElement> & {
  data: TreeDataItem[] | TreeDataItem;
  initialSelectedItemId?: string;
  onSelectChange?: (item: TreeDataItem | undefined) => void;
  expandAll?: boolean;
  defaultNodeIcon?: React.ComponentType<{ className?: string }>;
  defaultLeafIcon?: React.ComponentType<{ className?: string }>;
  renderItem?: (params: TreeRenderItemParams) => React.ReactNode;
};

const TreeView = React.forwardRef<TreeViewRef, TreeProps>(
  (
    {
      data,
      initialSelectedItemId,
      onSelectChange,
      expandAll,
      defaultLeafIcon,
      defaultNodeIcon,
      className,
      renderItem,
      ...props
    },
    ref,
  ) => {
    const divRef = React.useRef<HTMLDivElement>(null);
    const [selectedItemId, setSelectedItemId] = React.useState<
      string | undefined
    >(initialSelectedItemId);

    const handleSelectChange = React.useCallback(
      (item: TreeDataItem | undefined) => {
        setSelectedItemId(item?.id);
        if (onSelectChange) {
          onSelectChange(item);
        }
      },
      [onSelectChange],
    );

    const clearSelection = React.useCallback(() => {
      setSelectedItemId(undefined);
      if (onSelectChange) {
        onSelectChange(undefined);
      }
    }, [onSelectChange]);

    React.useImperativeHandle(
      ref,
      () => ({
        clearSelection,
        element: divRef.current,
      }),
      [clearSelection],
    );

    const expandedItemIds = React.useMemo(() => {
      if (!initialSelectedItemId) {
        return [] as string[];
      }

      const ids: string[] = [];

      function walkTreeItems(
        items: TreeDataItem[] | TreeDataItem,
        targetId: string,
      ) {
        if (Array.isArray(items)) {
          for (let i = 0; i < items.length; i++) {
            ids.push(items[i].id);
            if (walkTreeItems(items[i], targetId) && !expandAll) {
              return true;
            }
            if (!expandAll) ids.pop();
          }
        } else if (!expandAll && items.id === targetId) {
          return true;
        } else if (items.children) {
          return walkTreeItems(items.children, targetId);
        }
      }

      walkTreeItems(data, initialSelectedItemId);
      return ids;
    }, [data, expandAll, initialSelectedItemId]);

    return (
      <div
        ref={divRef}
        className={cn("relative overflow-hidden py-2 pr-4", className)}
      >
        <TreeItem
          data={data}
          selectedItemId={selectedItemId}
          handleSelectChange={handleSelectChange}
          expandedItemIds={expandedItemIds}
          defaultLeafIcon={defaultLeafIcon}
          defaultNodeIcon={defaultNodeIcon}
          renderItem={renderItem}
          level={0}
          {...props}
        />
      </div>
    );
  },
);
TreeView.displayName = "TreeView";

type TreeItemProps = TreeProps & {
  selectedItemId?: string;
  handleSelectChange: (item: TreeDataItem | undefined) => void;
  expandedItemIds: string[];
  defaultNodeIcon?: React.ComponentType<{ className?: string }>;
  defaultLeafIcon?: React.ComponentType<{ className?: string }>;
  level?: number;
};

const TreeItem = React.forwardRef<HTMLDivElement, TreeItemProps>(
  (
    {
      className,
      data,
      selectedItemId,
      handleSelectChange,
      expandedItemIds,
      defaultNodeIcon,
      defaultLeafIcon,
      renderItem,
      level,
      onSelectChange,
      expandAll,
      initialSelectedItemId,
      ...props
    },
    ref,
  ) => {
    if (!Array.isArray(data)) {
      data = [data];
    }
    return (
      <div ref={ref} role="tree" className={className} {...props}>
        <ul>
          {data.map((item) => (
            <li key={item.id}>
              {item.children ? (
                <TreeNode
                  item={item}
                  level={level ?? 0}
                  selectedItemId={selectedItemId}
                  expandedItemIds={expandedItemIds}
                  handleSelectChange={handleSelectChange}
                  defaultNodeIcon={defaultNodeIcon}
                  defaultLeafIcon={defaultLeafIcon}
                  renderItem={renderItem}
                />
              ) : (
                <TreeLeaf
                  item={item}
                  level={level ?? 0}
                  selectedItemId={selectedItemId}
                  handleSelectChange={handleSelectChange}
                  defaultLeafIcon={defaultLeafIcon}
                  renderItem={renderItem}
                />
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  },
);
TreeItem.displayName = "TreeItem";

const TreeNode = ({
  item,
  handleSelectChange,
  expandedItemIds,
  selectedItemId,
  defaultNodeIcon,
  defaultLeafIcon,
  renderItem,
  level = 0,
}: {
  item: TreeDataItem;
  handleSelectChange: (item: TreeDataItem | undefined) => void;
  expandedItemIds: string[];
  selectedItemId?: string;
  defaultNodeIcon?: React.ComponentType<{ className?: string }>;
  defaultLeafIcon?: React.ComponentType<{ className?: string }>;
  renderItem?: (params: TreeRenderItemParams) => React.ReactNode;
  level?: number;
}) => {
  const [value, setValue] = React.useState(
    expandedItemIds.includes(item.id) ? [item.id] : [],
  );
  const hasChildren = !!item.children?.length;
  const isSelected = selectedItemId === item.id;
  const isOpen = value.includes(item.id);

  return (
    <AccordionPrimitive.Root
      type="multiple"
      value={value}
      onValueChange={(s) => setValue(s)}
    >
      <AccordionPrimitive.Item value={item.id}>
        <AccordionTrigger
          className={cn(
            treeVariants(),
            isSelected && selectedTreeVariants(),
            item.className,
          )}
          onClick={() => {
            handleSelectChange(item);
            item.onClick?.();
          }}
        >
          {renderItem ? (
            renderItem({
              item,
              level,
              isLeaf: false,
              isSelected,
              isOpen,
              hasChildren,
            })
          ) : (
            <>
              <TreeIcon
                item={item}
                isSelected={isSelected}
                isOpen={isOpen}
                default={defaultNodeIcon}
              />
              <span className="truncate text-sm">{item.name}</span>
              <TreeActions isSelected={isSelected}>{item.actions}</TreeActions>
            </>
          )}
        </AccordionTrigger>
        <AccordionContent className="ml-4 border-l pl-1">
          <TreeItem
            data={item.children ? item.children : item}
            selectedItemId={selectedItemId}
            handleSelectChange={handleSelectChange}
            expandedItemIds={expandedItemIds}
            defaultLeafIcon={defaultLeafIcon}
            defaultNodeIcon={defaultNodeIcon}
            renderItem={renderItem}
            level={level + 1}
          />
        </AccordionContent>
      </AccordionPrimitive.Item>
    </AccordionPrimitive.Root>
  );
};

const TreeLeaf = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    item: TreeDataItem;
    level: number;
    selectedItemId?: string;
    handleSelectChange: (item: TreeDataItem | undefined) => void;
    defaultLeafIcon?: React.ComponentType<{ className?: string }>;
    renderItem?: (params: TreeRenderItemParams) => React.ReactNode;
  }
>(
  (
    {
      className,
      item,
      level,
      selectedItemId,
      handleSelectChange,
      defaultLeafIcon,
      renderItem,
      ...props
    },
    ref,
  ) => {
    const isSelected = selectedItemId === item.id;

    return (
      <div
        ref={ref}
        className={cn(
          "flex cursor-pointer items-center py-1 text-left before:right-1",
          treeVariants(),
          className,
          isSelected && selectedTreeVariants(),
          item.disabled && "pointer-events-none cursor-not-allowed opacity-50",
          item.className,
        )}
        onClick={() => {
          if (item.disabled) return;
          handleSelectChange(item);
          item.onClick?.();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (item.disabled) return;
            handleSelectChange(item);
            item.onClick?.();
          }
        }}
        {...props}
      >
        {renderItem ? (
          <>
            <div className="mr-1 h-4 w-4 shrink-0" />
            {renderItem({
              item,
              level,
              isLeaf: true,
              isSelected,
              hasChildren: false,
            })}
          </>
        ) : (
          <>
            <TreeIcon
              item={item}
              isSelected={isSelected}
              default={defaultLeafIcon}
            />
            <span className="flex truncate text-sm">{item.name}</span>
            <TreeActions isSelected={isSelected && !item.disabled}>
              {item.actions}
            </TreeActions>
          </>
        )}
      </div>
    );
  },
);
TreeLeaf.displayName = "TreeLeaf";

const AccordionTrigger = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header>
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex w-full flex-1 items-center py-0 transition-all first:[&[data-state=open]>svg]:first-of-type:rotate-90",
        className,
      )}
      {...props}
    >
      <ChevronRight className="mr-1 h-4 w-4 shrink-0 text-accent-foreground/50 transition-transform duration-200" />
      {children}
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn(
      "overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
      className,
    )}
    {...props}
  >
    <div className="pt-0 pb-1">{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

const TreeIcon = ({
  item,
  isOpen,
  isSelected,
  default: defaultIcon,
}: {
  item: TreeDataItem;
  isOpen?: boolean;
  isSelected?: boolean;
  default?: React.ComponentType<{ className?: string }>;
}) => {
  let Icon: React.ComponentType<{ className?: string }> | undefined =
    defaultIcon;
  if (isSelected && item.selectedIcon) {
    Icon = item.selectedIcon;
  } else if (isOpen && item.openIcon) {
    Icon = item.openIcon;
  } else if (item.icon) {
    Icon = item.icon;
  }
  return Icon ? <Icon className="mr-2 h-4 w-4 shrink-0" /> : null;
};

const TreeActions = ({
  children,
  isSelected,
}: {
  children: React.ReactNode;
  isSelected: boolean;
}) => {
  return (
    <div
      className={cn(
        isSelected ? "block" : "hidden",
        "absolute right-3 group-hover:block",
      )}
    >
      {children}
    </div>
  );
};

export {
  TreeView,
  type TreeDataItem,
  type TreeRenderItemParams,
  type TreeViewRef,
  AccordionTrigger,
  AccordionContent,
  TreeLeaf,
  TreeNode,
  TreeItem,
};
