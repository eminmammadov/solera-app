DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = '"MarketToken"'::regclass
      AND attname = 'pairAddress'
      AND NOT attisdropped
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = '"MarketToken"'::regclass
      AND attname = 'mintAddress'
      AND NOT attisdropped
  ) THEN
    ALTER TABLE "MarketToken"
      RENAME COLUMN "pairAddress" TO "mintAddress";
  END IF;
END $$;
