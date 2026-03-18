-- Harden PlatformSetting.headerNetwork values to valid runtime networks only.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'platform_setting_header_network_check'
  ) THEN
    ALTER TABLE "PlatformSetting"
    ADD CONSTRAINT "platform_setting_header_network_check"
    CHECK (
      "headerNetwork" IS NULL
      OR "headerNetwork" IN ('devnet', 'mainnet')
    );
  END IF;
END
$$;
