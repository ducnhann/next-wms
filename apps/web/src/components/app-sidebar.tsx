"use client";

import type { PermissionsInput } from "@wms/backend/lib/permissions";
import {
  ArrowBigDownDash,
  ArrowBigUpDash,
  ChartColumn,
  Database,
  Gauge,
  Package,
  ShieldUser,
  Warehouse,
} from "lucide-react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { NavWorkspace } from "@/components/nav-workspace";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useHasPermissions } from "@/hooks/use-permissions";
import { ScrollArea } from "./ui/scroll-area";

const NAV_DATA = [
  {
    title: "Dashboard",
    icon: Gauge,
    isActive: true,
    items: [
      {
        title: "General",
        url: "/dashboard",
      },
    ],
    // Dashboard is always visible to authenticated users
    permission: undefined,
  },
  {
    title: "Inbound",
    icon: ArrowBigDownDash,
    isActive: true,
    items: [
      {
        title: "Inbound Orders",
        url: "/inbound-orders",
      },
      {
        title: "Receiving Sessions",
        url: "/receiving-sessions",
      },
      {
        title: "Return Requests",
        url: "/return-requests",
      },
    ],
    permission: { inventory: ["read"] },
  },
  {
    title: "Outbound",
    icon: ArrowBigUpDash,
    isActive: true,
    items: [
      {
        title: "Orders",
        url: "/orders",
      },
      {
        title: "Picking Sessions",
        url: "/picking-sessions",
      },
    ],
    permission: { inventory: ["read"] },
  },
  {
    title: "Inventory",
    icon: Package,
    items: [
      {
        title: "Products",
        url: "/inventory/products",
      },
      // {
      //   title: "Stock",
      //   url: "/inventory/stock",
      // },
      // {
      //   title: "Batches",
      //   url: "/inventory/batches",
      // },
      // {
      //   title: "Serials",
      //   url: "/inventory/serials",
      // },
      {
        title: "Adjustments",
        url: "/inventory/adjustments",
      },
      // {
      //   title: "Transfers",
      //   url: "/inventory/transfers",
      // },
      {
        title: "Cycle Count",
        url: "/inventory/cycle-count",
      },
    ],
    permission: { inventory: ["read"] },
  },
  {
    title: "Warehouses Ops",
    icon: Warehouse,
    items: [
      {
        title: "Zones",
        url: "/warehouses-ops/zones",
      },
      // {
      //   title: "Work Sessions",
      //   url: "/warehouses-ops/work-sessions",
      // },
    ],
    permission: { warehouse: ["read"] },
  },
  {
    title: "Master Data",
    icon: Database,
    items: [
      {
        title: "Products",
        url: "/master-data/products",
      },
      {
        title: "Categories",
        url: "/master-data/categories",
      },
      {
        title: "Brands",
        url: "/master-data/brands",
      },
      {
        title: "Suppliers",
        url: "/master-data/suppliers",
      },
    ],
    permission: { masterData: ["read"] },
  },
  {
    title: "Reports",
    icon: ChartColumn,
    items: [
      {
        title: "Inventory",
        url: "/reports/inventory",
      },
      {
        title: "Inbound",
        url: "/reports/inbound",
      },
      {
        title: "Outbound",
        url: "/reports/outbound",
      },
    ],
    permission: { reports: ["read"] },
  },
  {
    title: "System",
    icon: ShieldUser,
    items: [
      {
        title: "Traceability",
        url: "/system/traceability",
      },
    ],
    permission: { system: ["read"] },
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // Collect all permissions that need to be checked
  const permissionSets = NAV_DATA.map((item) => item.permission).filter(
    (permission): permission is NonNullable<typeof permission> => !!permission,
  );

  // Check all permissions in one batch
  const { data: permissionResults } = useHasPermissions(
    permissionSets as unknown as PermissionsInput[],
  );

  // Filter nav items based on permissions
  const navMain = NAV_DATA.filter((item) => {
    // If no permission required, always show
    if (!item.permission) return true;

    // Find index of this item's permission in the set
    // Note: This relies on the order being preserved, which filter+map does
    const permissionIndex = permissionSets.indexOf(item.permission);
    return permissionResults?.[permissionIndex] ?? false;
  });

  return (
    <Sidebar collapsible={"icon"} {...props}>
      <SidebarHeader>
        <NavWorkspace />
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="h-full">
          <NavMain items={navMain} />
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
