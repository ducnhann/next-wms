"use client";

import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";

interface ParsedRow {
  productName: string;
  categoryName: string;
  brandName: string;
  description: string;
  storage: string;
  tracking: string;
  shelfLifeDays?: number;
  reorderPoint?: number;
  variantName: string;
  skuCode: string;
  barcode?: string;
  unit?: string;
}

interface ProductGroup {
  productName: string;
  categoryName: string;
  brandName: string;
  description: string;
  storage: string;
  tracking: string;
  shelfLifeDays?: number;
  reorderPoint?: number;
  variants: VariantInfo[];
}

interface VariantInfo {
  variantName: string;
  skuCode: string;
  barcode?: string;
  unit?: string;
}

interface ExistingVariant {
  skuCode: string;
}

function parseExcelFile(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        if (!sheet) {
          reject(new Error("No worksheet found"));
          return;
        }

        const rows: ParsedRow[] = [];
        let row = 2; // Skip header

        while (true) {
          const productName = sheet[`A${row}`]?.v
            ? String(sheet[`A${row}`].v).trim()
            : "";
          if (!productName) break; // Stop if product name empty

          const categoryName = sheet[`B${row}`]?.v
            ? String(sheet[`B${row}`].v).trim()
            : "";
          const brandName = sheet[`C${row}`]?.v
            ? String(sheet[`C${row}`].v).trim()
            : "";
          const description = sheet[`D${row}`]?.v
            ? String(sheet[`D${row}`].v).trim()
            : "";
          const storage = sheet[`E${row}`]?.v
            ? String(sheet[`E${row}`].v).trim()
            : "";
          const tracking = sheet[`F${row}`]?.v
            ? String(sheet[`F${row}`].v).trim()
            : "";
          const shelfLifeDays = sheet[`G${row}`]?.v
            ? Number(sheet[`G${row}`].v)
            : undefined;
          const reorderPoint = sheet[`H${row}`]?.v
            ? Number(sheet[`H${row}`].v)
            : undefined;
          const variantName = sheet[`I${row}`]?.v
            ? String(sheet[`I${row}`].v).trim()
            : "";
          const skuCode = sheet[`J${row}`]?.v
            ? String(sheet[`J${row}`].v).trim()
            : "";
          const barcode = sheet[`K${row}`]?.v
            ? String(sheet[`K${row}`].v).trim()
            : undefined;
          const unit = sheet[`L${row}`]?.v
            ? String(sheet[`L${row}`].v).trim()
            : undefined;

          // Basic validation
          if (
            !productName ||
            !categoryName ||
            !brandName ||
            !description ||
            !storage ||
            !tracking ||
            !variantName ||
            !skuCode
          ) {
            row++;
            continue; // Skip incomplete rows
          }

          rows.push({
            productName,
            categoryName,
            brandName,
            description,
            storage,
            tracking,
            shelfLifeDays,
            reorderPoint,
            variantName,
            skuCode,
            barcode,
            unit,
          });

          row++;
          if (row > 10000) break; // Safety limit
        }

        resolve(rows);
      } catch (_error) {
        reject(new Error("Failed to parse Excel file"));
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

function groupByProduct(rows: ParsedRow[]): Map<string, ProductGroup> {
  const groups = new Map<string, ProductGroup>();

  for (const row of rows) {
    const key = row.productName.toLowerCase();

    let group = groups.get(key);
    if (!group) {
      // First row for this product
      group = {
        productName: row.productName,
        categoryName: row.categoryName,
        brandName: row.brandName,
        description: row.description,
        storage: row.storage,
        tracking: row.tracking,
        shelfLifeDays: row.shelfLifeDays,
        reorderPoint: row.reorderPoint,
        variants: [],
      };
      groups.set(key, group);
    }

    // Add variant
    group.variants.push({
      variantName: row.variantName,
      skuCode: row.skuCode,
      barcode: row.barcode,
      unit: row.unit,
    });
  }

  return groups;
}

export function ImportExcelButtonProducts() {
  const { organizationId } = useCurrentUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, setIsPending] = useState(false);

  // Query existing data
  const { data: existingProducts } = useQuery({
    ...convexQuery(api.products.listWithDetails, {
      organizationId: organizationId as Id<"organizations">,
    }),
    enabled: !!organizationId,
  });

  const { data: categories } = useQuery({
    ...convexQuery(api.categories.getTree, {
      organizationId: organizationId as Id<"organizations">,
    }),
    enabled: !!organizationId,
  });

  const { data: brands } = useQuery({
    ...convexQuery(api.brands.listBrandsWithProductCount, {
      organizationId: organizationId as string,
    }),
    enabled: !!organizationId,
  });

  const { data: systemLookups } = useQuery({
    ...convexQuery(api.systemLookups.list, {
      organizationId: organizationId as Id<"organizations">,
    }),
    enabled: !!organizationId,
  });

  // Mutation
  const { mutateAsync: createProduct } = useMutation({
    mutationFn: useConvexMutation(api.products.createWithVariants),
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImport(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImport = async (file: File) => {
    if (!organizationId) {
      toast.error("Organization not found");
      return;
    }

    setIsPending(true);

    try {
      // Step 1: Parse Excel
      const rows = await parseExcelFile(file);
      if (rows.length === 0) {
        throw new Error("No valid data found");
      }

      // Step 2: Group by product
      const productGroups = groupByProduct(rows);

      // Step 3: Build mappings
      const categoryMap = new Map<string, Id<"categories">>();
      categories?.forEach((c) => {
        categoryMap.set(c.name.toLowerCase(), c._id as Id<"categories">);
      });

      const brandMap = new Map<string, Id<"brands">>();
      brands?.forEach((b) => {
        brandMap.set(b.name.toLowerCase(), b._id as Id<"brands">);
      });

      const storageMap = new Map<string, Id<"system_lookups">>();
      const trackingMap = new Map<string, Id<"system_lookups">>();
      const unitMap = new Map<string, Id<"system_lookups">>();

      // Debug: Log systemLookups
      console.log("Total systemLookups:", systemLookups?.length);
      const storageLookups = systemLookups?.filter(
        (l) => l.lookupType === "StorageRequirement",
      );
      console.log("Storage lookups found:", storageLookups);

      systemLookups?.forEach((lookup) => {
        const code = lookup.lookupCode?.toLowerCase();
        const value = lookup.lookupValue?.toLowerCase();

        if (lookup.lookupType === "StorageRequirement") {
          if (code) storageMap.set(code, lookup._id as Id<"system_lookups">);
          if (value) storageMap.set(value, lookup._id as Id<"system_lookups">);
        }
        if (lookup.lookupType === "TrackingMethod") {
          if (code) trackingMap.set(code, lookup._id as Id<"system_lookups">);
          if (value) trackingMap.set(value, lookup._id as Id<"system_lookups">);
        }
        if (lookup.lookupType === "UnitOfMeasure") {
          if (code) unitMap.set(code, lookup._id as Id<"system_lookups">);
          if (value) unitMap.set(value, lookup._id as Id<"system_lookups">);
        }
      });

      // Debug: Log mappings
      console.log("Storage Map:", Array.from(storageMap.entries()));
      console.log("Tracking Map:", Array.from(trackingMap.entries()));
      console.log("Unit Map:", Array.from(unitMap.entries()));

      // Get default barcode type
      const defaultBarcodeType = systemLookups?.find(
        (l) => l.lookupType === "BarcodeType" && l.lookupCode === "EAN13",
      );

      // Step 4: Validate & Create
      const errors: string[] = [];
      const existingProductNames = new Set(
        existingProducts?.map((p) => p.name.toLowerCase()) || [],
      );
      const existingSkus = new Set<string>();
      existingProducts?.forEach((p) => {
        p.variants.forEach((v: ExistingVariant) => {
          existingSkus.add(v.skuCode.toLowerCase());
        });
      });

      let successCount = 0;
      let errorCount = 0;

      for (const [_, group] of productGroups) {
        // Check product name
        if (existingProductNames.has(group.productName.toLowerCase())) {
          errors.push(`Product "${group.productName}" already exists`);
          continue;
        }

        // Check category
        const categoryId = categoryMap.get(group.categoryName.toLowerCase());
        if (!categoryId) {
          errors.push(`Category "${group.categoryName}" not found`);
          continue;
        }

        // Check brand
        const brandId = brandMap.get(group.brandName.toLowerCase());
        if (!brandId) {
          errors.push(`Brand "${group.brandName}" not found`);
          continue;
        }

        // Check storage
        console.log(
          `Looking for storage: "${group.storage}" (lowercase: "${group.storage.toLowerCase()}")`,
        );
        const storageId = storageMap.get(group.storage.toLowerCase());
        if (!storageId) {
          errors.push(`Storage "${group.storage}" not found`);
          continue;
        }

        // Check tracking
        const trackingId = trackingMap.get(group.tracking.toLowerCase());
        if (!trackingId) {
          errors.push(`Tracking "${group.tracking}" not found`);
          continue;
        }

        // Validate variants
        const validVariants = [];
        for (const variant of group.variants) {
          // Check SKU uniqueness
          if (existingSkus.has(variant.skuCode.toLowerCase())) {
            errors.push(`SKU "${variant.skuCode}" already exists`);
            continue;
          }

          // Get unit ID
          const unitId =
            unitMap.get(variant.unit?.toLowerCase() || "piece") ||
            unitMap.get("piece");
          if (!unitId) {
            errors.push(`Unit "${variant.unit || "piece"}" not found`);
            continue;
          }

          validVariants.push({
            skuCode: variant.skuCode,
            description: variant.variantName,
            costPrice: 0,
            sellingPrice: 0,
            unitOfMeasureId: unitId,
            temperatureSensitive: false,
            isActive: true,
            barcodes: variant.barcode
              ? [
                  {
                    barcodeTypeId:
                      (defaultBarcodeType?._id as Id<"system_lookups">) ||
                      (systemLookups?.[0]?._id as Id<"system_lookups">),
                    barcodeValue: variant.barcode,
                  },
                ]
              : undefined,
          });

          existingSkus.add(variant.skuCode.toLowerCase());
        }

        if (validVariants.length === 0) {
          errors.push(`No valid variants for product "${group.productName}"`);
          continue;
        }

        // Create product with variants
        try {
          await createProduct({
            organizationId: organizationId as Id<"organizations">,
            name: group.productName,
            description: group.description,
            categoryId,
            brandId,
            storageRequirementTypeId: storageId,
            trackingMethodTypeId: trackingId,
            shelfLifeDays: group.shelfLifeDays,
            reorderPoint: group.reorderPoint,
            isActive: true,
            variants: validVariants,
          });
          successCount++;
          existingProductNames.add(group.productName.toLowerCase());
        } catch (error) {
          console.error(
            `Failed to create product "${group.productName}":`,
            error,
          );
          errorCount++;
        }
      }

      // Show results
      if (errors.length > 0) {
        toast.warning(
          `${errors.length} error(s): ${errors.slice(0, 3).join(", ")}${errors.length > 3 ? "..." : ""}`,
        );
      }

      if (successCount > 0) {
        toast.success(
          `Successfully imported ${successCount} product(s)${errorCount > 0 ? `, ${errorCount} failed` : ""}`,
        );
      } else if (errorCount > 0) {
        toast.error(`Failed to import ${errorCount} product(s)`);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to import products",
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={isPending}
      >
        <Upload className="mr-2 h-4 w-4" />
        {isPending ? "Importing..." : "Import Excel"}
      </Button>
    </>
  );
}
