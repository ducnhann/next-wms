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

interface ParsedCategory {
  name: string;
  parentName?: string;
}

interface CategoryToCreate {
  name: string;
  parentId?: Id<"categories">;
  level: number;
}

function parseExcelFile(file: File): Promise<ParsedCategory[]> {
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

        const categories: ParsedCategory[] = [];
        let row = 2; // Start from row 2 (skip header)

        while (true) {
          const nameCell = sheet[`A${row}`];
          const parentCell = sheet[`B${row}`];

          // Stop if name cell is empty
          if (!nameCell?.v) {
            break;
          }

          const name = String(nameCell.v).trim();
          const parentName = parentCell?.v
            ? String(parentCell.v).trim()
            : undefined;

          if (name) {
            categories.push({
              name,
              parentName: parentName || undefined,
            });
          }

          row++;

          // Safety limit
          if (row > 10000) {
            break;
          }
        }

        resolve(categories);
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

export function ImportExcelButtonCategories() {
  const { organizationId } = useCurrentUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, setIsPending] = useState(false);

  // Query to get existing categories
  const { data: existingCategories } = useQuery({
    ...convexQuery(api.categories.getTree, {
      organizationId: organizationId as Id<"organizations">,
    }),
    enabled: !!organizationId,
  });

  // Mutation to create category
  const { mutateAsync: createCategory } = useMutation({
    mutationFn: useConvexMutation(api.categories.create),
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
      const parsedCategories = await parseExcelFile(file);

      if (parsedCategories.length === 0) {
        throw new Error("No categories found in the Excel file");
      }

      // Step 2: Check for duplicates within Excel
      const uniqueNames = new Map<string, ParsedCategory>();
      const duplicatesInFile: string[] = [];

      for (const category of parsedCategories) {
        const lowerName = category.name.toLowerCase();
        if (uniqueNames.has(lowerName)) {
          duplicatesInFile.push(category.name);
        } else {
          uniqueNames.set(lowerName, category);
        }
      }

      if (duplicatesInFile.length > 0) {
        toast.warning(
          `Found ${duplicatesInFile.length} duplicate(s) in Excel file`,
        );
      }

      // Step 3: Filter out categories that already exist
      const existingNames = new Set(
        existingCategories?.map((c) => c.name.toLowerCase()) || [],
      );

      const newCategories: ParsedCategory[] = [];
      const alreadyExists: string[] = [];

      for (const category of Array.from(uniqueNames.values())) {
        if (existingNames.has(category.name.toLowerCase())) {
          alreadyExists.push(category.name);
        } else {
          newCategories.push(category);
        }
      }

      if (alreadyExists.length > 0) {
        toast.info(
          `${alreadyExists.length} category(ies) already exist: ${alreadyExists.slice(0, 3).join(", ")}${alreadyExists.length > 3 ? "..." : ""}`,
        );
      }

      if (newCategories.length === 0) {
        toast.info("No new categories to import");
        setIsPending(false);
        return;
      }

      // Step 4: Build hierarchy and sort by levels
      const categoryMap = new Map<string, CategoryToCreate>();
      const createdCategoryPaths = new Map<string, string>(); // name -> path

      // First pass: identify all categories and their levels
      const calculateLevel = (
        cat: ParsedCategory,
        visited = new Set<string>(),
      ): number => {
        if (!cat.parentName) return 0; // Root category

        // Detect circular reference
        if (visited.has(cat.name.toLowerCase())) {
          throw new Error(
            `Circular reference detected involving "${cat.name}"`,
          );
        }

        visited.add(cat.name.toLowerCase());

        // Find parent in new categories
        const parent = Array.from(uniqueNames.values()).find(
          (c) => c.name.toLowerCase() === cat.parentName?.toLowerCase(),
        );

        if (!parent) {
          // Parent not in Excel, might be existing category
          const existingParent = existingCategories?.find(
            (c) => c.name.toLowerCase() === cat.parentName?.toLowerCase(),
          );

          if (existingParent) {
            return 1; // Child of existing category
          }

          // Parent doesn't exist anywhere
          throw new Error(
            `Parent category "${cat.parentName}" not found for "${cat.name}"`,
          );
        }

        return calculateLevel(parent, visited) + 1;
      };

      // Calculate levels for all categories
      for (const category of newCategories) {
        const level = calculateLevel(category);
        categoryMap.set(category.name.toLowerCase(), {
          name: category.name,
          parentName: category.parentName,
          level,
        } as CategoryToCreate);
      }

      // Sort by level (create parents before children)
      const sortedCategories = Array.from(categoryMap.values()).sort(
        (a, b) => a.level - b.level,
      );

      // Step 5: Create categories in order
      let successCount = 0;
      let errorCount = 0;

      for (const category of sortedCategories) {
        try {
          let parentPath: string | undefined;

          // Find parent path
          if (category.parentName) {
            // Check if parent was just created
            parentPath = createdCategoryPaths.get(
              category.parentName.toLowerCase(),
            );

            // If not, check existing categories
            if (!parentPath) {
              const existingParent = existingCategories?.find(
                (c) =>
                  c.name.toLowerCase() === category.parentName?.toLowerCase(),
              );
              parentPath = existingParent?.path;
            }
          }

          const _newCategoryId = await createCategory({
            organizationId: organizationId as Id<"organizations">,
            name: category.name,
            parentPath,
          });

          // Calculate and store the path for this category
          const categoryPath = parentPath
            ? `${parentPath}.${category.name.toLowerCase().replace(/\s+/g, "_")}`
            : category.name.toLowerCase().replace(/\s+/g, "_");

          createdCategoryPaths.set(category.name.toLowerCase(), categoryPath);
          successCount++;
        } catch (error) {
          console.error(`Failed to create category "${category.name}":`, error);
          errorCount++;
        }
      }

      // Show summary
      if (successCount > 0) {
        toast.success(
          `Successfully imported ${successCount} category(ies)${errorCount > 0 ? `, ${errorCount} failed` : ""}`,
        );
      } else if (errorCount > 0) {
        toast.error(`Failed to import ${errorCount} category(ies)`);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to import categories",
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
