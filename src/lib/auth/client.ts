export type AuthFieldErrors = Record<string, string>;

type AuthResponsePayload = {
  message?: string;
  fieldErrors?: AuthFieldErrors;
  user?: Record<string, unknown> | null;
  tenants?: unknown;
};

export async function submitAuthRequest<TBody extends Record<string, unknown>>(
  endpoint: "/api/auth/login" | "/api/auth/register" | "/api/auth/logout" | "/api/auth/admin-register",
  body?: TBody,
) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  let payload: AuthResponsePayload | null = null;

  try {
    payload = (await response.json()) as AuthResponsePayload;
  } catch {
    payload = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}
