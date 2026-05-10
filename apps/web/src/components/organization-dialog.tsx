import { Building2, ChevronRight, QrCode, UserRoundPlus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateOrganizationForm } from "./create-organization-form";
import { springTransition } from "./easing";
import { Field, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "./ui/item";

interface OrganizationDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type DialogView = "selection" | "create" | "join-method" | "join-code";

const ItemStyle =
  "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 cursor-pointer";

export function OrganizationDialog({
  open,
  onOpenChange,
}: OrganizationDialogProps) {
  const [view, setView] = useState<DialogView>("selection");

  // Form states
  const [inviteCode, setInviteCode] = useState("");

  const handleClose = () => {
    // Reset state when dialog closes
    setView("selection");
    setInviteCode("");
    onOpenChange?.(false);
  };

  const handleBack = () => {
    if (view === "create" || view === "join-method") {
      setView("selection");
    } else if (view === "join-code") {
      setView("join-method");
    }
  };

  const handleJoinOrg = async () => {
    // TODO: Implement join organization logic
    // console.log({ inviteCode });
    handleClose();
  };

  const dialogConfig = {
    selection: {
      title: "Add Organization",
      description:
        "Choose how you'd like to add an organization to your workspace.",
    },
    create: {
      title: "Create Organization",
      description: "Set up a new organization and invite your team members.",
    },
    "join-method": {
      title: "Join Organization",
      description: "Choose how you'd like to join an existing organization.",
    },
    "join-code": {
      title: "Enter Invite Code",
      description:
        "Enter the invite code provided by your organization administrator.",
    },
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent showCloseButton={false} className="sm:max-w-xl">
        {/* Header */}
        <motion.div
          key={`${view}-dialog-header`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 0.2, ease: "easeInOut" },
          }}
        >
          <DialogHeader>
            <DialogTitle>{dialogConfig[view].title}</DialogTitle>
            <DialogDescription>
              {dialogConfig[view].description}
            </DialogDescription>
          </DialogHeader>
        </motion.div>
        <motion.div
          key={`${view}-dialog-content`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{
            opacity: { duration: 0.2, ease: "easeInOut" },
            x: springTransition,
          }}
          className="min-h-72"
        >
          {/* Selection View */}
          {view === "selection" && (
            <div className="flex flex-col gap-2">
              <Item
                variant="outline"
                className={ItemStyle}
                onClick={() => setView("create")}
              >
                <ItemMedia>
                  <UserRoundPlus className="size-5" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Create organization</ItemTitle>
                  <ItemDescription>
                    Once created, you&apos;ll become organization administrator
                    who can invite members to join.
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <ChevronRight className="size-4" />
                </ItemActions>
              </Item>
              <Item
                variant="outline"
                className={ItemStyle}
                onClick={() => setView("join-method")}
              >
                <ItemMedia>
                  <Building2 className="size-5" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Join organization</ItemTitle>
                  <ItemDescription>
                    Join organization through Invite QR Code or Invite Code, and
                    start collaborating with others.
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <ChevronRight className="size-4" />
                </ItemActions>
              </Item>
            </div>
          )}

          {/* Create Organization Form */}
          {view === "create" && (
            <CreateOrganizationForm
              formId="org-create-form"
              onSuccess={handleClose}
              showActions={false}
            />
          )}

          {/* Join Method Selection */}
          {view === "join-method" && (
            <div className="flex flex-col gap-2">
              <Item
                variant="outline"
                className={ItemStyle}
                onClick={() => setView("join-code")}
              >
                <ItemMedia>
                  <Building2 className="size-5" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Enter Invite Code</ItemTitle>
                  <ItemDescription>
                    Manually enter the invite code provided by your
                    administrator.
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <ChevronRight className="size-4" />
                </ItemActions>
              </Item>
              <Item
                variant="outline"
                className={ItemStyle}
                onClick={() => {
                  // TODO: Open QR scanner
                  setView("join-code");
                }}
              >
                <ItemMedia>
                  <QrCode className="size-5" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Scan QR Code</ItemTitle>
                  <ItemDescription>
                    Use your camera to scan the invite QR code.
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <ChevronRight className="size-4" />
                </ItemActions>
              </Item>
            </div>
          )}

          {/* Join Code Input */}
          {view === "join-code" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleJoinOrg();
              }}
              className="flex flex-col gap-4"
            >
              <Field>
                <FieldLabel htmlFor="invite-code">Invite Code</FieldLabel>
                <Input
                  id="invite-code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="ABC-DEF-GHI"
                  required
                />
              </Field>
            </form>
          )}
        </motion.div>
        <DialogFooter className="flex flex-row gap-2">
          <AnimatePresence mode={"popLayout"}>
            {view !== "selection" && (
              <BtnWrapper key="back">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
              </BtnWrapper>
            )}

            {/* ---------- CANCEL ---------- */}
            <BtnWrapper key="cancel">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
            </BtnWrapper>

            {/* ---------- CREATE / JOIN ---------- */}
            {view === "create" && (
              <BtnWrapper key="create">
                <Button type="submit" form="org-create-form">
                  Create
                </Button>
              </BtnWrapper>
            )}

            {view === "join-code" && (
              <BtnWrapper key="join">
                <Button onClick={handleJoinOrg} disabled={!inviteCode}>
                  Join
                </Button>
              </BtnWrapper>
            )}
          </AnimatePresence>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const BtnWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    transition={{
      layout: { duration: 0.1, ease: "easeOut" },
      opacity: { duration: 0.15 },
      scale: { duration: 0.15 },
    }}
    className="flex"
  >
    {children}
  </motion.div>
);
