"use client";

import { useConvexMutation } from "@convex-dev/react-query";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { Building2, MapPin, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useCurrentUser } from "@/hooks/use-current-user";

const branchSchema = z.object({
  name: z.string().min(1, "Branch name is required"),
  address: z.string().min(1, "Address is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
});

interface CreateBranchDialogProps {
  onSuccess?: () => void;
}

export function CreateBranchDialog({ onSuccess }: CreateBranchDialogProps) {
  const [open, setOpen] = useState(false);
  const { organizationId } = useCurrentUser();

  const { mutate, isPending } = useMutation({
    mutationFn: useConvexMutation(api.branches.createBranch),
  });

  const form = useForm({
    defaultValues: {
      name: "",
      address: "",
      phoneNumber: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const validated = branchSchema.parse(value);

        if (!organizationId) {
          toast.error("No organization selected");
          return;
        }

        mutate(
          {
            name: validated.name,
            address: validated.address,
            phoneNumber: validated.phoneNumber,
            organizationId: organizationId as Id<"organizations">,
          },
          {
            onSuccess: () => {
              toast.success(`Branch "${validated.name}" created successfully`);
              form.reset();
              setOpen(false);
              onSuccess?.();
            },
            onError: (error) => {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Failed to create branch",
              );
            },
          },
        );
      } catch (error) {
        if (error instanceof z.ZodError) {
          toast.error(error.issues[0]?.message ?? "Validation error");
        }
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <CreateNewButton label="Create branch" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create new branch</DialogTitle>
          <DialogDescription>
            Add a new branch to your organization.
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
            {/* Branch Name */}
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) => {
                  if (!value) return "Branch name is required";
                  return undefined;
                },
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="branch-name">Branch Name</Label>
                  <div className="relative">
                    <Building2 className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="branch-name"
                      placeholder="Enter branch name"
                      className="pl-9"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                  </div>
                  {field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0 && (
                      <p className="text-destructive text-sm">
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                </div>
              )}
            </form.Field>

            {/* Address */}
            <form.Field
              name="address"
              validators={{
                onChange: ({ value }) => {
                  if (!value) return "Address is required";
                  return undefined;
                },
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="branch-address">Address</Label>
                  <div className="relative">
                    <MapPin className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="branch-address"
                      placeholder="Enter branch address"
                      className="pl-9"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                  </div>
                  {field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0 && (
                      <p className="text-destructive text-sm">
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                </div>
              )}
            </form.Field>

            {/* Phone Number */}
            <form.Field
              name="phoneNumber"
              validators={{
                onChange: ({ value }) => {
                  if (!value) return "Phone number is required";
                  return undefined;
                },
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="branch-phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="branch-phone"
                      placeholder="Enter phone number"
                      className="pl-9"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                  </div>
                  {field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0 && (
                      <p className="text-destructive text-sm">
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                </div>
              )}
            </form.Field>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Spinner />}
              Create Branch
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
