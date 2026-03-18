export const WALLET_USER_SESSION_CHANGED_EVENT =
  "solera:wallet-user-session-changed";

type WalletUserSessionEventSource =
  | "session_start"
  | "session_end"
  | "session_refresh";

export interface WalletUserSessionChangedDetail {
  walletAddress: string;
  sessionId: string | null;
  source: WalletUserSessionEventSource;
}

export const emitWalletUserSessionChanged = (
  detail: WalletUserSessionChangedDetail,
) => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<WalletUserSessionChangedDetail>(
      WALLET_USER_SESSION_CHANGED_EVENT,
      {
        detail,
      },
    ),
  );
};
