import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DOCS_SETTINGS_ID } from '../system/system.constants';
import {
  CreateDocsCategoryDto,
  DOCS_ICON_VALUES,
  DocsIconValue,
} from './dto/create-docs-category.dto';
import {
  CreateDocsPageDto,
  DocsSectionInputDto,
} from './dto/create-docs-page.dto';
import { UpdateDocsCategoryDto } from './dto/update-docs-category.dto';
import { UpdateDocsPageDto } from './dto/update-docs-page.dto';
import { UpdateDocsSettingsDto } from './dto/update-docs-settings.dto';

const DOCS_ICON_SET = new Set<string>(DOCS_ICON_VALUES);
const DOCS_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DEFAULT_DOCS_SOCIAL_LINKS = [
  { label: 'X', href: 'https://x.com/SOLERAwork' },
  { label: 'Telegram', href: 'https://t.me/SOLERAwork' },
] as const;
const DEFAULT_DOCS_VERSION = '1.0.0';

export interface DocsSectionPayload {
  id: string;
  title: string;
  anchor: string;
  content: string[];
  order: number;
}

export interface DocsPagePayload {
  id: string;
  title: string;
  slug: string;
  order: number;
  categoryId: string;
  sections: DocsSectionPayload[];
}

export interface DocsCategoryPayload {
  id: string;
  title: string;
  icon: DocsIconValue;
  order: number;
  items: DocsPagePayload[];
}

export interface DocsSocialLinkPayload {
  label: string;
  href: string;
}

export interface DocsSettingsPayload {
  version: string;
  socialLinks: DocsSocialLinkPayload[];
  updatedAt: string;
}

type DocsCategoryWithNested = Prisma.DocsCategoryGetPayload<{
  include: {
    items: {
      include: { sections: true };
    };
  };
}>;

