ALTER TABLE "RaRuntimeSetting"
ADD COLUMN "tokenSymbol" TEXT,
ADD COLUMN "tokenName" TEXT;

UPDATE "RaRuntimeSetting"
SET
  "tokenSymbol" = COALESCE(NULLIF(BTRIM("tokenSymbol"), ''), 'RA'),
  "tokenName" = COALESCE(NULLIF(BTRIM("tokenName"), ''), 'Solera')
WHERE
  COALESCE(NULLIF(BTRIM("tokenSymbol"), ''), '') = ''
  OR COALESCE(NULLIF(BTRIM("tokenName"), ''), '') = '';
