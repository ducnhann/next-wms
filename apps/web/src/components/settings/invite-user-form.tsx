"use client";

import { useForm } from "@tanstack/react-form";
import { Mail, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { organization } from "@/lib/auth/client";

const inviteFormSchema = z.object({
  email: z.email("Please enter a valid email address"),
  role: z.enum(["admin", "member"]),
});

interface InviteUserFormProps {
  /** Called when invitation is successfully sent */
  onSuccess?: () => void;
  /** Called when user cancels */
  onCancel?: () => void;
  /** Additional class name */
  className?: string;
}

/**
 * Form for inviting a user to the organization via email.
 */
export function InviteUserForm({
  onSuccess,
  onCancel,
  className,
}: InviteUserFormProps) {
  const form = useForm({
    defaultValues: {
      email: "",
      role: "member" as "admin" | "member",
    },
    onSubmit: async ({ value }) => {
      try {
        const validated = inviteFormSchema.parse(value);
        await organization.inviteMember({
          email: validated.email,
          role: validated.role,
        });
        toast.success(`Invitation sent to ${validated.email}`);
        form.reset();
        onSuccess?.();
      } catch (error) {
        if (error instanceof z.ZodError) {
          const issues = error.issues;
          toast.error(issues[0]?.message ?? "Validation error");
        } else {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to send invitation";
          toast.error(message);
        }
        console.error("Invite error:", error);
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className={className}
    >
      <div className="space-y-4">
        {/* Email Field */}
        <form.Field
          name="email"
          validators={{
            onChange: ({ value }) => {
              const result = z.string().email().safeParse(value);
              return result.success
                ? undefined
                : "Please enter a valid email address";
            },
          }}
        >
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="user@example.com"
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

        {/* Role Field */}
        <form.Field name="role">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={field.state.value}
                onValueChange={(value) =>
                  field.handleChange(value as "admin" | "member")
                }
              >
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                {/* TODO: get the actual roles from this organization */}
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </form.Field>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Spinner />
                ) : (
                  <UserPlus className="mr-2 size-4" />
                )}
                Send Invitation
              </Button>
            )}
          </form.Subscribe>
        </div>
      </div>
    </form>
  );
}
