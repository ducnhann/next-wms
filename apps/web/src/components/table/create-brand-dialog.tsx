"use client";

import { useConvexMutation } from "@convex-dev/react-query";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import { Package } from "lucide-react";
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

const brandSchema = z.object({
  name: z.string().min(3, "Brand name must be at least 3 characters"),
});

interface CreateBrandDialogProps {
  onSuccess?: () => void;
}

export function CreateBrandDialog({ onSuccess }: CreateBrandDialogProps) {
  const [open, setOpen] = useState(false);
  const { organizationId } = useCurrentUser();

  const { mutate, isPending } = useMutation({
    mutationFn: useConvexMutation(api.brands.createBrand),
  });

  const form = useForm({
    defaultValues: {
      name: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const validated = brandSchema.parse(value);

        if (!organizationId) {
          toast.error("No organization selected");
          return;
        }

        mutate(
          {
            name: validated.name,
            organizationId: organizationId as unknown as string,
          },
          {
            onSuccess: () => {
              toast.success(`Brand "${validated.name}" created successfully`);
              form.reset();
              setOpen(false);
              onSuccess?.();
            },
            onError: (error) => {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Failed to create brand",
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
        <CreateNewButton label="Create brand" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create new brand</DialogTitle>
          <DialogDescription>
            Add a new brand to your organization.
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
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) => {
                  if (!value) return "Brand name is required";
                  if (value.length < 3)
                    return "Brand name must be at least 3 characters";
                  return undefined;
                },
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="brand-name">Brand Name</Label>
                  <div className="relative">
                    <Package className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="brand-name"
                      placeholder="Enter brand name"
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
              Create Brand
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
