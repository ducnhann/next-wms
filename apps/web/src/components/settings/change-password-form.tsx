"use client";

import { KeyRound, Loader2 } from "lucide-react";
import { type FormEvent, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { toast } from "sonner";

/**
 * ChangePasswordForm
 *
 * A self-contained form component for changing the user's password.
 * Uses Better Auth's `changePassword` API which requires the current password
 * for identity verification before applying the change (ASR-SEC-03).
 *
 * Design Patterns:
 * - Single Responsibility: Handles only password change logic
 * - Controlled Form: React state for all inputs
 * - Optimistic UI: Loading state + disabled during submission
 */

interface PasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const INITIAL_STATE: PasswordFormState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const MIN_PASSWORD_LENGTH = 8;

export function ChangePasswordForm() {
  const [formState, setFormState] = useState<PasswordFormState>(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = useCallback(
    (field: keyof PasswordFormState, value: string) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  /**
   * Validates form inputs before submission.
   * Returns error message or null if valid.
   */
  const validateForm = useCallback((): string | null => {
    if (!formState.currentPassword) {
      return "Current password is required.";
    }
    if (formState.newPassword.length < MIN_PASSWORD_LENGTH) {
      return `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (formState.newPassword !== formState.confirmPassword) {
      return "New passwords do not match.";
    }
    if (formState.currentPassword === formState.newPassword) {
      return "New password must be different from current password.";
    }
    return null;
  }, [formState]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      const validationError = validateForm();
      if (validationError) {
        toast.error(validationError);
        return;
      }

      setIsSubmitting(true);

      try {
        const { error } = await authClient.changePassword({
          currentPassword: formState.currentPassword,
          newPassword: formState.newPassword,
          revokeOtherSessions: true,
        });

        if (error) {
          toast.error(
            error.message ?? "Failed to change password. Please try again.",
          );
          return;
        }

        toast.success(
          "Password changed successfully. Other sessions have been revoked.",
        );
        setFormState(INITIAL_STATE);
      } catch {
        toast.error("An unexpected error occurred. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [formState, validateForm],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="current-password">Current Password</Label>
        <Input
          id="current-password"
          type="password"
          placeholder="Enter your current password"
          value={formState.currentPassword}
          onChange={(e) => updateField("currentPassword", e.target.value)}
          disabled={isSubmitting}
          autoComplete="current-password"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-password">New Password</Label>
        <Input
          id="new-password"
          type="password"
          placeholder="Enter your new password"
          value={formState.newPassword}
          onChange={(e) => updateField("newPassword", e.target.value)}
          disabled={isSubmitting}
          autoComplete="new-password"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm New Password</Label>
        <Input
          id="confirm-password"
          type="password"
          placeholder="Confirm your new password"
          value={formState.confirmPassword}
          onChange={(e) => updateField("confirmPassword", e.target.value)}
          disabled={isSubmitting}
          autoComplete="new-password"
        />
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="mr-2 h-4 w-4" />
          )}
          {isSubmitting ? "Changing..." : "Change Password"}
        </Button>
        <p className="text-muted-foreground text-xs">
          All other sessions will be revoked after changing your password.
        </p>
      </div>
    </form>
  );
}
