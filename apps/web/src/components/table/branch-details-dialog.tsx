"use client";

import { useConvexMutation } from "@convex-dev/react-query";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import { Building2, MapPin, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import type { Branch } from "@/lib/types";

interface BranchDetailsDialogProps {
  branch: Branch;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BranchDetailsDialog({
  branch,
  open,
  onOpenChange,
}: BranchDetailsDialogProps) {
  const [hasChanges, setHasChanges] = useState(false);

  const { mutate: updateBranch, isPending } = useMutation({
    mutationFn: useConvexMutation(api.branches.updateBranch),
  });

  const form = useForm({
    defaultValues: {
      name: branch.name,
      address: branch.address,
      phoneNumber: branch.phoneNumber,
      isActive: branch.isActive,
      isDeleted: branch.isDeleted,
    },
    onSubmit: async ({ value }) => {
      updateBranch(
        {
          id: branch._id,
          name: value.name,
          address: value.address,
          phoneNumber: value.phoneNumber,
          isActive: value.isActive,
          isDeleted: value.isDeleted,
        },
        {
          onSuccess: () => {
            toast.success(`Branch "${value.name}" updated successfully`);
            setHasChanges(false);
            onOpenChange(false);
          },
          onError: (error) => {
            toast.error(
              error instanceof Error
                ? error.message
                : "Failed to update branch",
            );
          },
        },
      );
    },
  });

  // Reset form when branch changes or dialog opens
  useEffect(() => {
    if (open) {
      form.reset();
      form.setFieldValue("name", branch.name);
      form.setFieldValue("address", branch.address);
      form.setFieldValue("phoneNumber", branch.phoneNumber);
      form.setFieldValue("isActive", branch.isActive);
      form.setFieldValue("isDeleted", branch.isDeleted);
      setHasChanges(false);
    }
  }, [branch, open, form]);

  // Check for changes
  const checkChanges = () => {
    const current = form.state.values;
    const hasChanged =
      current.name !== branch.name ||
      current.address !== branch.address ||
      current.phoneNumber !== branch.phoneNumber ||
      current.isActive !== branch.isActive ||
      current.isDeleted !== branch.isDeleted;
    setHasChanges(hasChanged);
  };

  const handleCancel = () => {
    form.setFieldValue("name", branch.name);
    form.setFieldValue("address", branch.address);
    form.setFieldValue("phoneNumber", branch.phoneNumber);
    form.setFieldValue("isActive", branch.isActive);
    form.setFieldValue("isDeleted", branch.isDeleted);
    setHasChanges(false);
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Branch Details</DialogTitle>
          <DialogDescription>
            View and edit branch information.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="space-y-4 py-4">
            {/* Read-only fields */}
            <div className="grid grid-rows-2 gap-4">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">Branch ID</Label>
                <p className="font-mono text-sm">{branch._id}</p>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">Created At</Label>
                <p className="text-sm">{formatDate(branch._creationTime)}</p>
              </div>
            </div>

            {branch.deletedAt && (
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">Deleted At</Label>
                <p className="text-destructive text-sm">
                  {formatDate(branch.deletedAt)}
                </p>
              </div>
            )}

            <hr className="my-4" />

            {/* Branch Name */}
            <form.Field name="name">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="details-name">Branch Name</Label>
                  <div className="relative">
                    <Building2 className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="details-name"
                      className="pl-9"
                      value={field.state.value}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                        checkChanges();
                      }}
                      onBlur={() => checkChanges()}
                    />
                  </div>
                </div>
              )}
            </form.Field>

            {/* Address */}
            <form.Field name="address">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="details-address">Address</Label>
                  <div className="relative">
                    <MapPin className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="details-address"
                      className="pl-9"
                      value={field.state.value}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                        checkChanges();
                      }}
                      onBlur={() => checkChanges()}
                    />
                  </div>
                </div>
              )}
            </form.Field>

            {/* Phone Number */}
            <form.Field name="phoneNumber">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="details-phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="details-phone"
                      className="pl-9"
                      value={field.state.value}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                        checkChanges();
                      }}
                      onBlur={() => checkChanges()}
                    />
                  </div>
                </div>
              )}
            </form.Field>

            {/* Status toggles */}
            <div className="grid grid-cols-2 gap-4">
              <form.Field name="isActive">
                {(field) => (
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label>Active</Label>
                      <p className="text-muted-foreground text-xs">
                        Branch is available for use
                      </p>
                    </div>
                    <Switch
                      checked={field.state.value}
                      onCheckedChange={(checked) => {
                        field.handleChange(checked);
                        // If activating, automatically un-delete
                        if (checked) {
                          form.setFieldValue("isDeleted", false);
                        }
                        setTimeout(checkChanges, 0);
                      }}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="isDeleted">
                {(field) => (
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label>Deleted</Label>
                      <p className="text-muted-foreground text-xs">
                        Branch has been soft deleted
                      </p>
                    </div>
                    <Switch
                      checked={field.state.value}
                      onCheckedChange={(checked) => {
                        field.handleChange(checked);
                        // If marking as deleted, set isActive to false
                        if (checked) {
                          form.setFieldValue("isActive", false);
                        }
                        setTimeout(checkChanges, 0);
                      }}
                    />
                  </div>
                )}
              </form.Field>
            </div>
          </div>

          <DialogFooter>
            {hasChanges ? (
              <>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Spinner />}
                  Save Changes
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
