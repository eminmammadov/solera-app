-- Add advanced header controls: network, connect toggle and nav links
ALTER TABLE "PlatformSetting" ADD COLUMN IF NOT EXISTS "headerNetwork" TEXT;
ALTER TABLE "PlatformSetting" ADD COLUMN IF NOT EXISTS "headerConnectEnabled" BOOLEAN;
ALTER TABLE "PlatformSetting" ADD COLUMN IF NOT EXISTS "headerNavLinks" JSONB;
