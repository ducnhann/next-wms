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

interface ParsedBrand {
  name: string;
}

function parseExcelFile(file: File): Promise<ParsedBrand[]> {
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

        // Extract brand names from column A (starting from A2)
        const brands: ParsedBrand[] = [];
        let row = 2; // Start from row 2 (A2)

        while (true) {
          const cell = sheet[`A${row}`];

          // Stop if cell is empty
          if (!cell?.v) {
            break;
          }

          const brandName = String(cell.v).trim();

          if (brandName) {
            brands.push({ name: brandName });
          }

          row++;

          // Safety limit to prevent infinite loops
          if (row > 10000) {
            break;
          }
        }

        resolve(brands);
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

export function ImportExcelButtonBrands() {
  const { organizationId } = useCurrentUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, setIsPending] = useState(false);

  // Query to get existing brands
  const { data: existingBrands } = useQuery({
    ...convexQuery(api.brands.listBrandsWithProductCount, {
      organizationId: organizationId as Id<"organizations">,
    }),
    enabled: !!organizationId,
  });

  // Mutation to create brand
  const { mutateAsync: createBrand } = useMutation({
    mutationFn: useConvexMutation(api.brands.createBrand),
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImport(file);
    }
    // Reset input so same file can be selected again
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
      // Step 1: Parse Excel file
      const parsedBrands = await parseExcelFile(file);

      if (parsedBrands.length === 0) {
        throw new Error("No brands found in the Excel file");
      }

      // Step 2: Check for duplicates within Excel file
      const uniqueBrands = new Map<string, ParsedBrand>();
      const duplicatesInFile: string[] = [];

      for (const brand of parsedBrands) {
        const lowerName = brand.name.toLowerCase();
        if (uniqueBrands.has(lowerName)) {
          duplicatesInFile.push(brand.name);
        } else {
          uniqueBrands.set(lowerName, brand);
        }
      }

      if (duplicatesInFile.length > 0) {
        toast.warning(
          `Found ${duplicatesInFile.length} duplicate(s) in Excel: ${duplicatesInFile.slice(0, 3).join(", ")}${duplicatesInFile.length > 3 ? "..." : ""}`,
        );
      }

      // Step 3: Filter out brands that already exist in database
      const existingBrandNames = new Set(
        existingBrands?.map((b) => b.name.toLowerCase()) || [],
      );

      const newBrands: ParsedBrand[] = [];
      const alreadyExists: string[] = [];

      for (const brand of Array.from(uniqueBrands.values())) {
        if (existingBrandNames.has(brand.name.toLowerCase())) {
          alreadyExists.push(brand.name);
        } else {
          newBrands.push(brand);
        }
      }

      if (alreadyExists.length > 0) {
        toast.info(
          `${alreadyExists.length} brand(s) already exist: ${alreadyExists.slice(0, 3).join(", ")}${alreadyExists.length > 3 ? "..." : ""}`,
        );
      }

      if (newBrands.length === 0) {
        toast.info("No new brands to import");
        setIsPending(false);
        return;
      }

      // Step 4: Create brands
      let successCount = 0;
      let errorCount = 0;

      for (const brand of newBrands) {
        try {
          await createBrand({
            organizationId: organizationId as Id<"organizations">,
            name: brand.name,
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to create brand "${brand.name}":`, error);
          errorCount++;
        }
      }

      // Show summary
      if (successCount > 0) {
        toast.success(
          `Successfully imported ${successCount} brand(s)${errorCount > 0 ? `, ${errorCount} failed` : ""}`,
        );
      } else if (errorCount > 0) {
        toast.error(`Failed to import ${errorCount} brand(s)`);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to import brands",
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
        aria-label="Select Excel file to import brands"
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
