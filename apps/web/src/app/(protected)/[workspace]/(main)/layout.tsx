import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app-sidebar";
import MainHeader from "@/components/header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <SidebarProvider defaultOpen={defaultOpen} suppressHydrationWarning>
      <AppSidebar />
      <SidebarInset className="flex h-screen flex-col" suppressHydrationWarning>
        <MainHeader />
        <ScrollArea className="flex-1 overflow-y-auto px-4">
          {children}
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  );
}
