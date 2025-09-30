import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createUserMock,
  signInMock,
  supabaseFromMock,
  createProfileWithUniqueUsernameMock,
  normalizeBaseUsernameMock,
} = vi.hoisted(() => {
  const createUser = vi.fn();
  const signIn = vi.fn();
  const fromMock = vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  }));
  return {
    createUserMock: createUser,
    signInMock: signIn,
    supabaseFromMock: fromMock,
    createProfileWithUniqueUsernameMock: vi.fn(),
    normalizeBaseUsernameMock: vi.fn(() => "normalized"),
  };
});

const maybeSingleMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@supabase/auth-helpers-nextjs", () => ({
  createRouteHandlerClient: vi.fn(() => ({
    auth: {
      signInWithPassword: signInMock,
    },
  })),
}));

vi.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        createUser: createUserMock,
      },
    },
    from: (table: string) => {
      const query = supabaseFromMock(table);
      query.maybeSingle = maybeSingleMock;
      return query;
    },
  },
}));

vi.mock("@/lib/auth/register", () => ({
  createProfileWithUniqueUsername: createProfileWithUniqueUsernameMock,
  normalizeBaseUsername: normalizeBaseUsernameMock,
}));

import { POST } from "./route";

const TENANT_RESPONSE = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Demo Workspace",
  slug: "demo-workspace",
  logo_url: null,
  tagline: null,
};

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingleMock.mockReset();
  });

  it("creates a member inside an existing tenant", async () => {
    createUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "member@example.com" } },
      error: null,
    });
    signInMock.mockResolvedValue({ error: null });
    maybeSingleMock.mockResolvedValue({ data: TENANT_RESPONSE, error: null });
    createProfileWithUniqueUsernameMock.mockResolvedValue({
      id: "user-1",
      tenant_id: "11111111-1111-1111-1111-111111111111",
      username: "normalized",
      full_name: "Member",
      avatar_url: null,
      role: "user",
    });

    const request = new Request("https://example.com/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Member",
        email: "member@example.com",
        password: "password123",
        tenantId: "11111111-1111-1111-1111-111111111111",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const body = await response.json();

    expect(createUserMock).toHaveBeenCalledWith({
      email: "member@example.com",
      password: "password123",
      email_confirm: true,
      user_metadata: { full_name: "Member" },
    });
    expect(signInMock).toHaveBeenCalledWith({ email: "member@example.com", password: "password123" });
    expect(createProfileWithUniqueUsernameMock).toHaveBeenCalledWith(expect.any(Object), {
      id: "user-1",
      tenantId: "11111111-1111-1111-1111-111111111111",
      baseUsername: "normalized",
      fullName: "Member",
      avatarUrl: null,
      role: 'user',
    });
    expect(body.user.tenant).toEqual(TENANT_RESPONSE);
  });

  it("requires tenant id", async () => {
    const request = new Request("https://example.com/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Member",
        email: "member@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.fieldErrors.tenantId).toBeDefined();
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it("returns 404 when tenant is missing", async () => {
    createUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "member@example.com" } },
      error: null,
    });
    signInMock.mockResolvedValue({ error: null });
    maybeSingleMock.mockResolvedValue({ data: null, error: null });

    const request = new Request("https://example.com/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Member",
        email: "member@example.com",
        password: "password123",
        tenantId: "99999999-9999-9999-9999-999999999999",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.fieldErrors.tenantId).toBeDefined();
    expect(createProfileWithUniqueUsernameMock).not.toHaveBeenCalled();
  });

  it("propagates username conflicts", async () => {
    createUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "member@example.com" } },
      error: null,
    });
    signInMock.mockResolvedValue({ error: null });
    maybeSingleMock.mockResolvedValue({ data: TENANT_RESPONSE, error: null });
    createProfileWithUniqueUsernameMock.mockRejectedValue({ code: "23505" });

    const request = new Request("https://example.com/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Member",
        email: "member@example.com",
        password: "password123",
        tenantId: "11111111-1111-1111-1111-111111111111",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.fieldErrors.username).toBeDefined();
  });
});
