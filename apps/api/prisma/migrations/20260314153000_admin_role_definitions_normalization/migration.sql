CREATE TABLE "AdminRoleDefinition" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "accessRole" "AdminAccessRole" NOT NULL,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AdminRoleDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminRoleDefinition_key_key"
  ON "AdminRoleDefinition"("key");

CREATE INDEX "AdminRoleDefinition_accessRole_idx"
  ON "AdminRoleDefinition"("accessRole");

CREATE INDEX "AdminRoleDefinition_isSystem_idx"
  ON "AdminRoleDefinition"("isSystem");

CREATE INDEX "AdminRoleDefinition_isActive_idx"
  ON "AdminRoleDefinition"("isActive");

INSERT INTO "AdminRoleDefinition" (
  "id",
  "key",
  "name",
  "accessRole",
  "isSystem",
  "isActive",
  "createdAt",
  "updatedAt"
)
VALUES
  ('system-super-admin', 'SUPER_ADMIN', 'SUPER_ADMIN', 'SUPER_ADMIN', true, true, NOW(), NOW()),
  ('system-editor', 'EDITOR', 'EDITOR', 'EDITOR', true, true, NOW(), NOW()),
  ('system-viewer', 'VIEWER', 'VIEWER', 'VIEWER', true, true, NOW(), NOW()),
  ('system-custom', 'CUSTOM', 'CUSTOM', 'CUSTOM', true, true, NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;

WITH normalized_custom_roles AS (
  SELECT
    'custom-' || md5(lower(btrim("customRoleName"))) AS id,
    'custom:' || md5(lower(btrim("customRoleName"))) AS key,
    MAX(btrim("customRoleName")) AS name
  FROM "Admin"
  WHERE "role" = 'CUSTOM'
    AND "customRoleName" IS NOT NULL
    AND btrim("customRoleName") <> ''
  GROUP BY lower(btrim("customRoleName"))
)
INSERT INTO "AdminRoleDefinition" (
  "id",
  "key",
  "name",
  "accessRole",
  "isSystem",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  id,
  key,
  name,
  'CUSTOM',
  false,
  true,
  NOW(),
  NOW()
FROM normalized_custom_roles
ON CONFLICT ("key") DO NOTHING;

ALTER TABLE "Admin"
  ADD COLUMN "adminRoleId" TEXT;

UPDATE "Admin" AS admin
SET "adminRoleId" = roles."id"
FROM "AdminRoleDefinition" AS roles
WHERE roles."isSystem" = true
  AND roles."accessRole" = admin."role"
  AND admin."role" <> 'CUSTOM';

UPDATE "Admin" AS admin
SET "adminRoleId" = roles."id"
FROM "AdminRoleDefinition" AS roles
WHERE roles."isSystem" = false
  AND roles."accessRole" = 'CUSTOM'
  AND admin."role" = 'CUSTOM'
  AND admin."customRoleName" IS NOT NULL
  AND lower(btrim(admin."customRoleName")) = lower(roles."name");

UPDATE "Admin"
SET "adminRoleId" = 'system-viewer'
WHERE "adminRoleId" IS NULL;

ALTER TABLE "Admin"
  ALTER COLUMN "adminRoleId" SET NOT NULL;

CREATE INDEX "Admin_adminRoleId_idx"
  ON "Admin"("adminRoleId");

ALTER TABLE "Admin"
  ADD CONSTRAINT "Admin_adminRoleId_fkey"
  FOREIGN KEY ("adminRoleId") REFERENCES "AdminRoleDefinition"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Admin"
  DROP COLUMN "role",
  DROP COLUMN "customRoleName";
