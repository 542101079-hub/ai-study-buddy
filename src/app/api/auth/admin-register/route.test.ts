import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createUserMock,
  signInMock,
  createTenantMock,
  deriveTenantMetadataMock,
  createProfileWithUniqueUsernameMock,
  normalizeBaseUsernameMock,
} = vi.hoisted(() => ({
  createUserMock: vi.fn(),
  signInMock: vi.fn(),
  createTenantMock: vi.fn(),
  deriveTenantMetadataMock: vi.fn(() => ({ name: "Demo Workspace", slugBase: "demo-workspace" })),
  createProfileWithUniqueUsernameMock: vi.fn(),
  normalizeBaseUsernameMock: vi.fn(() => "normalized"),
}));

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
  },
}));

vi.mock("@/lib/tenants", () => ({
  createTenant: createTenantMock,
  deriveTenantMetadata: deriveTenantMetadataMock,
}));

vi.mock("@/lib/auth/register", () => ({
  createProfileWithUniqueUsername: createProfileWithUniqueUsernameMock,
  normalizeBaseUsername: normalizeBaseUsernameMock,
}));

import { POST } from "./route";

describe("POST /api/auth/admin-register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates tenant and administrator", async () => {
    createUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "owner@example.com" } },
      error: null,
    });
    signInMock.mockResolvedValue({ error: null });
    createTenantMock.mockResolvedValue({
      id: "tenant-1",
      name: "Demo Workspace",
      slug: "demo-workspace",
      logo_url: "https://logo.example.com",
      tagline: "tagline",
    });
    createProfileWithUniqueUsernameMock.mockResolvedValue({
      id: "user-1",
      tenant_id: "tenant-1",
      username: "owner",
      full_name: "Owner",
      avatar_url: null,
      role: "admin",
    });

    const request = new Request("https://example.com/api/auth/admin-register", {
      method: "POST",
      body: JSON.stringify({
        tenantName: "Demo Workspace",
        tenantLogoUrl: "https://logo.example.com",
        tenantTagline: "tagline",
        name: "Owner",
        email: "owner@example.com",
        password: "password123",
        username: "Owner",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const body = await response.json();

    expect(body.user).toBeDefined();
    expect(createUserMock).toHaveBeenCalledWith({
      email: "owner@example.com",
      password: "password123",
      email_confirm: true,
      user_metadata: { full_name: "Owner" },
    });
    expect(signInMock).toHaveBeenCalledWith({ email: "owner@example.com", password: "password123" });
    expect(deriveTenantMetadataMock).toHaveBeenCalledWith("Owner", "owner", "owner@example.com", {
      tenantName: "Demo Workspace",
    });
    expect(createTenantMock).toHaveBeenCalledWith(expect.any(Object), "Demo Workspace", "demo-workspace", {
      logoUrl: "https://logo.example.com",
      tagline: "tagline",
    });
    expect(createProfileWithUniqueUsernameMock).toHaveBeenCalledWith(expect.any(Object), {
      id: "user-1",
      tenantId: "tenant-1",
      baseUsername: "owner",
      fullName: "Owner",
      avatarUrl: null,
      role: 'admin',
    });
  });

  it("returns 409 when email already exists", async () => {
    createUserMock.mockResolvedValue({
      data: { user: null },
      error: { status: 409 },
    });

    const request = new Request("https://example.com/api/auth/admin-register", {
      method: "POST",
      body: JSON.stringify({
        tenantName: "Demo Workspace",
        tenantLogoUrl: "https://logo.example.com",
        tenantTagline: "tagline",
        name: "Owner",
        email: "owner@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.fieldErrors).toHaveProperty("email");
    expect(signInMock).not.toHaveBeenCalled();
    expect(createTenantMock).not.toHaveBeenCalled();
  });

  it("validates payload", async () => {
    const request = new Request("https://example.com/api/auth/admin-register", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.fieldErrors).toBeDefined();
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it("returns 409 when username is duplicated", async () => {
    createUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "owner@example.com" } },
      error: null,
    });
    signInMock.mockResolvedValue({ error: null });
    deriveTenantMetadataMock.mockReturnValue({ name: "Demo Workspace", slugBase: "demo-workspace" });
    createTenantMock.mockResolvedValue({
      id: "tenant-1",
      name: "Demo Workspace",
      slug: "demo-workspace",
      logo_url: "https://logo.example.com",
      tagline: "tagline",
    });
    createProfileWithUniqueUsernameMock.mockRejectedValue({ code: "23505" });

    const request = new Request("https://example.com/api/auth/admin-register", {
      method: "POST",
      body: JSON.stringify({
        tenantName: "Demo Workspace",
        tenantLogoUrl: "https://logo.example.com",
        tenantTagline: "tagline",
        name: "Owner",
        email: "owner@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.fieldErrors).toHaveProperty("username");
  });
});
