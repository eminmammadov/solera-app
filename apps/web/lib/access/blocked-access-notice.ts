export const BLOCKED_ACCESS_NOTICE_EVENT = "solera_blocked_access_notice";
export {
  BLOCKED_ACCESS_NOTICE_COOKIE_MAX_AGE_SECONDS,
  BLOCKED_ACCESS_NOTICE_COOKIE_NAME,
  DEFAULT_BLOCKED_ACCESS_MESSAGE,
  sanitizeBlockedAccessMessage,
} from "@/lib/access/blocked-access-notice-shared";
import { sanitizeBlockedAccessMessage } from "@/lib/access/blocked-access-notice-shared";

export const emitBlockedAccessNotice = (message?: string | null) => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(BLOCKED_ACCESS_NOTICE_EVENT, {
      detail: {
        message: sanitizeBlockedAccessMessage(message),
      },
    }),
  );
};
