"use client";

import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { useCallback } from "react";

interface UploadResult {
  storageId: Id<"_storage">;
}

/**
 * Hook for uploading files to Convex storage
 *
 * Usage:
 * ```tsx
 * const { uploadFile, isUploading, error } = useFileStorage();
 *
 * // Upload a file and get the storage ID
 * const { storageId } = await uploadFile(file);
 * ```
 */
export function useFileStorage() {
  const { mutateAsync: generateUploadUrl } = useMutation({
    mutationFn: useConvexMutation(api.authSync.generateUploadUrl),
    mutationKey: ["generateUploadUrl"],
  });

  // Wrap the fetch POST in a mutation for traceability
  const {
    mutateAsync: postToUploadUrl,
    isPending: isPosting,
    error: postError,
  } = useMutation({
    mutationFn: async ({
      uploadUrl,
      file,
    }: {
      uploadUrl: string;
      file: File;
    }) => {
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error(`Upload failed: ${result.statusText}`);
      }

      const data = await result.json();
      return { storageId: data.storageId as Id<"_storage"> };
    },
    mutationKey: ["uploadToConvexStorage"],
  });

  const uploadFile = useCallback(
    async (file: File): Promise<UploadResult> => {
      // Step 1: Get a short-lived upload URL
      const uploadUrl = await generateUploadUrl({});

      // Step 2: POST the file to the URL (wrapped in mutation)
      const { storageId } = await postToUploadUrl({ uploadUrl, file });

      return { storageId };
    },
    [generateUploadUrl, postToUploadUrl],
  );

  return {
    uploadFile,
    isUploading: isPosting,
    error: postError,
  };
}
