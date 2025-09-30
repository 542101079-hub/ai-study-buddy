import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createUserMock,
  createProfileWithUniqueUsernameMock,
  normalizeBaseUsernameMock,
} = vi.hoisted(() => ({
  createUserMock: vi.fn(),
  createProfileWithUniqueUsernameMock: vi.fn(),
  normalizeBaseUsernameMock: vi.fn(() => "normalized"),
}));

vi.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        createUser: createUserMock,
      },
    },
  },
}));

vi.mock("@/lib/auth/register", () => ({
  createProfileWithUniqueUsername: createProfileWithUniqueUsernameMock,
  normalizeBaseUsername: normalizeBaseUsernameMock,
}));

vi.mock("@/lib/auth/permissions", () => ({
  withAdminRoute: (handler: any) => handler,
}));

import { POST } from "./route";

const profileContext = {
  profile: {
    id: "admin-1",
    tenant_id: "tenant-1",
    role: "admin",
    username: "owner",
    full_name: "Owner",
    avatar_url: null,
  },
};

describe("POST /api/admin/members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new administrator and returns profile", async () => {
    createUserMock.mockResolvedValue({
      data: { user: { id: "user-123", email: "new-admin@example.com" } },
      error: null,
    });
    createProfileWithUniqueUsernameMock.mockResolvedValue({
      id: "user-123",
      tenant_id: "tenant-1",
      username: "adminuser",
      full_name: "Admin User",
      avatar_url: null,
      role: "admin",
    });

    const request = new Request("https://example.com/api/admin/members", {
      method: "POST",
      body: JSON.stringify({
        name: "Admin User",
        email: "new-admin@example.com",
        password: "password123",
        username: "AdminUser",
      }),
    });

    const response = await POST(request, {} as any, profileContext);
    expect(response.status).toBe(201);
    const body = await response.json();

    expect(body.member).toEqual(
      expect.objectContaining({
        id: "user-123",
        role: "admin",
        username: "adminuser",
      }),
    );
    expect(createUserMock).toHaveBeenCalledWith({
      email: "new-admin@example.com",
      password: "password123",
      email_confirm: true,
      user_metadata: { full_name: "Admin User" },
    });
    expect(createProfileWithUniqueUsernameMock).toHaveBeenCalledWith(expect.any(Object), {
      id: "user-123",
      tenantId: "tenant-1",
      baseUsername: "adminuser",
      fullName: "Admin User",
      avatarUrl: null,
      role: "admin",
    });
    expect(normalizeBaseUsernameMock).not.toHaveBeenCalled();
  });

  it("returns field error when email already exists", async () => {
    createUserMock.mockResolvedValue({
      data: { user: null },
      error: { status: 409 },
    });

    const request = new Request("https://example.com/api/admin/members", {
      method: "POST",
      body: JSON.stringify({
        name: "Admin User",
        email: "duplicate@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request, {} as any, profileContext);
    expect(response.status).toBe(409);
    const body = await response.json();

    expect(body.fieldErrors).toHaveProperty("email");
    expect(createProfileWithUniqueUsernameMock).not.toHaveBeenCalled();
  });

  it("validates input payload", async () => {
    const request = new Request("https://example.com/api/admin/members", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request, {} as any, profileContext);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.fieldErrors).toBeDefined();
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it("returns conflict when profile creation fails with duplicate username", async () => {
    createUserMock.mockResolvedValue({
      data: { user: { id: "user-123", email: "new-admin@example.com" } },
      error: null,
    });
    createProfileWithUniqueUsernameMock.mockRejectedValue({ code: "23505" });

    const request = new Request("https://example.com/api/admin/members", {
      method: "POST",
      body: JSON.stringify({
        name: "Admin User",
        email: "new-admin@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request, {} as any, profileContext);
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.fieldErrors).toHaveProperty("username");
  });
});
