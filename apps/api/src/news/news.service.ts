import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NewsVoteType } from '@prisma/client';
import { validateProxySharedKey } from '../common/proxy-key';
import { getSharedRateLimitStore } from '../common/rate-limit-store';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNewsItemDto } from './dto/create-news-item.dto';
import { UpdateNewsItemDto } from './dto/update-news-item.dto';

export type ViewerVote = 'up' | 'down' | null;

export interface NewsFeedItemResponse {
  id: string;
  title: string;
  source: string;
  tags: string[];
  body: string | null;
  articleUrl: string | null;
  isActive: boolean;
  upvotes: number;
  downvotes: number;
  createdAt: Date;
  updatedAt: Date;
  viewerVote: ViewerVote;
}

@Injectable()
export class NewsService {
  private readonly maxQueryLimit = 200;
  private readonly maxOffset = 5000;
  private readonly defaultPublicLimit = 120;
  private readonly defaultAdminLimit = 100;
  private readonly votePerMinute = 60;
  private readonly voteRateLimitStore = getSharedRateLimitStore();

  constructor(private prisma: PrismaService) {}

  private normalizeTags(tags?: string[]): string[] {
    if (!tags) return [];

    const normalized = tags
      .map((tag) => tag.trim().replace(/^\$+/, '').toUpperCase())
      .filter((tag) => tag.length > 0)
      .slice(0, 6);

    return Array.from(new Set(normalized));
  }

