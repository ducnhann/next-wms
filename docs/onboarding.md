# Onboarding Guide: Implementing New UI Pages

This guide will help you implement new UI pages in the Next-WMS application following best practices and established patterns.

## Quick Start Checklist

- [ ] Define types from Convex schemas
- [ ] Set up Convex queries/mutations with TanStack Query
- [ ] Use components from `@/components/*`
- [ ] Add `"use client"` if using hooks
- [ ] Ensure distinct Convex API arguments for proper query key separation

---

## Step 1: Define Types

Use Convex's `Doc<>` type helper to compose your types. This ensures type safety between your frontend and backend.

```typescript
import type { Doc, Id } from "@wms/backend/convex/_generated/dataModel";

// Single document type
type Brand = Doc<"brands">;

// With additional computed fields
type BrandWithStats = Brand & {
  productCount: number;
  isActive: boolean;
};

// For forms/input
type CreateBrandInput = {
  name: string;
  organizationId: Id<"organizations">;
};
```

**Benefits:**

- Easy to create mock data that matches real schema
- Seamless transition from mock to real data
- Auto-completion and type checking throughout your code

---

## Step 2: Convex with TanStack Query

Reference example: [apps/web/src/app/(protected)/[workspace]/(main)/master-data/brands/page.tsx](../apps/web/src/app/(protected)/[workspace]/(main)/master-data/brands/page.tsx)

### Query Pattern

```typescript
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";

// In your component
const { data: brands, isLoading } = useQuery({
  ...convexQuery(api.brands.listAll, {
    organizationId: organizationId as Id<"organizations">,
  }),
  enabled: !!organizationId, // Only run when organizationId exists
});
```

### Mutation Pattern

```typescript
const { mutate, isPending } = useMutation({
  mutationFn: useConvexMutation(api.brands.createBrand),
});

// Usage
mutate(
  { name, organizationId },
  {
    onSuccess: () => {
      // Handle success (reset form, show toast, etc.)
    },
    onError: (error) => {
      // Handle error
    },
  }
);
```

---

## Step 3: Use Existing Components

**Always import from `@/components/*`** to maintain consistency and leverage the existing design system.

```typescript
// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Feature Components
import { Header } from "@/components/header";
import { DataTable } from "@/components/table/data-table";
```

**Available component categories:**

- `@/components/ui/*` - Base UI components (shadcn/ui)
- `@/components/table/*` - Data table components
- `@/components/settings/*` - Settings-specific components
- `@/components/providers/*` - Context providers

---

## Step 4: Client vs Server Components

### When to use `"use client"`

Add `"use client"` at the top of your file when using:

- React hooks (`useState`, `useEffect`, `useQuery`, etc.)
- Event handlers (`onClick`, `onChange`, etc.)
- Browser APIs (`localStorage`, `window`, etc.)
- Context consumers

```typescript
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
```

### When to keep server components

Keep components as server components (no `"use client"`) when:

- Only rendering static content
- Fetching data at build/request time
- No interactivity needed

---

## Step 5: Convex Function Design Best Practices

### ⚠️ Critical: Distinct API Arguments

Ensure your Convex API arguments are **distinct** so TanStack Query can generate unique query keys for proper cache separation.

```typescript
// Proper separation with multiple dimensions
listProducts({ 
  organizationId: "org1",
  userId: "user1",
  branchId: "branch1"
})
```

### Recommended argument structure

```typescript
// In your Convex function
export const listItems = query({
  args: {
    organizationId: v.id("organizations"),
    userId: v.optional(v.id("users")),      // User-specific filtering
    branchId: v.optional(v.id("branches")), // Branch-specific filtering
    filters: v.optional(v.object({
      status: v.optional(v.string()),
      category: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    // Implementation
  },
});
```

**Key dimensions for separation:**

- `organizationId` - Organization scope
- `userId` - User-specific data
- `branchId` - Branch/warehouse scope
- Additional filters as needed

---

