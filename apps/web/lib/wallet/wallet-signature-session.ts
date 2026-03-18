const WALLET_SIGNATURE_SESSION_PREFIX = "solera_wallet_session_signed";
const DEFAULT_SIGNATURE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const WALLET_SIGNATURE_SESSION_CHANGED_EVENT =
  "solera_wallet_signature_session_changed";

interface WalletSignatureSession {
  signedAt: number;
  expiresAt: number;
}

const getSessionKey = (walletAddress: string) =>
  `${WALLET_SIGNATURE_SESSION_PREFIX}:${walletAddress}`;

const emitWalletSignatureSessionChanged = (walletAddress: string) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(WALLET_SIGNATURE_SESSION_CHANGED_EVENT, {
      detail: { walletAddress },
    }),
  );
};

const readSession = (walletAddress: string): WalletSignatureSession | null => {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(getSessionKey(walletAddress));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as WalletSignatureSession;
    if (
      typeof parsed.signedAt !== "number" ||
      typeof parsed.expiresAt !== "number"
    ) {
      localStorage.removeItem(getSessionKey(walletAddress));
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(getSessionKey(walletAddress));
    return null;
  }
};

export const hasValidWalletSignatureSession = (walletAddress: string) => {
  const session = readSession(walletAddress);
  if (!session) return false;

  if (Date.now() >= session.expiresAt) {
    clearWalletSignatureSession(walletAddress);
    return false;
  }

  return true;
};

export const saveWalletSignatureSession = (
  walletAddress: string,
  ttlMs = DEFAULT_SIGNATURE_TTL_MS,
) => {
  if (typeof window === "undefined") return;

  const now = Date.now();
  const payload: WalletSignatureSession = {
    signedAt: now,
    expiresAt: now + ttlMs,
  };
  localStorage.setItem(getSessionKey(walletAddress), JSON.stringify(payload));
  emitWalletSignatureSessionChanged(walletAddress);
};

export const clearWalletSignatureSession = (walletAddress: string) => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getSessionKey(walletAddress));
  emitWalletSignatureSessionChanged(walletAddress);
};
