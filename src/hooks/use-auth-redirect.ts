"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasActiveSession } from "@/lib/session";

type RedirectCondition = "authenticated" | "unauthenticated";

interface UseAuthRedirectOptions {
  when: RedirectCondition;
  redirectTo: string;
  enabled?: boolean;
}

export function useAuthRedirect({
  when,
  redirectTo,
  enabled = true,
}: UseAuthRedirectOptions) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const loggedIn = hasActiveSession();
    const shouldRedirect =
      (when === "authenticated" && loggedIn) ||
      (when === "unauthenticated" && !loggedIn);

    if (shouldRedirect) {
      router.replace(redirectTo);
    }
  }, [enabled, redirectTo, router, when]);
}
