"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type QuickActionNavigateProps = {
  href?: string;
  external?: boolean;
  children: React.ReactNode;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
};

export function QuickActionNavigate({
  href,
  external,
  children,
  className,
  variant = "ghost",
  size = "sm",
}: QuickActionNavigateProps) {
  const router = useRouter();

  if (!href) {
    return (
      <Button variant={variant} size={size} className={className}>
        {children}
      </Button>
    );
  }

  if (external) {
    return (
      <Button
        asChild
        variant={variant}
        size={size}
        className={cn(className, "px-1")}
      >
        <Link href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </Link>
      </Button>
    );
  }

  if (href === "/journal") {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => router.push("/journal")}
      >
        {children}
      </Button>
    );
  }

  return (
    <Button
      asChild
      variant={variant}
      size={size}
      className={cn(className, "px-1")}
    >
      <Link href={href}>{children}</Link>
    </Button>
  );
}
