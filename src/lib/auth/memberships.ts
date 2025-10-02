type PostgrestErrorLike = {
  code?: string;
  message?: string;
};

const MISSING_MEMBERSHIP_CODES = new Set(["42703", "PGRST205"]);

export function isTenantMembershipTableMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const { code, message } = error as PostgrestErrorLike;
  if (code && MISSING_MEMBERSHIP_CODES.has(code)) {
    return true;
  }

  if (typeof message === "string") {
    return message.includes("app_users") && message.includes("tenant") &&
      message.includes("does not exist");
  }

  return false;
}
