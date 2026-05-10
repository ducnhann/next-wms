"use client";

import type { Id } from "@wms/backend/convex/_generated/dataModel";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteProduct } from "@/hooks/use-products";

interface DeleteProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: Id<"products"> | null;
  productName: string;
}

export function DeleteProductDialog({
  open,
  onOpenChange,
  productId,
  productName,
}: DeleteProductDialogProps) {
  const deleteProduct = useDeleteProduct();

  const handleDelete = async () => {
    if (!productId) return;

    try {
      await deleteProduct.mutateAsync({ id: productId });
      toast.success("Xóa sản phẩm thành công!");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Lỗi khi xóa sản phẩm",
      );
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Xác nhận xóa sản phẩm
          </AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc chắn muốn xóa sản phẩm{" "}
            <span className="font-semibold text-foreground">
              "{productName}"
            </span>
            ?
            <br />
            <br />
            Hành động này sẽ xóa tất cả các phiên bản (variants) và mã vạch
            (barcodes) liên quan. Sản phẩm sẽ được đánh dấu là đã xóa và không
            thể khôi phục.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteProduct.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteProduct.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xóa...
              </>
            ) : (
              "Xóa sản phẩm"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
