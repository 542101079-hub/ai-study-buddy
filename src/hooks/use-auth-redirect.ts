"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

async function fetchSessionStatus(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/session", {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });

    if (!response.ok) {
      return false;
    }

    const data = (await response.json()) as { user: unknown };
    return Boolean(data.user);
  } catch (error) {
    console.warn("Failed to resolve auth session", error);
    return false;
  }
}

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

    let cancelled = false;

    async function evaluateRedirect() {
      const loggedIn = await fetchSessionStatus();
      const shouldRedirect =
        (when === "authenticated" && loggedIn) ||
        (when === "unauthenticated" && !loggedIn);

      if (!cancelled && shouldRedirect) {
        router.replace(redirectTo);
      }
    }

    evaluateRedirect();

    return () => {
      cancelled = true;
    };
  }, [enabled, redirectTo, router, when]);
}
