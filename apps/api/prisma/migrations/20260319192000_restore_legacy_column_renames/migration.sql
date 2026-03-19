DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = '"MarketToken"'::regclass
      AND attname = 'pairAddress'
      AND NOT attisdropped
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM pg_attribute
      WHERE attrelid = '"MarketToken"'::regclass
        AND attname = 'mintAddress'
        AND NOT attisdropped
    ) THEN
      EXECUTE 'UPDATE "MarketToken" SET "mintAddress" = COALESCE("mintAddress", "pairAddress") WHERE "pairAddress" IS NOT NULL';
      EXECUTE 'ALTER TABLE "MarketToken" DROP COLUMN "pairAddress"';
    ELSE
      EXECUTE 'ALTER TABLE "MarketToken" RENAME COLUMN "pairAddress" TO "mintAddress"';
    END IF;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = '"MarketToken"'::regclass
      AND attname = 'mintAddress'
      AND NOT attisdropped
  ) THEN
    EXECUTE 'ALTER TABLE "MarketToken" ADD COLUMN "mintAddress" TEXT';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = '"BlogPost"'::regclass
      AND attname = 'coverImage'
      AND NOT attisdropped
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM pg_attribute
      WHERE attrelid = '"BlogPost"'::regclass
        AND attname = 'imageUrl'
        AND NOT attisdropped
    ) THEN
      EXECUTE 'UPDATE "BlogPost" SET "imageUrl" = COALESCE("imageUrl", "coverImage") WHERE "coverImage" IS NOT NULL';
      EXECUTE 'ALTER TABLE "BlogPost" DROP COLUMN "coverImage"';
    ELSE
      EXECUTE 'ALTER TABLE "BlogPost" RENAME COLUMN "coverImage" TO "imageUrl"';
    END IF;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = '"BlogPost"'::regclass
      AND attname = 'imageUrl'
      AND NOT attisdropped
  ) THEN
    EXECUTE 'ALTER TABLE "BlogPost" ADD COLUMN "imageUrl" TEXT';
  END IF;
END $$;
