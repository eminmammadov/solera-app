DO $$
BEGIN
  CREATE TYPE "AdminAccessRole" AS ENUM ('SUPER_ADMIN', 'EDITOR', 'VIEWER', 'CUSTOM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE "Admin"
  ADD COLUMN IF NOT EXISTS "role" "AdminAccessRole" NOT NULL DEFAULT 'SUPER_ADMIN',
  ADD COLUMN IF NOT EXISTS "customRoleName" TEXT,
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS "Admin_role_idx" ON "Admin"("role");
CREATE INDEX IF NOT EXISTS "Admin_isActive_idx" ON "Admin"("isActive");

ALTER TABLE "PlatformSetting"
  ADD COLUMN IF NOT EXISTS "proxyBackendBaseDraft" TEXT,
  ADD COLUMN IF NOT EXISTS "proxyBackendBasePublished" TEXT,
  ADD COLUMN IF NOT EXISTS "proxyBackendBasePrevious" TEXT,
  ADD COLUMN IF NOT EXISTS "proxyBackendBaseVersion" INTEGER NOT NULL DEFAULT 1;
