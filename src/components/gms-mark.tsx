import { cn } from "@/lib/utils";

export function GmsMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex size-9 items-center justify-center rounded-md border border-accent/70 bg-elevated",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" className="size-5 text-accent" fill="none">
        <path d="M4 12V6h6" stroke="currentColor" strokeWidth="1.6" />
        <path d="M28 12V6h-6" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4 20v6h6" stroke="currentColor" strokeWidth="1.6" />
        <path d="M28 20v6h-6" stroke="currentColor" strokeWidth="1.6" />
        <rect x="10" y="8" width="12" height="16" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M16 8v16M10 16h12" stroke="currentColor" strokeWidth="0.8" opacity="0.7" />
      </svg>
    </span>
  );
}
