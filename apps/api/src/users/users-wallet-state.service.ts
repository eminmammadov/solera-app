import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, WalletUserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_BLOCK_MESSAGE } from './users.constants';
import type { UsersRequestContext } from './users.types';

@Injectable()
export class UsersWalletStateService {
  constructor(private readonly prisma: PrismaService) {}

  sanitizeBlockMessage(blockMessage?: string | null): string {
    const normalized = blockMessage?.trim();
    return normalized ? normalized.slice(0, 400) : DEFAULT_BLOCK_MESSAGE;
  }

  getBlockedMessage(user: { blockMessage: string | null }): string {
    return this.sanitizeBlockMessage(user.blockMessage);
  }

  isUserBlockedForAccess(user: {
    role: WalletUserRole;
    isBlocked: boolean;
  }): boolean {
    return user.role !== WalletUserRole.ADMIN && user.isBlocked;
  }

  async getWalletUserByAddress(walletAddress: string) {
    return this.prisma.walletUser.findUnique({
      where: { walletAddress },
    });
  }

  async resolveWalletRole(walletAddress: string): Promise<WalletUserRole> {
    const admin = await this.prisma.admin.findUnique({
      where: { walletAddress },
      select: { id: true },
    });

    return admin ? WalletUserRole.ADMIN : WalletUserRole.USER;
  }

  async syncWalletRoleAndBlockState(
    user: Prisma.WalletUserGetPayload<object>,
  ): Promise<Prisma.WalletUserGetPayload<object>> {
    const resolvedRole = await this.resolveWalletRole(user.walletAddress);
    const shouldPromoteAdmin = resolvedRole === WalletUserRole.ADMIN;
    const roleChanged = user.role !== resolvedRole;
    const shouldClearBlockForAdmin = shouldPromoteAdmin && user.isBlocked;

    if (!roleChanged && !shouldClearBlockForAdmin) {
      return user;
    }

    return this.prisma.walletUser.update({
      where: { id: user.id },
      data: {
        role: resolvedRole,
        ...(shouldClearBlockForAdmin
          ? {
              isBlocked: false,
              blockedAt: null,
              blockMessage: null,
            }
          : {}),
      },
    });
  }

  async assertWalletNotBlocked(walletAddress: string) {
    const existingUser = await this.getWalletUserByAddress(walletAddress);
    if (!existingUser) return null;

    const syncedUser = await this.syncWalletRoleAndBlockState(existingUser);
    if (this.isUserBlockedForAccess(syncedUser)) {
      throw new ForbiddenException(this.getBlockedMessage(syncedUser));
    }

    return syncedUser;
  }

  async upsertWalletUser(
    walletAddress: string,
    context: UsersRequestContext,
    countryCode: string | null,
  ): Promise<{ user: Prisma.WalletUserGetPayload<object>; isNew: boolean }> {
    const now = new Date();
    const role = await this.resolveWalletRole(walletAddress);

    const existing = await this.prisma.walletUser.findUnique({
      where: { walletAddress },
    });

    if (!existing) {
      const created = await this.prisma.walletUser.create({
        data: {
          walletAddress,
          role,
          firstSeenAt: now,
          lastSeenAt: now,
          firstSeenIp: context.ipAddress,
          lastSeenIp: context.ipAddress,
          firstSeenCountry: countryCode,
          lastSeenCountry: countryCode,
        },
      });

      return { user: created, isNew: true };
    }

    const updated = await this.prisma.walletUser.update({
      where: { id: existing.id },
      data: {
        role,
        lastSeenAt: now,
        lastSeenIp: context.ipAddress ?? existing.lastSeenIp,
        lastSeenCountry: countryCode ?? existing.lastSeenCountry,
      },
    });

    return { user: updated, isNew: false };
  }
}
