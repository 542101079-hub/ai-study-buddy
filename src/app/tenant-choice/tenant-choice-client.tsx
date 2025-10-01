"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

import type { TenantSummary } from "@/lib/auth/tenant-context";

type TenantOption = TenantSummary;

type ConfirmOptions = {
  silent?: boolean;
};

function parseCachedTenants(): TenantOption[] {
  try {
    const raw = sessionStorage.getItem("availableTenants");
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((tenant): tenant is TenantOption =>
      Boolean(
        tenant &&
          typeof tenant === "object" &&
          typeof (tenant as TenantOption).id === "string" &&
          typeof (tenant as TenantOption).name === "string" &&
          typeof (tenant as TenantOption).slug === "string",
      ),
    );
  } catch (error) {
    console.warn("[tenant-choice] failed to parse cached tenants", error);
    return [];
  }
}

export function TenantChoiceClient() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const confirmTenant = useCallback(
    async (tenantId: string, options: ConfirmOptions = {}) => {
      if (!tenantId) {
        return;
      }

      const { silent = false } = options;
      if (!silent) {
        setIsSubmitting(true);
        setError(null);
      }

      try {
        const response = await fetch("/api/auth/tenant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ tenantId }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message ?? "Failed to switch tenant");
        }

        try {
          sessionStorage.setItem("activeTenantId", tenantId);
        } catch (storageError) {
          console.warn("[tenant-choice] failed to cache active tenant", storageError);
        }

        router.replace("/dashboard");
        router.refresh();
      } catch (submitError) {
        console.error("[tenant-choice] switch tenant failed", submitError);
        const fallbackMessage = submitError instanceof Error ? submitError.message : "Failed to switch tenant";
        setError(fallbackMessage);
        if (!silent) {
          setIsSubmitting(false);
        }
      }
    },
    [router],
  );

  useEffect(() => {
    const cachedTenants = parseCachedTenants();
    const cachedActiveTenantId = sessionStorage.getItem("activeTenantId") ?? "";

    if (cachedTenants.length > 0) {
      setTenants(cachedTenants);
      setSelectedTenantId(cachedActiveTenantId || cachedTenants[0].id);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadTenants() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/auth/tenants", { credentials: "include" });
        if (!response.ok) {
          throw new Error(`Failed to load tenants: ${response.status}`);
        }
        const payload = (await response.json()) as { tenants?: TenantOption[] } | null;
        const fetchedTenants = Array.isArray(payload?.tenants) ? payload!.tenants : [];

        if (!cancelled) {
          setTenants(fetchedTenants);
          if (fetchedTenants.length > 0) {
            const initialTenantId = cachedActiveTenantId && fetchedTenants.some((tenant) => tenant.id === cachedActiveTenantId)
              ? cachedActiveTenantId
              : fetchedTenants[0].id;
            setSelectedTenantId(initialTenantId);
            try {
              sessionStorage.setItem("availableTenants", JSON.stringify(fetchedTenants));
              sessionStorage.setItem("activeTenantId", initialTenantId);
            } catch (storageError) {
              console.warn("[tenant-choice] failed to cache tenants", storageError);
            }
          }
        }
      } catch (fetchError) {
        console.error("[tenant-choice] load tenants failed", fetchError);
        if (!cancelled) {
          setError("Unable to load your tenants. Please try again later.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadTenants();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (tenants.length === 0) {
      router.replace("/dashboard");
      router.refresh();
      return;
    }

    if (tenants.length === 1) {
      router.replace("/dashboard");
      router.refresh();
    }
  }, [isLoading, router, tenants]);

  const handleConfirm = async () => {
    await confirmTenant(selectedTenantId);
  };

  const hasTenants = tenants.length > 0;
  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === selectedTenantId) ?? null,
    [selectedTenantId, tenants],
  );

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-12 text-white">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Choose a workspace</h1>
        <p className="text-sm text-white/70">Select the tenant you want to work in right now.</p>
      </header>

      {isLoading ? (
        <div className="rounded-lg border border-white/10 bg-slate-900/60 p-6 text-center text-sm text-white/70">
          Loading tenants...
        </div>
      ) : !hasTenants ? (
        <div className="rounded-lg border border-white/10 bg-slate-900/60 p-6 text-center text-sm text-white/70">
          We could not find any tenants linked to your account.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {tenants.map((tenant) => {
              const isSelected = tenant.id === selectedTenantId;
              return (
                <button
                  key={tenant.id}
                  type="button"
                  onClick={() => setSelectedTenantId(tenant.id)}
                  className={`flex flex-col gap-3 rounded-xl border px-5 py-4 text-left transition ${
                    isSelected
                      ? "border-emerald-400/80 bg-emerald-500/10"
                      : "border-white/10 bg-slate-900/60 hover:border-emerald-400/60 hover:bg-emerald-500/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {tenant.logo_url ? (
                      <div className="relative h-12 w-12 overflow-hidden rounded-full bg-white/10">
                        <img src={tenant.logo_url} alt={`${tenant.name} logo`} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-base font-semibold">
                        {tenant.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white/90">{tenant.name}</p>
                      <p className="truncate text-xs text-white/70">{tenant.slug}</p>
                    </div>
                    <div
                      className={`ml-auto h-4 w-4 rounded-full border ${
                        isSelected ? "border-emerald-400 bg-emerald-400" : "border-white/40"
                      }`}
                    />
                  </div>
                  {tenant.tagline && <p className="text-xs text-white/70">{tenant.tagline}</p>}
                </button>
              );
            })}
          </div>

          {selectedTenant && (
            <div className="rounded-lg border border-white/10 bg-slate-900/60 p-4 text-sm text-white/80">
              <p className="text-base font-semibold text-white">{selectedTenant.name}</p>
              <p className="text-xs text-white/70">{selectedTenant.tagline ?? "This tenant has no tagline yet"}</p>
            </div>
          )}

          {error && <p className="text-sm text-rose-300/90">{error}</p>}

          <Button
            onClick={handleConfirm}
            disabled={!selectedTenantId || isSubmitting}
            className="w-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-500 text-base text-white shadow-[0_18px_45px_rgba(16,185,129,0.35)] hover:from-emerald-400 hover:via-emerald-500 hover:to-teal-400"
          >
            {isSubmitting ? "Switching..." : "Continue"}
          </Button>
        </div>
      )}
    </section>
  );
}
