-- CreateTable
CREATE TABLE "WalletTokenHolding" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "network" TEXT NOT NULL,
  "mintAddress" TEXT NOT NULL,
  "ticker" TEXT NOT NULL,
  "tokenName" TEXT,
  "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WalletTokenHolding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WalletTokenHolding_userId_network_mintAddress_key" ON "WalletTokenHolding"("userId", "network", "mintAddress");

-- CreateIndex
CREATE INDEX "WalletTokenHolding_userId_network_idx" ON "WalletTokenHolding"("userId", "network");

-- CreateIndex
CREATE INDEX "WalletTokenHolding_network_ticker_idx" ON "WalletTokenHolding"("network", "ticker");

-- AddForeignKey
ALTER TABLE "WalletTokenHolding"
ADD CONSTRAINT "WalletTokenHolding_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "WalletUser"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
