-- CreateEnum
CREATE TYPE "WalletConversionStatus" AS ENUM (
  'PREPARED',
  'COMPLETED',
  'PARTIAL_SUCCESS',
  'FAILED',
  'EXPIRED'
);

-- CreateEnum
CREATE TYPE "WalletConversionLegStatus" AS ENUM (
  'PREPARED',
  'COMPLETED',
  'FAILED',
  'EXPIRED'
);

-- CreateTable
CREATE TABLE "WalletConversionSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "network" TEXT NOT NULL,
  "status" "WalletConversionStatus" NOT NULL DEFAULT 'PREPARED',
  "totalInputUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "quotedRaOut" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "actualRaOut" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalFeeRa" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalFeeUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "requesterIp" TEXT,
  "requesterCountry" TEXT,
  "userAgent" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WalletConversionSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletConversionLeg" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "status" "WalletConversionLegStatus" NOT NULL DEFAULT 'PREPARED',
  "inputTicker" TEXT NOT NULL,
  "inputTokenName" TEXT,
  "inputMintAddress" TEXT NOT NULL,
  "inputAmount" DOUBLE PRECISION NOT NULL,
  "inputAmountRaw" TEXT NOT NULL,
  "inputDecimals" INTEGER NOT NULL,
  "quotedInputUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "quotedRaOut" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "actualRaOut" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "quotedFeeRa" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "actualFeeRa" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "quotedFeeUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "feeBps" INTEGER NOT NULL DEFAULT 0,
  "slippageBps" INTEGER NOT NULL DEFAULT 0,
  "jupiterQuote" JSONB,
  "preparedTransaction" TEXT NOT NULL,
  "preparedMessageHash" TEXT NOT NULL,
  "preparedLastValidBlockHeight" INTEGER,
  "signature" TEXT,
  "referenceActivityId" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WalletConversionLeg_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WalletConversionSession_userId_createdAt_idx" ON "WalletConversionSession"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletConversionSession_walletAddress_createdAt_idx" ON "WalletConversionSession"("walletAddress", "createdAt");

-- CreateIndex
CREATE INDEX "WalletConversionSession_status_createdAt_idx" ON "WalletConversionSession"("status", "createdAt");

-- CreateIndex
CREATE INDEX "WalletConversionSession_network_status_idx" ON "WalletConversionSession"("network", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WalletConversionLeg_sessionId_sequence_key" ON "WalletConversionLeg"("sessionId", "sequence");

-- CreateIndex
CREATE INDEX "WalletConversionLeg_sessionId_status_idx" ON "WalletConversionLeg"("sessionId", "status");

-- CreateIndex
CREATE INDEX "WalletConversionLeg_signature_idx" ON "WalletConversionLeg"("signature");

-- AddForeignKey
ALTER TABLE "WalletConversionSession"
ADD CONSTRAINT "WalletConversionSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "WalletUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletConversionLeg"
ADD CONSTRAINT "WalletConversionLeg_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "WalletConversionSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
