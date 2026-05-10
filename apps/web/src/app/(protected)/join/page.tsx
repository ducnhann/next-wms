"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { CreateOrganizationForm } from "@/components/create-organization-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient, useListOrganizations } from "@/lib/auth/client";

function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: organizations, isPending } = useListOrganizations();
  const tenants = organizations ?? [];
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Handle error messages from middleware redirects
  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      toast.error(error);
      // Clean up URL by removing the error param
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.pathname);
    }
  }, [searchParams]);

  function getInitials(str: string) {
    const letters = str.match(/[A-Za-z]/g) || [];
    return letters.slice(0, 2).join("").toUpperCase();
  }

  const handleJoinOrg = (orgSlug: string) => {
    toast.success("Loading organization...");
    // Clear selected branch to ensure fresh selection for new org
    localStorage.removeItem("wms:selected-branch");
    authClient.organization.setActive({
      organizationSlug: orgSlug,
    });
    router.push(`/${orgSlug}/dashboard`);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="w-full max-w-100 space-y-6">
        {!showCreateForm ? (
          <>
            <span className="flex justify-center font-medium text-lg">
              Select an Organization to start
            </span>
            <div className="flex flex-col space-y-2">
              {isPending ? (
                <>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </>
              ) : (
                tenants.map((org) => (
                  <Item key={org.id} variant="outline">
                    <ItemMedia>
                      <Avatar className="h-8 w-8 rounded">
                        {org.logo && (
                          <AvatarImage src={org.logo} alt={org.name} />
                        )}
                        <AvatarFallback className="rounded-lg">
                          {getInitials(org.name)}
                        </AvatarFallback>
                      </Avatar>
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{org.name}</ItemTitle>
                    </ItemContent>
                    <ItemActions>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleJoinOrg(org.slug)}
                      >
                        Open
                      </Button>
                    </ItemActions>
                  </Item>
                ))
              )}
            </div>
            <span className="flex justify-center">
              <Button
                className="w-8/10"
                onClick={() => setShowCreateForm(true)}
              >
                Create New Organization
              </Button>
            </span>
          </>
        ) : (
          <>
            <span className="flex justify-center pb-4 font-medium text-lg">
              Create New Organization
            </span>
            <CreateOrganizationForm
              onSuccess={(orgSlug) => {
                // Clear selected branch to ensure fresh selection for new org
                localStorage.removeItem("wms:selected-branch");
                authClient.organization.setActive({
                  organizationSlug: orgSlug,
                });
                setShowCreateForm(false);
                router.push(`/${orgSlug}/dashboard`);
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center">
          Loading...
        </div>
      }
    >
      <JoinPageContent />
    </Suspense>
  );
}
