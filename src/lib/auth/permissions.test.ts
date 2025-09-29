import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  jsonSpy,
  cookiesSpy,
  getSessionMock,
  createRouteHandlerClientMock,
  loadTenantScopedProfileMock,
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
  return {
    jsonSpy: jsonMock,
    cookiesSpy: cookiesMock,
    getSessionMock: sessionMock,
    createRouteHandlerClientMock: createClientMock,
    loadTenantScopedProfileMock: tenantProfileMock,
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
import { withAdminRoute } from "./permissions";

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

    expect(result).toEqual({ body: { message: "Unauthorized" }, init: { status: 401 } });
    expect(jsonSpy).toHaveBeenCalledWith({ message: "Unauthorized" }, { status: 401 });
    expect(handler).not.toHaveBeenCalled();
    expect(loadTenantScopedProfileMock).not.toHaveBeenCalled();
  });

  it("returns 403 for non-admin profiles", async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
    loadTenantScopedProfileMock.mockResolvedValue({ id: "user-1", tenantId: "tenant-1", role: "user" });

    const handler = vi.fn();
    const guard = withAdminRoute(handler);

    const result = await guard({} as never, {} as never);

    expect(result).toEqual({ body: { message: "You do not have permission to access this resource" }, init: { status: 403 } });
    expect(jsonSpy).toHaveBeenCalledWith(
      { message: "You do not have permission to access this resource" },
      { status: 403 },
    );
    expect(handler).not.toHaveBeenCalled();
    expect(loadTenantScopedProfileMock).toHaveBeenCalledWith(expect.anything(), "user-1");
  });

  it("allows admin profiles to hit the handler", async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: "admin-1" } } } });
    loadTenantScopedProfileMock.mockResolvedValue({ id: "admin-1", tenantId: "tenant-1", role: "admin" });

    const handler = vi.fn(async () => new Response("ok", { status: 200 }));
    const guard = withAdminRoute(handler);

    const response = await guard({} as never, { params: { example: true } } as never);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.anything(),
      { params: { example: true } },
      {
        supabase: expect.any(Object),
        profile: { id: "admin-1", tenantId: "tenant-1", role: "admin" },
      },
    );
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
    expect(jsonSpy).not.toHaveBeenCalled();
  });
});
