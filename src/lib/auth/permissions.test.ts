import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  jsonSpy,
  cookiesSpy,
  getSessionMock,
  createRouteHandlerClientMock,
  loadTenantScopedProfileMock,
  supabaseAdminStub,
} = vi.hoisted(() => {
  const jsonMock = vi.fn((body: unknown, init?: ResponseInit) => ({ body, init }));
  const cookiesMock = vi.fn();
  const sessionMock = vi.fn();
  const createClientMock = vi.fn(() => ({
    auth: {
      getSession: sessionMock,
    },
  }));
  const tenantProfileMock = vi.fn();
  const supabaseAdminMock = { marker: "admin-client" };
  return {
    jsonSpy: jsonMock,
    cookiesSpy: cookiesMock,
    getSessionMock: sessionMock,
    createRouteHandlerClientMock: createClientMock,
    loadTenantScopedProfileMock: tenantProfileMock,
    supabaseAdminStub: supabaseAdminMock,
  };
});

vi.mock("next/headers", () => ({
  cookies: cookiesSpy,
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: jsonSpy,
  },
  NextRequest: class MockRequest {},
}));

vi.mock("@supabase/auth-helpers-nextjs", () => ({
  createRouteHandlerClient: createRouteHandlerClientMock,
}));

vi.mock("./tenant-context", () => ({
  loadTenantScopedProfile: loadTenantScopedProfileMock,
}));

// vitest needs the module mocks declared before importing the module under test.
vi.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: supabaseAdminStub,
}));

import { withAdminRoute } from "./server-guards";

describe("withAdminRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    jsonSpy.mockImplementation((body: unknown, init?: ResponseInit) => ({ body, init }));
  });

  it("returns 401 when session is missing", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });

    const handler = vi.fn();
    const guard = withAdminRoute(handler);

    const result = await guard({} as never, {} as never);

    expect(result).toEqual({ body: { message: "Authentication required" }, init: { status: 401 } });
    expect(jsonSpy).toHaveBeenCalledWith({ message: "Authentication required" }, { status: 401 });
    expect(handler).not.toHaveBeenCalled();
    expect(loadTenantScopedProfileMock).not.toHaveBeenCalled();
  });

  it("returns 403 for non-admin profiles", async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: "user-1" } } }, error: null });
    loadTenantScopedProfileMock.mockResolvedValue({
      id: "user-1",
      tenant_id: "tenant-1",
      role: "user",
      username: "user1",
      full_name: null,
      avatar_url: null,
    });

    const handler = vi.fn();
    const guard = withAdminRoute(handler);

    const result = await guard({} as never, {} as never);

    expect(result).toEqual({ body: { message: "Insufficient permissions" }, init: { status: 403 } });
    expect(jsonSpy).toHaveBeenCalledWith(
      { message: "Insufficient permissions" },
      { status: 403 },
    );
    expect(handler).not.toHaveBeenCalled();
    expect(loadTenantScopedProfileMock).toHaveBeenCalledWith(supabaseAdminStub, "user-1");
  });

  it("allows admin profiles to hit the handler", async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: "admin-1" } } }, error: null });
    loadTenantScopedProfileMock.mockResolvedValue({
      id: "admin-1",
      tenant_id: "tenant-1",
      role: "admin",
      username: "admin",
      full_name: "Admin User",
      avatar_url: null,
    });

    const handler = vi.fn(async () => new Response("ok", { status: 200 }));
    const guard = withAdminRoute(handler);

    const response = await guard({} as never, { params: { example: true } } as never);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.anything(),
      { params: { example: true } },
      {
        supabase: expect.any(Object),
        profile: {
          id: "admin-1",
          tenant_id: "tenant-1",
          role: "admin",
          username: "admin",
          full_name: "Admin User",
          avatar_url: null,
        },
      },
    );
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
    expect(jsonSpy).not.toHaveBeenCalled();
  });
});
