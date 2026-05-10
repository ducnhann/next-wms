"use client";

import { ReturnRequestsTable } from "@/components/table/return-request-table";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function Page() {
  return (
    <PageWrapper>
      <ReturnRequestsTable />
    </PageWrapper>
  );
}
