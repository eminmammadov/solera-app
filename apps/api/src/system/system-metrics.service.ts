import { Injectable } from '@nestjs/common';
import { StakePositionStatus } from '@prisma/client';
import { toNumber } from '../common/numeric';
import { readOptionalEnv } from '../common/env';
import { getRateLimitRuntimeStatus } from '../common/rate-limit-store';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_HEADER_SETTINGS,
  resolveOnlineTimeoutMs,
} from './system.constants';
import type { AdminMetricsPayload } from './system.types';

@Injectable()
export class SystemMetricsService {
  private readonly onlineTimeoutMs = resolveOnlineTimeoutMs();

  constructor(private readonly prisma: PrismaService) {}

  async getAdminMetrics(): Promise<AdminMetricsPayload> {
    const now = new Date();
    const onlineCutoff = new Date(now.getTime() - this.onlineTimeoutMs);
    const active24hCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      settings,
      headerSettings,
      totalUsers,
      blockedUsers,
      activeUsers24h,
      onlineSessionRows,
      averageSessionAggregate,
      topCountries,
      totalStakePositions,
      activeStakePositions,
      totalStakedAmountUsdAggregate,
      blogTotal,
      blogPublished,
      newsTotal,
      newsActive,
      newsVoteAggregate,
      docsCategories,
      docsPages,
      docsSections,
      tokensTotal,
      tokensActive,
    ] = await Promise.all([
      this.prisma.maintenanceSetting.upsert({
        where: { id: 'maintenance-settings' },
        update: {},
        create: { id: 'maintenance-settings' },
      }),
      this.prisma.headerSetting.upsert({
        where: { id: 'header-settings' },
        update: {},
        create: { id: 'header-settings' },
      }),
      this.prisma.walletUser.count(),
      this.prisma.walletUser.count({ where: { isBlocked: true } }),
      this.prisma.walletUser.count({
        where: { lastSeenAt: { gte: active24hCutoff } },
      }),
      this.prisma.walletUserSession.findMany({
        where: {
          isOnline: true,
          endedAt: null,
          lastSeenAt: { gte: onlineCutoff },
        },
        distinct: ['userId'],
        select: { userId: true },
      }),
      this.prisma.walletUser.aggregate({
        _avg: { totalSessionSeconds: true },
      }),
      this.prisma.walletUser.groupBy({
        by: ['lastSeenCountry'],
        where: { lastSeenCountry: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { lastSeenCountry: 'desc' } },
        take: 5,
      }),
      this.prisma.walletStakePosition.count(),
      this.prisma.walletStakePosition.count({
        where: { status: StakePositionStatus.ACTIVE },
      }),
      this.prisma.walletStakePosition.aggregate({
        where: { status: StakePositionStatus.ACTIVE },
        _sum: { amountUsd: true },
      }),
      this.prisma.blogPost.count(),
      this.prisma.blogPost.count({ where: { isPublished: true } }),
      this.prisma.newsItem.count(),
      this.prisma.newsItem.count({ where: { isActive: true } }),
      this.prisma.newsItem.aggregate({
        _sum: { upvotes: true, downvotes: true },
      }),
      this.prisma.docsCategory.count(),
      this.prisma.docsPage.count(),
      this.prisma.docsSection.count(),
      this.prisma.marketToken.count(),
      this.prisma.marketToken.count({ where: { isActive: true } }),
    ]);

    const startsAt = settings.startsAt;
    const maintenanceActive =
      settings.enabled && (!startsAt || startsAt <= now);
    const infra = getRateLimitRuntimeStatus();

    return {
      generatedAt: now.toISOString(),
      users: {
        total: totalUsers,
        blocked: blockedUsers,
        online: onlineSessionRows.length,
        active24h: activeUsers24h,
        totalStakePositions,
        activeStakePositions,
        totalStakedAmountUsd: toNumber(
          totalStakedAmountUsdAggregate._sum.amountUsd,
        ),
        averageSessionSeconds: Math.round(
          averageSessionAggregate._avg.totalSessionSeconds ?? 0,
        ),
        topCountries: topCountries.map((entry) => ({
          country: entry.lastSeenCountry ?? 'UN',
          users: entry._count._all,
        })),
      },
      content: {
        blogTotal,
        blogPublished,
        blogDraft: Math.max(0, blogTotal - blogPublished),
        newsTotal,
        newsActive,
        newsInactive: Math.max(0, newsTotal - newsActive),
        newsUpvotes: newsVoteAggregate._sum.upvotes ?? 0,
        newsDownvotes: newsVoteAggregate._sum.downvotes ?? 0,
        docsCategories,
        docsPages,
        docsSections,
      },
      market: {
        tokensTotal,
        tokensActive,
      },
      system: {
        maintenanceEnabled: settings.enabled,
        maintenanceActive,
        connectEnabled:
          headerSettings.connectEnabled ??
          DEFAULT_HEADER_SETTINGS.connectEnabled,
        headerNetwork:
          headerSettings.network === 'mainnet' ? 'mainnet' : 'devnet',
        rateLimitRedisConfigured: infra.redisConfigured,
        rateLimitConfiguredBackend: infra.configuredBackend,
        rateLimitEffectiveBackend: infra.effectiveBackend,
        rateLimitDegraded: infra.degraded,
        rateLimitLastFallbackAt: infra.lastFallbackAt,
        rateLimitLastErrorMessage: infra.lastErrorMessage,
        proxySharedKeyConfigured: Boolean(
          readOptionalEnv('SOLERA_PROXY_SHARED_KEY'),
        ),
        proxyAllowDevFallbacks: false,
      },
    };
  }
}
