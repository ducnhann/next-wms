"use client";

import type { Id } from "@wms/backend/convex/_generated/dataModel";
import * as React from "react";
import { AuditLogsTable } from "@/components/table/audit-logs-table";
import { InventoryTransactionsTable } from "@/components/table/inventory-transactions-table";
import {
  type DateRange,
  DateRangePicker,
  getPresetDateRange,
} from "@/components/ui/date-range-picker";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useDebouncedInput } from "@/hooks/use-debounced-input";

export default function TraceabilityPage() {
  const { organizationId } = useCurrentUser();

  // Tab state
  const [activeTab, setActiveTab] = React.useState("audit-logs");

  // Date range state - default to last 30 days
  const defaultRange = getPresetDateRange("last30");
  const [dateRange, setDateRange] = React.useState<DateRange>(defaultRange);

  // Global filter state with debouncing - shared across tabs
  const [setFilterValue, , debouncedFilterValue] = useDebouncedInput("", 300);

  // Convert date range to timestamps for queries
  const dateFrom = dateRange.from?.getTime();
  const dateTo = dateRange.to?.getTime();

  return (
    <PageWrapper>
      {/* Header: DateRangePicker on left, Tabs on right */}
      <div className="flex flex-row items-center justify-between">
        <DateRangePicker
          align="start"
          showCompare={false}
          onUpdate={(data) => {
            // Defer the state update to prevent synchronous re-renders
            setTimeout(() => {
              setDateRange(data.range);
            }, 0);
          }}
        />
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="audit-logs">Audit Log</TabsTrigger>
            <TabsTrigger value="inventory-transactions">
              Inventory Transactions
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table Content */}
      {activeTab === "audit-logs" ? (
        <AuditLogsTable
          organizationId={organizationId as Id<"organizations"> | undefined}
          dateFrom={dateFrom}
          dateTo={dateTo}
          globalFilter={debouncedFilterValue}
          onGlobalFilterChange={setFilterValue}
        />
      ) : (
        <InventoryTransactionsTable
          organizationId={organizationId as Id<"organizations"> | undefined}
          dateFrom={dateFrom}
          dateTo={dateTo}
          globalFilter={debouncedFilterValue}
          onGlobalFilterChange={setFilterValue}
        />
      )}
    </PageWrapper>
  );
}
