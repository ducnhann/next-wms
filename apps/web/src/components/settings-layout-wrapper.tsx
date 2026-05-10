"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { SettingsSidebar } from "@/components/settings-sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

interface SettingsLayoutWrapperProps {
  children: React.ReactNode;
  canAccessAdminSettings: boolean;
}

export function SettingsLayoutWrapper({
  children,
  canAccessAdminSettings,
}: SettingsLayoutWrapperProps) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <SidebarProvider defaultOpen={true}>
        <SettingsSidebar
          className="h-screen"
          canAccessAdminSettings={canAccessAdminSettings}
        />
        <SidebarInset>
          <ScrollArea className="flex h-screen min-h-0 flex-col">
            <header className="flex h-16 shrink-0 items-center transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
              <div className="flex w-full flex-row items-center justify-between px-4 transition-[padding] group-has-data-[collapsible=icon]/sidebar-wrapper:px-2">
                {isMobile && <SidebarTrigger className="size-8" />}
              </div>
            </header>
            <main className="min-h-0 flex-1 overflow-hidden">
              <div className="mx-auto max-w-4xl px-4 py-4 md:py-6">
                <div className="space-y-6">{children}</div>
              </div>
            </main>
          </ScrollArea>
        </SidebarInset>
      </SidebarProvider>
    </motion.div>
  );
}
