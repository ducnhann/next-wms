"use client";

import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import { Check, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import AvatarUpload from "@/components/avatar-upload";
import {
  Setting,
  SettingHeader,
  SettingSection,
} from "@/components/settings/setting";
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
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useFileStorage } from "@/hooks/use-file-storage";
import type { FileWithPreview } from "@/hooks/use-file-upload";
import { authClient, useActiveOrganization } from "@/lib/auth/client";

export default function OrganizationSettingsPage() {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const { data: activeOrg } = useActiveOrganization();
  const { organization, organizationId } = useCurrentUser();
  const router = useRouter();

  // Editing states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [logoFile, setLogoFile] = useState<FileWithPreview | null>(null);

  const handleLogoChange = useCallback((file: FileWithPreview | null) => {
    setLogoFile(file);
  }, []);

  const { mutate: updateOrg, isPending } = useMutation({
    mutationFn: useConvexMutation(api.authSync.updateOrganization),
  });

  const { mutate: updateOrgLogo, isPending: isLogoUpdating } = useMutation({
    mutationFn: useConvexMutation(api.authSync.updateOrganizationLogo),
  });

  const { uploadFile, isUploading } = useFileStorage();

  const organizationName = activeOrg?.name;
  const isConfirmationValid = confirmationText === organizationName;

  const handleDeleteOrganization = async () => {
    const { error } = await authClient.organization.delete({
      organizationId: activeOrg?.id || "",
    });

    if (error) {
      toast.error(`Failed to delete organization: ${error.message}`);
      return;
    }

    toast.success("Organization deleted successfully");
    router.push("/");
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

  const handleEdit = (field: string, currentValue: string) => {
    setEditValue(currentValue);
    setEditingField(field);
  };

  const handleSave = (field: string) => {
    if (!organizationId) return;

    const updates: Record<string, unknown> = {};

    if (field === "name") {
      if (!editValue.trim()) {
        toast.error("Name cannot be empty");
        return;
      }
      updates.name = editValue;
    } else if (field === "address") {
      updates.address = editValue;
    } else if (field === "contactEmail" || field === "contactPhone") {
      const currentInfo =
        (organization?.contactInfo as { email?: string; phone?: string }) || {};
      updates.contactInfo = {
        ...currentInfo,
        [field === "contactEmail" ? "email" : "phone"]: editValue,
      };
    }

    updateOrg(
      { id: organizationId, ...updates },
      {
        onSuccess: () => {
          toast.success(`${field} updated successfully`);
          setEditingField(null);
          setEditValue("");
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Update failed");
        },
      },
    );
  };

  const handleCancel = () => {
    setEditingField(null);
    setEditValue("");
  };

  const handleLogoSave = async () => {
    if (!organizationId || !logoFile) return;

    try {
      // Get the actual File from FileWithPreview
      const file = logoFile.file instanceof File ? logoFile.file : null;
      if (!file) {
        toast.error("Invalid file");
        return;
      }

      // Upload file to Convex storage
      const { storageId } = await uploadFile(file);

      // Update organization with storage ID
      updateOrgLogo(
        { organizationId, storageId },
        {
          onSuccess: () => {
            toast.success("Logo updated successfully");
            setLogoFile(null);
          },
          onError: (error) => {
            toast.error(
              error instanceof Error ? error.message : "Logo update failed",
            );
          },
        },
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload logo",
      );
    }
  };

  const contactInfo =
    (organization?.contactInfo as { email?: string; phone?: string }) || {};

  return (
    <Setting>
      <SettingHeader
        title="Organization"
        description="Manage your organization settings and information"
      />

      <SettingSection
        title="Organization Information"
        description="View and edit your organization details"
      >
        <div className="rounded-lg border">
          {/* Read-only: ID */}
          <Item>
            <ItemContent>
              <ItemTitle>Organization ID</ItemTitle>
            </ItemContent>
            <ItemActions>
              <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                {organization?._id || "-"}
              </code>
            </ItemActions>
          </Item>
          <Separator />

          {/* Read-only: Auth ID */}
          <Item>
            <ItemContent>
              <ItemTitle>Auth ID</ItemTitle>
            </ItemContent>
            <ItemActions>
              <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                {organization?.authId || "-"}
              </code>
            </ItemActions>
          </Item>
          <Separator />

          {/* Read-only: Created At */}
          <Item>
            <ItemContent>
              <ItemTitle>Created At</ItemTitle>
            </ItemContent>
            <ItemActions>
              <span className="text-muted-foreground text-sm">
                {organization?.authCreatedAt
                  ? formatDate(organization.authCreatedAt)
                  : "-"}
              </span>
            </ItemActions>
          </Item>
          <Separator />

          {/* Editable: Name */}
          <Item>
            <ItemContent>
              <ItemTitle>Name</ItemTitle>
            </ItemContent>
            <ItemActions>
              <Input
                value={
                  editingField === "name" ? editValue : organization?.name || ""
                }
                onChange={(e) => setEditValue(e.target.value)}
                disabled={editingField !== "name"}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editingField === "name")
                    handleSave("name");
                  if (e.key === "Escape") handleCancel();
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={
                  editingField === "name"
                    ? () => handleSave("name")
                    : () => handleEdit("name", organization?.name || "")
                }
                disabled={isPending}
              >
                {isPending && editingField === "name" ? (
                  <Spinner />
                ) : editingField === "name" ? (
                  <Check />
                ) : (
                  <Pencil />
                )}
              </Button>
            </ItemActions>
          </Item>
          <Separator />

          {/* Read-only: Slug */}
          <Item>
            <ItemContent>
              <ItemTitle>Slug</ItemTitle>
            </ItemContent>
            <ItemActions>
              <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                {organization?.slug || "-"}
              </code>
            </ItemActions>
          </Item>
          <Separator />

          {/* Editable: Logo */}
          <Item>
            <ItemContent>
              <ItemTitle>Logo</ItemTitle>
            </ItemContent>
            <ItemActions className="flex-col items-end gap-2">
              <AvatarUpload
                defaultAvatar={organization?.logo}
                onFileChange={handleLogoChange}
              />
              {logoFile && (
                <Button
                  size="sm"
                  onClick={handleLogoSave}
                  disabled={isUploading || isLogoUpdating}
                >
                  {isUploading || isLogoUpdating ? <Spinner /> : "Save Logo"}
                </Button>
              )}
            </ItemActions>
          </Item>
          <Separator />

          {/* Editable: Address */}
          <Item>
            <ItemContent>
              <ItemTitle>Address</ItemTitle>
            </ItemContent>
            <ItemActions>
              <Input
                value={
                  editingField === "address"
                    ? editValue
                    : organization?.address || ""
                }
                onChange={(e) => setEditValue(e.target.value)}
                disabled={editingField !== "address"}
                placeholder="Enter address"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editingField === "address")
                    handleSave("address");
                  if (e.key === "Escape") handleCancel();
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={
                  editingField === "address"
                    ? () => handleSave("address")
                    : () => handleEdit("address", organization?.address || "")
                }
                disabled={isPending}
              >
                {isPending && editingField === "address" ? (
                  <Spinner />
                ) : editingField === "address" ? (
                  <Check />
                ) : (
                  <Pencil />
                )}
              </Button>
            </ItemActions>
          </Item>
          <Separator />

          {/* Editable: Contact Email */}
          <Item>
            <ItemContent>
              <ItemTitle>Contact Email</ItemTitle>
            </ItemContent>
            <ItemActions>
              <Input
                type="email"
                value={
                  editingField === "contactEmail"
                    ? editValue
                    : contactInfo.email || ""
                }
                onChange={(e) => setEditValue(e.target.value)}
                disabled={editingField !== "contactEmail"}
                placeholder="contact@example.com"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editingField === "contactEmail")
                    handleSave("contactEmail");
                  if (e.key === "Escape") handleCancel();
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={
                  editingField === "contactEmail"
                    ? () => handleSave("contactEmail")
                    : () => handleEdit("contactEmail", contactInfo.email || "")
                }
                disabled={isPending}
              >
                {isPending && editingField === "contactEmail" ? (
                  <Spinner />
                ) : editingField === "contactEmail" ? (
                  <Check />
                ) : (
                  <Pencil />
                )}
              </Button>
            </ItemActions>
          </Item>
          <Separator />

          {/* Editable: Contact Phone */}
          <Item>
            <ItemContent>
              <ItemTitle>Contact Phone</ItemTitle>
            </ItemContent>
            <ItemActions>
              <Input
                type="tel"
                value={
                  editingField === "contactPhone"
                    ? editValue
                    : contactInfo.phone || ""
                }
                onChange={(e) => setEditValue(e.target.value)}
                disabled={editingField !== "contactPhone"}
                placeholder="+1 234 567 8900"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editingField === "contactPhone")
                    handleSave("contactPhone");
                  if (e.key === "Escape") handleCancel();
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={
                  editingField === "contactPhone"
                    ? () => handleSave("contactPhone")
                    : () => handleEdit("contactPhone", contactInfo.phone || "")
                }
                disabled={isPending}
              >
                {isPending && editingField === "contactPhone" ? (
                  <Spinner />
                ) : editingField === "contactPhone" ? (
                  <Check />
                ) : (
                  <Pencil />
                )}
              </Button>
            </ItemActions>
          </Item>
        </div>
      </SettingSection>

      <SettingSection
        title="Danger Zone"
        description="Irreversible and destructive actions"
      >
        <Item className="border border-destructive/50">
          <ItemContent>
            <ItemTitle>Delete Organization</ItemTitle>
            <p className="text-muted-foreground text-sm">
              Permanently delete this organization and all its data
            </p>
          </ItemContent>
          <ItemActions>
            <Button
              onClick={() => setIsDeleteDialogOpen(true)}
              variant="destructive"
            >
              Delete Organization
            </Button>
          </ItemActions>
        </Item>
      </SettingSection>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              organization and all associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="confirmation">
                Type <span className="font-semibold">{organizationName}</span>{" "}
                to confirm
              </Label>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={organizationName}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setConfirmationText("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteOrganization}
              disabled={!isConfirmationValid}
            >
              Delete Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Setting>
  );
}
