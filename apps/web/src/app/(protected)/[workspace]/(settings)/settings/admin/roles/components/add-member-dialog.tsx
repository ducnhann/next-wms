"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useDebouncedInput } from "@/hooks/use-debounced-input";
import { useMembers } from "@/hooks/use-members";
import { authClient } from "@/lib/auth/client";

interface AddMemberDialogProps {
  selectedRoleId: string | undefined;
  selectedRoleName: string | undefined;
}

export function AddMemberDialog({
  selectedRoleId,
  selectedRoleName,
}: AddMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setMemberSearchQuery, memberSearchQuery, memberSearchQueryDebounced] =
    useDebouncedInput("", 100);
  const { authOrganization } = useCurrentUser();
  const { data: membersData } = useMembers({
    organizationId: authOrganization?.id,
  });
  const queryClient = useQueryClient();

  // Filter out members who already have the selected role
  const availableMembers = useMemo(() => {
    if (!membersData?.members || !selectedRoleId) return [];
    return membersData.members.filter(
      (member) => member.role !== selectedRoleId,
    );
  }, [membersData?.members, selectedRoleId]);

  // Apply search filter
  const filteredMembers = useMemo(() => {
    if (!memberSearchQueryDebounced.trim()) return availableMembers;
    const q = memberSearchQueryDebounced.toLowerCase();
    return availableMembers.filter((member) => {
      const name = (member.user.name || "").toLowerCase();
      const email = (member.user.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [availableMembers, memberSearchQueryDebounced]);

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  };

  const toggleAll = () => {
    if (selectedMemberIds.length === filteredMembers.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(filteredMembers.map((m) => m.id));
    }
  };

  const allSelected =
    filteredMembers.length > 0 &&
    selectedMemberIds.length === filteredMembers.length;

  const handleAddMembers = async () => {
    if (
      !selectedRoleId ||
      !authOrganization?.id ||
      selectedMemberIds.length === 0
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Update each selected member's role
      const promises = selectedMemberIds.map((memberId) =>
        authClient.organization.updateMemberRole({
          role: [selectedRoleId],
          memberId,
          organizationId: authOrganization.id,
        }),
      );

      const results = await Promise.allSettled(promises);
      const successCount = results.filter(
        (r) => r.status === "fulfilled",
      ).length;
      const failCount = results.filter((r) => r.status === "rejected").length;

      if (failCount > 0 && successCount > 0) {
        toast.warning(
          `Added ${successCount} member(s) to ${selectedRoleName}. ${failCount} failed.`,
        );
      } else if (failCount > 0) {
        toast.error(`Failed to add members to ${selectedRoleName}`);
      } else {
        toast.success(
          `Successfully added ${successCount} member(s) to ${selectedRoleName}`,
        );
      }

      // Invalidate members query to refresh the list
      await queryClient.invalidateQueries({ queryKey: ["members"] });

      // Reset state and close dialog
      setSelectedMemberIds([]);
      setMemberSearchQuery("");
      setOpen(false);
    } catch (error) {
      toast.error("Failed to add members to role");
      console.error("Error adding members to role:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when dialog closes
      setSelectedMemberIds([]);
      setMemberSearchQuery("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <CreateNewButton label="Add member" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add members to role</DialogTitle>
          <DialogDescription>
            Select members to assign to the {selectedRoleName || "selected"}{" "}
            role.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="member-select">Select Members</FieldLabel>

            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search members..."
                value={memberSearchQuery}
                onValueChange={setMemberSearchQuery}
                className="h-9"
              />
              <CommandList>
                <CommandEmpty>No members available</CommandEmpty>
                {filteredMembers.length > 0 && (
                  <>
                    <CommandGroup>
                      <CommandItem
                        onSelect={toggleAll}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Checkbox
                          checked={allSelected}
                          className="pointer-events-none"
                        />
                        <span>Select All ({filteredMembers.length})</span>
                      </CommandItem>
                    </CommandGroup>
                    <ScrollArea className="h-48">
                      <CommandGroup>
                        {filteredMembers.map((member) => (
                          <CommandItem
                            key={member.id}
                            onSelect={() => toggleMemberSelection(member.id)}
                            className="flex cursor-pointer items-center gap-2"
                          >
                            <Checkbox
                              checked={selectedMemberIds.includes(member.id)}
                              className="pointer-events-none"
                            />
                            <div className="flex flex-1 items-center justify-between">
                              <span className="text-left">
                                {member.user.name}
                              </span>
                              <span className="text-muted-foreground text-sm">
                                {member.user.email}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </ScrollArea>
                  </>
                )}
              </CommandList>
            </Command>
            <FieldDescription>
              {selectedMemberIds.length > 0
                ? `${selectedMemberIds.length} member(s) selected`
                : "Select members to assign to this role."}
            </FieldDescription>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button
            disabled={selectedMemberIds.length === 0 || isSubmitting}
            onClick={handleAddMembers}
          >
            {isSubmitting
              ? "Adding..."
              : `Add ${selectedMemberIds.length || ""} Member${selectedMemberIds.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