## Additional Tips

### 1. Use Custom Hooks

Leverage existing custom hooks for common patterns:

```typescript
import { useCurrentUser } from "@/hooks/use-current-user";
import { usePermissions } from "@/hooks/use-permissions";
import { useRoles } from "@/hooks/use-roles";

const { userId, organizationId } = useCurrentUser();
const { hasPermission } = usePermissions();
```

### 2. Error Handling

Always handle loading and error states:

```typescript
const { data, isLoading, error } = useQuery({...});

if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage error={error} />;
if (!data) return <EmptyState />;
```

### 3. Suspense Boundaries

Wrap components using `useSearchParams()` or async operations in Suspense:

```typescript
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <PageContent />
    </Suspense>
  );
}
```

### 4. File Organization

Follow the established folder structure:

```txt
app/
  (protected)/
    [workspace]/
      (main)/
        your-feature/
          page.tsx          # Main page component
          loading.tsx       # Loading state
          error.tsx         # Error boundary
          components/       # Feature-specific components
            your-form.tsx
            your-table.tsx
```

### 5. TypeScript Best Practices

```typescript
// Use type inference when possible
const [items, setItems] = useState<Brand[]>([]);

// Explicit return types for complex functions
function processData(data: Brand[]): BrandWithStats[] {
  // ...
}

// Use const assertions for constants
const STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;
```

### 6. Performance Considerations

- Use `enabled` flag to prevent unnecessary queries
- Implement pagination for large datasets
- Debounce search inputs
- Memoize expensive calculations with `useMemo`
- Memoize callbacks with `useCallback` when passing to child components

---

## Example: Complete Page Implementation

```typescript
"use client";

import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@wms/backend/convex/_generated/api";
import type { Doc, Id } from "@wms/backend/convex/_generated/dataModel";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";

// Type definitions
type Item = Doc<"items">;

export default function ItemsPage() {
  const { organizationId, userId } = useCurrentUser();
  const [name, setName] = useState("");

  // Query
  const { data: items, isLoading } = useQuery({
    ...convexQuery(api.items.list, {
      organizationId: organizationId as Id<"organizations">,
      userId: userId as Id<"users">,
    }),
    enabled: !!organizationId && !!userId,
  });

  // Mutation
  const { mutate, isPending } = useMutation({
    mutationFn: useConvexMutation(api.items.create),
  });

  const handleCreate = () => {
    if (!name.trim() || !organizationId) return;
    
    mutate(
      { name, organizationId },
      {
        onSuccess: () => {
          setName("");
          toast.success("Item created successfully");
        },
        onError: (error) => {
          toast.error("Failed to create item");
        },
      }
    );
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Items</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Item name"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button
            onClick={handleCreate}
            disabled={isPending || !name.trim()}
          >
            {isPending ? "Creating..." : "Create"}
          </Button>
        </div>
        
        <div className="space-y-2">
          {items?.map((item) => (
            <div key={item._id}>{item.name}</div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Quick Reference

| Task             | Import                                     | Usage                                                     |
|------------------|--------------------------------------------|-----------------------------------------------------------|
| Query data       | `convexQuery`                              | `useQuery({ ...convexQuery(api.x.y, args) })`             |
| Mutate data      | `useConvexMutation`                        | `useMutation({ mutationFn: useConvexMutation(api.x.y) })` |
| Get current user | `useCurrentUser`                           | `const { userId, organizationId } = useCurrentUser()`     |
| UI Components    | `@/components/ui/*`                        | `import { Button } from "@/components/ui/button"`         |
| Types            | `@wms/backend/convex/_generated/dataModel` | `type X = Doc<"table">`                                   |

---

## Need Help?

- Check existing pages in `apps/web/src/app/(protected)/[workspace]/(main)/` for reference
- Review [USER_HOOKS.md](./USER_HOOKS.md) for custom hook documentation
- Look at component implementations in `apps/web/src/components/`

Happy coding! 🚀
