-- 1. Network consistency
ALTER TABLE "MarketToken"
ADD COLUMN "network" TEXT NOT NULL DEFAULT 'global';

ALTER TABLE "WalletUserSession"
ADD COLUMN "network" TEXT NOT NULL DEFAULT 'mainnet';

ALTER TABLE "WalletStakePosition"
ADD COLUMN "network" TEXT NOT NULL DEFAULT 'mainnet';

ALTER TABLE "WalletUserActivity"
ADD COLUMN "network" TEXT NOT NULL DEFAULT 'mainnet';

CREATE INDEX "MarketToken_network_idx" ON "MarketToken"("network");
CREATE INDEX "MarketToken_network_isActive_idx" ON "MarketToken"("network", "isActive");
CREATE INDEX "WalletUserSession_network_isOnline_idx" ON "WalletUserSession"("network", "isOnline");
CREATE INDEX "WalletStakePosition_userId_network_idx" ON "WalletStakePosition"("userId", "network");
CREATE INDEX "WalletStakePosition_network_status_idx" ON "WalletStakePosition"("network", "status");
CREATE INDEX "WalletUserActivity_userId_network_createdAt_idx" ON "WalletUserActivity"("userId", "network", "createdAt");
CREATE INDEX "WalletUserActivity_network_createdAt_idx" ON "WalletUserActivity"("network", "createdAt");

-- 2. Decimal / numeric financial columns
ALTER TABLE "MarketToken"
ALTER COLUMN "price" TYPE DECIMAL(38,18) USING "price"::numeric(38,18);

ALTER TABLE "WalletUser"
ALTER COLUMN "totalStakedAmountUsd" TYPE DECIMAL(38,18) USING "totalStakedAmountUsd"::numeric(38,18),
ALTER COLUMN "raOnchainBalance" TYPE DECIMAL(38,18) USING "raOnchainBalance"::numeric(38,18);

ALTER TABLE "WalletTokenHolding"
ALTER COLUMN "amount" TYPE DECIMAL(38,18) USING "amount"::numeric(38,18);

ALTER TABLE "WalletStakePosition"
ALTER COLUMN "amount" TYPE DECIMAL(38,18) USING "amount"::numeric(38,18),
ALTER COLUMN "amountUsd" TYPE DECIMAL(38,18) USING "amountUsd"::numeric(38,18),
ALTER COLUMN "rewardEstimate" TYPE DECIMAL(38,18) USING "rewardEstimate"::numeric(38,18);

ALTER TABLE "WalletConversionSession"
ALTER COLUMN "totalInputUsd" TYPE DECIMAL(38,18) USING "totalInputUsd"::numeric(38,18),
ALTER COLUMN "quotedRaOut" TYPE DECIMAL(38,18) USING "quotedRaOut"::numeric(38,18),
ALTER COLUMN "actualRaOut" TYPE DECIMAL(38,18) USING "actualRaOut"::numeric(38,18),
ALTER COLUMN "totalFeeRa" TYPE DECIMAL(38,18) USING "totalFeeRa"::numeric(38,18),
ALTER COLUMN "totalFeeUsd" TYPE DECIMAL(38,18) USING "totalFeeUsd"::numeric(38,18);

ALTER TABLE "WalletConversionLeg"
ALTER COLUMN "inputAmount" TYPE DECIMAL(38,18) USING "inputAmount"::numeric(38,18),
ALTER COLUMN "quotedInputUsd" TYPE DECIMAL(38,18) USING "quotedInputUsd"::numeric(38,18),
ALTER COLUMN "quotedRaOut" TYPE DECIMAL(38,18) USING "quotedRaOut"::numeric(38,18),
ALTER COLUMN "actualRaOut" TYPE DECIMAL(38,18) USING "actualRaOut"::numeric(38,18),
ALTER COLUMN "quotedFeeRa" TYPE DECIMAL(38,18) USING "quotedFeeRa"::numeric(38,18),
ALTER COLUMN "actualFeeRa" TYPE DECIMAL(38,18) USING "actualFeeRa"::numeric(38,18),
ALTER COLUMN "quotedFeeUsd" TYPE DECIMAL(38,18) USING "quotedFeeUsd"::numeric(38,18);

ALTER TABLE "WalletUserActivity"
ALTER COLUMN "amount" TYPE DECIMAL(38,18) USING "amount"::numeric(38,18),
ALTER COLUMN "amountUsd" TYPE DECIMAL(38,18) USING "amountUsd"::numeric(38,18);

-- 3. Bounded system config tables
CREATE TABLE "MaintenanceSetting" (
  "id" TEXT NOT NULL DEFAULT 'maintenance-settings',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "startsAt" TIMESTAMP(3),
  "message" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaintenanceSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HeaderSetting" (
  "id" TEXT NOT NULL DEFAULT 'header-settings',
  "logoUrl" TEXT,
  "projectName" TEXT,
  "description" TEXT,
  "network" TEXT,
  "connectEnabled" BOOLEAN,
  "navLinks" JSONB,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HeaderSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RaRuntimeSetting" (
  "id" TEXT NOT NULL DEFAULT 'ra-runtime-settings',
  "mintDevnet" TEXT,
  "mintMainnet" TEXT,
  "treasuryDevnet" TEXT,
  "treasuryMainnet" TEXT,
  "oraclePrimary" TEXT,
  "oracleSecondary" TEXT,
  "stakeFeeBps" INTEGER,
  "claimFeeBps" INTEGER,
  "stakeMinUsd" DECIMAL(38,18),
  "stakeMaxUsd" DECIMAL(38,18),
  "convertMinUsd" DECIMAL(38,18),
  "convertMaxUsd" DECIMAL(38,18),
  "convertEnabled" BOOLEAN,
  "convertProvider" TEXT,
  "convertExecutionMode" TEXT,
  "convertRoutePolicy" TEXT,
  "convertSlippageBps" INTEGER,
  "convertMaxTokensPerSession" INTEGER,
  "convertPoolIdDevnet" TEXT,
  "convertPoolIdMainnet" TEXT,
  "convertQuoteMintDevnet" TEXT,
  "convertQuoteMintMainnet" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RaRuntimeSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProxyBackendSetting" (
  "id" TEXT NOT NULL DEFAULT 'proxy-backend-settings',
  "draftBackendBaseUrl" TEXT,
  "publishedBackendBaseUrl" TEXT,
  "previousBackendBaseUrl" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProxyBackendSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocsSetting" (
  "id" TEXT NOT NULL DEFAULT 'docs-settings',
  "version" TEXT,
  "socialLinks" JSONB,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocsSetting_pkey" PRIMARY KEY ("id")
);

