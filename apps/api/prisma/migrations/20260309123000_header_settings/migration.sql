-- Add configurable header branding fields
ALTER TABLE "PlatformSetting"
ADD COLUMN "headerLogoUrl" TEXT,
ADD COLUMN "headerProjectName" TEXT,
ADD COLUMN "headerDescription" TEXT;
