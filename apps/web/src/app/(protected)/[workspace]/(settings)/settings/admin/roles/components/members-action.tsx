"use client";

import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authClient } from "@/lib/auth/client";

export function MembersAction({
  memberId,
  memberName,
  roleId,
  roleName,
  memberRoles,
}: {
  memberId: string;
  memberName: string;
  roleId: string;
  roleName: string;
  memberRoles?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const { authOrganization } = useCurrentUser();
  const queryClient = useQueryClient();

  const handleRemoveMember = async () => {
    if (!authOrganization?.id) return;

    setIsRemoving(true);
    try {
      // Filter out the current role from the member's roles
      const currentRoles = memberRoles || [roleId];
      const updatedRoles = currentRoles.filter((r) => r !== roleId);

      // If no roles remain, we need to assign a default role (member)
      const newRoles = updatedRoles.length > 0 ? updatedRoles : ["member"];

      await authClient.organization.updateMemberRole({
        role: newRoles,
        memberId,
        organizationId: authOrganization.id,
      });

      toast.success(`Removed ${memberName} from ${roleName}`);

      // Invalidate members query to refresh the list
      await queryClient.invalidateQueries({ queryKey: ["members"] });

      setOpen(false);
    } catch (error) {
      toast.error(`Failed to remove ${memberName} from ${roleName}`);
      console.error("Error removing member from role:", error);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={"ghost"} size={"icon-sm"}>
          <X />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove member from role</DialogTitle>
          <DialogDescription>
            Remove {memberName} from the {roleName} role?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={isRemoving}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleRemoveMember}
            disabled={isRemoving}
          >
            {isRemoving ? "Removing..." : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
