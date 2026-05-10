"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import type { SettingNavGroup } from "./settings-sidebar";

export function SettingsNavMain({ items }: { items: SettingNavGroup[] }) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            {item.showTitle && (
              <SidebarGroupLabel>
                <span>{item.title}</span>
              </SidebarGroupLabel>
            )}
            <SidebarMenuSub className="border-0 pl-0">
              {item.items?.map((subItem) => {
                const isActive = pathname === subItem.url;
                return (
                  <SidebarMenuSubItem key={subItem.title}>
                    <SidebarMenuSubButton
                      className={isActive ? "bg-accent" : ""}
                      asChild
                    >
                      <Link href={subItem.url as Route}>
                        {subItem.icon && <subItem.icon />}
                        <span>{subItem.title}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
