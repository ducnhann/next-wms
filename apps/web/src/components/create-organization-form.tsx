import { revalidateLogic, useForm } from "@tanstack/react-form";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { useConvex } from "convex/react";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import z from "zod";
import { useFileStorage } from "@/hooks/use-file-storage";
import type { FileWithPreview } from "@/hooks/use-file-upload";
import { authClient } from "@/lib/auth/client";
import AvatarUpload from "./avatar-upload";
import { Button } from "./ui/button";
import { Field, FieldError, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { Spinner } from "./ui/spinner";

const ORG_CREATE_SCHEMA = z.object({
  orgName: z
    .string()
    .min(3, "Organization name is required")
    .regex(
      /^[a-zA-Z0-9\s-]+$/,
      "Name can only contain letters, numbers, spaces, and hyphens",
    ),
  orgSlug: z
    .string()
    .min(3, "Organization slug is required")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug can only contain lowercase letters, numbers, and hyphens",
    ),
});

type OrgCreateForm = z.infer<typeof ORG_CREATE_SCHEMA>;

interface CreateOrganizationFormProps {
  onSuccess?: (orgSlug: string) => void;
  onCancel?: () => void;
  showActions?: boolean;
  formId?: string;
}

export function CreateOrganizationForm({
  onSuccess,
  onCancel,
  showActions = true,
  formId = "org-create-form",
}: CreateOrganizationFormProps) {
  const [isPending, startTransition] = useTransition();
  const [logoFile, setLogoFile] = useState<FileWithPreview | null>(null);
  const { uploadFile, isUploading } = useFileStorage();
  const convex = useConvex();

  const handleLogoChange = useCallback((file: FileWithPreview | null) => {
    setLogoFile(file);
  }, []);

  const validateOrgForm = useCallback(async (value: OrgCreateForm) => {
    const result = ORG_CREATE_SCHEMA.safeParse(value);
    if (!result.success) {
      const errors = z.treeifyError(result.error);
      return {
        fields: {
          orgName: { message: errors.properties?.orgName?.errors[0] },
          orgSlug: { message: errors.properties?.orgSlug?.errors[0] },
        },
      };
    }

    const { data, error } = await authClient.organization.checkSlug({
      slug: value.orgSlug,
    });

    if (error) {
      return {
        fields: {
          orgSlug: { message: [error.message] },
        },
      };
    }

    if (!data.status) {
      return {
        fields: {
          orgSlug: { message: "Organization slug is already taken" },
        },
      };
    }

    return null;
  }, []);

  const createOrgForm = useForm({
    defaultValues: {
      orgName: "",
      orgSlug: "",
    },
    validators: {
      onSubmitAsync: async ({ value }) => {
        return new Promise((resolve) => {
          startTransition(async () => {
            const errors = await validateOrgForm(value);
            resolve(errors);
          });
        });
      },
    },
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "blur",
    }),
    onSubmit: async ({ value }) => {
      startTransition(async () => {
        // Upload logo if selected
        let storageId: Id<"_storage"> | undefined;
        if (logoFile?.file instanceof File) {
          try {
            const result = await uploadFile(logoFile.file);
            storageId = result.storageId as Id<"_storage">;
          } catch {
            toast.error("Failed to upload logo");
            return;
          }
        }

        // Create organization in Better Auth (without logo URL for now)
        const { data, error } = await authClient.organization.create({
          name: value.orgName,
          slug: value.orgSlug,
        });
        if (error) {
          toast.error(error.message || "Failed to create organization");
          return;
        }

        if (!data) {
          toast.error("Failed to create organization");
          return;
        }

        // If we have a logo, update it after org creation
        // This converts the storageId to a proper URL
        if (storageId) {
          try {
            // Wait a moment for the org sync to complete
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Query the organization by slug to get the Convex ID
            const org = await convex.query(api.authSync.getOrganizationBySlug, {
              slug: value.orgSlug,
            });

            if (org?._id) {
              // Update the logo with the storage ID (converts to URL)
              await convex.mutation(api.authSync.updateOrganizationLogo, {
                organizationId: org._id,
                storageId,
              });
            }
          } catch (logoError) {
            // Log error but don't fail org creation
            console.error("Failed to update organization logo:", logoError);
          }
        }

        // Success - proxy middleware will handle setting active org after navigation
        toast.success("Organization created successfully");
        onSuccess?.(value.orgSlug);
      });
    },
  });

  return (
    <form
      id={formId}
      onSubmit={(e) => {
        e.preventDefault();
        createOrgForm.handleSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <createOrgForm.Field name="orgName">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid;

          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Organization Name</FieldLabel>
              <Input
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                type="text"
                aria-invalid={isInvalid}
                placeholder="Acme Corp"
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      </createOrgForm.Field>
      <createOrgForm.Field name="orgSlug">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid;

          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Organization Slug</FieldLabel>
              <Input
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                type="text"
                aria-invalid={isInvalid}
                placeholder="acme-corp"
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      </createOrgForm.Field>
      <Field>
        <FieldLabel>Logo (Optional)</FieldLabel>
        <AvatarUpload onFileChange={handleLogoChange} />
      </Field>
      {showActions && (
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isPending || isUploading}>
            {isPending || isUploading ? <Spinner /> : "Create"}
          </Button>
        </div>
      )}
    </form>
  );
}

export { ORG_CREATE_SCHEMA };
export type { OrgCreateForm };
