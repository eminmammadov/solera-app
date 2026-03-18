import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ONLINE_TIMEOUT_MS } from './users.constants';

@Injectable()
export class UsersOnlineStateService {
  private readonly onlineTimeoutMs = ONLINE_TIMEOUT_MS;
  private staleSessionSyncPromise: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  getOnlineCutoffDate() {
    return new Date(Date.now() - this.onlineTimeoutMs);
  }

  async finalizeStaleSessions() {
    if (!this.staleSessionSyncPromise) {
      this.staleSessionSyncPromise = this.runFinalizeStaleSessions().finally(
        () => {
          this.staleSessionSyncPromise = null;
        },
      );
    }

    await this.staleSessionSyncPromise;
  }

  async getOnlineUserIdSet(userIds?: string[]): Promise<Set<string>> {
    const cutoff = this.getOnlineCutoffDate();
    const onlineRows = await this.prisma.walletUserSession.findMany({
      where: {
        isOnline: true,
        endedAt: null,
        lastSeenAt: { gte: cutoff },
        userId: userIds && userIds.length > 0 ? { in: userIds } : undefined,
      },
      distinct: ['userId'],
      select: { userId: true },
    });

    return new Set(onlineRows.map((row) => row.userId));
  }

  private async runFinalizeStaleSessions() {
    const cutoff = this.getOnlineCutoffDate();

    const staleSessions = await this.prisma.walletUserSession.findMany({
      where: {
        isOnline: true,
        endedAt: null,
        lastSeenAt: { lt: cutoff },
      },
      select: {
        id: true,
        userId: true,
        startedAt: true,
        lastSeenAt: true,
        durationSeconds: true,
      },
      take: 500,
    });

    for (const session of staleSessions) {
      const durationSeconds = Math.max(
        session.durationSeconds,
        Math.floor(
          (session.lastSeenAt.getTime() - session.startedAt.getTime()) / 1000,
        ),
      );
      const durationDelta = Math.max(
        0,
        durationSeconds - session.durationSeconds,
      );

      await this.prisma.$transaction(async (tx) => {
        await tx.walletUserSession.update({
          where: { id: session.id },
          data: {
            isOnline: false,
            endedAt: session.lastSeenAt,
            durationSeconds,
          },
        });

        if (durationDelta > 0) {
          await tx.walletUser.update({
            where: { id: session.userId },
            data: {
              totalSessionSeconds: { increment: durationDelta },
            },
          });
        }
      });
    }
  }
}
