"use client";

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
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Edit,
  Filter,
  MoreHorizontal,
  Settings2,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ImportExcelButtonProducts } from "@/components/import-excel-button-products";
import { CreateProductDialog } from "@/components/products/create-product-dialog";
import { DeleteProductDialog } from "@/components/products/delete-product-dialog";
import { EditProductDialog } from "@/components/products/edit-product-dialog";
import { FilterPopover } from "@/components/table/filter-popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { type ProductListItem, useProductsList } from "@/hooks/use-products";

// Product table item type - flattened view showing one row per variant
export type ProductTableItem = {
  _id: string;
  productId: string;
  variantId: string;
  barcode: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  variantDescription: string;
  storageRequirement: string;
  trackingMethod: string;
  isActive: boolean;
};

// Actions Cell Component
function ActionsCell({
  product,
  onEdit,
  onDelete,
}: {
  product: ProductTableItem;
  onEdit: (productId: Id<"products">) => void;
  onDelete: (productId: Id<"products">, name: string) => void;
}) {
  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => onEdit(product.productId as Id<"products">)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit product
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() =>
              onDelete(product.productId as Id<"products">, product.name)
            }
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export const columns: ColumnDef<ProductTableItem>[] = [
  {
    accessorKey: "sku",
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
            label="SKU"
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
    cell: ({ row }) => (
      <div className="font-mono text-sm">{row.getValue("sku")}</div>
    ),
  },
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
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "category",
    header: () => <span className="font-medium">Category</span>,
    cell: ({ row }) => <div>{row.getValue("category") || "-"}</div>,
  },
  {
    accessorKey: "brand",
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
            label="Brand"
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
    cell: ({ row }) => <div>{row.getValue("brand") || "-"}</div>,
  },
  {
    accessorKey: "variantDescription",
    header: () => <span className="font-medium">Variant</span>,
    cell: ({ row }) => <div>{row.getValue("variantDescription") || "-"}</div>,
  },
  {
    accessorKey: "storageRequirement",
    header: () => <span className="font-medium">Storage</span>,
    cell: ({ row }) => <div>{row.getValue("storageRequirement") || "-"}</div>,
  },
  {
    accessorKey: "trackingMethod",
    header: () => <span className="font-medium">Tracking</span>,
    cell: ({ row }) => <div>{row.getValue("trackingMethod") || "-"}</div>,
  },
  {
    id: "actions",
    header: () => (
      <div className="text-right">
        <span className="font-medium">Action</span>
      </div>
    ),
    enableHiding: false,
    cell: () => null, // Will be overridden in component
  },
];

// Helper function to flatten products into table rows
function flattenProductsToTableItems(
  products: ProductListItem[],
): ProductTableItem[] {
  const items: ProductTableItem[] = [];

  for (const product of products) {
    const variants = product.variants ?? [];

    if (variants.length === 0) {
      // Product has no variants - show product without variant info
      items.push({
        _id: `${product._id}-no-variant`,
        productId: product._id,
        variantId: "",
        barcode: "",
        sku: "-",
        name: product.name,
        category: product.category?.name ?? "",
        brand: product.brand?.name ?? "",
        variantDescription: "-",
        storageRequirement: product.storageRequirement?.lookupValue ?? "",
        trackingMethod: product.trackingMethod?.lookupValue ?? "",
        isActive: product.isActive,
      });
    } else {
      // Create one row per variant
      for (const variant of variants) {
        const primaryBarcode = variant.barcodes?.[0]?.barcodeValue ?? "";

        items.push({
          _id: `${product._id}-${variant._id}`,
          productId: product._id,
          variantId: variant._id,
          barcode: primaryBarcode,
          sku: variant.skuCode,
          name: product.name,
          category: product.category?.name ?? "",
          brand: product.brand?.name ?? "",
          variantDescription: variant.description,
          storageRequirement: product.storageRequirement?.lookupValue ?? "",
          trackingMethod: product.trackingMethod?.lookupValue ?? "",
          isActive: product.isActive && variant.isActive,
        });
      }
    }
  }

  return items;
}

export function ProductsTable() {
  const { organizationId } = useCurrentUser();

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] =
    useState<Id<"products"> | null>(null);
  const [selectedProductName, setSelectedProductName] = useState("");

  // Fetch products from Convex
  const {
    products: rawProducts,
    isPending,
    error,
  } = useProductsList({
    organizationId: organizationId,
  });

  // Transform products to table items
  const products = useMemo(
    () => flattenProductsToTableItems(rawProducts as ProductListItem[]),
    [rawProducts],
  );

  // State for filtering and sorting
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // Debounced search input
  const [setFilterValue, instantFilterValue, debouncedFilterValue] =
    useDebouncedInput("", 300);

  // Handle edit
  const handleEdit = useCallback((productId: Id<"products">) => {
    setSelectedProductId(productId);
    setEditDialogOpen(true);
  }, []);

  // Handle delete
  const handleDelete = useCallback(
    (productId: Id<"products">, name: string) => {
      setSelectedProductId(productId);
      setSelectedProductName(name);
      setDeleteDialogOpen(true);
    },
    [],
  );

  // Dynamic columns with callbacks
  const tableColumns = useMemo(() => {
    return columns.map((col) => {
      if (col.id === "actions") {
        return {
          ...col,
          cell: ({ row }: { row: { original: ProductTableItem } }) => (
            <ActionsCell
              product={row.original}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ),
        };
      }
      return col;
    });
  }, [handleDelete, handleEdit]);

  const table = useReactTable({
    data: products ?? [],
    columns: tableColumns,
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

  // Apply debounced filter to SKU column
  useEffect(() => {
    table.getColumn("sku")?.setFilterValue(debouncedFilterValue);
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

  if (isPending) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-muted-foreground">Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-destructive">
          Error loading products: {error.message}
        </p>
      </div>
    );
  }

  const totalProducts = products?.length ?? 0;

  return (
    <div className="w-full">
      <div className="flex flex-row justify-between pb-4">
        {/* Search Input */}
        <InputGroup className="max-w-50">
          <InputGroupInput
            placeholder="Filter products by SKU..."
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
          <ImportExcelButtonProducts />

          {/* Create Product Button */}
          <CreateProductDialog />
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
                  No products found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="hidden items-center gap-2 lg:flex">
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
            Showing {table.getRowModel().rows.length} product(s) of{" "}
            {totalProducts} total
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

      {/* Edit Product Dialog */}
      <EditProductDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        productId={selectedProductId}
      />

      {/* Delete Product Dialog */}
      <DeleteProductDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        productId={selectedProductId}
        productName={selectedProductName}
      />
    </div>
  );
}
