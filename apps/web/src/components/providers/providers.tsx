"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ConvexClientProvider } from "@/components/providers/convex-client-providers";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "./theme-provider";

interface ProvidersProps {
  children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <ConvexClientProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange={false}
      >
        <NuqsAdapter>{children}</NuqsAdapter>
        <Toaster richColors position={"bottom-center"} />
      </ThemeProvider>
    </ConvexClientProvider>
  );
}
