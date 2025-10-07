import * as React from "react";

import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline" | "muted";
}

const variantClassNames: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-violet-600/30 text-violet-100 border border-violet-500/30",
  outline: "bg-transparent text-slate-200 border border-white/20",
  muted: "bg-slate-800/60 text-slate-300 border border-white/10",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, children, variant = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        variantClassNames[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  ),
);

Badge.displayName = "Badge";
