# User and Organization Hooks

## Overview

Custom hooks to bridge Better Auth session (authId) with Convex data (document IDs and organizationId).

## Hooks

### `useCurrentUser()`

Gets the current user's Convex data using their Better Auth session.

**Returns:**

```typescript
{
  // Session data (from Better Auth)
  session: Session | null;
  authId: string | undefined;
  
  // Convex user data
  user: User | null;
  userId: Id<"users"> | undefined;
  organizationId: Id<"organizations"> | undefined;
  
  // Loading states
  isPending: boolean;
  isSessionPending: boolean;
  isUserPending: boolean;
  
  // Error state
  error: Error | null;
  
  // Convenience flags
  isAuthenticated: boolean;
  hasOrganization: boolean;
}
```

**Usage:**

```tsx
import { useCurrentUser } from "@/hooks/use-current-user";

export default function MyComponent() {
  const { userId, organizationId, user, isPending } = useCurrentUser();
  
  if (isPending) return <div>Loading...</div>;
  
  return (
    <div>
      <p>User ID: {userId}</p>
      <p>Organization: {organizationId}</p>
      <p>Email: {user?.email}</p>
    </div>
  );
}
```

### `useCurrentOrganization()`

Gets the current user's organization data from Convex.

**Returns:**

```typescript
{
  organization: Organization | null;
  organizationId: Id<"organizations"> | undefined;
  isPending: boolean;
  error: Error | null;
  hasOrganization: boolean;
}
```

**Usage:**

```tsx
import { useCurrentOrganization } from "@/hooks/use-current-organization";

export default function MyComponent() {
  const { organization, isPending } = useCurrentOrganization();
  
  if (isPending) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>{organization?.name}</h1>
      <p>{organization?.address}</p>
    </div>
  );
}
```

## Caching

Both hooks use TanStack Query with:

- **Stale time**: 5 minutes
- **Automatic refetching** when data becomes stale
- **Query deduplication** - multiple components using the same hook share the same query

## Example: Using in a Query

```tsx
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@wms/backend/convex/_generated/api";

export default function NotificationsPage() {
  const { userId } = useCurrentUser();
  
  const { data: notifications } = useQuery({
    ...convexQuery(api.notifications.list, {
      userId: userId as Id<"users">,
    }),
    enabled: !!userId, // Only run query when userId is available
  });
  
  // ... rest of component
}
```

## Convex Queries Added

### User Queries

- `api.authSync.getUserByAuthId({ authId })` - Get user by Better Auth ID
- `api.authSync.getUserById({ userId })` - Get user by Convex ID

### Organization Queries  

- `api.authSync.getOrganizationByAuthId({ authId })` - Get org by Better Auth ID
- `api.authSync.getOrganizationById({ organizationId })` - Get org by Convex ID
- `api.authSync.getOrganizationBySlug({ slug })` - Get org by slug

## Migration Guide

### Before

```tsx
const { data: sessionData } = useSession();
const userId = sessionData?.user.id; // This is authId, not Convex userId!

const { data } = useQuery({
  ...convexQuery(api.someQuery, {
    userId: userId as Id<"users">, // WRONG - using authId as userId
  }),
  enabled: !!userId,
});
```

### After

```tsx
const { userId, organizationId } = useCurrentUser();

const { data } = useQuery({
  ...convexQuery(api.someQuery, {
    userId: userId as Id<"users">, // CORRECT - using Convex userId
  }),
  enabled: !!userId,
});
```

## Benefits

✅ **Type-safe** - Proper Convex document IDs  
✅ **Cached** - TanStack Query handles caching automatically  
✅ **Reusable** - Use across all components without prop drilling  
✅ **Efficient** - Single query shared across all components  
✅ **Simple** - No need to manually track authId vs userId  

## Files

- `apps/web/src/hooks/use-current-user.tsx` - User hook
- `apps/web/src/hooks/use-current-organization.tsx` - Organization hook
- `packages/backend/convex/authSync.ts` - Convex queries
