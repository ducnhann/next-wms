"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import AvatarUpload from "@/components/avatar-upload";
import { Spinner } from "@/components/ui/spinner";
import type { FileWithPreview } from "@/hooks/use-file-upload";
import { authClient } from "@/lib/auth/client";

interface AvatarUploadFieldProps {
  /** Current avatar URL */
  currentAvatar?: string;
  /** Called when avatar is successfully updated */
  onAvatarUpdated?: (url: string | null) => void;
  /** Max file size in bytes */
  maxSize?: number;
  /** Additional class name */
  className?: string;
}

/**
 * Avatar upload field that integrates with Better Auth for profile image updates.
 * Handles file selection, upload, and profile update in one component.
 */
export function AvatarUploadField({
  currentAvatar,
  onAvatarUpdated,
  maxSize = 1 * 1024 * 1024, // 1MB
  className,
}: AvatarUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = useCallback(
    async (file: FileWithPreview | null) => {
      if (!file) {
        // Remove avatar
        try {
          setIsUploading(true);
          await authClient.updateUser({
            image: null,
          });
          onAvatarUpdated?.(null);
          toast.success("Avatar removed");
        } catch (error) {
          toast.error("Failed to remove avatar");
          console.error("Avatar removal error:", error);
        } finally {
          setIsUploading(false);
        }
        return;
      }

      try {
        setIsUploading(true);

        // Convert file to base64 data URL for upload
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file.file as Blob);
        });

        // Update user profile with new image
        await authClient.updateUser({
          image: dataUrl,
        });

        onAvatarUpdated?.(dataUrl);
        toast.success("Avatar updated successfully");
      } catch (error) {
        toast.error("Failed to upload avatar");
        console.error("Avatar upload error:", error);
      } finally {
        setIsUploading(false);
      }
    },
    [onAvatarUpdated],
  );

  return (
    <div className="relative">
      <AvatarUpload
        defaultAvatar={currentAvatar}
        onFileChange={handleFileChange}
        maxSize={maxSize}
        className={className}
      />
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80">
          <Spinner />
        </div>
      )}
    </div>
  );
}
