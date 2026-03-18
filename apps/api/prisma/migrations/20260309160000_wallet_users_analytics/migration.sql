-- CreateEnum
CREATE TYPE "StakePositionStatus" AS ENUM ('ACTIVE', 'CLAIMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "WalletUser" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstSeenIp" TEXT,
    "lastSeenIp" TEXT,
    "firstSeenCountry" TEXT,
    "lastSeenCountry" TEXT,
    "totalSessionSeconds" INTEGER NOT NULL DEFAULT 0,
    "totalStakePositions" INTEGER NOT NULL DEFAULT 0,
    "activeStakePositions" INTEGER NOT NULL DEFAULT 0,
    "totalStakedAmountUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletUserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "ipAddress" TEXT,
    "countryCode" TEXT,
    "userAgent" TEXT,
    "sessionKey" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletUserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletStakePosition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenTicker" TEXT NOT NULL,
    "tokenName" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "amountUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "periodLabel" TEXT NOT NULL,
    "periodDays" INTEGER NOT NULL,
    "apy" DOUBLE PRECISION NOT NULL,
    "rewardToken" TEXT NOT NULL DEFAULT 'RA',
    "rewardEstimate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "StakePositionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlockAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletStakePosition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WalletUser_walletAddress_key" ON "WalletUser"("walletAddress");

-- CreateIndex
CREATE INDEX "WalletUser_lastSeenAt_idx" ON "WalletUser"("lastSeenAt");

-- CreateIndex
CREATE INDEX "WalletUser_lastSeenCountry_idx" ON "WalletUser"("lastSeenCountry");

-- CreateIndex
CREATE UNIQUE INDEX "WalletUserSession_sessionKey_key" ON "WalletUserSession"("sessionKey");

-- CreateIndex
CREATE INDEX "WalletUserSession_userId_idx" ON "WalletUserSession"("userId");

-- CreateIndex
CREATE INDEX "WalletUserSession_lastSeenAt_idx" ON "WalletUserSession"("lastSeenAt");

-- CreateIndex
CREATE INDEX "WalletUserSession_isOnline_idx" ON "WalletUserSession"("isOnline");

-- CreateIndex
CREATE INDEX "WalletStakePosition_userId_idx" ON "WalletStakePosition"("userId");

-- CreateIndex
CREATE INDEX "WalletStakePosition_status_idx" ON "WalletStakePosition"("status");

-- CreateIndex
CREATE INDEX "WalletStakePosition_tokenTicker_idx" ON "WalletStakePosition"("tokenTicker");

-- CreateIndex
CREATE INDEX "WalletStakePosition_startedAt_idx" ON "WalletStakePosition"("startedAt");

-- AddForeignKey
ALTER TABLE "WalletUserSession" ADD CONSTRAINT "WalletUserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "WalletUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletStakePosition" ADD CONSTRAINT "WalletStakePosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "WalletUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
