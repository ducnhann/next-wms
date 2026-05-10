import { HydrationBoundary } from "@tanstack/react-query";
import { SettingsLayoutWrapper } from "@/components/settings-layout-wrapper";
import { checkPermission } from "@/lib/permissions/server";

interface SettingsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
}

export default async function SettingsLayout({
  children,
}: SettingsLayoutProps) {
  // Check permissions server-side and get dehydrated state for client hydration
  const { dehydratedState, result: canAccessAdminSettings } =
    await checkPermission({ settings: ["admin"] });

  return (
    <HydrationBoundary state={dehydratedState}>
      <SettingsLayoutWrapper canAccessAdminSettings={canAccessAdminSettings}>
        {children}
      </SettingsLayoutWrapper>
    </HydrationBoundary>
  );
}
