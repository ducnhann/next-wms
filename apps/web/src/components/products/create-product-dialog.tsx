"use client";

import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { Loader2, Plus, Settings2, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useBrands } from "@/hooks/use-brands";
import { useCategoryTree } from "@/hooks/use-categories";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  type CreateProductWithVariantsInput,
  useCreateProductWithVariants,
} from "@/hooks/use-products";
import {
  useBarcodeTypes,
  useStorageRequirements,
  useTrackingMethods,
  useUnitsOfMeasure,
} from "@/hooks/use-system-lookups";

// Types
interface UnitConversion {
  id: string;
  unitName: string;
  conversionValue: number;
  baseUnit: string;
  barcode: string;
}

interface ProductAttribute {
  id: string;
  name: string;
  values: string[];
}

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  barcode: string;
}

// Unit & Attribute Dialog
function UnitAttributeDialog({
  open,
  onOpenChange,
  baseUnit,
  productName,
  unitConversions,
  setUnitConversions,
  attributes,
  setAttributes,
  variants,
  setVariants,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseUnit: string;
  productName: string;
  unitConversions: UnitConversion[];
  setUnitConversions: React.Dispatch<React.SetStateAction<UnitConversion[]>>;
  attributes: ProductAttribute[];
  setAttributes: React.Dispatch<React.SetStateAction<ProductAttribute[]>>;
  variants: ProductVariant[];
  setVariants: React.Dispatch<React.SetStateAction<ProductVariant[]>>;
}) {
  const addUnitConversion = () => {
    setUnitConversions([
      ...unitConversions,
      {
        id: Date.now().toString(),
        unitName: "",
        conversionValue: 1,
        baseUnit: baseUnit || "piece",
        barcode: "",
      },
    ]);
  };

  const removeUnitConversion = (id: string) => {
    setUnitConversions(unitConversions.filter((u) => u.id !== id));
  };

  const addAttribute = () => {
    setAttributes([
      ...attributes,
      {
        id: Date.now().toString(),
        name: "",
        values: [],
      },
    ]);
  };

  const removeAttribute = (id: string) => {
    setAttributes(attributes.filter((a) => a.id !== id));
    generateVariants(attributes.filter((a) => a.id !== id));
  };

  const _updateAttributeValues = (id: string, valuesStr: string) => {
    const values = valuesStr
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v);
    const newAttributes = attributes.map((a) =>
      a.id === id ? { ...a, values } : a,
    );
    setAttributes(newAttributes);
    generateVariants(newAttributes);
  };

  const generateVariants = (attrs: ProductAttribute[]) => {
    const validAttrs = attrs.filter((a) => a.name && a.values.length > 0);
    if (validAttrs.length === 0) {
      setVariants([]);
      return;
    }

    // Generate all combinations
    const combinations: string[][] = [];
    const generate = (index: number, current: string[]) => {
      if (index === validAttrs.length) {
        combinations.push([...current]);
        return;
      }
      for (const value of validAttrs[index].values) {
        current.push(value);
        generate(index + 1, current);
        current.pop();
      }
    };
    generate(0, []);

    // Create SKU prefix from product name (remove spaces, accents, uppercase)
    const skuPrefix =
      productName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase()
        .substring(0, 10) || "SKU";

    const newVariants: ProductVariant[] = combinations.map((combo, idx) => ({
      id: `var-${idx}`,
      name: productName
        ? `${productName} - ${combo.join(" - ")}`
        : combo.join(" - "),
      sku: `${skuPrefix}-${combo.join("-").toUpperCase().replace(/\s/g, "")}`,
      barcode: "",
    }));
    setVariants(newVariants);
  };

  const updateVariant = (
    id: string,
    field: keyof ProductVariant,
    value: string | number,
  ) => {
    setVariants(
      variants.map((v) => (v.id === id ? { ...v, [field]: value } : v)),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>UNIT & ATTRIBUTE SETUP</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="units" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="units">Unit Conversions</TabsTrigger>
            <TabsTrigger value="attributes">Attributes</TabsTrigger>
          </TabsList>

          <TabsContent value="units" className="space-y-4">
            <p className="text-muted-foreground text-sm">
              &gt; Base Unit: [ {baseUnit || "piece"} ] (From previous screen)
            </p>

            <div className="space-y-2">
              <h4 className="font-semibold text-amber-600">
                1. UNIT CONVERSION LIST
              </h4>
              <p className="text-muted-foreground text-sm">
                (Add larger units like Box, Case, Pack)
              </p>

              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_1.5fr_1fr_auto] gap-3 font-medium text-sm">
                  <span>Unit Name</span>
                  <span>Conversion Value</span>
                  <span>Barcode</span>
                  <span />
                </div>

                {unitConversions.map((unit) => (
                  <div
                    key={unit.id}
                    className="grid grid-cols-[1fr_1.5fr_1fr_auto] gap-3"
                  >
                    <Input
                      placeholder="Box"
                      value={unit.unitName}
                      onChange={(e) =>
                        setUnitConversions(
                          unitConversions.map((u) =>
                            u.id === unit.id
                              ? { ...u, unitName: e.target.value }
                              : u,
                          ),
                        )
                      }
                    />
                    <div className="flex items-center gap-2">
                      <span>=</span>
                      <Input
                        type="number"
                        className="w-20"
                        value={unit.conversionValue}
                        onChange={(e) =>
                          setUnitConversions(
                            unitConversions.map((u) =>
                              u.id === unit.id
                                ? {
                                    ...u,
                                    conversionValue: Number(e.target.value),
                                  }
                                : u,
                            ),
                          )
                        }
                      />
                      <span className="whitespace-nowrap">
                        {baseUnit || "piece"}
                      </span>
                    </div>
                    <Input
                      placeholder="SCAN..."
                      value={unit.barcode}
                      onChange={(e) =>
                        setUnitConversions(
                          unitConversions.map((u) =>
                            u.id === unit.id
                              ? { ...u, barcode: e.target.value }
                              : u,
                          ),
                        )
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeUnitConversion(unit.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button
                  variant="ghost"
                  className="text-amber-600"
                  onClick={addUnitConversion}
                >
                  + Add New Unit
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="attributes" className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-amber-600">
                2. PRODUCT ATTRIBUTES (create multiple variants)
              </h4>
              <p className="text-muted-foreground text-sm">
                (For fashion items, phones, etc.)
              </p>

              <div className="space-y-4">
                {attributes.map((attr, idx) => (
                  <div
                    key={attr.id}
                    className="space-y-2 rounded-lg border p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          Attribute {idx + 1}:
                        </span>
                        <Input
                          placeholder="Color, Size..."
                          value={attr.name}
                          onChange={(e) =>
                            setAttributes(
                              attributes.map((a) =>
                                a.id === attr.id
                                  ? { ...a, name: e.target.value }
                                  : a,
                              ),
                            )
                          }
                          className="w-32"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeAttribute(attr.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <span className="text-muted-foreground text-sm">
                        Values:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {attr.values.map((value) => (
                          <span
                            key={value}
                            className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-amber-800 text-sm"
                          >
                            {value}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                const newValues = attr.values.filter(
                                  (v) => v !== value,
                                );
                                const newAttributes = attributes.map((a) =>
                                  a.id === attr.id
                                    ? { ...a, values: newValues }
                                    : a,
                                );
                                setAttributes(newAttributes);
                                generateVariants(newAttributes);
                              }}
                              className="ml-1 rounded-full"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </span>
                        ))}
                        <Input
                          placeholder="Enter value and press Enter"
                          className="w-48"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === ",") {
                              e.preventDefault();
                              const input = e.currentTarget;
                              const value = input.value.trim();
                              if (value && !attr.values.includes(value)) {
                                const newAttributes = attributes.map((a) =>
                                  a.id === attr.id
                                    ? { ...a, values: [...a.values, value] }
                                    : a,
                                );
                                setAttributes(newAttributes);
                                input.value = "";
                                // Auto generate variants when adding values
                                generateVariants(newAttributes);
                              }
                            }
                          }}
                        />
                      </div>
                      <p className="text-muted-foreground text-xs">
                        💡 Enter value and press Enter or comma to add
                      </p>
                    </div>
                  </div>
                ))}

                <Button
                  variant="ghost"
                  className="text-amber-600"
                  onClick={addAttribute}
                >
                  + Add New Attribute
                </Button>
              </div>
            </div>

            {variants.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold">
                  &gt; VARIANT LIST ({variants.length} variants)
                </h4>
                <div className="max-h-64 overflow-y-auto rounded border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th className="p-2 text-left">Variant Name</th>
                        <th className="p-2 text-left">SKU Code</th>
                        <th className="p-2 text-left">Barcode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((variant) => (
                        <tr key={variant.id} className="border-t">
                          <td className="bg-amber-100 p-2 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
                            {variant.name}
                          </td>
                          <td className="p-1">
                            <Input
                              value={variant.sku}
                              onChange={(e) =>
                                updateVariant(variant.id, "sku", e.target.value)
                              }
                              className="h-8"
                            />
                          </td>
                          <td className="p-1">
                            <Input
                              value={variant.barcode}
                              onChange={(e) =>
                                updateVariant(
                                  variant.id,
                                  "barcode",
                                  e.target.value,
                                )
                              }
                              placeholder="Barcode..."
                              className="h-8"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)}>Confirm & Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main Create Product Dialog
export function CreateProductDialog() {
  const { organizationId } = useCurrentUser();
  const [open, setOpen] = React.useState(false);
  const [unitAttributeOpen, setUnitAttributeOpen] = React.useState(false);

  // Fetch data for dropdowns
  const { categories } = useCategoryTree(organizationId);
  const { brands } = useBrands(organizationId as unknown as string);
  const { lookups: storageRequirements } = useStorageRequirements();
  const { lookups: trackingMethods } = useTrackingMethods();
  const { lookups: unitsOfMeasure } = useUnitsOfMeasure();
  const { lookups: barcodeTypes } = useBarcodeTypes();

  // Create mutation
  const createProductMutation = useCreateProductWithVariants();

  // Form state - Product info
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<string>("");
  const [brandId, setBrandId] = React.useState<string>("");
  const [storageRequirementId, setStorageRequirementId] =
    React.useState<string>("");
  const [trackingMethodId, setTrackingMethodId] = React.useState<string>("");
  const [shelfLifeDays, setShelfLifeDays] = React.useState<number | undefined>(
    undefined,
  );
  const [reorderPoint, setReorderPoint] = React.useState<number | undefined>(
    undefined,
  );

  // Default variant (when no attributes)
  const [defaultSku, setDefaultSku] = React.useState("");
  const [defaultBarcode, setDefaultBarcode] = React.useState("");
  const [baseUnitId, setBaseUnitId] = React.useState<string>("");

  // Unit conversions & attributes (managed by sub-dialog)
  const [unitConversions, setUnitConversions] = React.useState<
    UnitConversion[]
  >([]);
  const [attributes, setAttributes] = React.useState<ProductAttribute[]>([]);
  const [variants, setVariants] = React.useState<ProductVariant[]>([]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setCategoryId("");
    setBrandId("");
    setStorageRequirementId("");
    setTrackingMethodId("");
    setShelfLifeDays(undefined);
    setReorderPoint(undefined);
    setDefaultSku("");
    setDefaultBarcode("");
    setBaseUnitId("");
    setUnitConversions([]);
    setAttributes([]);
    setVariants([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organizationId) {
      toast.error("Organization not found");
      return;
    }

    if (!name.trim()) {
      toast.error("Please enter product name");
      return;
    }

    if (!categoryId) {
      toast.error("Please select category");
      return;
    }

    if (!brandId) {
      toast.error("Please select brand");
      return;
    }

    if (!storageRequirementId) {
      toast.error("Please select storage requirement");
      return;
    }

    if (!trackingMethodId) {
      toast.error("Please select tracking method");
      return;
    }

    if (!baseUnitId) {
      toast.error("Please select base unit");
      return;
    }

    // Get default barcode type (EAN13)
    const defaultBarcodeType = barcodeTypes.find(
      (b) => b.lookupCode === "EAN13",
    );

    // Build variants to create
    let variantsToCreate: CreateProductWithVariantsInput["variants"] = [];

    if (variants.length > 0) {
      // Use attribute-based variants
      variantsToCreate = variants.map((v) => ({
        skuCode: v.sku,
        description: v.name,
        costPrice: 0,
        sellingPrice: 0,
        unitOfMeasureId: baseUnitId as Id<"system_lookups">,
        temperatureSensitive: false,
        isActive: true,
        barcodes: v.barcode
          ? [
              {
                barcodeTypeId:
                  (defaultBarcodeType?._id as Id<"system_lookups">) ??
                  (barcodeTypes[0]?._id as Id<"system_lookups">),
                barcodeValue: v.barcode,
              },
            ]
          : undefined,
      }));
    } else {
      // Create single default variant
      if (!defaultSku.trim()) {
        toast.error("Please enter SKU code");
        return;
      }

      variantsToCreate = [
        {
          skuCode: defaultSku,
          description: name,
          costPrice: 0,
          sellingPrice: 0,
          unitOfMeasureId: baseUnitId as Id<"system_lookups">,
          temperatureSensitive: false,
          isActive: true,
          barcodes: defaultBarcode
            ? [
                {
                  barcodeTypeId:
                    (defaultBarcodeType?._id as Id<"system_lookups">) ??
                    (barcodeTypes[0]?._id as Id<"system_lookups">),
                  barcodeValue: defaultBarcode,
                },
              ]
            : undefined,
        },
      ];
    }

    try {
      await createProductMutation.mutateAsync({
        organizationId: organizationId as Id<"organizations">,
        name,
        description: description || name,
        categoryId: categoryId as Id<"categories">,
        brandId: brandId as Id<"brands">,
        storageRequirementTypeId: storageRequirementId as Id<"system_lookups">,
        trackingMethodTypeId: trackingMethodId as Id<"system_lookups">,
        shelfLifeDays,
        reorderPoint,
        isActive: true,
        variants: variantsToCreate,
      });

      toast.success("Product created successfully!");
      resetForm();
      setOpen(false);
    } catch (error) {
      console.error("Failed to create product:", error);
      toast.error(
        `Failed to create product: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  // Get base unit name for display
  const baseUnitName =
    unitsOfMeasure.find((u) => u._id === baseUnitId)?.lookupValue || "Piece";

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus />
            Add New
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Name */}
              <div className="grid gap-2">
                <Label htmlFor="name">
                  Product Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Enter product name..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter product description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Category & Brand */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat._id} value={cat._id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>
                    Brand <span className="text-destructive">*</span>
                  </Label>
                  <Select value={brandId} onValueChange={setBrandId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand..." />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand._id} value={brand._id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Storage Requirement & Tracking Method */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>
                    Storage Requirements{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={storageRequirementId}
                    onValueChange={setStorageRequirementId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {storageRequirements.map((item) => (
                        <SelectItem key={item._id} value={item._id}>
                          {item.lookupValue}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>
                    Tracking Method <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={trackingMethodId}
                    onValueChange={setTrackingMethodId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {trackingMethods.map((item) => (
                        <SelectItem key={item._id} value={item._id}>
                          {item.lookupValue}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Base Unit & Shelf Life */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>
                    Base Unit <span className="text-destructive">*</span>
                  </Label>
                  <Select value={baseUnitId} onValueChange={setBaseUnitId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit..." />
                    </SelectTrigger>
                    <SelectContent>
                      {unitsOfMeasure.map((item) => (
                        <SelectItem key={item._id} value={item._id}>
                          {item.lookupValue}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Expiry Date (days)</Label>
                  <Input
                    type="number"
                    placeholder="Number of days..."
                    value={shelfLifeDays ?? ""}
                    onChange={(e) =>
                      setShelfLifeDays(
                        e.target.value ? Number(e.target.value) : undefined,
                      )
                    }
                    min={0}
                  />
                </div>
              </div>

              {/* Reorder Point */}
              <div className="grid gap-2">
                <Label>Reorder Point</Label>
                <Input
                  type="number"
                  placeholder="Minimum quantity..."
                  value={reorderPoint ?? ""}
                  onChange={(e) =>
                    setReorderPoint(
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  min={0}
                />
              </div>

              {/* Default Variant Section (when no attributes) */}
              {variants.length === 0 && (
                <div className="rounded-md border p-4">
                  <h4 className="mb-3 font-semibold">
                    Default Variant Information
                  </h4>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>
                          SKU Code <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          placeholder="Enter SKU code..."
                          value={defaultSku}
                          onChange={(e) => setDefaultSku(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Barcode</Label>
                        <Input
                          placeholder="Enter barcode..."
                          value={defaultBarcode}
                          onChange={(e) => setDefaultBarcode(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Variants info (when has attributes) */}
              {variants.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                  <h4 className="mb-2 font-semibold text-amber-800">
                    Created {variants.length} variants from attributes
                  </h4>
                  <p className="text-amber-700 text-sm">
                    Variants will be automatically created when saving product.
                  </p>
                </div>
              )}

              {/* Manage Units & Attributes Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full border-amber-400 border-dashed text-amber-600"
                onClick={() => setUnitAttributeOpen(true)}
              >
                <Settings2 className="mr-2 h-4 w-4" />
                Manage Units & Attributes ({variants.length} variants)
              </Button>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={createProductMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-green-500 hover:bg-green-600"
                disabled={createProductMutation.isPending}
              >
                {createProductMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Product"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <UnitAttributeDialog
        open={unitAttributeOpen}
        onOpenChange={setUnitAttributeOpen}
        baseUnit={baseUnitName}
        productName={name}
        unitConversions={unitConversions}
        setUnitConversions={setUnitConversions}
        attributes={attributes}
        setAttributes={setAttributes}
        variants={variants}
        setVariants={setVariants}
      />
    </>
  );
}
