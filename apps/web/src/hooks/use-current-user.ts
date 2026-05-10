/**
 * Custom hook to get the current user's Convex data
 *
 * This hook bridges the gap between Better Auth session (which has authId)
 * and Convex user data (which has the Convex document ID)
 * It also fetches the user's organization memberships
 */

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import { useActiveOrganization, useSession } from "@/lib/auth/client";

export function useCurrentUser() {
  const { data: session, isPending: isSessionPending } = useSession();
  const { data: activeOrganization } = useActiveOrganization();
  const authId = session?.user?.id;

  // Query Convex for the user document using authId
  const {
    data: convexUser,
    isPending: isUserPending,
    error,
  } = useQuery({
    ...convexQuery(api.authSync.getUserByAuthId, {
      authId: authId ?? "",
    }),
    enabled: !!authId,
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
  });

  // Query user's organization memberships
  const { data: organization, isPending: isActiveOrgPending } = useQuery({
    ...convexQuery(api.authSync.getOrganizationByAuthId, {
      authId: activeOrganization?.id ?? "",
    }),
    enabled: !!convexUser?._id && !!activeOrganization,
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
  });

  // Get the first organization (for now, later can support multi-org switching)
  const organizationId = organization?._id;

  return {
    // Session data (from Better Auth)
    authOrganization: activeOrganization,
    session,
    authId,

    // Convex user data
    user: convexUser,
    userId: convexUser?._id,
    organizationId,
    organization,

    // Loading states
    isPending: isSessionPending || isUserPending || isActiveOrgPending,
    isSessionPending,
    isUserPending,
    isActiveOrgPending,

    // Error state
    error,

    // Convenience flags
    isAuthenticated: !!session?.user,
    hasOrganization: !!organizationId,
  };
}
