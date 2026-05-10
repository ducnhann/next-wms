"use client";

import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import {
  ImportExcelButtonOutbound,
  type ResolvedImportData,
} from "@/components/import-excel-button-outbound";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { cn } from "@/lib/utils";

interface ProductItem {
  id: string;
  variantId: Id<"product_variants">;
  skuCode: string;
  productName: string;
  availableQuantity: number;
  quantity: number;
}

interface AddOutboundOrderDialogProps {
  trigger?: React.ReactNode;
}

export function AddOutboundOrderDialog({
  trigger,
}: AddOutboundOrderDialogProps) {
  const { userId, organizationId } = useCurrentUser();
  const { currentBranch } = useBranches({
    organizationId: organizationId as Id<"organizations"> | undefined,
    includeDeleted: false,
  });

  const [open, setOpen] = React.useState(false);
  const [requestedShipDate, setRequestedShipDate] = React.useState<Date>();
  const [products, setProducts] = React.useState<ProductItem[]>([]);
  const [skuPopoverOpen, setSkuPopoverOpen] = React.useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = React.useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = React.useState<string>("");

  // Fetch available SKUs
  const { data: availableSkus } = useQuery({
    ...convexQuery(
      api.outboundOrders.getProductVariantsForOutbound,
      currentBranch ? { branchId: currentBranch._id } : "skip",
    ),
    enabled: !!currentBranch && open,
  });

  // Create mutation
  const createOrderMutation = useMutation({
    mutationFn: useConvexMutation(api.outboundOrders.createOutboundOrder),
  });

  // Fetch organization users for assigned worker dropdown
  const { data: organizationUsers, isLoading: isLoadingUsers } = useQuery({
    ...convexQuery(
      api.cycleCount.getOrganizationUsers,
      open && organizationId
        ? { organizationId: organizationId as Id<"organizations"> }
        : "skip",
    ),
    enabled: open && !!organizationId,
  });

  // Get list of already selected SKU IDs
  const selectedSkuIds = products.map((p) => p.variantId);

  // Filter out already selected SKUs
  const filteredSkus = (availableSkus ?? []).filter(
    (sku) => !selectedSkuIds.includes(sku.variantId),
  );

  const handleAddProduct = (sku: NonNullable<typeof availableSkus>[0]) => {
    const newProduct: ProductItem = {
      id: String(Date.now()),
      variantId: sku.variantId,
      skuCode: sku.skuCode,
      productName: sku.productName,
      availableQuantity: sku.availableQuantity,
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

  // Handler for Excel import
  const handleImportComplete = async (data: ResolvedImportData) => {
    if (!currentBranch) return;

    // Fetch available quantities for imported products
    const importedProducts: ProductItem[] = [];

    for (const product of data.products) {
      // Check if this SKU is already in the products list
      const existingProduct = products.find(
        (p) => p.variantId === product.variantId,
      );

      if (existingProduct) {
        // Update quantity of existing product
        handleUpdateProductQuantity(
          existingProduct.id,
          existingProduct.quantity + product.quantity,
        );
      } else {
        // Add new product
        // We need to fetch available quantity from the backend
        // For now, we'll use a placeholder and fetch it via the availableSkus query
        const availableSku = (availableSkus ?? []).find(
          (sku) => sku.variantId === product.variantId,
        );

        if (availableSku) {
          const newProduct: ProductItem = {
            id: `${Date.now()}-${product.variantId}`,
            variantId: product.variantId,
            skuCode: product.skuCode,
            productName: product.description,
            availableQuantity: availableSku.availableQuantity,
            quantity: Math.min(
              product.quantity,
              availableSku.availableQuantity,
            ),
          };
          importedProducts.push(newProduct);
        }
      }
    }

    // Add all new imported products to the state
    if (importedProducts.length > 0) {
      setProducts([...products, ...importedProducts]);
    }
  };

  const handleCreateOutboundOrder = async () => {
    if (!currentBranch || !userId || products.length === 0) return;

    try {
      await createOrderMutation.mutateAsync({
        branchId: currentBranch._id,
        userId: userId as Id<"users">,
        requestedShipDate: requestedShipDate?.getTime(),
        assignedWorkerId: selectedWorkerId
          ? (selectedWorkerId as Id<"users">)
          : undefined,
        items: products.map((p) => ({
          variantId: p.variantId,
          quantity: p.quantity,
        })),
      });
      setOpen(false);
      // Reset form
      setProducts([]);
      setRequestedShipDate(undefined);
      setSelectedWorkerId("");
    } catch (error) {
      console.error("Failed to create outbound order:", error);
    }
  };

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
      <DialogContent className="flex max-h-250 w-full flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Outbound Order</DialogTitle>
        </DialogHeader>

        {/* Form Fields */}
        <div className="flex max-w-150 flex-row gap-4">
          <div className="space-y-2">
            <Label>Requested Ship Date</Label>
            <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-50 justify-start text-left font-normal",
                    !requestedShipDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {requestedShipDate
                    ? new Intl.DateTimeFormat("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }).format(requestedShipDate)
                    : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={requestedShipDate}
                  onSelect={(date) => {
                    setRequestedShipDate(date);
                    setDatePopoverOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Assigned Worker Dropdown */}
          <div className="space-y-2">
            <Label>Assigned Worker</Label>
            <Select
              value={selectedWorkerId}
              onValueChange={setSelectedWorkerId}
            >
              <SelectTrigger className="w-50">
                <SelectValue placeholder="Select worker" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={5}>
                {isLoadingUsers && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="size-4 animate-spin" />
                    <span className="ml-2">Loading...</span>
                  </div>
                )}
                {!isLoadingUsers &&
                  (!organizationUsers || organizationUsers.length === 0) && (
                    <div className="py-4 text-center text-muted-foreground text-sm">
                      No workers available
                    </div>
                  )}
                {!isLoadingUsers &&
                  organizationUsers &&
                  organizationUsers.length > 0 &&
                  organizationUsers.map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.fullName}
                      <span className="ml-2 text-muted-foreground text-xs">
                        {user.email}
                      </span>
                    </SelectItem>
                  ))}
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
                  <TableHead>Product Name</TableHead>
                  <TableHead className="text-center">Available</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="w-10" />
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
                      <TableCell className="px-3 font-medium text-blue-600">
                        {product.skuCode}
                      </TableCell>
                      <TableCell>{product.productName}</TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {product.availableQuantity}
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min={1}
                          max={product.availableQuantity}
                          value={product.quantity}
                          onChange={(e) =>
                            handleUpdateProductQuantity(
                              product.id,
                              Math.min(
                                Number.parseInt(e.target.value, 10) || 1,
                                product.availableQuantity,
                              ),
                            )
                          }
                          className="mx-auto w-20 text-center"
                        />
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
          <div className="mt-4 flex gap-2">
            <Popover open={skuPopoverOpen} onOpenChange={setSkuPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  Add product <Plus className="ml-1 size-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-87.5 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search SKU code or name..." />
                  <CommandList>
                    <CommandEmpty>No SKU found.</CommandEmpty>
                    <CommandGroup heading="Available SKUs">
                      {filteredSkus.map((sku) => (
                        <CommandItem
                          key={sku.variantId}
                          value={`${sku.skuCode} ${sku.productName}`}
                          onSelect={() => handleAddProduct(sku)}
                          className="flex flex-col items-start gap-1 py-2"
                        >
                          <div className="flex w-full items-center justify-between">
                            <span className="font-medium text-blue-600">
                              {sku.skuCode}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              Avail: {sku.availableQuantity}
                            </span>
                          </div>
                          <span className="text-muted-foreground text-sm">
                            {sku.productName}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <ImportExcelButtonOutbound
              onImportComplete={handleImportComplete}
            />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="mt-6">
          <Button
            onClick={handleCreateOutboundOrder}
            disabled={products.length === 0 || createOrderMutation.isPending}
          >
            {createOrderMutation.isPending ? "Creating..." : "Create Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
