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
import type { Doc, Id } from "@wms/backend/convex/_generated/dataModel";

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
import { ImportExcelButtonSuppliers } from "@/components/import-excel-button-suppliers";
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

// Supplier type for the table
export type SupplierTableItem = Doc<"suppliers"> & {
  brandName: string;
};

// CreateSupplierDialog component
function CreateSupplierDialog() {
  const { organizationId } = useCurrentUser();
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    defaultLeadTimeDays: 7,
    brandId: "",
  });

  // Fetch brands
  const { data: brands } = useQuery({
    ...convexQuery(api.brands.listBrandsWithProductCount, {
      organizationId: organizationId as Id<"organizations">,
    }),
    enabled: !!organizationId,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: useConvexMutation(api.suppliers.create),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.brandId ||
      !organizationId
    )
      return;

    // console.log("Creating supplier with brandId:", formData.brandId);

    mutate(
      {
        name: formData.name,
        contactPerson: formData.contactPerson,
        email: formData.email,
        phone: formData.phone,
        defaultLeadTimeDays: formData.defaultLeadTimeDays,
        brandId: formData.brandId as Id<"brands">,
        organizationId,
        isActive: true,
      },
      {
        onSuccess: () => {
          toast.success(`Supplier "${formData.name}" created successfully`);
          setFormData({
            name: "",
            contactPerson: "",
            email: "",
            phone: "",
            defaultLeadTimeDays: 7,
            brandId: "",
          });
          setOpen(false);
        },
        onError: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to create supplier",
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
            <DialogTitle>Create New Supplier</DialogTitle>
            <DialogDescription>
              Add a new supplier to your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Supplier Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter supplier name..."
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="brand-select">Brand *</Label>
              <Select
                value={formData.brandId}
                onValueChange={(value) =>
                  setFormData({ ...formData, brandId: value })
                }
                disabled={isPending}
              >
                <SelectTrigger id="brand-select">
                  <SelectValue placeholder="Select a brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands?.map((brand) => (
                    <SelectItem key={brand._id} value={brand._id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contactPerson">Contact Person *</Label>
              <Input
                id="contactPerson"
                value={formData.contactPerson}
                onChange={(e) =>
                  setFormData({ ...formData, contactPerson: e.target.value })
                }
                placeholder="Enter contact person name..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="supplier@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+84 123 456 789"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="leadTime">Lead Time (days) *</Label>
              <Input
                id="leadTime"
                type="number"
                value={formData.defaultLeadTimeDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultLeadTimeDays: Number(e.target.value),
                  })
                }
                placeholder="7"
                min="0"
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
            <Button
              type="submit"
              disabled={
                isPending ||
                !formData.name.trim() ||
                !formData.email.trim() ||
                !formData.brandId
              }
            >
              {isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// EditSupplierDialog component
function EditSupplierDialog({
  supplier,
  open,
  onOpenChange,
}: {
  supplier: SupplierTableItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { organizationId } = useCurrentUser();
  const [formData, setFormData] = React.useState({
    name: supplier.name,
    contactPerson: supplier.contactPerson,
    email: supplier.email,
    phone: supplier.phone,
    defaultLeadTimeDays: supplier.defaultLeadTimeDays,
    brandId: supplier.brandId as string,
  });

  // Fetch brands
  const { data: brands } = useQuery({
    ...convexQuery(api.brands.listBrandsWithProductCount, {
      organizationId: organizationId as Id<"organizations">,
    }),
    enabled: !!organizationId,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: useConvexMutation(api.suppliers.update),
  });

  React.useEffect(() => {
    setFormData({
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone,
      defaultLeadTimeDays: supplier.defaultLeadTimeDays,
      brandId: supplier.brandId as string,
    });
  }, [supplier]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.brandId)
      return;

    mutate(
      {
        id: supplier._id,
        ...formData,
        brandId: formData.brandId as Id<"brands">,
      },
      {
        onSuccess: () => {
          toast.success(`Supplier "${formData.name}" updated successfully`);
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to update supplier",
          );
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
            <DialogDescription>Update supplier information.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Supplier Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter supplier name..."
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-contactPerson">Contact Person *</Label>
              <Input
                id="edit-contactPerson"
                value={formData.contactPerson}
                onChange={(e) =>
                  setFormData({ ...formData, contactPerson: e.target.value })
                }
                placeholder="Enter contact person name..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="supplier@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Phone *</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+84 123 456 789"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-leadTime">Lead Time (days) *</Label>
              <Input
                id="edit-leadTime"
                type="number"
                value={formData.defaultLeadTimeDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultLeadTimeDays: Number(e.target.value),
                  })
                }
                placeholder="7"
                min="0"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-brand">Brand *</Label>
              <Select
                value={formData.brandId}
                onValueChange={(value) =>
                  setFormData({ ...formData, brandId: value })
                }
              >
                <SelectTrigger id="edit-brand">
                  <SelectValue placeholder="Select a brand..." />
                </SelectTrigger>
                <SelectContent>
                  {brands?.map((brand) => (
                    <SelectItem key={brand._id} value={brand._id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button
              type="submit"
              disabled={
                isPending || !formData.name.trim() || !formData.email.trim()
              }
            >
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Actions Cell Component
function ActionsCell({ supplier }: { supplier: SupplierTableItem }) {
  const [editOpen, setEditOpen] = React.useState(false);

  const { mutate: deleteSupplier } = useMutation({
    mutationFn: useConvexMutation(api.suppliers.remove),
  });

  const { mutate: updateSupplier } = useMutation({
    mutationFn: useConvexMutation(api.suppliers.update),
  });

  const handleDelete = () => {
    if (!confirm(`Are you sure you want to delete "${supplier.name}"?`)) return;

    deleteSupplier(
      { id: supplier._id },
      {
        onSuccess: () => {
          toast.success(`Supplier "${supplier.name}" deleted`);
        },
        onError: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to delete supplier",
          );
        },
      },
    );
  };

  const handleToggleActive = () => {
    updateSupplier(
      { id: supplier._id, isActive: !supplier.isActive },
      {
        onSuccess: () => {
          toast.success(
            `Supplier "${supplier.name}" ${supplier.isActive ? "deactivated" : "activated"}`,
          );
        },
        onError: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to update supplier",
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
              Edit supplier
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {supplier.isActive ? (
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
      <EditSupplierDialog
        supplier={supplier}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}

export const columns: ColumnDef<SupplierTableItem>[] = [
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
    accessorKey: "brandName",
    header: () => <span className="font-medium">Brand</span>,
    cell: ({ row }) => {
      const brandName = row.getValue("brandName") as string;
      return brandName ? (
        <span>{brandName}</span>
      ) : (
        <span className="text-muted-foreground text-sm">N/A</span>
      );
    },
  },
  {
    accessorKey: "contactPerson",
    header: () => <span className="font-medium">Contact Person</span>,
    cell: ({ row }) => <div>{row.getValue("contactPerson")}</div>,
  },
  {
    accessorKey: "email",
    header: () => <span className="font-medium">Email</span>,
    cell: ({ row }) => (
      <div className="text-muted-foreground text-sm">
        {row.getValue("email")}
      </div>
    ),
  },
  {
    accessorKey: "phone",
    header: () => <span className="font-medium">Phone</span>,
    cell: ({ row }) => (
      <div className="text-muted-foreground text-sm">
        {row.getValue("phone")}
      </div>
    ),
  },
  {
    accessorKey: "defaultLeadTimeDays",
    header: () => (
      <div className="text-center">
        <span className="font-medium">Lead Time</span>
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        {row.getValue("defaultLeadTimeDays")} days
      </div>
    ),
  },
  {
    id: "actions",
    header: () => (
      <div className="text-right">
        <span className="font-medium">Action</span>
      </div>
    ),
    enableHiding: false,
    cell: ({ row }) => {
      return <ActionsCell supplier={row.original} />;
    },
  },
];

export function SuppliersTable() {
  const { organizationId } = useCurrentUser();

  const { data: suppliers, isLoading } = useQuery({
    ...convexQuery(api.suppliers.getActive, {
      organizationId: organizationId as Id<"organizations">,
    }),
    enabled: !!organizationId,
  });

  React.useEffect(() => {
    if (suppliers) {
      // console.log("=== SUPPLIERS DATA ===");
      // console.log("Total suppliers:", suppliers.length);
      // suppliers.forEach((s, idx) => {
      //   console.log(`Supplier ${idx + 1}:`, {
      //     name: s.name,
      //     brandId: s.brandId,
      //     brandName: s.brandName || "<<< MISSING >>>",
      //     fullData: s,
      //   });
      // });
    }
  }, [suppliers]);

  // State for filtering and sorting
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [setFilterValue, instantFilterValue, debouncedFilterValue] =
    useDebouncedInput("", 300);

  const table = useReactTable({
    data: suppliers ?? [],
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
        <p className="text-muted-foreground">Loading suppliers...</p>
      </div>
    );
  }

  const totalSuppliers = suppliers?.length ?? 0;

  return (
    <div className="w-full">
      <div className="flex flex-row justify-between pb-4">
        {/* Search Input */}
        <InputGroup className="max-w-50">
          <InputGroupInput
            placeholder="Filter suppliers by name..."
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
          <ImportExcelButtonSuppliers />

          {/* Create Supplier Button */}
          <CreateSupplierDialog />
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
                  No suppliers found.
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
            Showing {table.getRowModel().rows.length} supplier(s) of{" "}
            {totalSuppliers} total
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
