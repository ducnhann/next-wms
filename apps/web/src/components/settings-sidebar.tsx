"use client";

import type { LucideIcon } from "lucide-react";
import {
  Building,
  ChevronLeft,
  CircleUserRound,
  KeyRound,
  Settings2,
  TableProperties,
  UserRound,
  Users2,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { SettingsNavMain } from "./settings-nav-main";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

type SettingNavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  /** Permission required to view this item. Format: "resource:action" */
  requiredPermission?: "settings:admin";
};

export type SettingNavGroup = {
  title: string;
  showTitle?: boolean;
  items: SettingNavItem[];
};

/**
 * Full settings navigation configuration with permissions.
 */
const settingsNavs: SettingNavGroup[] = [
  {
    title: "Personal",
    showTitle: true,
    items: [
      {
        title: "Preferences",
        icon: Settings2,
        url: "preferences",
      },
      {
        title: "Profile",
        icon: UserRound,
        url: "profile",
      },
      {
        title: "Security & Access",
        icon: KeyRound,
        url: "security",
      },
    ],
  },
  {
    title: "Administration",
    showTitle: true,
    items: [
      {
        title: "Organization",
        icon: Building,
        url: "admin/workspace",
        requiredPermission: "settings:admin",
      },
      {
        title: "Members",
        icon: Users2,
        url: "admin/members",
        requiredPermission: "settings:admin",
      },
      {
        title: "Roles & Permissions",
        icon: CircleUserRound,
        url: "admin/roles",
        requiredPermission: "settings:admin",
      },
      {
        title: "Branches",
        icon: Warehouse,
        url: "admin/branches",
        requiredPermission: "settings:admin",
      },
      {
        title: "System Lookups",
        icon: TableProperties,
        url: "admin/lookups",
        requiredPermission: "settings:admin",
      },
    ],
  },
];

type SettingsSidebarProps = React.ComponentProps<typeof Sidebar> & {
  canAccessAdminSettings: boolean;
};

export function SettingsSidebar({
  canAccessAdminSettings,
  ...props
}: SettingsSidebarProps) {
  const isMobile = useIsMobile();
  const params = useParams<{ workspace: string }>();
  const workspace = params.workspace;

  // Permission check helper
  const hasPermission = (permission?: "settings:admin") => {
    if (!permission) return true;
    if (permission === "settings:admin") return canAccessAdminSettings;
    return false;
  };

  // Filter nav items based on permissions and build full URLs
  const navWithUrls = settingsNavs
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => hasPermission(item.requiredPermission))
        .map((item) => ({
          ...item,
          url: `/${workspace}/settings/${item.url}`,
        })),
    }))
    // Filter out empty groups
    .filter((group) => group.items.length > 0);

  return (
    <Sidebar collapsible={isMobile ? "offcanvas" : "none"} {...props}>
      <SidebarHeader>
        <Button variant="ghost" className="w-1/2" asChild>
          <Link href={`/${workspace}/dashboard`}>
            <ChevronLeft />
            Back to app
          </Link>
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="overflow-y-auto">
          <SettingsNavMain items={navWithUrls} />
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter />
      <SidebarRail />
    </Sidebar>
  );
}
