export const BLOCKED_ACCESS_NOTICE_COOKIE_NAME = "solera_blocked_notice";
export const BLOCKED_ACCESS_NOTICE_COOKIE_MAX_AGE_SECONDS = 120;
export const DEFAULT_BLOCKED_ACCESS_MESSAGE =
  "You are blocked. Please contact block@solera.work for assistance.";

export const sanitizeBlockedAccessMessage = (message?: string | null) => {
  const trimmed = message?.trim();
  if (!trimmed) return DEFAULT_BLOCKED_ACCESS_MESSAGE;
  return trimmed.slice(0, 500);
};

