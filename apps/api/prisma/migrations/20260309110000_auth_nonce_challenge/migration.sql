-- Persist wallet auth nonce challenges for multi-instance safety
CREATE TABLE "AuthNonceChallenge" (
    "walletAddress" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthNonceChallenge_pkey" PRIMARY KEY ("walletAddress")
);

CREATE INDEX "AuthNonceChallenge_expiresAt_idx" ON "AuthNonceChallenge"("expiresAt");