@Injectable()
export class DocsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateDocsSettings() {
    return this.prisma.docsSetting.upsert({
      where: { id: DOCS_SETTINGS_ID },
      update: {},
      create: { id: DOCS_SETTINGS_ID },
    });
  }

  private sanitizeDocsVersion(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    return trimmed.slice(0, 24);
  }

  private sanitizeDocsSocialLinks(
    rawLinks: unknown,
    fallbackLinks: Array<{ label: string; href: string }> = [],
    strict = false,
  ): Array<{ label: string; href: string }> {
    if (!Array.isArray(rawLinks)) {
      return fallbackLinks.map((link) => ({ ...link }));
    }

    const normalized: Array<{ label: string; href: string }> = [];
    const dedupe = new Set<string>();

    for (const candidate of rawLinks.slice(0, 8)) {
      if (!candidate || typeof candidate !== 'object') continue;

      const source = candidate as { label?: unknown; href?: unknown };
      if (typeof source.label !== 'string' || typeof source.href !== 'string') {
        if (strict) {
          throw new BadRequestException(
            'Social media links must include valid label and href strings',
          );
        }
        continue;
      }

      const label = source.label.trim();
      const href = source.href.trim();
      if (!label || label.length > 32 || !href || href.length > 300) {
        if (strict) {
          throw new BadRequestException('Invalid social media link payload');
        }
        continue;
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(href);
      } catch {
        if (strict) {
          throw new BadRequestException(
            'Social media link href must be a valid URL',
          );
        }
        continue;
      }

      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        if (strict) {
          throw new BadRequestException(
            'Social media link href must use http or https protocol',
          );
        }
        continue;
      }

      const dedupeKey = `${label.toLowerCase()}|${href.toLowerCase()}`;
      if (dedupe.has(dedupeKey)) {
        continue;
      }

      dedupe.add(dedupeKey);
      normalized.push({ label, href });
    }

    if (normalized.length === 0 && fallbackLinks.length > 0) {
      return fallbackLinks.map((link) => ({ ...link }));
    }

    return normalized;
  }

  private toDocsSettingsPayload(settings: {
    version: string | null;
    socialLinks: Prisma.JsonValue | null;
    updatedAt: Date;
  }): DocsSettingsPayload {
    return {
      version: settings.version || DEFAULT_DOCS_VERSION,
      socialLinks: this.sanitizeDocsSocialLinks(
        settings.socialLinks,
        DEFAULT_DOCS_SOCIAL_LINKS.map((link) => ({ ...link })),
      ),
      updatedAt: settings.updatedAt.toISOString(),
    };
  }

  private sanitizeRequiredText(value: string, fieldName: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException(`${fieldName} cannot be empty`);
    }
    return trimmed;
  }

  private sanitizeSlug(value: string, fieldName = 'Slug'): string {
    const normalized = this.sanitizeRequiredText(
      value,
      fieldName,
    ).toLowerCase();
    if (!DOCS_SLUG_REGEX.test(normalized)) {
      throw new BadRequestException(
        `${fieldName} must use lowercase letters, numbers and hyphens`,
      );
    }
    return normalized;
  }

  private sanitizeOrder(value: number | undefined, fallback: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return fallback;
    }
    return Math.max(0, Math.min(10_000, Math.trunc(value)));
  }

  private sanitizeIcon(value: string | undefined | null): DocsIconValue {
    if (value && DOCS_ICON_SET.has(value)) {
      return value as DocsIconValue;
    }
    return 'Rocket';
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private sanitizeSectionContent(content: string[]): string[] {
    const normalized = content
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0)
      .slice(0, 40);

    if (normalized.length === 0) {
      throw new BadRequestException(
        'Each section must have at least one content paragraph',
      );
    }
    return normalized;
  }

  private sanitizeSections(sections: DocsSectionInputDto[] | undefined): Array<{
    title: string;
    anchor: string;
    content: string[];
    order: number;
  }> {
    if (!sections || sections.length === 0) {
      return [];
    }

    const usedAnchors = new Set<string>();
    return sections.slice(0, 40).map((section, index) => {
      const title = this.sanitizeRequiredText(section.title, 'Section title');
      const requestedAnchor = section.anchor?.trim();
      const baseAnchor = requestedAnchor
        ? this.sanitizeSlug(requestedAnchor, 'Section anchor')
        : this.slugify(title);

      if (!baseAnchor) {
        throw new BadRequestException('Section anchor cannot be empty');
      }

      let uniqueAnchor = baseAnchor;
      let counter = 2;
      while (usedAnchors.has(uniqueAnchor)) {
        uniqueAnchor = `${baseAnchor}-${counter}`;
        counter += 1;
      }
      usedAnchors.add(uniqueAnchor);

      return {
        title,
        anchor: uniqueAnchor,
        content: this.sanitizeSectionContent(section.content),
        order: this.sanitizeOrder(section.order, index),
      };
    });
  }

  private toCategoryPayload(
    category: DocsCategoryWithNested,
  ): DocsCategoryPayload {
    return {
      id: category.id,
      title: category.title,
      icon: this.sanitizeIcon(category.icon),
      order: category.order,
      items: [...category.items]
        .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
        .map((page) => ({
          id: page.id,
          title: page.title,
          slug: page.slug,
          order: page.order,
          categoryId: page.categoryId,
          sections: [...page.sections]
            .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
            .map((section) => ({
              id: section.id,
              title: section.title,
              anchor: section.anchor,
              content: section.content,
              order: section.order,
            })),
        })),
    };
  }

  private async getCategoriesWithNested(): Promise<DocsCategoryWithNested[]> {
    return this.prisma.docsCategory.findMany({
      orderBy: [{ order: 'asc' }, { title: 'asc' }],
      include: {
        items: {
          orderBy: [{ order: 'asc' }, { title: 'asc' }],
          include: {
            sections: {
              orderBy: [{ order: 'asc' }, { title: 'asc' }],
            },
          },
        },
      },
    });
  }

  async findAll(): Promise<DocsCategoryPayload[]> {
    const categories = await this.getCategoriesWithNested();
    return categories
      .map((category) => this.toCategoryPayload(category))
      .filter((category) => category.items.length > 0);
  }

  async findAllForAdmin(): Promise<DocsCategoryPayload[]> {
    const categories = await this.getCategoriesWithNested();
    return categories.map((category) => this.toCategoryPayload(category));
  }

  async getDocsSettings(): Promise<DocsSettingsPayload> {
    const settings = await this.getOrCreateDocsSettings();
    return this.toDocsSettingsPayload(settings);
  }

  async updateDocsSettings(
    dto: UpdateDocsSettingsDto,
  ): Promise<DocsSettingsPayload> {
    const updateData: {
      version?: string | null;
      socialLinks?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
    } = {};

    if (dto.version !== undefined) {
      updateData.version = this.sanitizeDocsVersion(dto.version);
    }

    if (dto.socialLinks !== undefined) {
      updateData.socialLinks = this.sanitizeDocsSocialLinks(
        dto.socialLinks,
        [],
        true,
      );
    }

    const settings = await this.prisma.docsSetting.upsert({
      where: { id: DOCS_SETTINGS_ID },
      update: updateData,
      create: {
        id: DOCS_SETTINGS_ID,
        version: updateData.version ?? null,
        socialLinks: updateData.socialLinks ?? Prisma.DbNull,
      },
    });

    return this.toDocsSettingsPayload(settings);
  }

  async createCategory(dto: CreateDocsCategoryDto) {
    const title = this.sanitizeRequiredText(dto.title, 'Category title');
    const existing = await this.prisma.docsCategory.findFirst({
      where: {
        title: {
          equals: title,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Category title already exists');
    }

    return this.prisma.docsCategory.create({
      data: {
        title,
        icon: this.sanitizeIcon(dto.icon),
        order: this.sanitizeOrder(dto.order, 0),
      },
    });
  }

  async updateCategory(id: string, dto: UpdateDocsCategoryDto) {
    const category = await this.prisma.docsCategory.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!category) {
      throw new NotFoundException(`Docs category with ID ${id} not found`);
    }

    const data: Prisma.DocsCategoryUpdateInput = {};
    if (dto.title !== undefined) {
      const title = this.sanitizeRequiredText(dto.title, 'Category title');
      const existing = await this.prisma.docsCategory.findFirst({
        where: {
          id: { not: id },
          title: {
            equals: title,
            mode: 'insensitive',
          },
        },
        select: { id: true },
      });
      if (existing) {
        throw new BadRequestException('Category title already exists');
      }
      data.title = title;
    }

    if (dto.icon !== undefined) {
      data.icon = this.sanitizeIcon(dto.icon);
    }

    if (dto.order !== undefined) {
      data.order = this.sanitizeOrder(dto.order, 0);
    }

    return this.prisma.docsCategory.update({
      where: { id },
      data,
    });
  }

  async removeCategory(id: string) {
    const category = await this.prisma.docsCategory.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!category) {
      throw new NotFoundException(`Docs category with ID ${id} not found`);
    }

    await this.prisma.docsCategory.delete({
      where: { id },
    });

    return { success: true };
  }

  private async ensureCategoryExists(categoryId: string) {
    const category = await this.prisma.docsCategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new NotFoundException(
        `Docs category with ID ${categoryId} not found`,
      );
    }
  }

  async createPage(dto: CreateDocsPageDto) {
    await this.ensureCategoryExists(dto.categoryId);

    const slug = this.sanitizeSlug(dto.slug);
    const duplicate = await this.prisma.docsPage.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (duplicate) {
      throw new BadRequestException('Page slug already exists');
    }

    const sections = this.sanitizeSections(dto.sections);
    return this.prisma.docsPage.create({
      data: {
        title: this.sanitizeRequiredText(dto.title, 'Page title'),
        slug,
        categoryId: dto.categoryId,
        order: this.sanitizeOrder(dto.order, 0),
        sections: {
          create: sections,
        },
      },
      include: {
        sections: {
          orderBy: [{ order: 'asc' }, { title: 'asc' }],
        },
      },
    });
  }

  async updatePage(id: string, dto: UpdateDocsPageDto) {
    const page = await this.prisma.docsPage.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!page) {
      throw new NotFoundException(`Docs page with ID ${id} not found`);
    }

    const data: Prisma.DocsPageUpdateInput = {};
    if (dto.title !== undefined) {
      data.title = this.sanitizeRequiredText(dto.title, 'Page title');
    }

    if (dto.slug !== undefined) {
      const slug = this.sanitizeSlug(dto.slug);
      const duplicate = await this.prisma.docsPage.findFirst({
        where: {
          id: { not: id },
          slug,
        },
        select: { id: true },
      });
      if (duplicate) {
        throw new BadRequestException('Page slug already exists');
      }
      data.slug = slug;
    }

    if (dto.categoryId !== undefined) {
      await this.ensureCategoryExists(dto.categoryId);
      data.category = { connect: { id: dto.categoryId } };
    }

    if (dto.order !== undefined) {
      data.order = this.sanitizeOrder(dto.order, 0);
    }

    if (dto.sections === undefined) {
      return this.prisma.docsPage.update({
        where: { id },
        data,
        include: {
          sections: {
            orderBy: [{ order: 'asc' }, { title: 'asc' }],
          },
        },
      });
    }

    const sections = this.sanitizeSections(dto.sections);
    await this.prisma.$transaction(async (tx) => {
      await tx.docsPage.update({
        where: { id },
        data,
      });

      await tx.docsSection.deleteMany({
        where: { pageId: id },
      });

      if (sections.length > 0) {
        await tx.docsSection.createMany({
          data: sections.map((section) => ({
            title: section.title,
            anchor: section.anchor,
            content: section.content,
            pageId: id,
            order: section.order,
          })),
        });
      }
    });

    return this.prisma.docsPage.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: [{ order: 'asc' }, { title: 'asc' }],
        },
      },
    });
  }

  async removePage(id: string) {
    const page = await this.prisma.docsPage.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!page) {
      throw new NotFoundException(`Docs page with ID ${id} not found`);
    }

    await this.prisma.docsPage.delete({
      where: { id },
    });

    return { success: true };
  }
}
