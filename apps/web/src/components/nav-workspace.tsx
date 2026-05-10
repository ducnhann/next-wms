"use client";

import { Building2, ChevronsUpDown, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useCurrentUser } from "@/hooks/use-current-user";
import { organization, useListOrganizations } from "@/lib/auth/client";
import { OrganizationDialog } from "./organization-dialog";
import { Kbd } from "./ui/kbd";
import { ScrollArea } from "./ui/scroll-area";
import { Skeleton } from "./ui/skeleton";

export function NavWorkspace() {
  const router = useRouter();
  const { isMobile } = useSidebar();

  const { data: organizations } = useListOrganizations();
  const tenants = organizations ?? [];
  const { organization: currentOrg } = useCurrentUser();

  const [open, setOpen] = useState(false);

  const handleOrgSwitch = async (orgId: string, orgSlug: string) => {
    try {
      // Clear selected branch to ensure fresh selection for new org
      localStorage.removeItem("wms:selected-branch");

      await organization.setActive({
        organizationId: orgId,
      });
      router.push(`/${orgSlug}/dashboard`);
    } catch (error) {
      console.error("Failed to switch organization:", error);
      toast.error("Failed to switch organization");
    }
  };

  const handleSettingsClick = () => {
    if (currentOrg) {
      router.push(`/${currentOrg.slug}/settings`);
    } else {
      // this should not happen, but just in case
      toast.error("No active organization to view settings for.");
    }
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          {tenants.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    {currentOrg?.logo ? (
                      <Avatar className="size-8 rounded-md">
                        <AvatarImage
                          src={currentOrg.logo}
                          alt={currentOrg.name}
                        />
                        <AvatarFallback>
                          <Building2 className="size-2.5" />
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <Building2 className="size-4" />
                    )}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {currentOrg?.name}
                    </span>
                    <span className="truncate text-xs">{currentOrg?.slug}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                align="start"
                side={isMobile ? "bottom" : "right"}
                sideOffset={4}
              >
                <DropdownMenuItem onClick={handleSettingsClick}>
                  Settings
                  <DropdownMenuShortcut>
                    <Kbd>S</Kbd>
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/${currentOrg?.slug}/settings/admin/members`)
                  }
                >
                  Invite and manage members
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    Switch organization
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <ScrollArea className="h-32">
                        {tenants.map((tenant, index: number) => (
                          <DropdownMenuItem
                            key={tenant.id}
                            onClick={() =>
                              handleOrgSwitch(tenant.id, tenant.slug)
                            }
                            className="gap-2 p-2"
                          >
                            <div className="flex size-6 items-center justify-center rounded-md border">
                              {tenant.logo ? (
                                <Avatar className="h-3.5 w-3.5 shrink-0 rounded">
                                  <AvatarImage
                                    src={tenant.logo}
                                    alt={tenant.name}
                                  />
                                  <AvatarFallback>
                                    <Building2 className="size-2.5" />
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <Building2 className="size-3.5 shrink-0" />
                              )}
                            </div>
                            {tenant.name}
                            <DropdownMenuShortcut>
                              <Kbd>{index + 1}</Kbd>
                            </DropdownMenuShortcut>
                          </DropdownMenuItem>
                        ))}
                      </ScrollArea>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setOpen(true);
                        }}
                        className="gap-2 p-2"
                      >
                        <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                          <Plus className="size-4" />
                        </div>
                        <div className="font-medium text-muted-foreground">
                          Add organization
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
              <div className="grid flex-1 gap-0.5 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              <Skeleton className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          )}
        </SidebarMenuItem>
      </SidebarMenu>
      <OrganizationDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
