DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WalletUserRole') THEN
    CREATE TYPE "WalletUserRole" AS ENUM ('USER', 'ADMIN');
  END IF;
END $$;

ALTER TABLE "WalletUser"
  ADD COLUMN IF NOT EXISTS "role" "WalletUserRole" NOT NULL DEFAULT 'USER';

UPDATE "WalletUser" wu
SET "role" = 'ADMIN'
FROM "Admin" a
WHERE a."walletAddress" = wu."walletAddress";

CREATE INDEX IF NOT EXISTS "WalletUser_role_idx" ON "WalletUser"("role");
