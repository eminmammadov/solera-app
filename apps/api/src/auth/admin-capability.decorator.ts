import { SetMetadata } from '@nestjs/common';

export const ADMIN_CAPABILITIES_KEY = 'solera_admin_capabilities';

export type AdminCapability =
  | 'auth.self.read'
  | 'auth.admin.read'
  | 'auth.admin.write'
  | 'audit.read'
  | 'blog.admin.read'
  | 'blog.admin.write'
  | 'docs.admin.read'
  | 'docs.admin.write'
  | 'news.admin.read'
  | 'news.admin.write'
  | 'ohlc.admin.read'
  | 'ohlc.admin.write'
  | 'users.admin.read'
  | 'users.admin.write'
  | 'system.read'
  | 'system.security.write'
  | 'market.admin.read'
  | 'market.admin.write'
  | 'staking.admin.read'
  | 'staking.operator.write';

export const RequireAdminCapabilities = (...capabilities: AdminCapability[]) =>
  SetMetadata(ADMIN_CAPABILITIES_KEY, capabilities);
