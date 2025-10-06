import * as React from "react";

import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  indicatorClassName?: string;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value, max = 100, className, indicatorClassName, ...props }, ref) => {
    const clampedMax = Math.max(max, 1);
    const safeValue = Math.min(Math.max(value, 0), clampedMax);
    const percentage = (safeValue / clampedMax) * 100;

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={Number(safeValue.toFixed(2))}
        aria-valuemin={0}
        aria-valuemax={clampedMax}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800/60",
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 transition-all",
            indicatorClassName,
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  },
);
Progress.displayName = "Progress";
