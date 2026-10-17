import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-mono text-[0.65rem] font-medium uppercase tracking-[0.16em]",
  {
    variants: {
      variant: {
        default: "bg-elevated text-muted border border-border",
        live: "bg-ok/12 text-ok border border-ok/30",
        down: "bg-danger/12 text-danger border border-danger/30",
        accent: "bg-accent/12 text-accent border border-accent/30",
        warn: "bg-warn/12 text-warn border border-warn/30",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
