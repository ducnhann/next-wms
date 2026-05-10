"use client";

import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { Check, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import {
  ImportExcelButton,
  type ResolvedImportData,
} from "@/components/import-excel-button";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBranches } from "@/hooks/use-branches";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { PurchaseOrderProductItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AddPurchaseOrderDialogProps {
  trigger?: React.ReactNode;
  // Props for Excel import pre-fill
  initialBranchId?: string;
  initialSupplierId?: string;
  initialProducts?: Array<{
    variantId: string;
    skuCode: string;
    description: string;
    quantity: number;
  }>;
  // External dialog control
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddPurchaseOrderDialog({
  trigger,
  initialBranchId,
  initialSupplierId,
  initialProducts,
  defaultOpen = false,
  onOpenChange,
}: AddPurchaseOrderDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);

  // Use external control if provided, otherwise use internal state
  const open = onOpenChange ? defaultOpen : internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [receivingBranchId, setReceivingBranchId] = React.useState<string>("");
  const [supplierId, setSupplierId] = React.useState<string>("");
  const [products, setProducts] = React.useState<PurchaseOrderProductItem[]>(
    [],
  );
  const [skuPopoverOpen, setSkuPopoverOpen] = React.useState(false);
  const [zonePopoverOpenId, setZonePopoverOpenId] = React.useState<
    string | null
  >(null);

  const { userId, organizationId } = useCurrentUser();
  const { currentBranch, branches } = useBranches({ organizationId });

  // Initialize from props when dialog opens with pre-filled data
  React.useEffect(() => {
    if (open) {
      // Set branch: prefer initialBranchId, then currentBranch
      if (initialBranchId) {
        setReceivingBranchId(initialBranchId);
      } else if (currentBranch && !receivingBranchId) {
        setReceivingBranchId(currentBranch._id);
      }

      // Set supplier from import
      if (initialSupplierId) {
        setSupplierId(initialSupplierId);
      }

      // Set products from import
      if (initialProducts && initialProducts.length > 0) {
        const mappedProducts: PurchaseOrderProductItem[] = initialProducts.map(
          (p, index) => ({
            id: `import-${index}-${Date.now()}`,
            variantId: p.variantId as Id<"product_variants">,
            skuCode: p.skuCode,
            description: p.description,
            quantity: p.quantity,
          }),
        );
        setProducts(mappedProducts);
      }
    }
  }, [
    open,
    currentBranch,
    initialBranchId,
    initialSupplierId,
    initialProducts,
    receivingBranchId,
  ]);

  // Fetch next PO code when branch is selected
  const { data: nextPoCode } = useQuery({
    ...convexQuery(
      api.purchaseOrders.generateNextPurchaseOrderCode,
      receivingBranchId
        ? {
            branchId: receivingBranchId as Id<"branches">,
          }
        : "skip",
    ),
    enabled: !!receivingBranchId && open,
  });

  // Fetch active suppliers
  const { data: suppliers, isLoading: isLoadingSuppliers } = useQuery({
    ...convexQuery(
      api.suppliers.getActive,
      organizationId
        ? {
            organizationId: organizationId as Id<"organizations">,
          }
        : "skip",
    ),
    enabled: !!organizationId && open,
  });

  // Fetch product variants filtered by supplier
  const { data: productVariants, isLoading: isLoadingProducts } = useQuery({
    ...convexQuery(
      api.purchaseOrders.getProductVariantsBySupplier,
      supplierId
        ? {
            supplierId: supplierId as Id<"suppliers">,
          }
        : "skip",
    ),
    enabled: !!supplierId && open,
  });

  // Clear products when supplier changes
  const previousSupplierIdRef = React.useRef<string>(supplierId);
  React.useEffect(() => {
    if (
      previousSupplierIdRef.current !== supplierId &&
      previousSupplierIdRef.current !== ""
    ) {
      // Supplier changed, clear the products list
      setProducts([]);
    }
    previousSupplierIdRef.current = supplierId;
  }, [supplierId]);

  // Fetch rack-type zones for selected branch
  const { data: zones, isLoading: isLoadingZones } = useQuery({
    ...convexQuery(
      api.storageZones.getRackByBranch,
      receivingBranchId
        ? {
            branchId: receivingBranchId as Id<"branches">,
          }
        : "skip",
    ),
    enabled: !!receivingBranchId && open,
  });

  // Get list of already selected variant IDs
  const selectedVariantIds = products.map((p) => p.variantId);

  // Filter out already selected products (use variantId from getProductVariantsBySupplier response)
  const availableProducts =
    productVariants?.filter(
      (pv) => !selectedVariantIds.includes(pv.variantId),
    ) ?? [];

  const handleAddProduct = (
    product: NonNullable<typeof productVariants>[0],
  ) => {
    const newProduct: PurchaseOrderProductItem = {
      id: String(Date.now()),
      variantId: product.variantId,
      skuCode: product.skuCode,
      description: product.description,
      quantity: 1,
    };
    setProducts([...products, newProduct]);
    setSkuPopoverOpen(false);
  };

  const handleRemoveProduct = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
  };

  const handleUpdateProductQuantity = (id: string, quantity: number) => {
    setProducts(products.map((p) => (p.id === id ? { ...p, quantity } : p)));
  };

  const handleSelectZone = (
    productId: string,
    zone: NonNullable<typeof zones>[0],
  ) => {
    setProducts(
      products.map((p) =>
        p.id === productId
          ? { ...p, zoneId: zone._id, zoneName: zone.name }
          : p,
      ),
    );
    setZonePopoverOpenId(null);
  };

  // Create purchase order mutation
  const createPurchaseOrder = useConvexMutation(
    api.purchaseOrders.createPurchaseOrder,
  );

  const { mutate: handleCreatePurchaseOrder, isPending: isCreating } =
    useMutation({
      mutationFn: async () => {
        if (
          !receivingBranchId ||
          !supplierId ||
          !userId ||
          products.length === 0
        ) {
          throw new Error("Please fill all required fields");
        }

        // Validate all products have zones
        const productsWithoutZones = products.filter((p) => !p.zoneId);
        if (productsWithoutZones.length > 0) {
          throw new Error(
            `Please select a zone for: ${productsWithoutZones.map((p) => p.skuCode).join(", ")}`,
          );
        }

        return createPurchaseOrder({
          receivingBranchId: receivingBranchId as Id<"branches">,
          userId: userId as Id<"users">,
          supplierId: supplierId as Id<"suppliers">,
          items: products.map((p) => ({
            variantId: p.variantId,
            quantity: p.quantity,
            zoneId: p.zoneId as Id<"storage_zones">,
          })),
        });
      },
      onSuccess: (result) => {
        toast.success(`Purchase order ${result.code} created successfully`);
        // Reset form
        setReceivingBranchId("");
        setSupplierId("");
        setProducts([]);
        setOpen(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create purchase order");
      },
    });

  const handleSubmit = () => {
    if (!receivingBranchId) {
      toast.error("Please select a receiving branch");
      return;
    }
    if (!supplierId) {
      toast.error("Please select a supplier");
      return;
    }
    if (products.length === 0) {
      toast.error("Please add at least one product");
      return;
    }
    // Validate all products have zones
    const productsWithoutZones = products.filter((p) => !p.zoneId);
    if (productsWithoutZones.length > 0) {
      toast.error(
        `Please select a zone for: ${productsWithoutZones.map((p) => p.skuCode).join(", ")}`,
      );
      return;
    }
    handleCreatePurchaseOrder();
  };

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setReceivingBranchId("");
      setSupplierId("");
      setProducts([]);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus />
            Add New
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex max-h-250 w-full flex-col overflow-hidden sm:max-w-3xl">
        <DialogHeader className="flex flex-row items-center justify-between pr-8">
          <DialogTitle>New Purchase Order</DialogTitle>
          <ImportExcelButton
            onImportComplete={(data: ResolvedImportData) => {
              // Set branch from import
              if (data.branchId) {
                setReceivingBranchId(data.branchId);
              }
              // Set supplier from import
              if (data.supplierId) {
                setSupplierId(data.supplierId);
              }
              // Set products from import
              if (data.products && data.products.length > 0) {
                const mappedProducts: PurchaseOrderProductItem[] =
                  data.products.map((p, index) => ({
                    id: `import-${index}-${Date.now()}`,
                    variantId: p.variantId as Id<"product_variants">,
                    skuCode: p.skuCode,
                    description: p.description,
                    quantity: p.quantity,
                  }));
                setProducts(mappedProducts);
                toast.success(`Imported ${mappedProducts.length} products`);
              }
            }}
          />
        </DialogHeader>

        {/* Form Fields */}
        <div className="flex w-full flex-row gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="po-id">
              PO-ID<span className="text-destructive">*</span>
            </Label>
            <Input
              id="po-id"
              value={nextPoCode?.code ?? "Loading..."}
              disabled
              className="w-full bg-muted"
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="receiving-branch">
              Receiving Branch<span className="text-destructive">*</span>
            </Label>
            <Select
              value={receivingBranchId}
              onValueChange={setReceivingBranchId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                {branches
                  ?.filter((b) => b.isActive && !b.isDeleted)
                  .map((branch) => (
                    <SelectItem key={branch._id} value={branch._id}>
                      {branch.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 space-y-2">
            <Label htmlFor="supplier">
              Supplier <span className="text-destructive">*</span>
            </Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingSuppliers ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="size-4 animate-spin" />
                  </div>
                ) : (
                  suppliers?.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Products Table */}
        <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="max-h-75 overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-3">SKU Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-20 text-center text-muted-foreground"
                    >
                      No products added yet. Click "Add product" to add items.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="px-3 font-medium">
                        {product.skuCode}
                      </TableCell>
                      <TableCell>{product.description}</TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min={1}
                          value={product.quantity}
                          onChange={(e) =>
                            handleUpdateProductQuantity(
                              product.id,
                              Number.parseInt(e.target.value, 10) || 1,
                            )
                          }
                          className="mx-auto w-20 text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <Popover
                          open={zonePopoverOpenId === product.id}
                          onOpenChange={(isOpen) =>
                            setZonePopoverOpenId(isOpen ? product.id : null)
                          }
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "w-full justify-start",
                                !product.zoneName && "text-muted-foreground",
                              )}
                              disabled={!receivingBranchId || isLoadingZones}
                            >
                              <MapPin className="mr-1 size-4" />
                              {product.zoneName || "Select zone"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-62.5 p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search zones..." />
                              <CommandList>
                                <CommandEmpty>No zone found.</CommandEmpty>
                                <CommandGroup>
                                  {zones?.map((zone) => (
                                    <CommandItem
                                      key={zone._id}
                                      value={zone.name}
                                      onSelect={() =>
                                        handleSelectZone(product.id, zone)
                                      }
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          product.zoneId === zone._id
                                            ? "opacity-100"
                                            : "opacity-0",
                                        )}
                                      />
                                      {zone.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveProduct(product.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Add Product Button with SKU Selection */}
          <Popover open={skuPopoverOpen} onOpenChange={setSkuPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="mt-4"
                disabled={!supplierId || isLoadingProducts}
                title={
                  !supplierId ? "Please select a supplier first" : undefined
                }
              >
                {!supplierId ? (
                  <>Select supplier first</>
                ) : isLoadingProducts ? (
                  <>
                    <Loader2 className="mr-1 size-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    Add product <Plus className="ml-1 size-4" />
                  </>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-87.5 p-0" align="start">
              <Command>
                <CommandInput placeholder="Search SKU code or description..." />
                <CommandList>
                  <CommandEmpty>No product found.</CommandEmpty>
                  <CommandGroup heading="Available Products">
                    {availableProducts.map((product) => (
                      <CommandItem
                        key={product.productId}
                        value={`${product.skuCode} ${product.description}`}
                        onSelect={() => handleAddProduct(product)}
                        className="flex flex-col items-start gap-1 py-2"
                      >
                        <span className="font-medium text-blue-600">
                          {product.skuCode}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          {product.description}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Footer */}
        <DialogFooter className="mt-6">
          <Button
            onClick={handleSubmit}
            disabled={
              isCreating ||
              !receivingBranchId ||
              !supplierId ||
              products.length === 0
            }
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Purchase Order"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
