"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { TenantSummary } from "@/lib/auth/tenant-context";

type TenantContextValue = {
  tenants: TenantSummary[];
  activeTenantId: string;
  selectedTenant: TenantSummary | null;
  setTenants: (tenants: TenantSummary[]) => void;
  setActiveTenant: (tenantId: string) => void;
  clearTenants: () => void;
};

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

const TENANTS_KEY = "availableTenants";
const ACTIVE_TENANT_KEY = "activeTenantId";

function readTenantsFromSession(): TenantSummary[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(TENANTS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((tenant): tenant is TenantSummary =>
      Boolean(
        tenant &&
          typeof tenant === "object" &&
          typeof (tenant as TenantSummary).id === "string" &&
          typeof (tenant as TenantSummary).name === "string" &&
          typeof (tenant as TenantSummary).slug === "string",
      ),
    );
  } catch (error) {
    console.warn("[TenantContext] failed to read tenants from session storage", error);
    return [];
  }
}

function readActiveTenantFromSession(): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.sessionStorage.getItem(ACTIVE_TENANT_KEY) ?? "";
  } catch (error) {
    console.warn("[TenantContext] failed to read active tenant from session storage", error);
    return "";
  }
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenants, setTenantsState] = useState<TenantSummary[]>([]);
  const [activeTenantId, setActiveTenantIdState] = useState<string>("");

  useEffect(() => {
    const initialTenants = readTenantsFromSession();
    const initialTenantId = readActiveTenantFromSession();

    setTenantsState(initialTenants);
    if (initialTenantId) {
      setActiveTenantIdState(initialTenantId);
    } else if (initialTenants.length === 1) {
      setActiveTenantIdState(initialTenants[0].id);
    }
  }, []);

  const setTenants = useCallback((nextTenants: TenantSummary[]) => {
    setTenantsState(nextTenants);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(TENANTS_KEY, JSON.stringify(nextTenants));
      } catch (error) {
        console.warn("[TenantContext] failed to persist tenants", error);
      }
    }
  }, []);

  const setActiveTenant = useCallback((tenantId: string) => {
    setActiveTenantIdState(tenantId);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(ACTIVE_TENANT_KEY, tenantId);
      } catch (error) {
        console.warn("[TenantContext] failed to persist active tenant", error);
      }
    }
  }, []);

  const clearTenants = useCallback(() => {
    setTenantsState([]);
    setActiveTenantIdState("");
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(TENANTS_KEY);
        window.sessionStorage.removeItem(ACTIVE_TENANT_KEY);
      } catch (error) {
        console.warn("[TenantContext] failed to clear session storage", error);
      }
    }
  }, []);

  const selectedTenant = useMemo(() => {
    return tenants.find((tenant) => tenant.id === activeTenantId) ?? null;
  }, [activeTenantId, tenants]);

  const value = useMemo(
    () => ({ tenants, activeTenantId, selectedTenant, setTenants, setActiveTenant, clearTenants }),
    [activeTenantId, clearTenants, selectedTenant, setActiveTenant, setTenants, tenants],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenantContext() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenantContext must be used within a TenantProvider");
  }
  return context;
}
