import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { AdminAccessRole } from '@prisma/client';
import type { Request } from 'express';
import {
  ADMIN_CAPABILITIES_KEY,
  type AdminCapability,
} from './admin-capability.decorator';
import { hasAdminCapabilityForRole } from './admin-capability-policy';

interface AuthenticatedAdminRequest extends Request {
  user?: {
    id?: string;
    walletAddress?: string;
    role?: AdminAccessRole;
    customRoleName?: string | null;
  };
}

@Injectable()
export class AdminAccessGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAllowed = await super.canActivate(context);
    if (!isAllowed) return false;

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedAdminRequest>();
    const role = request.user?.role;

    if (!role) {
      throw new ForbiddenException('Admin role is missing.');
    }

    if (role === AdminAccessRole.SUPER_ADMIN) {
      return true;
    }

    const capabilities =
      this.reflector.getAllAndOverride<AdminCapability[]>(
        ADMIN_CAPABILITIES_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    if (capabilities.length === 0) {
      throw new ForbiddenException(
        'Admin capability metadata is missing for this protected endpoint.',
      );
    }

    const missingCapability = capabilities.find(
      (capability) => !hasAdminCapabilityForRole(role, capability),
    );

    if (missingCapability) {
      throw new ForbiddenException(
        `Admin role ${role} is missing required capability: ${missingCapability}.`,
      );
    }

    return true;
  }
}
