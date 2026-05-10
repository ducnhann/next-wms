"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RolesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <AlertTriangle className="size-12 text-destructive" />
      <div className="text-center">
        <h2 className="font-semibold text-xl">Something went wrong!</h2>
        <p className="mt-2 text-muted-foreground">
          Failed to load roles. Please try again.
        </p>
        {error.message && (
          <p className="mt-1 text-muted-foreground text-sm">{error.message}</p>
        )}
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
