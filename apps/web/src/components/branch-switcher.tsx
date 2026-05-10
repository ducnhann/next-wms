"use client";

import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CommandPopover } from "@/components/ui/command-popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranches } from "@/hooks/use-branches";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function BranchSwitcher() {
  const { organizationId } = useCurrentUser();
  const [open, setOpen] = useState(false);

  const { branches, currentBranch, selectBranch, isLoading } = useBranches({
    organizationId: organizationId as Id<"organizations"> | undefined,
    includeDeleted: false,
  });

  if (isLoading) {
    return <Skeleton className="h-10 w-50" />;
  }

  const branchOptions =
    branches?.map((branch) => ({
      label: branch.name,
      value: branch._id,
      data: branch,
    })) ?? [];

  return (
    <CommandPopover<string>
      options={branchOptions}
      value={currentBranch?._id}
      onValueChange={(value) => {
        const branch = branches?.find((b) => b._id === value);
        if (branch) {
          selectBranch(branch);
        }
      }}
      open={open}
      onOpenChange={setOpen}
      placeholder="Select branch"
      searchPlaceholder="Search branches..."
      emptyText="No branches found."
      trigger={
        <Button
          type="button"
          variant={"outline"}
          size={"sm"}
          className="truncate"
        >
          {currentBranch?.name ?? "Select branch"}
          <ChevronsUpDown />
        </Button>
      }
      contentClassName="w-50"
      align="end"
    />
  );
}
