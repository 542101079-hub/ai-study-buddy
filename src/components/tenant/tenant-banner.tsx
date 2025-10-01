"use client";

import { useTenantContext } from "./tenant-context";

export function TenantBanner() {
  const { selectedTenant } = useTenantContext();

  if (!selectedTenant) {
    return null;
  }

  return (
    <div className="border-b border-white/10 bg-slate-950/85 px-6 py-4 text-sm text-white/85 backdrop-blur sm:px-10">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4">
        {selectedTenant.logo_url ? (
          <div className="relative h-10 w-10 overflow-hidden rounded-full bg-white/10">
            <img
              src={selectedTenant.logo_url}
              alt={`${selectedTenant.name} logo`}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
            {selectedTenant.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-white">{selectedTenant.name}</p>
          <p className="truncate text-xs text-white/70">
            {selectedTenant.tagline ?? "This tenant has no tagline yet"}
          </p>
        </div>
      </div>
    </div>
  );
}
