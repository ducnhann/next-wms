"use client";

import { Ellipsis } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useDeleteRole, useUpdateRole } from "@/hooks/use-roles";

export function RolesAction({
  roleId,
  roleName,
}: {
  roleId: string;
  roleName: string;
}) {
  const [open, setOpen] = useState(false); // Dropdown open state
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const [newName, setNewName] = useState(roleName);
  const [confirmDeleteName, setConfirmDeleteName] = useState("");

  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { authOrganization } = useCurrentUser();
  const updateRoleMutation = useUpdateRole();
  const deleteRoleMutation = useDeleteRole();

  const handleRename = async () => {
    if (!newName.trim() || !authOrganization?.id) return;
    if (newName === roleName) {
      setShowRename(false);
      return;
    }

    setIsRenaming(true);
    try {
      await updateRoleMutation.mutateAsync({
        data: {
          roleId,
          organizationId: authOrganization.id,
          data: {
            roleName: newName.trim(),
          },
        },
      });
      toast.success("Role name updated successfully");
      setShowRename(false);
    } catch (error) {
      toast.error("Failed to update role name");
      console.error(error);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDelete = async () => {
    if (!authOrganization?.id) return;
    if (confirmDeleteName !== roleName) return;

    setIsDeleting(true);
    try {
      await deleteRoleMutation.mutateAsync({
        roleId,
        roleName,
        organizationId: authOrganization.id,
      });
      toast.success(`Role "${roleName}" deleted successfully`);
      setShowDelete(false);
    } catch (error) {
      toast.error("Failed to delete role");
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant={"ghost"} size={"icon-sm"}>
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Role Actions</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem
              onSelect={() => {
                setNewName(roleName);
                setShowRename(true);
              }}
            >
              Change name
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                setConfirmDeleteName("");
                setShowDelete(true);
              }}
              className="text-destructive focus:text-destructive"
            >
              Delete role
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename Dialog */}
      <Dialog open={showRename} onOpenChange={setShowRename}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role Name</DialogTitle>
            <DialogDescription>
              Enter a new name for the <strong>{roleName}</strong> role.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New role name"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleRename();
                }
              }}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isRenaming}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleRename}
              disabled={!newName.trim() || isRenaming}
            >
              {isRenaming ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the{" "}
              <strong>{roleName}</strong> role and remove it from all assigned
              members.
              <br />
              <br />
              Please type <strong>{roleName}</strong> to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={confirmDeleteName}
              onChange={(e) => setConfirmDeleteName(e.target.value)}
              placeholder="Type role name to confirm"
              className={
                confirmDeleteName && confirmDeleteName !== roleName
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              }
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isDeleting}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={confirmDeleteName !== roleName || isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
