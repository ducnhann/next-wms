"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InviteUserForm } from "./invite-user-form";

interface InviteUserDialogProps {
  /** Button variant */
  variant?: "default" | "outline" | "secondary" | "ghost";
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Custom trigger element */
  trigger?: React.ReactNode;
  /** Additional class name for trigger button */
  className?: string;
}

/**
 * Dialog component for inviting users to the organization.
 * Contains the invite form with email and role selection.
 */
export function InviteUserDialog({
  variant = "default",
  size = "default",
  trigger,
  className,
}: InviteUserDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant={variant} size={size} className={className}>
            <UserPlus className="mr-2 size-4" />
            Invite Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Send an invitation email to add a new member to your workspace.
          </DialogDescription>
        </DialogHeader>
        <InviteUserForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </DialogContent>
    </Dialog>
  );
}
