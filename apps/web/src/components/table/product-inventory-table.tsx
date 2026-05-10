"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
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
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Filter,
  Loader2,
  MapPin,
  MoreHorizontal,
  Package,
  PackageX,
} from "lucide-react";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { FilterPopover } from "@/components/table/filter-popover";
import TableCellFirst from "@/components/table/table-cell-first";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBranches } from "@/hooks/use-branches";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";

// Type for product inventory item
export type ProductInventoryItem = {
  _id: Id<"products">;
  name: string;
  description: string;
  categoryId: Id<"categories">;
  categoryName: string;
  brandId: Id<"brands">;
  brandName: string;
  variantCount: number;
  totalQuantity: number;
  totalBatchCount: number;
  reorderPoint: number;
  stockStatus: "in_stock" | "low_stock" | "out_of_stock";
  isActive: boolean;
  locations: string[];
  variants: Array<{
    variantId: string;
    skuCode: string;
    description: string;
    quantity: number;
    batchCount: number;
    costPrice: number;
    sellingPrice: number;
    locations: string[];
  }>;
  shelfLifeDays?: number;
};

// Stock status filter options
const stockStatusFilterOptions = [
  { label: "In Stock", value: "in_stock" },
  { label: "Low Stock", value: "low_stock" },
  { label: "Out of Stock", value: "out_of_stock" },
];

interface ProductInventoryTableProps {
  onViewDetails?: (productId: Id<"products">) => void;
}

