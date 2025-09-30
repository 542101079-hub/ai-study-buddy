import { afterEach, describe, expect, it, vi } from "vitest";

import { createProfileWithUniqueUsername, normalizeBaseUsername } from "./register";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("normalizeBaseUsername", () => {
  it("derives a sanitized username from the provided name", () => {
    const result = normalizeBaseUsername("Alice Smith", "user@example.com");
    expect(result).toBe("alicesmith");
  });

  it("falls back to email local part when name is missing", () => {
    const result = normalizeBaseUsername(null, "Example.User+test@example.com");
    expect(result).toBe("exampleusertest");
  });

  it("generates a random suffix when base is too short", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.123456789);
    const result = normalizeBaseUsername("a", "a@example.com");
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result.startsWith("a")).toBe(true);
    randomSpy.mockRestore();
  });
});

type MockResponse = { data: any; error: any };

function createClientMock(responses: MockResponse[]) {
  const queue = [...responses];
  const singleMock = vi.fn(() => Promise.resolve(queue.shift() ?? { data: null, error: null }));
  const selectMock = vi.fn(() => ({ single: singleMock }));
  const insertMock = vi.fn(() => ({ select: selectMock }));
  const fromMock = vi.fn(() => ({ insert: insertMock }));
  const client = { from: fromMock } as unknown as Parameters<typeof createProfileWithUniqueUsername>[0];

  return {
    client,
    insertMock,
    singleMock,
  };
}

describe("createProfileWithUniqueUsername", () => {
  const baseArgs = {
    id: "user-1",
    tenantId: "tenant-1",
    baseUsername: "example",
    fullName: "Example User",
    avatarUrl: null as string | null,
    role: "admin" as const,
  };

  it("returns inserted profile on first attempt", async () => {
    const profile = {
      id: "user-1",
      tenant_id: "tenant-1",
      username: "example",
      full_name: "Example User",
      avatar_url: null,
      role: "admin",
    };

    const { client, insertMock } = createClientMock([{ data: profile, error: null }]);

    const result = await createProfileWithUniqueUsername(client, baseArgs);

    expect(result).toEqual(profile);
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock.mock.calls[0][0]).toMatchObject({ username: "example" });
  });

  it("retries when username conflict occurs", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.654321);

    const conflict = { data: null, error: { code: "23505" } };
    const successProfile = {
      id: "user-1",
      tenant_id: "tenant-1",
      username: "example_new",
      full_name: "Example User",
      avatar_url: null,
      role: "admin",
    };

    const { client, insertMock } = createClientMock([conflict, { data: successProfile, error: null }]);

    const result = await createProfileWithUniqueUsername(client, baseArgs);

    expect(result).toEqual(successProfile);
    expect(insertMock).toHaveBeenCalledTimes(2);
    expect(insertMock.mock.calls[0][0]).toMatchObject({ username: "example" });
    expect(insertMock.mock.calls[1][0].username.startsWith("example")).toBe(true);
    expect(insertMock.mock.calls[1][0].username).not.toBe("example");
  });

  it("throws after exhausting retry attempts", async () => {
    const conflict = { data: null, error: { code: "23505" } };
    const { client } = createClientMock([conflict, conflict, conflict, conflict, conflict]);

    await expect(createProfileWithUniqueUsername(client, baseArgs)).rejects.toThrow(/用户名/);
  });
});
