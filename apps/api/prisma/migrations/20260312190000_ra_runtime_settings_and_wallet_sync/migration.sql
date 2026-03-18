ALTER TABLE "PlatformSetting"
  ADD COLUMN IF NOT EXISTS "raMintDevnet" TEXT,
  ADD COLUMN IF NOT EXISTS "raMintMainnet" TEXT,
  ADD COLUMN IF NOT EXISTS "raTreasuryDevnet" TEXT,
  ADD COLUMN IF NOT EXISTS "raTreasuryMainnet" TEXT,
  ADD COLUMN IF NOT EXISTS "raOraclePrimary" TEXT,
  ADD COLUMN IF NOT EXISTS "raOracleSecondary" TEXT,
  ADD COLUMN IF NOT EXISTS "raStakeFeeBps" INTEGER,
  ADD COLUMN IF NOT EXISTS "raClaimFeeBps" INTEGER,
  ADD COLUMN IF NOT EXISTS "raConvertFeeBps" INTEGER,
  ADD COLUMN IF NOT EXISTS "raStakeMinUsd" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "raStakeMaxUsd" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "raConvertMinUsd" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "raConvertMaxUsd" DOUBLE PRECISION;

ALTER TABLE "WalletUser"
  ADD COLUMN IF NOT EXISTS "raOnchainBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "raOnchainBalanceUpdatedAt" TIMESTAMP(3);

UPDATE "PlatformSetting"
SET
  "raMintDevnet" = COALESCE("raMintDevnet", '4aQNjPD9Zy9B86csxdXjUZHF4MpLWEM2z5psTyzDrQsQ'),
  "raMintMainnet" = COALESCE("raMintMainnet", '2jPF5RY4B3jtJb4iAwRZ5J68WLLu4uaaBZ4wpjV29YYA'),
  "raTreasuryDevnet" = COALESCE("raTreasuryDevnet", '2KNsZWkfUrrpsuP2svBVHGUDPnUTGf1RdJ3TisnfnETp'),
  "raTreasuryMainnet" = COALESCE("raTreasuryMainnet", '2KNsZWkfUrrpsuP2svBVHGUDPnUTGf1RdJ3TisnfnETp'),
  "raOraclePrimary" = COALESCE("raOraclePrimary", 'DEXSCREENER'),
  "raOracleSecondary" = COALESCE("raOracleSecondary", 'RAYDIUM'),
  "raStakeFeeBps" = COALESCE("raStakeFeeBps", 5),
  "raClaimFeeBps" = COALESCE("raClaimFeeBps", 5),
  "raConvertFeeBps" = COALESCE("raConvertFeeBps", 25),
  "raStakeMinUsd" = COALESCE("raStakeMinUsd", 10),
  "raStakeMaxUsd" = COALESCE("raStakeMaxUsd", 50000),
  "raConvertMinUsd" = COALESCE("raConvertMinUsd", 0.5),
  "raConvertMaxUsd" = COALESCE("raConvertMaxUsd", 2.5)
WHERE "id" = 'platform-settings';