export function ProductInventoryTable({
  onViewDetails,
}: ProductInventoryTableProps) {
  const router = useRouter();
  const params = useParams();
  const workspace = params.workspace as string;

  const { organizationId } = useCurrentUser();
  const { currentBranch } = useBranches({ organizationId });

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [stockStatusFilter, setStockStatusFilter] = React.useState<string[]>(
    [],
  );

  // Fetch product inventory data
  const { data: products, isLoading } = useQuery({
    ...convexQuery(
      api.products.getProductInventoryList,
      organizationId
        ? {
            organizationId: organizationId as Id<"organizations">,
            branchId: currentBranch?._id as Id<"branches"> | undefined,
            stockStatus:
              stockStatusFilter.length === 1
                ? (stockStatusFilter[0] as
                    | "in_stock"
                    | "low_stock"
                    | "out_of_stock")
                : "all",
            searchTerm: globalFilter || undefined,
          }
        : "skip",
    ),
    enabled: !!organizationId,
  });

  // Fetch categories for filter
  // const { data: categories } = useQuery({
  //   ...convexQuery(
  //     api.categories.getTree,
  //     organizationId
  //       ? {
  //           organizationId: organizationId as Id<"organizations">,
  //         }
  //       : "skip",
  //   ),
  //   enabled: !!organizationId,
  // });

  // Fetch brands for filter
  // const { data: brands } = useQuery({
  //   ...convexQuery(
  //     api.brands.listAll,
  //     organizationId
  //       ? {
  //           organizationId: organizationId as string,
  //         }
  //       : "skip",
  //   ),
  //   enabled: !!organizationId,
  // });

  // const categoryFilterOptions = React.useMemo(() => {
  //   if (!categories) return [];
  //   return categories.map((c) => ({ label: c.name, value: c._id }));
  // }, [categories]);

  // const brandFilterOptions = React.useMemo(() => {
  //   if (!brands) return [];
  //   return brands.map((b) => ({ label: b.name, value: b._id }));
  // }, [brands]);

  const handleViewDetails = React.useCallback(
    (productId: Id<"products">) => {
      router.push(`/${workspace}/inventory/products/${productId}` as Route);
      onViewDetails?.(productId);
    },
    [router, workspace, onViewDetails],
  );

  const getStockStatusBadge = (status: string) => {
    switch (status) {
      case "in_stock":
        return (
          <Badge
            variant="outline"
            className="border-green-500/60 bg-green-500/10 text-green-600"
          >
            <Package className="mr-1 h-3 w-3" />
            In Stock
          </Badge>
        );
      case "low_stock":
        return (
          <Badge
            variant="outline"
            className="border-yellow-500/60 bg-yellow-500/10 text-yellow-600"
          >
            <AlertTriangle className="mr-1 h-3 w-3" />
            Low Stock
          </Badge>
        );
      case "out_of_stock":
        return (
          <Badge
            variant="outline"
            className="border-red-500/60 bg-red-500/10 text-red-600"
          >
            <PackageX className="mr-1 h-3 w-3" />
            Out of Stock
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const columns: ColumnDef<ProductInventoryItem>[] = [
    {
      accessorKey: "name",
      header: "Product Name",
      cell: ({ row }) => (
        <TableCellFirst className="font-medium">
          {row.getValue("name")}
        </TableCellFirst>
      ),
    },
    {
      accessorKey: "categoryName",
      header: "Category",
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue("categoryName")}</span>
      ),
    },
    {
      accessorKey: "brandName",
      header: "Brand",
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue("brandName")}</span>
      ),
    },
    {
      accessorKey: "variantCount",
      header: "Variants",
      cell: ({ row }) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help text-sm">
              {row.getValue("variantCount")} SKU(s)
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              {row.original.variants.slice(0, 5).map((v) => (
                <div key={v.variantId}>
                  {v.skuCode}: {v.quantity} units
                </div>
              ))}
              {row.original.variants.length > 5 && (
                <div className="text-muted-foreground">
                  +{row.original.variants.length - 5} more...
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      accessorKey: "totalQuantity",
      header: "Total Qty",
      cell: ({ row }) => {
        const qty = row.getValue("totalQuantity") as number;
        const reorderPoint = row.original.reorderPoint;
        return (
          <span
            className={cn(
              "font-medium text-sm",
              qty === 0
                ? "text-red-600"
                : qty <= reorderPoint
                  ? "text-yellow-600"
                  : "text-foreground",
            )}
          >
            {qty.toLocaleString()}
          </span>
        );
      },
    },
    {
      accessorKey: "totalBatchCount",
      header: "Batches",
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue("totalBatchCount")}</span>
      ),
    },
    {
      accessorKey: "locations",
      header: "Locations",
      cell: ({ row }) => {
        const locations = row.getValue("locations") as string[];
        if (locations.length === 0) {
          return <span className="text-muted-foreground text-sm">-</span>;
        }
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex cursor-help items-center gap-1">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm">
                  {locations.length} zone{locations.length > 1 ? "s" : ""}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                {locations.map((loc) => (
                  <div key={loc}>{loc}</div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      accessorKey: "stockStatus",
      header: "Status",
      cell: ({ row }) => getStockStatusBadge(row.getValue("stockStatus")),
      filterFn: (row, id, filterValue) => {
        if (!filterValue || filterValue.length === 0) return true;
        const status = row.getValue(id) as string;
        return filterValue.includes(status);
      },
    },
    {
      accessorKey: "reorderPoint",
      header: "Reorder Point",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.getValue("reorderPoint")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => {
        const product = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(product._id)}
              >
                Copy Product ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleViewDetails(product._id)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Filter data based on stock status
  const filteredData = React.useMemo(() => {
    if (!products) return [];
    if (stockStatusFilter.length === 0) return products;
    return products.filter((item) =>
      stockStatusFilter.includes(item.stockStatus),
    );
  }, [products, stockStatusFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <InputGroup className="max-w-sm">
          <InputGroupAddon align="inline-start">
            <Filter className="h-4 w-4" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search by product name or SKU..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </InputGroup>

        <div className="flex items-center gap-2">
          <FilterPopover
            label="Stock Status"
            options={stockStatusFilterOptions}
            currentValue={stockStatusFilter}
            onChange={(value) =>
              setStockStatusFilter(Array.isArray(value) ? value : [])
            }
            variant="multi-select"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Columns <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table className="bg-card">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading products...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewDetails(row.original._id)}
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

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label htmlFor="rows-per-page" className="font-medium text-sm">
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
          <Label className="font-medium text-sm">per page</Label>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground text-sm">
            {table.getFilteredRowModel().rows.length} product(s) total
          </span>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
