"use client";
import BranchSwitcher from "@/components/branch-switcher";
import { Notification } from "@/components/notifications";
import { SidebarTrigger } from "./ui/sidebar";

export default function MainHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex w-full flex-row items-center justify-between px-6 transition-[padding] group-has-data-[collapsible=icon]/sidebar-wrapper:px-6">
        <SidebarTrigger className="size-8" />
        <div className="flex flex-row items-center gap-4">
          <BranchSwitcher />
          <Notification />
        </div>
      </div>
    </header>
  );
}
