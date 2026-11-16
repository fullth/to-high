// Source: https://ui.shadcn.com/r/styles/new-york-v4/skeleton.json
// MIT license: see LICENSE.shadcn.
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-accent", className)}
      {...props}
    />
  );
}

export { Skeleton };
