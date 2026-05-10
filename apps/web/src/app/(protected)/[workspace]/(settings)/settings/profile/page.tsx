"use client";

import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import { Check, Pencil } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import AvatarUpload from "@/components/avatar-upload";
import {
  Setting,
  SettingHeader,
  SettingSection,
} from "@/components/settings/setting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useFileStorage } from "@/hooks/use-file-storage";
import type { FileWithPreview } from "@/hooks/use-file-upload";
import { authClient } from "@/lib/auth/client";

export default function ProfilePage() {
  const { user, userId } = useCurrentUser();
  const [isEditingName, setIsEditingName] = useState(false);
  const [fullName, setFullName] = useState("");
  const [imageFile, setImageFile] = useState<FileWithPreview | null>(null);

  const handleImageChange = useCallback((file: FileWithPreview | null) => {
    setImageFile(file);
  }, []);

  const { mutate: updateUserImage, isPending: isImageUpdating } = useMutation({
    mutationFn: useConvexMutation(api.authSync.updateUserImage),
  });

  const { uploadFile, isUploading } = useFileStorage();

  const handleEditName = () => {
    setFullName(user?.fullName || "");
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!fullName.trim()) {
      toast.error("Full name cannot be empty");
      return;
    }

    if (fullName === user?.fullName) {
      toast.info("No changes made to full name");
      setIsEditingName(false);
      return;
    }

    try {
      await authClient.updateUser({
        name: fullName,
      });
      toast.success("Full name updated successfully");
      setIsEditingName(false);
    } catch (error) {
      console.error("Failed to update name:", error);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setFullName("");
  };

  const handleImageSave = async () => {
    if (!userId || !imageFile) return;

    try {
      // Get the actual File from FileWithPreview
      const file = imageFile.file instanceof File ? imageFile.file : null;
      if (!file) {
        toast.error("Invalid file");
        return;
      }

      // Upload file to Convex storage
      const { storageId } = await uploadFile(file);

      // Update user in Convex with storage ID
      updateUserImage(
        { userId, storageId },
        {
          onSuccess: async ({ imageUrl }) => {
            // Also update Better Auth database for coherency
            try {
              await authClient.updateUser({
                image: imageUrl,
              });
              toast.success("Profile picture updated successfully");
              setImageFile(null);
            } catch (authError) {
              console.error("Failed to update auth image:", authError);
              toast.warning(
                "Image updated in system but failed to sync with auth",
              );
            }
          },
          onError: (error) => {
            toast.error(
              error instanceof Error
                ? error.message
                : "Profile picture update failed",
            );
          },
        },
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload image",
      );
    }
  };

  return (
    <Setting>
      <SettingHeader
        title="Profile"
        description="Manage your personal information and account settings"
      />

      <SettingSection
        title="Profile Information"
        description="Update your profile picture and personal details"
      >
        <div className="rounded-lg border">
          <Item>
            <ItemContent>
              <ItemTitle>Profile picture</ItemTitle>
            </ItemContent>
            <ItemActions className="flex-col items-end gap-2">
              <AvatarUpload
                defaultAvatar={user?.image}
                onFileChange={handleImageChange}
              />
              {imageFile && (
                <Button
                  size="sm"
                  onClick={handleImageSave}
                  disabled={isUploading || isImageUpdating}
                >
                  {isUploading || isImageUpdating ? (
                    <Spinner />
                  ) : (
                    "Save Picture"
                  )}
                </Button>
              )}
            </ItemActions>
          </Item>
          <Separator />
          {/* <Item>
            <ItemContent>
              <ItemTitle>Username</ItemTitle>
            </ItemContent>
            <ItemActions>
              <Input defaultValue={`${user?.username}`} disabled={true} />
              <Button variant={"ghost"} size={"icon"}>
                <Pencil />
              </Button>
            </ItemActions>
          </Item>
          <Separator /> */}
          <Item>
            <ItemContent>
              <ItemTitle>Fullname</ItemTitle>
            </ItemContent>
            <ItemActions>
              <Input
                value={isEditingName ? fullName : user?.fullName || ""}
                onChange={(e) => setFullName(e.target.value)}
                disabled={!isEditingName}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isEditingName) {
                    handleSaveName();
                  } else if (e.key === "Escape") {
                    handleCancelEdit();
                  }
                }}
              />
              <Button
                variant={"ghost"}
                size={"icon"}
                onClick={isEditingName ? handleSaveName : handleEditName}
              >
                {isEditingName ? <Check /> : <Pencil />}
              </Button>
            </ItemActions>
          </Item>
        </div>
      </SettingSection>

      <SettingSection
        title="Workspace Access"
        description="Your membership in the current workspace"
      >
        <div className="rounded-lg border p-6 pl-4">
          <p className="text-sm">
            Workspace access details will be implemented here
          </p>
        </div>
      </SettingSection>
    </Setting>
  );
}
