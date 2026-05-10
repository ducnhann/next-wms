"use client";

import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { useState } from "react";
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

interface CreateLookupDialogProps {
  organizationId: Id<"organizations">;
  defaultLookupType?: string;
}

export function CreateLookupDialog({
  organizationId,
  defaultLookupType,
}: CreateLookupDialogProps) {
  const [open, setOpen] = useState(false);
  const [lookupType, setLookupType] = useState(defaultLookupType ?? "");
  const [lookupCode, setLookupCode] = useState("");
  const [lookupValue, setLookupValue] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  const { mutate: createLookup, isPending } = useMutation({
    mutationFn: useConvexMutation(api.systemLookups.create),
    onSuccess: () => {
      toast.success("Lookup created successfully");
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create lookup");
    },
  });

  const resetForm = () => {
    if (!defaultLookupType) setLookupType("");
    setLookupCode("");
    setLookupValue("");
    setDescription("");
    setSortOrder(0);
  };

  const handleSubmit = () => {
    if (!lookupType.trim() || !lookupCode.trim() || !lookupValue.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    createLookup({
      organizationId,
      lookupType: lookupType.trim(),
      lookupCode: lookupCode.trim().toUpperCase(),
      lookupValue: lookupValue.trim(),
      description: description.trim(),
      sortOrder,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <CreateNewButton label="Add lookup" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create new lookup</DialogTitle>
          <DialogDescription>
            Add a new lookup value to the system.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="lookup-type">Lookup Type *</FieldLabel>
            <Input
              id="lookup-type"
              placeholder="e.g., StorageRequirement"
              value={lookupType}
              onChange={(e) => setLookupType(e.target.value)}
              disabled={!!defaultLookupType}
            />
            <FieldDescription>
              The category this lookup belongs to.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="lookup-code">Lookup Code *</FieldLabel>
            <Input
              id="lookup-code"
              placeholder="e.g., NORMAL"
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
            />
            <FieldDescription>
              Unique code for this lookup (uppercase).
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="lookup-value">Display Value *</FieldLabel>
            <Input
              id="lookup-value"
              placeholder="e.g., Normal Temperature"
              value={lookupValue}
              onChange={(e) => setLookupValue(e.target.value)}
            />
            <FieldDescription>The value displayed to users.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Input
              id="description"
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="sort-order">Sort Order</FieldLabel>
            <Input
              id="sort-order"
              type="number"
              placeholder="0"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
            />
            <FieldDescription>
              Lower numbers appear first in lists.
            </FieldDescription>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Creating..." : "Create Lookup"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EditLookupDialogProps {
  lookup: {
    _id: Id<"system_lookups">;
    lookupType: string;
    lookupCode: string;
    lookupValue: string;
    description: string;
    sortOrder: number;
  };
  trigger: React.ReactNode;
}

export function EditLookupDialog({ lookup, trigger }: EditLookupDialogProps) {
  const [open, setOpen] = useState(false);
  const [lookupValue, setLookupValue] = useState(lookup.lookupValue);
  const [description, setDescription] = useState(lookup.description);
  const [sortOrder, setSortOrder] = useState(lookup.sortOrder);

  const { mutate: updateLookup, isPending } = useMutation({
    mutationFn: useConvexMutation(api.systemLookups.update),
    onSuccess: () => {
      toast.success("Lookup updated successfully");
      setOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update lookup");
    },
  });

  const handleSubmit = () => {
    if (!lookupValue.trim()) {
      toast.error("Display value is required");
      return;
    }

    updateLookup({
      id: lookup._id,
      lookupValue: lookupValue.trim(),
      description: description.trim(),
      sortOrder,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit lookup</DialogTitle>
          <DialogDescription>
            Modify the lookup value details.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>Lookup Type</FieldLabel>
            <Input value={lookup.lookupType} disabled />
          </Field>
          <Field>
            <FieldLabel>Lookup Code</FieldLabel>
            <Input value={lookup.lookupCode} disabled />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-lookup-value">Display Value *</FieldLabel>
            <Input
              id="edit-lookup-value"
              value={lookupValue}
              onChange={(e) => setLookupValue(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-description">Description</FieldLabel>
            <Input
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-sort-order">Sort Order</FieldLabel>
            <Input
              id="edit-sort-order"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
