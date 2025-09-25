import * as React from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Avatar({ className, children, ...rest }: AvatarProps) {
  return (
    <div
      className={cn(
        "relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 text-base font-semibold text-white shadow-md backdrop-blur",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
