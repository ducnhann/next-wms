"use client";

import { Building2, CheckCircle, XCircle } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { authClient, organization, useSession } from "@/lib/auth/client";

type InvitationStatus =
  | "loading"
  | "checking"
  | "accepting"
  | "success"
  | "already-accepted"
  | "error"
  | "login-required";

interface InvitationDetails {
  organizationName?: string;
  organizationSlug?: string;
  organizationId?: string;
  role?: string;
  email?: string;
}

export default function AcceptInvitationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();

  const [status, setStatus] = useState<InvitationStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<InvitationDetails>({});

  // Prevent double execution from React strict mode
  const processingRef = useRef(false);

  const invitationId = params?.id;

  useEffect(() => {
    if (sessionLoading) return;

    // If not logged in, redirect to sign-in with return URL
    if (!session?.user) {
      setStatus("login-required");
      return;
    }

    // Prevent double execution
    if (processingRef.current) return;
    processingRef.current = true;

    // Process the invitation
    const processInvitation = async () => {
      if (!invitationId) {
        setStatus("error");
        setError("Invalid invitation link");
        return;
      }

      try {
        // First, check the invitation status
        setStatus("checking");
        const invitationResult = await authClient.organization.getInvitation({
          query: { id: invitationId },
        });

        if (invitationResult.error) {
          setStatus("error");
          setError(invitationResult.error.message ?? "Invitation not found");
          return;
        }

        const invitation = invitationResult.data;

        // Store invitation details for display
        setDetails({
          organizationName: invitation?.organizationName,
          organizationSlug: invitation?.organizationSlug,
          organizationId: invitation?.organizationId,
          role: invitation?.role,
          email: invitation?.email,
        });

        // Check if already accepted
        if (invitation?.status === "accepted") {
          // Set the organization as active and redirect
          if (invitation.organizationId) {
            await organization.setActive({
              organizationId: invitation.organizationId,
            });
          }
          setStatus("already-accepted");
          return;
        }

        // Check if invitation is expired or cancelled
        if (invitation?.status === "canceled") {
          setStatus("error");
          setError("This invitation has been cancelled");
          return;
        }

        if (
          invitation?.expiresAt &&
          new Date(invitation.expiresAt) < new Date()
        ) {
          setStatus("error");
          setError("This invitation has expired");
          return;
        }

        // Accept the invitation
        setStatus("accepting");
        const result = await organization.acceptInvitation({
          invitationId,
        });

        if (result.error) {
          setStatus("error");
          setError(result.error.message ?? "Failed to accept invitation");
          return;
        }

        // Set organization as active
        if (result.data?.member?.organizationId) {
          await organization.setActive({
            organizationId: result.data.member.organizationId,
          });
        }

        setDetails((prev) => ({
          ...prev,
          role: result.data?.member?.role ?? prev.role,
        }));
        setStatus("success");
      } catch (err) {
        setStatus("error");
        setError(
          err instanceof Error ? err.message : "Failed to process invitation",
        );
      }
    };

    processInvitation();
  }, [invitationId, session?.user, sessionLoading]);

  const handleSignIn = () => {
    // Redirect to sign-in with return URL
    const returnUrl = encodeURIComponent(
      `/auth/accept-invitation/${invitationId}`,
    );
    router.push(`/auth/sign-in?returnUrl=${returnUrl}`);
  };

  const handleGoToWorkspace = () => {
    router.push("/");
  };

  if (status === "loading" || status === "checking" || status === "accepting") {
    const statusMessages = {
      loading: "Loading invitation...",
      checking: "Checking invitation status...",
      accepting: "Accepting invitation...",
    };

    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-100 max-w-md">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <Spinner />
            <p className="text-muted-foreground">
              {statusMessages[status as keyof typeof statusMessages]}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "login-required") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-100 max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="size-6 text-primary" />
            </div>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to accept this workspace invitation.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button onClick={handleSignIn} className="w-full">
              Sign In to Continue
            </Button>
            <p className="text-center text-muted-foreground text-sm">
              Don't have an account?{" "}
              <Link
                href={`/auth/sign-up?returnUrl=${encodeURIComponent(`/auth/accept-invitation/${invitationId}`)}`}
                className="text-primary hover:underline"
              >
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "already-accepted") {
    const handleGoToOrganization = () => {
      if (details.organizationSlug) {
        router.push(`/${details.organizationSlug}` as Route);
      } else {
        router.push("/");
      }
    };

    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-100 max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
              <CheckCircle className="size-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle>Already a Member</CardTitle>
            <CardDescription>
              You've already accepted this invitation and are a member of{" "}
              <strong>{details.organizationName ?? "this workspace"}</strong>
              {details.role && (
                <>
                  {" "}
                  as <strong>{details.role}</strong>
                </>
              )}
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button onClick={handleGoToOrganization} className="w-full">
              Go to Workspace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-100 max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="size-6 text-destructive" />
            </div>
            <CardTitle>Invitation Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button onClick={() => router.push("/")} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-100 max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <CheckCircle className="size-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Welcome to the Team!</CardTitle>
            <CardDescription>
              You've successfully joined{" "}
              <strong>{details.organizationName ?? "the workspace"}</strong>
              {details.role && (
                <>
                  {" "}
                  as <strong>{details.role}</strong>
                </>
              )}
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button onClick={handleGoToWorkspace} className="w-full">
              Go to Workspace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
