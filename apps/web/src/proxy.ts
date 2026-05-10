import { QueryClient } from "@tanstack/react-query";
import { auth } from "@wms/backend/auth";
import {
  getPermissionQueryKey,
  type PermissionsInput,
} from "@wms/backend/lib/permissions";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Server-side QueryClient singleton for permission caching in middleware.
 */
let middlewareQueryClient: QueryClient | null = null;

function getMiddlewareQueryClient(): QueryClient {
  if (!middlewareQueryClient) {
    middlewareQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000,
          gcTime: 30 * 60 * 1000,
        },
      },
    });
  }
  return middlewareQueryClient;
}

/**
 * Check permissions with TanStack Query caching.
 */
async function checkPermissionCached(
  userId: string,
  permissions: PermissionsInput,
  requestHeaders: Headers,
): Promise<boolean> {
  return getMiddlewareQueryClient().fetchQuery({
    queryKey: getPermissionQueryKey(userId, permissions),
    queryFn: async () => {
      try {
        const result = await auth.api.hasPermission({
          headers: requestHeaders,
          body: { permissions },
        });
        return result.success === true;
      } catch {
        return false;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only run middleware for workspace routes (e.g., /acme-corp/dashboard)
  // Match pattern: /[workspace-slug]/...
  const workspaceMatch = pathname.match(/^\/([^/]+)\//);

  if (!workspaceMatch) {
    return NextResponse.next();
  }

  // Skip middleware for special routes
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/join") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static")
  ) {
    return NextResponse.next();
  }

  const workspaceSlug = workspaceMatch[1];

  try {
    // 1. Check session with Better Auth
    const getSessionResponse = await auth.api.getSession({
      headers: await headers(), // some endpoints might require headers
    });

    if (
      !getSessionResponse ||
      !getSessionResponse.session ||
      !getSessionResponse.user
    ) {
      const url = new URL("/auth/sign-in", request.url);
      url.searchParams.set("error", "Not authenticated");
      return NextResponse.redirect(url);
    }

    // 2. Fetch user's organizations
    const listOrgResponse = await auth.api.listOrganizations({
      // This endpoint requires session cookies.
      headers: await headers(),
    });

    if (!listOrgResponse) {
      const url = new URL("/join", request.url);
      url.searchParams.set("error", "Failed to fetch organizations");
      return NextResponse.redirect(url);
    }

    // 3. Check if user has access to the requested workspace
    const org = Array.isArray(listOrgResponse)
      ? listOrgResponse.find((o: { slug: string }) => o.slug === workspaceSlug)
      : null;

    if (!org) {
      const url = new URL("/join", request.url);
      url.searchParams.set(
        "error",
        "You don't have access to this organization",
      );
      return NextResponse.redirect(url);
    }

    // 4. Sync active organization with workspace URL
    //
    // This step ensures the session's activeOrganizationId matches the
    // workspace slug in the URL. This provides server-side workspace sync,
    // eliminating the need for client-side WorkspaceSync component.
    //
    // Benefits:
    // - Server-rendered content always has correct org context
    // - No hydration mismatches or race conditions
    // - URL is the single source of truth for active workspace
    // - Eliminates client-side sync delays and flashing
    //
    // The setActive call is fire-and-forget for performance:
    // - We already verified user has access to this org
    // - Subsequent requests will see the updated activeOrganizationId
    // - Reduces middleware latency (don't wait for DB write)
    if (getSessionResponse.session?.activeOrganizationId !== org.id) {
      try {
        const _data = await auth.api.setActiveOrganization({
          body: {
            organizationId: org.id,
          },
          // This endpoint requires session cookies.
          headers: await headers(),
        });
      } catch (error) {
        console.error("Failed to set active organization:", error);
      }
    }

    // 5. Check permissions for protected admin routes
    //
    // Admin settings routes require the "settings:admin" permission.
    // This prevents unauthorized users from accessing admin pages via direct URL.
    const isAdminSettingsRoute = pathname.includes("/settings/admin/");

    if (isAdminSettingsRoute) {
      const userId = getSessionResponse.user.id;
      const requestHeaders = await headers();

      const canAccessAdminSettings = await checkPermissionCached(
        userId,
        { settings: ["admin"] },
        requestHeaders,
      );

      if (!canAccessAdminSettings) {
        // Redirect to settings home if no permission
        const url = new URL(
          `/${workspaceSlug}/settings/preferences`,
          request.url,
        );
        return NextResponse.redirect(url);
      }
    }

    // User has access - allow request to continue
    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);

    // On error, redirect to join page
    const url = new URL("/join", request.url);
    url.searchParams.set("error", "An error occurred while validating access");
    return NextResponse.redirect(url);
  }
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - auth routes
     * - api routes
     * - join route
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|auth|api|join).*)",
  ],
};
