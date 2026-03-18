import { AdminAccessRole } from '@prisma/client';
import type { AdminCapability } from './admin-capability.decorator';

const EDITOR_AND_CUSTOM_ALLOWED_CAPABILITIES = new Set<AdminCapability>([
  'auth.self.read',
  'audit.read',
  'blog.admin.read',
  'blog.admin.write',
  'docs.admin.read',
  'docs.admin.write',
  'news.admin.read',
  'news.admin.write',
  'ohlc.admin.read',
  'ohlc.admin.write',
  'users.admin.read',
  'system.read',
  'market.admin.read',
  'market.admin.write',
  'staking.admin.read',
  'staking.operator.write',
]);

const VIEWER_ALLOWED_CAPABILITIES = new Set<AdminCapability>([
  'auth.self.read',
  'audit.read',
  'blog.admin.read',
  'docs.admin.read',
  'news.admin.read',
  'ohlc.admin.read',
  'users.admin.read',
  'system.read',
  'market.admin.read',
  'staking.admin.read',
]);

export const hasAdminCapabilityForRole = (
  role: AdminAccessRole,
  capability: AdminCapability,
): boolean => {
  if (role === AdminAccessRole.SUPER_ADMIN) {
    return true;
  }

  if (role === AdminAccessRole.VIEWER) {
    return VIEWER_ALLOWED_CAPABILITIES.has(capability);
  }

  if (role === AdminAccessRole.EDITOR || role === AdminAccessRole.CUSTOM) {
    return EDITOR_AND_CUSTOM_ALLOWED_CAPABILITIES.has(capability);
  }

  return false;
};
