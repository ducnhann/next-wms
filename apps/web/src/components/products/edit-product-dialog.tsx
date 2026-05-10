"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useBrands } from "@/hooks/use-brands";
import { useCategoryTree } from "@/hooks/use-categories";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useProductDetails, useUpdateProduct } from "@/hooks/use-products";
import {
  useStorageRequirements,
  useTrackingMethods,
} from "@/hooks/use-system-lookups";

// Form Schema
const editProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  brandId: z.string().min(1, "Brand is required"),
  storageRequirementTypeId: z
    .string()
    .min(1, "Storage requirement is required"),
  trackingMethodTypeId: z.string().min(1, "Tracking method is required"),
  shelfLifeDays: z.number().min(0, "Shelf life cannot be negative").optional(),
  reorderPoint: z
    .number()
    .min(0, "Reorder point cannot be negative")
    .optional(),
  isActive: z.boolean(),
});

type EditProductFormData = z.infer<typeof editProductSchema>;

interface EditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: Id<"products"> | null;
}

export function EditProductDialog({
  open,
  onOpenChange,
  productId,
}: EditProductDialogProps) {
  const { organizationId } = useCurrentUser();

  // Fetch product details
  const { product, isLoading: isLoadingProduct } = useProductDetails(
    productId ?? undefined,
  );

  // Fetch dropdown data
  const { categories } = useCategoryTree(organizationId);
  const { brands } = useBrands(organizationId);
  const { lookups: storageRequirements } = useStorageRequirements();
  const { lookups: trackingMethods } = useTrackingMethods();

  // Mutation
  const updateProduct = useUpdateProduct();

  // Form
  const form = useForm<EditProductFormData>({
    resolver: zodResolver(editProductSchema),
    defaultValues: {
      name: "",
      description: "",
      categoryId: "",
      brandId: "",
      storageRequirementTypeId: "",
      trackingMethodTypeId: "",
      shelfLifeDays: undefined,
      reorderPoint: undefined,
      isActive: true,
    },
  });

  // Reset form when product data loads
  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        description: product.description || "",
        categoryId: product.categoryId,
        brandId: product.brandId,
        storageRequirementTypeId: product.storageRequirementTypeId,
        trackingMethodTypeId: product.trackingMethodTypeId,
        shelfLifeDays: product.shelfLifeDays,
        reorderPoint: product.reorderPoint,
        isActive: product.isActive,
      });
    }
  }, [product, form]);

  // Submit handler
  const onSubmit = async (data: EditProductFormData) => {
    if (!productId) return;

    try {
      await updateProduct.mutateAsync({
        id: productId,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId as Id<"categories">,
        brandId: data.brandId as Id<"brands">,
        storageRequirementTypeId:
          data.storageRequirementTypeId as Id<"system_lookups">,
        trackingMethodTypeId: data.trackingMethodTypeId as Id<"system_lookups">,
        shelfLifeDays: data.shelfLifeDays,
        reorderPoint: data.reorderPoint,
        isActive: data.isActive,
      });

      toast.success("Product updated successfully!");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update product",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update product information. Click Save to confirm changes.
          </DialogDescription>
        </DialogHeader>

        {isLoadingProduct ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Product Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter product name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter product description"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category & Brand */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat._id} value={cat._id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="brandId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select brand" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {brands.map((brand) => (
                            <SelectItem key={brand._id} value={brand._id}>
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Storage & Tracking */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="storageRequirementTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Storage Requirement *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select storage requirement" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {storageRequirements.map((item) => (
                            <SelectItem key={item._id} value={item._id}>
                              {item.lookupValue}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trackingMethodTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tracking Method *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tracking method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {trackingMethods.map((item) => (
                            <SelectItem key={item._id} value={item._id}>
                              {item.lookupValue}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Shelf Life & Reorder Point */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="shelfLifeDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shelf Life (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Number of days"
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(
                              value === "" ? undefined : Number(value),
                            );
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reorderPoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reorder Point</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Minimum quantity"
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(
                              value === "" ? undefined : Number(value),
                            );
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Is Active */}
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active Status</FormLabel>
                      <p className="text-muted-foreground text-sm">
                        Product can be used in the system
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateProduct.isPending}>
                  {updateProduct.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
