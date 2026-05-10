"use client";

import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { useConvex } from "convex/react";
import { Loader2, Upload } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";

// Types for parsed Excel data
export interface ParsedExcelProduct {
  skuCode: string;
  quantity: number;
}

export interface ParsedExcelData {
  products: ParsedExcelProduct[];
}

// Types for resolved data after API lookups
export interface ResolvedImportData {
  products: Array<{
    variantId: string;
    skuCode: string;
    description: string;
    quantity: number;
  }>;
  skippedSkus: string[];
}

interface ImportExcelButtonOutboundProps {
  onImportComplete: (data: ResolvedImportData) => void;
}

/**
 * Parse Excel file to extract outbound order data
 * Cell mapping:
 * - C7:C∞: SKU codes (until empty)
 * - H7:H∞: Quantities (corresponding to SKU codes)
 */
function parseExcelFile(file: File): Promise<ParsedExcelData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        if (!sheet) {
          reject(new Error("No worksheet found in the Excel file"));
          return;
        }

        // Extract products from C7:H7 onwards
        const products: ParsedExcelProduct[] = [];
        let row = 7;

        while (true) {
          const skuCell = sheet[`C${row}`];
          const quantityCell = sheet[`H${row}`];

          // Stop if SKU cell is empty
          if (!skuCell?.v) {
            break;
          }

          const skuCode = String(skuCell.v).trim();
          const quantity = Number(quantityCell?.v) || 0;

          if (skuCode && quantity > 0) {
            products.push({ skuCode, quantity });
          }

          row++;

          // Safety limit to prevent infinite loops
          if (row > 1000) {
            break;
          }
        }

        resolve({
          products,
        });
      } catch (_error) {
        reject(
          new Error(
            "Failed to parse Excel file. Please check the file format.",
          ),
        );
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read the file"));
    };

    reader.readAsArrayBuffer(file);
  });
}

export function ImportExcelButtonOutbound({
  onImportComplete,
}: ImportExcelButtonOutboundProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { organizationId } = useCurrentUser();
  const convex = useConvex();
  const [isPending, setIsPending] = React.useState(false);

  const handleImport = async (file: File) => {
    if (!organizationId) {
      toast.error("Organization not found");
      return;
    }

    setIsPending(true);

    try {
      // Step 1: Parse Excel file
      const parsedData = await parseExcelFile(file);

      if (parsedData.products.length === 0) {
        throw new Error("No products found in the Excel file");
      }

      // Step 2: Batch lookup SKU codes
      const skuCodes = parsedData.products.map((p) => p.skuCode);
      const variantsResult = await convex.query(
        api.purchaseOrders.getVariantsBySkuCodes,
        {
          organizationId: organizationId as Id<"organizations">,
          skuCodes,
        },
      );

      // Map variants by SKU code for easy lookup
      const variantMap = new Map(
        variantsResult.map((v) => [v.skuCode.toLowerCase().trim(), v]),
      );

      // Match products with variants
      const resolvedProducts: ResolvedImportData["products"] = [];
      const skippedSkus: string[] = [];

      for (const product of parsedData.products) {
        const variant = variantMap.get(product.skuCode.toLowerCase().trim());

        if (variant) {
          resolvedProducts.push({
            variantId: variant._id,
            skuCode: variant.skuCode,
            description: variant.description,
            quantity: product.quantity,
          });
        } else {
          skippedSkus.push(product.skuCode);
        }
      }

      // Show warning for skipped SKUs
      if (skippedSkus.length > 0) {
        toast.warning(
          `${skippedSkus.length} SKU(s) not found: ${skippedSkus.slice(0, 3).join(", ")}${skippedSkus.length > 3 ? "..." : ""}`,
        );
      }

      if (resolvedProducts.length === 0) {
        throw new Error("No valid products found in the Excel file");
      }

      toast.success(
        `Imported ${resolvedProducts.length} product(s) from Excel`,
      );

      onImportComplete({
        products: resolvedProducts,
        skippedSkus,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to import Excel file",
      );
    } finally {
      setIsPending(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImport(file);
    }
    // Reset input so the same file can be selected again
    event.target.value = "";
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        variant="outline"
        onClick={handleClick}
        disabled={isPending || !organizationId}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-1 size-4 animate-spin" />
            Importing...
          </>
        ) : (
          <>
            <Upload className="mr-1 size-4" />
            Import Excel
          </>
        )}
      </Button>
    </>
  );
}
