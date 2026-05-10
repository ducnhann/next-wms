import { cn } from "@/lib/utils";

export default function TableCellFirst({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return <span className={cn("pl-1 font-medium", className)} {...props} />;
}