INSERT INTO "MaintenanceSetting" ("id", "enabled", "startsAt", "message", "updatedAt")
SELECT
  'maintenance-settings',
  COALESCE("maintenanceEnabled", false),
  "maintenanceStartsAt",
  "maintenanceMessage",
  COALESCE("updatedAt", CURRENT_TIMESTAMP)
FROM "PlatformSetting"
WHERE "id" = 'platform-settings'
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "HeaderSetting" ("id", "logoUrl", "projectName", "description", "network", "connectEnabled", "navLinks", "updatedAt")
SELECT
  'header-settings',
  "headerLogoUrl",
  "headerProjectName",
  "headerDescription",
  "headerNetwork",
  "headerConnectEnabled",
  "headerNavLinks",
  COALESCE("updatedAt", CURRENT_TIMESTAMP)
FROM "PlatformSetting"
WHERE "id" = 'platform-settings'
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "RaRuntimeSetting" (
  "id",
  "mintDevnet",
  "mintMainnet",
  "treasuryDevnet",
  "treasuryMainnet",
  "oraclePrimary",
  "oracleSecondary",
  "stakeFeeBps",
  "claimFeeBps",
  "stakeMinUsd",
  "stakeMaxUsd",
  "convertMinUsd",
  "convertMaxUsd",
  "convertEnabled",
  "convertProvider",
  "convertExecutionMode",
  "convertRoutePolicy",
  "convertSlippageBps",
  "convertMaxTokensPerSession",
  "convertPoolIdDevnet",
  "convertPoolIdMainnet",
  "convertQuoteMintDevnet",
  "convertQuoteMintMainnet",
  "updatedAt"
)
SELECT
  'ra-runtime-settings',
  "raMintDevnet",
  "raMintMainnet",
  "raTreasuryDevnet",
  "raTreasuryMainnet",
  "raOraclePrimary",
  "raOracleSecondary",
  "raStakeFeeBps",
  "raClaimFeeBps",
  CASE WHEN "raStakeMinUsd" IS NULL THEN NULL ELSE "raStakeMinUsd"::numeric(38,18) END,
  CASE WHEN "raStakeMaxUsd" IS NULL THEN NULL ELSE "raStakeMaxUsd"::numeric(38,18) END,
  CASE WHEN "raConvertMinUsd" IS NULL THEN NULL ELSE "raConvertMinUsd"::numeric(38,18) END,
  CASE WHEN "raConvertMaxUsd" IS NULL THEN NULL ELSE "raConvertMaxUsd"::numeric(38,18) END,
  "raConvertEnabled",
  "raConvertProvider",
  "raConvertExecutionMode",
  "raConvertRoutePolicy",
  "raConvertSlippageBps",
  "raConvertMaxTokensPerSession",
  "raConvertPoolIdDevnet",
  "raConvertPoolIdMainnet",
  "raConvertQuoteMintDevnet",
  "raConvertQuoteMintMainnet",
  COALESCE("updatedAt", CURRENT_TIMESTAMP)
FROM "PlatformSetting"
WHERE "id" = 'platform-settings'
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "ProxyBackendSetting" (
  "id",
  "draftBackendBaseUrl",
  "publishedBackendBaseUrl",
  "previousBackendBaseUrl",
  "version",
  "updatedAt"
)
SELECT
  'proxy-backend-settings',
  "proxyBackendBaseDraft",
  "proxyBackendBasePublished",
  "proxyBackendBasePrevious",
  COALESCE("proxyBackendBaseVersion", 1),
  COALESCE("updatedAt", CURRENT_TIMESTAMP)
FROM "PlatformSetting"
WHERE "id" = 'platform-settings'
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "DocsSetting" ("id", "version", "socialLinks", "updatedAt")
SELECT
  'docs-settings',
  "docsVersion",
  "docsSocialLinks",
  COALESCE("updatedAt", CURRENT_TIMESTAMP)
FROM "PlatformSetting"
WHERE "id" = 'platform-settings'
ON CONFLICT ("id") DO NOTHING;

-- Ensure bounded config rows exist even on fresh databases
INSERT INTO "MaintenanceSetting" ("id") VALUES ('maintenance-settings') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "HeaderSetting" ("id") VALUES ('header-settings') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "RaRuntimeSetting" ("id") VALUES ('ra-runtime-settings') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "ProxyBackendSetting" ("id") VALUES ('proxy-backend-settings') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "DocsSetting" ("id") VALUES ('docs-settings') ON CONFLICT ("id") DO NOTHING;

-- 4. Cleanup legacy tables and columns
ALTER TABLE "WalletConversionLeg"
DROP COLUMN "preparedTransaction",
DROP COLUMN "preparedMessageHash",
DROP COLUMN "jupiterQuote";

DROP TABLE IF EXISTS "PlatformMetrics";
DROP TABLE IF EXISTS "PlatformSetting";
