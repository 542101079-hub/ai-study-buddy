const SESSION_STORAGE_KEY = "asb:session";

type SessionPayload = {
  email: string;
  displayName?: string;
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type SetSessionOptions = {
  remember?: boolean;
};

function readFromStorage(storage: StorageLike | undefined | null) {
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionPayload;
  } catch (error) {
    console.warn("Failed to parse session payload", error);
    storage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function getSession(): SessionPayload | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    readFromStorage(window.localStorage) ??
    readFromStorage(window.sessionStorage)
  );
}

export function setSession(
  payload: SessionPayload,
  options: SetSessionOptions = {},
) {
  if (typeof window === "undefined") {
    return;
  }

  const remember = options.remember ?? true;
  const data = JSON.stringify(payload);

  if (remember) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, data);
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } else {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, data);
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

export function clearSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

export function hasActiveSession() {
  return getSession() !== null;
}

export function sessionKey() {
  return SESSION_STORAGE_KEY;
}
