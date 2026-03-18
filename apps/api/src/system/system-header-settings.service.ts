import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DEFAULT_HEADER_SETTINGS } from './system.constants';
import type { HeaderSettingsPayload } from './system.types';

@Injectable()
export class SystemHeaderSettingsService {
  sanitizeHeaderLogoUrl(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (!trimmed.startsWith('/')) {
      throw new BadRequestException(
        'logoUrl must be a local static path (e.g. /images/logo.png)',
      );
    }

    return trimmed;
  }

  sanitizeHeaderText(value: string): string | null {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private sanitizeHeaderNavLinkName(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException('Header nav link name cannot be empty');
    }
    return trimmed;
  }

  private sanitizeHeaderNavLinkHref(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException('Header nav link href cannot be empty');
    }
    if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
      throw new BadRequestException(
        'Header nav link href must be an internal path starting with "/"',
      );
    }
    return trimmed;
  }

  sanitizeHeaderNavLinks(
    rawLinks: unknown,
    fallbackLinks: Array<{ name: string; href: string }> = [],
    strict = false,
  ): Array<{ name: string; href: string }> {
    if (!Array.isArray(rawLinks)) {
      return fallbackLinks.map((link) => ({ ...link }));
    }

    const normalized: Array<{ name: string; href: string }> = [];
    const dedupe = new Set<string>();

    for (const candidate of rawLinks.slice(0, 10)) {
      if (!candidate || typeof candidate !== 'object') continue;
      const source = candidate as { name?: unknown; href?: unknown };
      if (typeof source.name !== 'string' || typeof source.href !== 'string') {
        if (strict) {
          throw new BadRequestException(
            'Header nav links must include valid name and href strings',
          );
        }
        continue;
      }

      let name = '';
      let href = '';
      try {
        name = this.sanitizeHeaderNavLinkName(source.name);
        href = this.sanitizeHeaderNavLinkHref(source.href);
      } catch (error) {
        if (strict) {
          throw error;
        }
        continue;
      }

      const dedupeKey = `${name.toLowerCase()}|${href.toLowerCase()}`;
      if (dedupe.has(dedupeKey)) {
        continue;
      }

      dedupe.add(dedupeKey);
      normalized.push({ name, href });
    }

    if (normalized.length === 0 && fallbackLinks.length > 0) {
      return fallbackLinks.map((link) => ({ ...link }));
    }

    return normalized;
  }

  toHeaderPayload(settings: {
    logoUrl: string | null;
    projectName: string | null;
    description: string | null;
    network: string | null;
    connectEnabled: boolean | null;
    navLinks: Prisma.JsonValue | null;
    updatedAt: Date;
  }): HeaderSettingsPayload {
    const normalizedNetwork =
      settings.network === 'mainnet' ? 'mainnet' : 'devnet';

    return {
      logoUrl: settings.logoUrl || DEFAULT_HEADER_SETTINGS.logoUrl,
      projectName: settings.projectName || DEFAULT_HEADER_SETTINGS.projectName,
      description: settings.description || DEFAULT_HEADER_SETTINGS.description,
      network: normalizedNetwork,
      connectEnabled:
        settings.connectEnabled ?? DEFAULT_HEADER_SETTINGS.connectEnabled,
      navLinks: this.sanitizeHeaderNavLinks(
        settings.navLinks,
        DEFAULT_HEADER_SETTINGS.navLinks,
      ),
      updatedAt: settings.updatedAt.toISOString(),
    };
  }
}
