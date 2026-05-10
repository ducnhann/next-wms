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

interface ParsedSupplier {
  name: string;
  brandName: string;
  contactPerson: string;
  email: string;
  phone: string;
  leadTimeDays: number;
}

function parseExcelFile(file: File): Promise<ParsedSupplier[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        if (!sheet) {
          reject(new Error("No worksheet found in the Excel file"));
          return;
        }

        const suppliers: ParsedSupplier[] = [];
        let row = 2; // Start from row 2 (skip header)

        while (true) {
          const nameCell = sheet[`A${row}`];
          const brandCell = sheet[`B${row}`];
          const contactCell = sheet[`C${row}`];
          const emailCell = sheet[`D${row}`];
          const phoneCell = sheet[`E${row}`];
          const leadTimeCell = sheet[`F${row}`];

          // Stop if name is empty
          if (!nameCell?.v) {
            break;
          }

          const name = String(nameCell.v).trim();
          const brandName = brandCell?.v ? String(brandCell.v).trim() : "";
          const contactPerson = contactCell?.v
            ? String(contactCell.v).trim()
            : "";
          const email = emailCell?.v ? String(emailCell.v).trim() : "";
          const phone = phoneCell?.v ? String(phoneCell.v).trim() : "";
          const leadTimeDays = leadTimeCell?.v ? Number(leadTimeCell.v) : 0;

          // Basic validation
          if (
            !name ||
            !brandName ||
            !contactPerson ||
            !email ||
            !phone ||
            !leadTimeDays
          ) {
            // Skip incomplete rows
            row++;
            continue;
          }

          suppliers.push({
            name,
            brandName,
            contactPerson,
            email,
            phone,
            leadTimeDays,
          });

          row++;

          // Safety limit
          if (row > 10000) {
            break;
          }
        }

        resolve(suppliers);
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

export function ImportExcelButtonSuppliers() {
  const { organizationId } = useCurrentUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, setIsPending] = useState(false);

  // Query to get existing suppliers
  const { data: existingSuppliers } = useQuery({
    ...convexQuery(api.suppliers.getActive, {
      organizationId: organizationId as Id<"organizations">,
    }),
    enabled: !!organizationId,
  });

  // Query to get existing brands
  const { data: existingBrands } = useQuery({
    ...convexQuery(api.brands.listBrandsWithProductCount, {
      organizationId: organizationId as string,
    }),
    enabled: !!organizationId,
  });

  // Mutation to create supplier
  const { mutateAsync: createSupplier } = useMutation({
    mutationFn: useConvexMutation(api.suppliers.create),
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
      // Step 1: Parse Excel file
      const parsedSuppliers = await parseExcelFile(file);

      if (parsedSuppliers.length === 0) {
        throw new Error("No valid suppliers found in the Excel file");
      }

      // Step 2: Create brand name to ID mapping
      const brandMap = new Map<string, Id<"brands">>();
      existingBrands?.forEach((brand) => {
        brandMap.set(brand.name.toLowerCase(), brand._id as Id<"brands">);
      });

      // Step 3: Validate and prepare suppliers
      const validSuppliers: Array<ParsedSupplier & { brandId: Id<"brands"> }> =
        [];
      const errors: string[] = [];

      for (const supplier of parsedSuppliers) {
        // Validate brand exists
        const brandId = brandMap.get(supplier.brandName.toLowerCase());
        if (!brandId) {
          errors.push(`Brand "${supplier.brandName}" not found`);
          continue;
        }

        // Validate email format
        if (!supplier.email.includes("@")) {
          errors.push(`Invalid email for "${supplier.name}"`);
          continue;
        }

        // Validate lead time
        if (supplier.leadTimeDays < 0 || Number.isNaN(supplier.leadTimeDays)) {
          errors.push(`Invalid lead time for "${supplier.name}"`);
          continue;
        }

        validSuppliers.push({ ...supplier, brandId });
      }

      if (errors.length > 0) {
        toast.warning(
          `${errors.length} row(s) skipped due to validation errors`,
        );
      }

      // Step 4: Check for duplicates with existing suppliers
      const existingNames = new Set(
        existingSuppliers?.map((s) => s.name.toLowerCase()) || [],
      );
      const existingEmails = new Set(
        existingSuppliers?.map((s) => s.email.toLowerCase()) || [],
      );

      const newSuppliers: typeof validSuppliers = [];
      const duplicates: string[] = [];

      for (const supplier of validSuppliers) {
        if (existingNames.has(supplier.name.toLowerCase())) {
          duplicates.push(`Name: ${supplier.name}`);
          continue;
        }
        if (existingEmails.has(supplier.email.toLowerCase())) {
          duplicates.push(`Email: ${supplier.email}`);
          continue;
        }
        newSuppliers.push(supplier);
      }

      if (duplicates.length > 0) {
        toast.info(
          `${duplicates.length} supplier(s) already exist: ${duplicates.slice(0, 3).join(", ")}${duplicates.length > 3 ? "..." : ""}`,
        );
      }

      if (newSuppliers.length === 0) {
        toast.info("No new suppliers to import");
        setIsPending(false);
        return;
      }

      // Step 5: Create suppliers
      let successCount = 0;
      let errorCount = 0;

      for (const supplier of newSuppliers) {
        try {
          await createSupplier({
            organizationId: organizationId as Id<"organizations">,
            brandId: supplier.brandId,
            name: supplier.name,
            contactPerson: supplier.contactPerson,
            email: supplier.email,
            phone: supplier.phone,
            defaultLeadTimeDays: supplier.leadTimeDays,
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to create supplier "${supplier.name}":`, error);
          errorCount++;
        }
      }

      // Show summary
      if (successCount > 0) {
        toast.success(
          `Successfully imported ${successCount} supplier(s)${errorCount > 0 ? `, ${errorCount} failed` : ""}`,
        );
      } else if (errorCount > 0) {
        toast.error(`Failed to import ${errorCount} supplier(s)`);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to import suppliers",
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
        aria-label="Select Excel file to import suppliers"
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
