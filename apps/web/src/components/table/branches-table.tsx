"use client";

import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
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
} from "@tanstack/react-table";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  MoreHorizontal,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { BranchDetailsDialog } from "@/components/table/branch-details-dialog";
import { CreateBranchDialog } from "@/components/table/create-branch-dialog";
import { FilterPopover } from "@/components/table/filter-popover";
import TableCellFirst from "@/components/table/table-cell-first";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useBranches } from "@/hooks/use-branches";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useDebouncedInput } from "@/hooks/use-debounced-input";
import type { Branch } from "@/lib/types";
import { cn } from "@/lib/utils";

const getStatusBadgeStyle = (isActive: boolean) => {
  return isActive
    ? "bg-green-500/10 text-green-500 border-green-500/60"
    : "bg-gray-500/10 text-gray-500 border-gray-500/60";
};

export const columns: ColumnDef<Branch>[] = [
  {
    accessorKey: "name",
    header: () => {
      return <span className="pl-1">Branch</span>;
    },
    cell: ({ row }) => <TableCellFirst>{row.getValue("name")}</TableCellFirst>,
    filterFn: (row, _id, value) => {
      const name = row.getValue("name") as string;
      return name.toLowerCase().includes(value.toLowerCase());
    },
  },
  {
    accessorKey: "address",
    header: () => <span>Address</span>,
    cell: ({ row }) => (
      <div className="max-w-48 truncate" title={row.getValue("address")}>
        {row.getValue("address")}
      </div>
    ),
  },
  {
    accessorKey: "phoneNumber",
    header: () => <span>Phone</span>,
    cell: ({ row }) => <div>{row.getValue("phoneNumber")}</div>,
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => {
      const statusFilterOptions = [
        { label: "All", value: "all" },
        { label: "Active", value: "true" },
        { label: "Inactive", value: "false" },
      ];

      const currentFilter = column.getFilterValue() as string | undefined;

      return (
        <div className="flex items-center justify-center">
          <FilterPopover
            label="Status"
            options={statusFilterOptions}
            currentValue={currentFilter}
            onChange={(value) => column.setFilterValue(value)}
          />
        </div>
      );
    },
    filterFn: (row, id, value) => {
      const rowValue = row.getValue(id) as boolean;
      return String(rowValue) === value;
    },
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as boolean;
      return (
        <div className="text-center">
          <Badge
            className={cn(
              "w-16 rounded-sm text-center",
              getStatusBadgeStyle(isActive),
            )}
            variant={"outline"}
          >
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "isDeleted",
    header: ({ column }) => {
      const deletedFilterOptions = [
        { label: "All", value: "all" },
        { label: "Active", value: "false" },
        { label: "Deleted", value: "true" },
      ];

      const currentFilter = column.getFilterValue() as string | undefined;

      return (
        <div className="flex items-center justify-center">
          <FilterPopover
            label="Deleted"
            options={deletedFilterOptions}
            currentValue={currentFilter}
            onChange={(value) => column.setFilterValue(value)}
          />
        </div>
      );
    },
    filterFn: (row, id, value) => {
      const rowValue = row.getValue(id) as boolean;
      return String(rowValue) === value;
    },
    cell: ({ row }) => {
      const isDeleted = row.getValue("isDeleted") as boolean;
      return (
        <div className="text-center">
          <Badge
            className={cn(
              "w-16 rounded-sm text-center",
              isDeleted
                ? "border-red-500/60 bg-red-500/10 text-red-500"
                : "border-green-500/60 bg-green-500/10 text-green-500",
            )}
            variant={"outline"}
          >
            {isDeleted ? "Yes" : "No"}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "_creationTime",
    header: ({ column }) => {
      const sortOptions = [
        { label: "Default", value: "default" },
        { label: "Ascending", value: "asc" },
        { label: "Descending", value: "desc" },
      ];

      const currentSort = column.getIsSorted();
      const currentValue = currentSort ? String(currentSort) : "default";

      return (
        <div className="flex items-center justify-end">
          <FilterPopover
            label="Created At"
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
      const timestamp = row.getValue("_creationTime") as number;
      const formatted = new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }).format(new Date(timestamp));

      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    id: "actions",
    header: "Action",
    enableHiding: false,
    cell: function ActionsCell({ row }) {
      const branch = row.original;
      const [detailsOpen, setDetailsOpen] = React.useState(false);

      const { mutate: deactivate } = useMutation({
        mutationFn: useConvexMutation(api.branches.deactivateBranch),
      });

      const { mutate: updateBranch } = useMutation({
        mutationFn: useConvexMutation(api.branches.updateBranch),
      });

      const handleDeactivate = () => {
        deactivate(
          { id: branch._id },
          {
            onSuccess: () => {
              toast.success(`Branch "${branch.name}" deactivated`);
            },
            onError: (error) => {
              toast.error(
                error instanceof Error ? error.message : "Failed to deactivate",
              );
            },
          },
        );
      };

      const handleReactivate = () => {
        updateBranch(
          { id: branch._id, isActive: true },
          {
            onSuccess: () => {
              toast.success(`Branch "${branch.name}" reactivated`);
            },
            onError: (error) => {
              toast.error(
                error instanceof Error ? error.message : "Failed to reactivate",
              );
            },
          },
        );
      };

      return (
        <div className="flex justify-end pr-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size={"icon-sm"}>
                <span className="sr-only">Open menu</span>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDetailsOpen(true)}>
                Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {branch.isActive ? (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={handleDeactivate}
                >
                  Deactivate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleReactivate}>
                  Reactivate
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <BranchDetailsDialog
            branch={branch}
            open={detailsOpen}
            onOpenChange={setDetailsOpen}
          />
        </div>
      );
    },
  },
];

export function BranchesTable() {
  const { organizationId } = useCurrentUser();

  const { data: branches, isLoading } = useBranches({
    organizationId: organizationId as Id<"organizations"> | undefined,
    includeDeleted: true,
  });

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [rowSelection, setRowSelection] = React.useState({});

  const [setFilterValue, instantFilterValue, debouncedFilterValue] =
    useDebouncedInput("", 300);

  const table = useReactTable({
    data: branches ?? [],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  });

  React.useEffect(() => {
    table.getColumn("name")?.setFilterValue(debouncedFilterValue);
  }, [debouncedFilterValue, table]);

  const activeFiltersCount =
    sorting.length + columnFilters.length + (instantFilterValue ? 1 : 0);

  const handleClearAllFilters = () => {
    table.resetColumnFilters();
    table.resetSorting();
    setFilterValue("");
  };

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-muted-foreground">Loading branches...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-row justify-between pb-4">
        <InputGroup className="max-w-60">
          <InputGroupInput
            placeholder="Search by branch name..."
            value={instantFilterValue}
            onChange={(event) => setFilterValue(event.target.value)}
          />
          <InputGroupAddon>
            <Filter />
          </InputGroupAddon>
        </InputGroup>
        <div className="flex items-center gap-2">
          {activeFiltersCount >= 2 && (
            <Button
              variant={"default"}
              className=""
              onClick={handleClearAllFilters}
            >
              Clear filters ({activeFiltersCount})
            </Button>
          )}
          <CreateBranchDialog />
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
                  No branches found.
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
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
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
