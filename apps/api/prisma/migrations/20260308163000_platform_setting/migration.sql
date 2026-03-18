-- CreateTable
CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL,
    "maintenanceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceStartsAt" TIMESTAMP(3),
    "maintenanceMessage" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

-- Seed singleton settings row
INSERT INTO "PlatformSetting" ("id", "maintenanceEnabled", "maintenanceStartsAt", "maintenanceMessage", "updatedAt")
VALUES ('platform-settings', false, NULL, NULL, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
