"use client";

import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Doc, Id } from "@wms/backend/convex/_generated/dataModel";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  MoreHorizontal,
  Plus,
  Settings2,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { ImportExcelButtonCategories } from "@/components/import-excel-button-categories";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useDebouncedInput } from "@/hooks/use-debounced-input";

// Category type with hierarchy
export type CategoryItem = Doc<"categories"> & {
  children?: CategoryItem[];
};

// CreateCategoryDialog component
function CreateCategoryDialog() {
  const { organizationId } = useCurrentUser();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: useConvexMutation(api.categories.create),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !organizationId) return;

    mutate(
      {
        name: name.trim(),
        organizationId,
        isActive: true,
      },
      {
        onSuccess: () => {
          toast.success(`Category "${name}" created successfully`);
          setName("");
          setOpen(false);
        },
        onError: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to create category",
          );
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Add New
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Add a new category to your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter category name..."
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// CreateSubcategoryDialog component
function CreateSubcategoryDialog({
  parentCategory,
  open,
  onOpenChange,
}: {
  parentCategory: CategoryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { organizationId } = useCurrentUser();
  const [name, setName] = React.useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: useConvexMutation(api.categories.create),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !organizationId) return;

    mutate(
      {
        name: name.trim(),
        organizationId,
        parentPath: parentCategory.path,
        isActive: true,
      },
      {
        onSuccess: () => {
          toast.success(
            `Subcategory "${name}" created under "${parentCategory.name}"`,
          );
          setName("");
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to create subcategory",
          );
        },
      },
    );
  };

  React.useEffect(() => {
    if (!open) setName("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Subcategory</DialogTitle>
            <DialogDescription>
              Add a new subcategory under "{parentCategory.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="sub-name">Subcategory Name</Label>
              <Input
                id="sub-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter subcategory name..."
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// EditCategoryDialog component
function EditCategoryDialog({
  category,
  open,
  onOpenChange,
}: {
  category: CategoryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = React.useState(category.name);

  const { mutate, isPending } = useMutation({
    mutationFn: useConvexMutation(api.categories.update),
  });

  React.useEffect(() => {
    setName(category.name);
  }, [category.name]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    mutate(
      { id: category._id, name: name.trim() },
      {
        onSuccess: () => {
          toast.success(`Category renamed to "${name}"`);
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to update category",
          );
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update the category name.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Category Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter category name..."
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Actions Cell Component
function ActionsCell({ category }: { category: CategoryItem }) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [addSubOpen, setAddSubOpen] = React.useState(false);

  const { mutate: deleteCategory } = useMutation({
    mutationFn: useConvexMutation(api.categories.remove),
  });

  const { mutate: updateCategory } = useMutation({
    mutationFn: useConvexMutation(api.categories.update),
  });

  const handleDelete = () => {
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) return;

    deleteCategory(
      { id: category._id },
      {
        onSuccess: () => {
          toast.success(`Category "${category.name}" deleted`);
        },
        onError: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to delete category",
          );
        },
      },
    );
  };

  const handleToggleActive = () => {
    updateCategory(
      { id: category._id, isActive: !category.isActive },
      {
        onSuccess: () => {
          toast.success(
            `Category "${category.name}" ${category.isActive ? "deactivated" : "activated"}`,
          );
        },
        onError: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to update category",
          );
        },
      },
    );
  };

  return (
    <>
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              Edit name
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAddSubOpen(true)}>
              Add subcategory
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {category.isActive ? (
              <DropdownMenuItem
                className="text-destructive"
                onClick={handleToggleActive}
              >
                Deactivate
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className="text-green-600"
                onClick={handleToggleActive}
              >
                Activate
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={handleDelete}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <EditCategoryDialog
        category={category}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <CreateSubcategoryDialog
        parentCategory={category}
        open={addSubOpen}
        onOpenChange={setAddSubOpen}
      />
    </>
  );
}

// CategoryRow Component with expand/collapse for subcategories
function CategoryRow({
  category,
  level = 0,
  columnVisibility,
}: {
  category: CategoryItem;
  level?: number;
  columnVisibility: { path: boolean };
}) {
  const hasChildren = category.children && category.children.length > 0;
  const [isExpanded, setIsExpanded] = React.useState(false);

  const toggleExpand = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <>
      <TableRow>
        <TableCell
          onClick={toggleExpand}
          className={hasChildren ? "cursor-pointer" : ""}
        >
          <div
            className="flex items-center"
            style={{ paddingLeft: `${level * 24}px` }}
          >
            {hasChildren ? (
              <Button
                variant="ghost"
                size="icon-sm"
                className="mr-1 h-5 w-5"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand();
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            ) : (
              <span className="mr-1 inline-block w-5" />
            )}
            <span className="font-medium">{category.name}</span>
            {!category.isActive && (
              <span className="ml-2 text-muted-foreground text-xs">
                (Inactive)
              </span>
            )}
          </div>
        </TableCell>
        {columnVisibility.path && (
          <TableCell>
            <div className="text-muted-foreground text-sm">{category.path}</div>
          </TableCell>
        )}
        <TableCell>
          <ActionsCell category={category} />
        </TableCell>
      </TableRow>
      {hasChildren &&
        isExpanded &&
        category.children?.map((child) => (
          <CategoryRow
            key={child._id}
            category={child}
            level={level + 1}
            columnVisibility={columnVisibility}
          />
        ))}
    </>
  );
}

export function CategoriesTable() {
  const { organizationId } = useCurrentUser();

  const { data: categories, isLoading } = useQuery({
    ...convexQuery(api.categories.getTree, {
      organizationId: organizationId as Id<"organizations">,
    }),
    enabled: !!organizationId,
  });

  // Build hierarchical structure from flat list
  const buildTree = (items: CategoryItem[]): CategoryItem[] => {
    if (!items) return [];

    const itemMap = new Map<string, CategoryItem>();
    const rootItems: CategoryItem[] = [];

    // First pass: create map of all items
    items.forEach((item) => {
      itemMap.set(item.path, { ...item, children: [] });
    });

    // Second pass: build tree
    items.forEach((item) => {
      const categoryItem = itemMap.get(item.path) as CategoryItem;
      const pathParts = item.path.split(".");

      if (pathParts.length === 1) {
        // Root level
        rootItems.push(categoryItem);
      } else {
        // Find parent
        const parentPath = pathParts.slice(0, -1).join(".");
        const parent = itemMap.get(parentPath);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(categoryItem);
        }
      }
    });

    return rootItems;
  };

  const hierarchicalCategories = buildTree(categories ?? []);

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);

  // Search filtering
  const [setFilterValue, instantFilterValue, debouncedFilterValue] =
    useDebouncedInput("", 300);

  // Column visibility
  const [columnVisibility, setColumnVisibility] = React.useState({
    path: true,
  });

  // Filter categories by name
  const filteredCategories = React.useMemo(() => {
    if (!debouncedFilterValue) return hierarchicalCategories;
    const lowerFilter = debouncedFilterValue.toLowerCase();
    return hierarchicalCategories.filter((cat) =>
      cat.name.toLowerCase().includes(lowerFilter),
    );
  }, [hierarchicalCategories, debouncedFilterValue]);

  // Paginate root categories only
  const totalPages = Math.ceil(filteredCategories.length / pageSize);
  const paginatedCategories = filteredCategories.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );

  const canPreviousPage = currentPage > 0;
  const canNextPage = currentPage < totalPages - 1;

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-muted-foreground">Loading categories...</p>
      </div>
    );
  }

  const totalRootCategories = filteredCategories.length;

  return (
    <div className="w-full">
      <div className="flex flex-row justify-between pb-4">
        {/* Search Input */}
        <InputGroup className="max-w-50">
          <InputGroupInput
            placeholder="Filter categories by name..."
            value={instantFilterValue}
            onChange={(event) => setFilterValue(event.target.value)}
          />
          <InputGroupAddon>
            <Filter />
          </InputGroupAddon>
        </InputGroup>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Column Visibility Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Settings2 className="mr-1 size-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="capitalize"
                onSelect={(e) => e.preventDefault()}
              >
                <Checkbox
                  checked={columnVisibility.path}
                  onCheckedChange={(value) =>
                    setColumnVisibility({ ...columnVisibility, path: !!value })
                  }
                  className="mr-2"
                />
                Path
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Import Excel Button */}
          <ImportExcelButtonCategories />

          {/* Create Category Button */}
          <CreateCategoryDialog />
        </div>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table className="bg-card">
          <TableHeader>
            <TableRow>
              <TableHead>
                <span className="font-medium">Name</span>
              </TableHead>
              {columnVisibility.path && (
                <TableHead>
                  <span className="font-medium">Path</span>
                </TableHead>
              )}
              <TableHead className="text-right">
                <span className="font-medium">Action</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCategories.length ? (
              paginatedCategories.map((category) => (
                <CategoryRow
                  key={category._id}
                  category={category}
                  columnVisibility={columnVisibility}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  No categories found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="Showing" className="font-medium text-sm">
            Showing
          </Label>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setCurrentPage(0);
            }}
          >
            <SelectTrigger size="sm" className="w-20" id="rows-per-page">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 40, 50].map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label htmlFor="per-page" className="font-medium text-sm">
            per page
          </Label>
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="flex w-fit items-center justify-center font-medium text-sm">
            Showing {paginatedCategories.length} category(s) of{" "}
            {totalRootCategories} total
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setCurrentPage(0)}
              disabled={!canPreviousPage}
            >
              <ChevronsLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={!canPreviousPage}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!canNextPage}
            >
              <ChevronRight />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setCurrentPage(totalPages - 1)}
              disabled={!canNextPage}
            >
              <ChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
