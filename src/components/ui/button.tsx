import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "ghost";
type ButtonSize = "default" | "sm" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  default:
    "bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 text-white shadow-sm hover:from-sky-600 hover:via-indigo-600 hover:to-violet-600",
  outline:
    "border border-slate-200 text-slate-900 hover:bg-slate-100 focus-visible:ring-slate-200 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800/60",
  ghost:
    "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/60",
};

const sizeStyles: Record<ButtonSize, string> = {
  default: "h-11 px-6 text-sm font-semibold",
  lg: "h-12 px-8 text-base font-semibold",
  sm: "h-9 px-4 text-sm",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      children,
      ...rest
    },
    ref,
  ) => {
    const baseClassName = cn(
      "inline-flex items-center justify-center gap-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-60",
      variantStyles[variant],
      sizeStyles[size],
    );

    const { type, ...buttonProps } = rest;

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ className?: string }>;
      return React.cloneElement(child, {
        ...(buttonProps as Record<string, unknown>),
        className: cn(baseClassName, className, child.props.className),
      });
    }

    return (
      <button
        ref={ref}
        className={cn(baseClassName, className)}
        type={type ?? "button"}
        {...buttonProps}
      >
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
