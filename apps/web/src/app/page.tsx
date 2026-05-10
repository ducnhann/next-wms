"use client";

import { ApiStatus } from "@/components/api-status";
import SignIn from "@/components/sign-in";

export default function Home() {
  return (
    <div className="bg-background">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col content-center p-4">
        <div className="flex flex-1 items-center justify-center">
          <div className="flex w-3/4 flex-col gap-6">
            <ApiStatus />
            <SignIn />
          </div>
        </div>
      </div>
    </div>
  );
}
