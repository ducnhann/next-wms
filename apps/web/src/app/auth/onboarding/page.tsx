"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  useActiveOrganization,
  useListOrganizations,
  useSession,
} from "@/lib/auth/client";

export default function Page() {
  const router = useRouter();
  const { data: session, isPending: isPendingSession } = useSession();
  const { data: userOrganizations, isPending: isPendingOrganizations } =
    useListOrganizations();
  const { data: activeOrganization, isPending: isPendingActiveOrganization } =
    useActiveOrganization();

  useEffect(() => {
    // Wait for all data to load
    if (
      isPendingSession ||
      isPendingOrganizations ||
      isPendingActiveOrganization
    ) {
      return;
    }

    // console.log("Session:", session);
    // console.log("User Organizations:", userOrganizations);
    // console.log("Active Organization:", activeOrganization);

    // Check if user is authenticated
    if (!session) {
      router.push("/auth/sign-in");
      return;
    }

    // Check if user has any organizations
    if (!userOrganizations || userOrganizations.length === 0) {
      router.push("/join");
      return;
    }

    // Check if user has an active organization
    if (activeOrganization) {
      router.push(`/${activeOrganization.slug}/dashboard`);
      return;
    }

    // Fallback: has organizations but no active one set
    // This shouldn't normally happen, but redirect to join to let them select
    router.push("/join");
  }, [
    session,
    userOrganizations,
    activeOrganization,
    isPendingSession,
    isPendingOrganizations,
    isPendingActiveOrganization,
    router,
  ]);

  // Show loading state while data is being fetched
  if (
    isPendingSession ||
    isPendingOrganizations ||
    isPendingActiveOrganization
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="animate-pulse text-lg">
            Setting up your workspace...
          </div>
          <div className="flex justify-center gap-2">
            <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
            <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
            <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-pulse text-center text-lg">Finishing up...</div>
    </div>
  );
}
