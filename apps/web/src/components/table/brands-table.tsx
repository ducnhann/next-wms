"use client";

import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { api } from "@wms/backend/convex/_generated/api";

import {
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
import { ImportExcelButtonBrands } from "@/components/import-excel-button-brands";
import { FilterPopover } from "@/components/table/filter-popover";
import TableCellFirst from "@/components/table/table-cell-first";
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
import type { BrandWithProductCount } from "@/lib/types";

// CreateBrandDialog component
function CreateBrandDialog() {
  const { organizationId } = useCurrentUser();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: useConvexMutation(api.brands.createBrand),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !organizationId) return;

    mutate(
      { name: name.trim(), organizationId },
      {
        onSuccess: () => {
          toast.success(`Brand "${name}" created successfully`);
          setName("");
          setOpen(false);
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : "Failed to create brand",
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
            <DialogTitle>Create New Brand</DialogTitle>
            <DialogDescription>
              Add a new brand to your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Brand Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter brand name..."
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

// EditBrandDialog component
function EditBrandDialog({
  brand,
  open,
  onOpenChange,
}: {
  brand: BrandWithProductCount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = React.useState(brand.name);

  const { mutate, isPending } = useMutation({
    mutationFn: useConvexMutation(api.brands.updateBrand),
  });

  React.useEffect(() => {
    setName(brand.name);
  }, [brand.name]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    mutate(
      { id: brand._id, name: name.trim() },
      {
        onSuccess: () => {
          toast.success(`Brand renamed to "${name}"`);
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : "Failed to update brand",
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
            <DialogTitle>Edit Brand</DialogTitle>
            <DialogDescription>Update the brand name.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Brand Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter brand name..."
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
function ActionsCell({ brand }: { brand: BrandWithProductCount }) {
  const [editOpen, setEditOpen] = React.useState(false);

  const { mutate: deactivate } = useMutation({
    mutationFn: useConvexMutation(api.brands.deactivateBrand),
  });

  const { mutate: updateBrand } = useMutation({
    mutationFn: useConvexMutation(api.brands.updateBrand),
  });

  const handleDeactivate = () => {
    deactivate(
      { id: brand._id },
      {
        onSuccess: () => {
          toast.success(`Brand "${brand.name}" deactivated`);
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : "Failed to deactivate",
          );
        },
      },
    );
  };

  const handleActivate = () => {
    updateBrand(
      { id: brand._id, isActive: true },
      {
        onSuccess: () => {
          toast.success(`Brand "${brand.name}" activated`);
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : "Failed to activate",
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
            <DropdownMenuSeparator />
            {brand.isActive ? (
              <DropdownMenuItem
                className="text-destructive"
                onClick={handleDeactivate}
              >
                Deactivate
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className="text-green-600"
                onClick={handleActivate}
              >
                Activate
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <EditBrandDialog
        brand={brand}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}

export const columns: ColumnDef<BrandWithProductCount>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      const sortOptions = [
        { label: "Default", value: "default" },
        { label: "Ascending", value: "asc" },
        { label: "Descending", value: "desc" },
      ];

      const currentSort = column.getIsSorted();
      const currentValue = currentSort ? String(currentSort) : "default";

      return (
        <div className="flex items-center">
          <FilterPopover
            label="Name"
            options={sortOptions}
            currentValue={currentValue}
            onChange={(value) => {
              if (value === "default" || !value) {
                column.clearSorting();
              } else {
                column.toggleSorting(value === "desc", false);
              }
            }}
            isSort
          />
        </div>
      );
    },
    cell: ({ row }) => <TableCellFirst>{row.getValue("name")}</TableCellFirst>,
  },
  {
    accessorKey: "productCount",
    header: ({ column }) => {
      const sortOptions = [
        { label: "Default", value: "default" },
        { label: "Ascending", value: "asc" },
        { label: "Descending", value: "desc" },
      ];

      const currentSort = column.getIsSorted();
      const currentValue = currentSort ? String(currentSort) : "default";

      return (
        <div className="flex items-center justify-center">
          <FilterPopover
            label="Product count"
            options={sortOptions}
            currentValue={currentValue}
            onChange={(value) => {
              if (value === "default" || !value) {
                column.clearSorting();
              } else {
                column.toggleSorting(value === "desc", false);
              }
            }}
            isSort
          />
        </div>
      );
    },
    cell: ({ row }) => {
      const count = row.getValue("productCount") as number;
      return <div className="text-center">{count}</div>;
    },
  },
  {
    id: "actions",
    header: () => {
      return (
        <div className="text-right">
          <span className="font-medium">Action</span>
        </div>
      );
    },
    enableHiding: false,
    cell: ({ row }) => {
      return <ActionsCell brand={row.original} />;
    },
  },
];

export function BrandsTable() {
  const { organizationId } = useCurrentUser();

  const { data: brands, isLoading } = useQuery({
    ...convexQuery(api.brands.listBrandsWithProductCount, {
      organizationId: organizationId as string,
    }),
    enabled: !!organizationId,
  });

  // State for filtering and sorting
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  // Debounced search input
  const [setFilterValue, instantFilterValue, debouncedFilterValue] =
    useDebouncedInput("", 300);

  const table = useReactTable({
    data: brands ?? [],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  // Apply debounced filter to name column
  React.useEffect(() => {
    table.getColumn("name")?.setFilterValue(debouncedFilterValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFilterValue, table]);

  // Calculate active filters count
  const activeFiltersCount =
    sorting.length + columnFilters.length + (instantFilterValue ? 1 : 0);

  // Handler to clear all filters
  const handleClearAllFilters = () => {
    table.resetColumnFilters();
    table.resetSorting();
    setFilterValue("");
  };

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-muted-foreground">Loading brands...</p>
      </div>
    );
  }

  const totalBrands = brands?.length ?? 0;

  return (
    <div className="w-full">
      <div className="flex flex-row justify-between pb-4">
        {/* Search Input */}
        <InputGroup className="max-w-50">
          <InputGroupInput
            placeholder="Filter brands by name..."
            value={instantFilterValue}
            onChange={(event) => setFilterValue(event.target.value)}
          />
          <InputGroupAddon>
            <Filter />
          </InputGroupAddon>
        </InputGroup>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Clear Filters Button */}
          {activeFiltersCount >= 2 && (
            <Button variant="default" onClick={handleClearAllFilters}>
              Clear filters ({activeFiltersCount})
            </Button>
          )}

          {/* Column Visibility Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Settings2 className="mr-1 size-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuItem
                      key={column.id}
                      className="capitalize"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Checkbox
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                        className="mr-2"
                      />
                      {column.id}
                    </DropdownMenuItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Import Excel Button */}
          <ImportExcelButtonBrands />

          {/* Create Brand Button */}
          <CreateBrandDialog />
        </div>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table className="bg-card">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No brands found.
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
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger size="sm" className="w-20" id="rows-per-page">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
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
            Showing {table.getRowModel().rows.length} brand(s) of {totalBrands}{" "}
            total
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.firstPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.lastPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
