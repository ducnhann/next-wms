"use client";

import { useQueryClient } from "@tanstack/react-query";
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
import { InviteUserDialog } from "@/components/settings/invite-user-dialog";
import { FilterPopover } from "@/components/table/filter-popover";
import TableCellFirst from "@/components/table/table-cell-first";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useDebouncedInput } from "@/hooks/use-debounced-input";
import { useMembers } from "@/hooks/use-members";
import { authClient, useActiveOrganization } from "@/lib/auth/client";
import type { Member } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

const getRoleBadgeStyle = (role: string) => {
  switch (role.toLowerCase()) {
    case "owner":
      return "bg-purple-500/10 text-purple-500 border-purple-500/60";
    case "admin":
      return "bg-blue-500/10 text-blue-500 border-blue-500/60";
    case "member":
      return "bg-green-500/10 text-green-500 border-green-500/60";
    default:
      return "bg-gray-500/10 text-gray-500 border-gray-500/60";
  }
};

const getInitials = (name: string | null | undefined) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export function MembersTable() {
  const { data: activeOrg } = useActiveOrganization();
  const { data: membersData, isLoading } = useMembers({
    organizationId: activeOrg?.id,
  });

  const members = membersData?.members ?? [];

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );

  const [rowSelection, setRowSelection] = React.useState({});

  const [setFilterValue, instantFilterValue, debouncedFilterValue] =
    useDebouncedInput("", 300);

  const queryClient = useQueryClient();
  const [removeDialogOpen, setRemoveDialogOpen] = React.useState(false);
  const [memberToRemove, setMemberToRemove] = React.useState<Member | null>(
    null,
  );

  const handleRemoveMember = async () => {
    if (!memberToRemove || !activeOrg?.id) return;

    try {
      const { data, error } = await authClient.organization.removeMember({
        memberIdOrEmail: memberToRemove.user?.email ?? "",
        organizationId: activeOrg.id,
      });
      if (error) throw error;

      toast.success("Member removed successfully");
      queryClient.invalidateQueries({ queryKey: ["members", activeOrg.id] });
      setRemoveDialogOpen(false);
      setMemberToRemove(null);
    } catch (err) {
      toast.error("Failed to remove member");
    }
  };

  const columns: ColumnDef<Member>[] = [
    {
      id: "user",
      accessorFn: (row) => row.user?.name ?? row.user?.email ?? "",
      header: () => {
        return <span className="pl-1">User</span>;
      },
      cell: ({ row }) => {
        const member = row.original;
        const user = member.user;
        return (
          <TableCellFirst className="flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarImage
                src={user?.image ?? undefined}
                alt={user?.name ?? ""}
              />
              <AvatarFallback className="text-xs">
                {getInitials(user?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{user?.name ?? "Unknown"}</span>
              <span className="text-muted-foreground text-xs">
                {user?.email ?? ""}
              </span>
            </div>
          </TableCellFirst>
        );
      },
      filterFn: (row, _id, value) => {
        const user = row.original.user;
        const searchValue = value.toLowerCase();
        return (
          (user?.name?.toLowerCase().includes(searchValue) ?? false) ||
          (user?.email?.toLowerCase().includes(searchValue) ?? false)
        );
      },
    },
    {
      accessorKey: "role",
      header: ({ column }) => {
        const roleFilterOptions = [
          { label: "All", value: "all" },
          { label: "Owner", value: "owner" },
          { label: "Admin", value: "admin" },
          { label: "Member", value: "member" },
        ];

        const currentFilter = column.getFilterValue() as string | undefined;

        return (
          <div className="flex items-center justify-center">
            <FilterPopover
              label="Role"
              options={roleFilterOptions}
              currentValue={currentFilter}
              onChange={(value) => column.setFilterValue(value)}
            />
          </div>
        );
      },
      filterFn: (row, id, value) => {
        const rowValue = row.getValue(id) as string;
        return rowValue.toLowerCase() === value.toLowerCase();
      },
      cell: ({ row }) => (
        <div className="text-center">
          <Badge
            className={cn(
              "w-16 rounded-sm text-center capitalize",
              getRoleBadgeStyle(row.getValue("role")),
            )}
            variant={"outline"}
          >
            {row.getValue("role")}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
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
              label="Joined At"
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
        const timestamp = row.getValue("createdAt") as string | Date;
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
      cell: ({ row }) => {
        const member = row.original;

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
                <DropdownMenuItem
                  onClick={() =>
                    navigator.clipboard.writeText(member.user?.email ?? "")
                  }
                >
                  Copy email
                </DropdownMenuItem>
                {/* <DropdownMenuItem>Change role</DropdownMenuItem> */}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    setMemberToRemove(member);
                    setRemoveDialogOpen(true);
                  }}
                >
                  Remove member
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: members,
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
    table.getColumn("user")?.setFilterValue(debouncedFilterValue);
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
        <p className="text-muted-foreground">Loading members...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-row justify-between pb-4">
        <InputGroup className="max-w-60">
          <InputGroupInput
            placeholder="Search by name or email..."
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
          <InviteUserDialog />
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
                  No members found.
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
      {removeDialogOpen && memberToRemove && (
        <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove{" "}
                {memberToRemove.user?.name ?? memberToRemove.user?.email} from
                the organization? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveMember}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
