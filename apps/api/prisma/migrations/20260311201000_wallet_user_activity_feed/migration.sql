DO $$
BEGIN
  CREATE TYPE "WalletActivityType" AS ENUM ('STAKE', 'CLAIM', 'DEPOSIT', 'WITHDRAW', 'CONVERT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE "WalletActivityStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS "WalletUserActivity" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "eventHash" TEXT NOT NULL,
  "type" "WalletActivityType" NOT NULL,
  "status" "WalletActivityStatus" NOT NULL DEFAULT 'COMPLETED',
  "tokenTicker" TEXT NOT NULL,
  "tokenName" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "amountUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "referenceId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WalletUserActivity_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "WalletUserActivity"
    ADD CONSTRAINT "WalletUserActivity_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "WalletUser"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "WalletUserActivity_eventHash_key" ON "WalletUserActivity"("eventHash");
CREATE INDEX IF NOT EXISTS "WalletUserActivity_createdAt_idx" ON "WalletUserActivity"("createdAt");
CREATE INDEX IF NOT EXISTS "WalletUserActivity_userId_createdAt_idx" ON "WalletUserActivity"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "WalletUserActivity_walletAddress_createdAt_idx" ON "WalletUserActivity"("walletAddress", "createdAt");
CREATE INDEX IF NOT EXISTS "WalletUserActivity_type_createdAt_idx" ON "WalletUserActivity"("type", "createdAt");
CREATE INDEX IF NOT EXISTS "WalletUserActivity_status_createdAt_idx" ON "WalletUserActivity"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "WalletUserActivity_tokenTicker_createdAt_idx" ON "WalletUserActivity"("tokenTicker", "createdAt");