  private sanitizeText(value: string, fieldName: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException(`${fieldName} cannot be empty`);
    }
    return trimmed;
  }

  private normalizeClientKey(
    clientKey?: string,
    required = false,
  ): string | null {
    const trimmed = clientKey?.trim();
    if (!trimmed) {
      if (required) {
        throw new BadRequestException('Missing x-news-client-id header');
      }
      return null;
    }

    const isValid = /^[A-Za-z0-9_-]{16,128}$/.test(trimmed);
    if (!isValid) {
      if (required) {
        throw new BadRequestException('Invalid x-news-client-id header');
      }
      return null;
    }

    return trimmed;
  }

  private toViewerVote(voteType: NewsVoteType): ViewerVote {
    return voteType === NewsVoteType.UP ? 'up' : 'down';
  }

  private validateProxyKey(proxyKey?: string) {
    validateProxySharedKey(proxyKey);
  }

  private async consumeVoteRateLimit(clientKey: string) {
    const result = await this.voteRateLimitStore.consume({
      key: `news-vote:${clientKey}`,
      max: this.votePerMinute,
      windowMs: 60_000,
    });

    if (!result.allowed) {
      throw new HttpException(
        'Too many vote requests. Please retry shortly.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async create(createNewsItemDto: CreateNewsItemDto) {
    return this.prisma.newsItem.create({
      data: {
        title: this.sanitizeText(createNewsItemDto.title, 'Title'),
        source: this.sanitizeText(createNewsItemDto.source, 'Source'),
        tags: this.normalizeTags(createNewsItemDto.tags),
        body: createNewsItemDto.body?.trim() || null,
        articleUrl: createNewsItemDto.articleUrl?.trim() || null,
        isActive: createNewsItemDto.isActive ?? true,
      },
    });
  }

  async findAll(
    activeOnly?: boolean,
    limit?: number,
    offset?: number,
    clientKey?: string,
  ): Promise<NewsFeedItemResponse[]> {
    const baseLimit = activeOnly
      ? this.defaultPublicLimit
      : this.defaultAdminLimit;
    const normalizedLimit =
      typeof limit === 'number' && Number.isFinite(limit) && limit > 0
        ? Math.trunc(limit)
        : baseLimit;
    const normalizedOffset =
      typeof offset === 'number' && Number.isFinite(offset) && offset >= 0
        ? Math.trunc(offset)
        : 0;

    const safeLimit = Math.min(
      this.maxQueryLimit,
      Math.max(1, normalizedLimit),
    );
    const safeOffset = Math.min(this.maxOffset, Math.max(0, normalizedOffset));
    const normalizedClientKey = this.normalizeClientKey(clientKey);

    const items = await this.prisma.newsItem.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { createdAt: 'desc' },
      skip: safeOffset,
      take: safeLimit,
    });

    if (!normalizedClientKey || items.length === 0) {
      return items.map((item) => ({
        ...item,
        viewerVote: null,
      }));
    }

    const itemIds = items.map((item) => item.id);
    const votes = await this.prisma.newsVote.findMany({
      where: {
        clientKey: normalizedClientKey,
        newsItemId: { in: itemIds },
      },
      select: {
        newsItemId: true,
        voteType: true,
      },
    });

    const voteMap = new Map<string, ViewerVote>(
      votes.map((vote) => [vote.newsItemId, this.toViewerVote(vote.voteType)]),
    );

    return items.map((item) => ({
      ...item,
      viewerVote: voteMap.get(item.id) ?? null,
    }));
  }

  async findOne(id: string, clientKey?: string): Promise<NewsFeedItemResponse> {
    const item = await this.prisma.newsItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`News item with ID ${id} not found`);
    }

    const normalizedClientKey = this.normalizeClientKey(clientKey);
    if (!normalizedClientKey) {
      return {
        ...item,
        viewerVote: null,
      };
    }

    const vote = await this.prisma.newsVote.findUnique({
      where: {
        newsItemId_clientKey: {
          newsItemId: id,
          clientKey: normalizedClientKey,
        },
      },
      select: {
        voteType: true,
      },
    });

    return {
      ...item,
      viewerVote: vote ? this.toViewerVote(vote.voteType) : null,
    };
  }

  async vote(
    id: string,
    requestedVote: ViewerVote,
    clientKey?: string,
    proxyKey?: string,
  ): Promise<NewsFeedItemResponse> {
    this.validateProxyKey(proxyKey);
    const normalizedClientKey = this.normalizeClientKey(clientKey, true);
    if (!normalizedClientKey) {
      throw new BadRequestException('Missing x-news-client-id header');
    }
    await this.consumeVoteRateLimit(normalizedClientKey);

    return this.prisma.$transaction(async (tx) => {
      const existingItem = await tx.newsItem.findUnique({ where: { id } });
      if (!existingItem) {
        throw new NotFoundException(`News item with ID ${id} not found`);
      }

      const existingVote = await tx.newsVote.findUnique({
        where: {
          newsItemId_clientKey: {
            newsItemId: id,
            clientKey: normalizedClientKey,
          },
        },
      });

      const nextVoteType =
        requestedVote === 'up'
          ? NewsVoteType.UP
          : requestedVote === 'down'
            ? NewsVoteType.DOWN
            : null;

      if (!existingVote && nextVoteType) {
        await tx.newsVote.create({
          data: {
            newsItemId: id,
            clientKey: normalizedClientKey,
            voteType: nextVoteType,
          },
        });

        await tx.newsItem.update({
          where: { id },
          data:
            nextVoteType === NewsVoteType.UP
              ? { upvotes: { increment: 1 } }
              : { downvotes: { increment: 1 } },
        });
      } else if (existingVote && !nextVoteType) {
        await tx.newsVote.delete({
          where: {
            newsItemId_clientKey: {
              newsItemId: id,
              clientKey: normalizedClientKey,
            },
          },
        });

        await tx.newsItem.update({
          where: { id },
          data:
            existingVote.voteType === NewsVoteType.UP
              ? { upvotes: { decrement: 1 } }
              : { downvotes: { decrement: 1 } },
        });
      } else if (
        existingVote &&
        nextVoteType &&
        existingVote.voteType !== nextVoteType
      ) {
        await tx.newsVote.update({
          where: {
            newsItemId_clientKey: {
              newsItemId: id,
              clientKey: normalizedClientKey,
            },
          },
          data: { voteType: nextVoteType },
        });

        await tx.newsItem.update({
          where: { id },
          data:
            nextVoteType === NewsVoteType.UP
              ? {
                  upvotes: { increment: 1 },
                  downvotes: { decrement: 1 },
                }
              : {
                  downvotes: { increment: 1 },
                  upvotes: { decrement: 1 },
                },
        });
      }

      const updatedItem = await tx.newsItem.findUnique({
        where: { id },
      });

      if (!updatedItem) {
        throw new NotFoundException(`News item with ID ${id} not found`);
      }

      const finalVote = await tx.newsVote.findUnique({
        where: {
          newsItemId_clientKey: {
            newsItemId: id,
            clientKey: normalizedClientKey,
          },
        },
        select: {
          voteType: true,
        },
      });

      return {
        ...updatedItem,
        viewerVote: finalVote ? this.toViewerVote(finalVote.voteType) : null,
      };
    });
  }

  async update(id: string, updateNewsItemDto: UpdateNewsItemDto) {
    await this.findOne(id);

    return this.prisma.newsItem.update({
      where: { id },
      data: {
        title:
          updateNewsItemDto.title !== undefined
            ? this.sanitizeText(updateNewsItemDto.title, 'Title')
            : undefined,
        source:
          updateNewsItemDto.source !== undefined
            ? this.sanitizeText(updateNewsItemDto.source, 'Source')
            : undefined,
        tags:
          updateNewsItemDto.tags !== undefined
            ? this.normalizeTags(updateNewsItemDto.tags)
            : undefined,
        body:
          updateNewsItemDto.body !== undefined
            ? updateNewsItemDto.body.trim() || null
            : undefined,
        articleUrl:
          updateNewsItemDto.articleUrl !== undefined
            ? updateNewsItemDto.articleUrl.trim() || null
            : undefined,
        isActive: updateNewsItemDto.isActive,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.newsItem.delete({
      where: { id },
    });
  }
}
