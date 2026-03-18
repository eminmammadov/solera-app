-- Add docs presentation settings: version and social links
ALTER TABLE "PlatformSetting" ADD COLUMN IF NOT EXISTS "docsVersion" TEXT;
ALTER TABLE "PlatformSetting" ADD COLUMN IF NOT EXISTS "docsSocialLinks" JSONB;
