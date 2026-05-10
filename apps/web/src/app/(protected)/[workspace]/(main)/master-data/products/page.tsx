"use client";

import { ProductsTable } from "@/components/table/products-table";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function Page() {
  return (
    <PageWrapper>
      <ProductsTable />
    </PageWrapper>
  );
}
