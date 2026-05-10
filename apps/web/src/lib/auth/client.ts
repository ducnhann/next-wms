import { ac, admin, member, owner } from "@wms/backend/lib/permissions";
import { emailOTPClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { toast } from "sonner";

export const authClient = createAuthClient({
  plugins: [
    organizationClient({
      ac,
      roles: {
        owner,
        admin,
        member,
      },
      dynamicAccessControl: {
        enabled: true,
      },
    }),
    emailOTPClient(),
  ],
  fetchOptions: {
    onError(e) {
      if (e.error.status === 429) {
        toast.error("Too many requests. Please try again later.");
      }
    },
  },
});

export const {
  signUp,
  signIn,
  signOut,
  useSession,
  organization,
  useListOrganizations,
  useActiveOrganization,
  useActiveMember,
  useActiveMemberRole,
} = authClient;
