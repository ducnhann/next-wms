"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  DEFAULT_ROLES,
  type RoleStatements,
} from "@wms/backend/lib/permissions";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CreateNewButton } from "@/components/ui/create-new-button";
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
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authClient } from "@/lib/auth/client";

interface RoleOption {
  id: string;
  name: string;
  role: { statements: RoleStatements };
  isDefault: boolean;
}

interface CreateRoleDialogProps {
  customRoles?: RoleOption[];
}

export function CreateRoleDialog({ customRoles = [] }: CreateRoleDialogProps) {
  const [open, setOpen] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [baseRoleId, setBaseRoleId] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const { authOrganization } = useCurrentUser();
  const queryClient = useQueryClient();

  // Combine default roles with custom roles for selection
  const allRoles = useMemo<RoleOption[]>(
    () => [...DEFAULT_ROLES, ...customRoles],
    [customRoles],
  );

  const handleCreate = async () => {
    if (!roleName.trim()) {
      toast.error("Role name is required");
      return;
    }

    if (!authOrganization?.id) {
      toast.error("No organization selected");
      return;
    }

    setIsCreating(true);
    try {
      // Get base permissions from selected role
      let permission: Record<string, string[]> = {};

      if (baseRoleId) {
        const baseRole = allRoles.find((r) => r.id === baseRoleId);
        if (baseRole) {
          // Convert readonly arrays to mutable arrays for the API
          permission = Object.fromEntries(
            Object.entries(baseRole.role.statements).map(([key, value]) => [
              key,
              [...(value || [])],
            ]),
          );
        }
      }

      await authClient.organization.createRole({
        role: roleName.trim().toLowerCase().replace(/\s+/g, "-"),
        permission,
        organizationId: authOrganization.id,
      });

      toast.success(`Role "${roleName}" created successfully`);

      // Invalidate roles query to refresh the list
      await queryClient.invalidateQueries({ queryKey: ["roles"] });

      // Reset form and close dialog
      setRoleName("");
      setBaseRoleId("");
      setOpen(false);
    } catch (error) {
      toast.error("Failed to create role");
      console.error("Error creating role:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset form when dialog closes
      setRoleName("");
      setBaseRoleId("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <CreateNewButton label="Create new role" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create new role</DialogTitle>
          <DialogDescription>
            Define a name and set base permission set for the new role.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="role-name">Role Name</FieldLabel>
            <Input
              id="role-name"
              placeholder="Manager"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="base-permissions">Base Permissions</FieldLabel>
            <Select value={baseRoleId} onValueChange={setBaseRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a base role (optional)" />
              </SelectTrigger>
              <SelectContent>
                {allRoles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                    {role.isDefault && (
                      <span className="ml-2 text-muted-foreground text-xs">
                        (Default)
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              Select a base permission set to copy from. You can modify
              permissions after creation.
            </FieldDescription>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={!roleName.trim() || isCreating}
          >
            {isCreating ? "Creating..." : "Create Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
