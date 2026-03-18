import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';

const BLOG_LIST_MAX_LIMIT = 200;
const BLOG_PUBLIC_DEFAULT_LIMIT = 120;
const BLOG_ADMIN_DEFAULT_LIMIT = 200;

interface PaginationConfig {
  take: number;
  skip: number;
}

@Injectable()
export class BlogService {
  constructor(private prisma: PrismaService) {}

  private readonly publicListSelect: Prisma.BlogPostSelect = {
    id: true,
    title: true,
    slug: true,
    summary: true,
    category: true,
    author: true,
    readTime: true,
    imageUrl: true,
    publishedAt: true,
    createdAt: true,
  };

  private readonly adminListSelect: Prisma.BlogPostSelect = {
    id: true,
    title: true,
    slug: true,
    category: true,
    author: true,
    isPublished: true,
    publishedAt: true,
    createdAt: true,
    updatedAt: true,
  };

  private toSafeNumber(
    value: number | undefined,
    fallback: number,
    max = BLOG_LIST_MAX_LIMIT,
  ) {
    if (!value || !Number.isFinite(value) || value <= 0) {
      return fallback;
    }
    return Math.min(Math.trunc(value), max);
  }

  private buildPagination(
    limit: number | undefined,
    page: number | undefined,
    defaults: { limit: number },
  ): PaginationConfig {
    const take = this.toSafeNumber(limit, defaults.limit);
    const safePage = this.toSafeNumber(page, 1, 50_000);
    return {
      take,
      skip: (safePage - 1) * take,
    };
  }

  private toDateOrNull(value: unknown): Date | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (
      typeof value !== 'string' &&
      typeof value !== 'number' &&
      !(value instanceof Date)
    ) {
      return undefined;
    }

    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return undefined;
    }
    return parsed;
  }

  private normalizeCreatePayload(
    payload: CreateBlogPostDto,
  ): Prisma.BlogPostCreateInput {
    const parsedPublishedAt = this.toDateOrNull(payload.publishedAt);
    let publishedAt: Date | null | undefined =
      parsedPublishedAt !== undefined ? parsedPublishedAt : undefined;

    if (payload.isPublished === true && publishedAt === undefined) {
      publishedAt = new Date();
    }
    if (payload.isPublished === false) {
      publishedAt = null;
    }

    return {
      ...payload,
      slug: payload.slug.trim().toLowerCase(),
      imageUrl:
        typeof payload.imageUrl === 'string' &&
        payload.imageUrl.trim().length > 0
          ? payload.imageUrl.trim()
          : null,
      publishedAt,
    };
  }

  private normalizeUpdatePayload(
    payload: UpdateBlogPostDto,
  ): Prisma.BlogPostUpdateInput {
    const next: Prisma.BlogPostUpdateInput = { ...payload };

    if (typeof payload.slug === 'string') {
      next.slug = payload.slug.trim().toLowerCase();
    }

    if (typeof payload.imageUrl === 'string') {
      const normalizedImageUrl = payload.imageUrl.trim();
      next.imageUrl = normalizedImageUrl.length > 0 ? normalizedImageUrl : null;
    }

    const parsedPublishedAt = this.toDateOrNull(payload.publishedAt);
    if (parsedPublishedAt !== undefined) {
      next.publishedAt = parsedPublishedAt;
    }

    if (payload.isPublished === true && parsedPublishedAt === undefined) {
      next.publishedAt = new Date();
    }

    if (payload.isPublished === false) {
      next.publishedAt = null;
    }

    return next;
  }

  async create(createBlogPostDto: CreateBlogPostDto) {
    const normalizedPayload = this.normalizeCreatePayload(createBlogPostDto);
    return this.prisma.blogPost.create({
      data: normalizedPayload,
    });
  }

  async findPublished(limit?: number, page?: number) {
    const now = new Date();
    const pagination = this.buildPagination(limit, page, {
      limit: BLOG_PUBLIC_DEFAULT_LIMIT,
    });

    const posts = await this.prisma.blogPost.findMany({
      where: {
        isPublished: true,
        OR: [{ publishedAt: { lte: now } }, { publishedAt: null }],
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      select: this.publicListSelect,
      take: pagination.take,
      skip: pagination.skip,
    });

    return posts.map((post) => ({
      ...post,
      publishedAt: post.publishedAt ?? post.createdAt,
    }));
  }

  async findAllForAdmin(limit?: number, page?: number) {
    const pagination = this.buildPagination(limit, page, {
      limit: BLOG_ADMIN_DEFAULT_LIMIT,
    });

    return this.prisma.blogPost.findMany({
      orderBy: [{ createdAt: 'desc' }],
      select: this.adminListSelect,
      take: pagination.take,
      skip: pagination.skip,
    });
  }

  async findOne(id: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id },
    });
    if (!post) {
      throw new NotFoundException(`Blog post with ID ${id} not found`);
    }
    return post;
  }

  async findPublishedBySlug(slug: string) {
    const now = new Date();
    const post = await this.prisma.blogPost.findFirst({
      where: {
        slug,
        isPublished: true,
        OR: [{ publishedAt: { lte: now } }, { publishedAt: null }],
      },
    });
    if (!post) {
      throw new NotFoundException(`Blog post with slug ${slug} not found`);
    }
    return {
      ...post,
      publishedAt: post.publishedAt ?? post.createdAt,
    };
  }

  async update(id: string, updateBlogPostDto: UpdateBlogPostDto) {
    await this.findOne(id);

    const normalizedPayload = this.normalizeUpdatePayload(updateBlogPostDto);
    return this.prisma.blogPost.update({
      where: { id },
      data: normalizedPayload,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.blogPost.delete({
      where: { id },
    });
  }
}
