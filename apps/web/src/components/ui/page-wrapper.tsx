import { cn } from "@/lib/utils";

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <div className={cn("flex flex-col gap-4 px-2 mb-20 mt-2", className)}>
      {children}
    </div>
  );
}