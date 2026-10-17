import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-display uppercase tracking-[0.14em] text-sm font-semibold transition-[transform,background-color,border-color,opacity,color] duration-[var(--motion-quick)] ease-[var(--ease-out)] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-fg hover:bg-accent-2 active:scale-[0.98]",
        secondary:
          "bg-elevated text-fg border border-border hover:border-accent/50 hover:text-accent active:scale-[0.98]",
        ghost: "text-muted hover:text-fg hover:bg-elevated",
        outline: "border border-border text-fg bg-transparent hover:border-accent hover:text-accent",
        danger: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3 text-[0.7rem]",
        lg: "h-12 px-6 text-[0.85rem]",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
