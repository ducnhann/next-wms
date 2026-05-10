"use client";

import { FolderOpen, ImageIcon, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  type FileWithPreview,
  formatBytes,
  useFileUpload,
} from "@/hooks/use-file-upload";
import { cn } from "@/lib/utils";
import { Field, FieldDescription, FieldError } from "./ui/field";

interface AvatarUploadProps {
  maxSize?: number;
  className?: string;
  onFileChange?: (file: FileWithPreview | null) => void;
  defaultAvatar?: string;
}

export default function AvatarUpload({
  maxSize = 1 * 1024 * 1024, // 1MB
  className,
  onFileChange,
  defaultAvatar,
}: AvatarUploadProps) {
  const [
    { files, isDragging, errors },
    {
      removeFile,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps,
    },
  ] = useFileUpload({
    maxFiles: 1,
    maxSize,
    accept: "image/*",
    multiple: false,
    onFilesChange: (files) => {
      onFileChange?.(files[0] || null);
    },
  });

  const currentFile = files[0];
  const previewUrl = currentFile?.preview || defaultAvatar;

  const handleRemove = () => {
    if (currentFile) {
      removeFile(currentFile.id);
    }
  };

  return (
    <div className="flex flex-row gap-6">
      <div className={cn("flex flex-col items-center gap-4", className)}>
        {/* Avatar Preview */}
        <div className="relative">
          <div
            className={cn(
              "group/avatar relative h-24 w-24 cursor-pointer overflow-hidden rounded-4xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              previewUrl && "border-solid",
            )}
          >
            <AnimatePresence mode={"popLayout"}>
              {previewUrl ? (
                <motion.div
                  initial={{ opacity: 0, filter: "blur(5px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(5px)" }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <Image
                    src={previewUrl}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                    width={96}
                    height={96}
                  />
                </motion.div>
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageIcon className="size-6 text-muted-foreground" />
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <Field className="flex flex-1 flex-col gap-2.5">
        <div className="flex w-full gap-2">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key="org-logo-upload-dropzone"
              layout
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                x: errors.length > 0 ? [2, -2, 2, -2, 2, 0] : 0,
              }}
              exit={{ opacity: 0 }}
              transition={{
                layout: { duration: 0.18, ease: "easeOut" },
                opacity: { duration: 0.18 },
                x: { duration: 0.4, ease: "easeInOut" },
              }}
              className="min-w-0 flex-1 overflow-hidden"
            >
              <div
                className={cn(
                  "inline-flex h-9 w-full min-w-0 items-center rounded-md border bg-transparent p-0.5 font-medium text-foreground text-sm shadow-xs outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
                  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-input hover:border-muted-foreground/50",
                )}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                {...(errors.length > 0 && { "aria-invalid": true })}
              >
                <input {...getInputProps()} className="sr-only" tabIndex={-1} />

                <motion.div whileTap={{ scale: 0.95 }} layout>
                  <Button
                    onClick={openFileDialog}
                    aria-label="choose-file"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground"
                  >
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </motion.div>

                <motion.p
                  layout
                  className="truncate pr-2 text-muted-foreground text-sm"
                >
                  Choose or drop file here
                </motion.p>
              </div>
            </motion.div>

            {currentFile && (
              <motion.div
                key="org-logo-remove-button"
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{
                  layout: { duration: 0.18, ease: "easeOut" },
                  opacity: { duration: 0.18 },
                  scale: { duration: 0.18 },
                }}
                className="shrink-0"
                whileTap={{
                  scale: 0.95,
                }}
              >
                <Button
                  size="icon"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                  aria-label="Remove avatar"
                >
                  <X className="size-3.5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <FieldDescription>
          PNG, JPG up to {formatBytes(maxSize)}
        </FieldDescription>
        {errors.length > 0 && (
          <FieldError
            errors={errors.map((error) => ({
              message: error,
            }))}
          />
        )}
      </Field>
    </div>
  );
}
