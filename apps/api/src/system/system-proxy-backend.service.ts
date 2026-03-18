import { BadRequestException, Injectable } from '@nestjs/common';
import { readOptionalEnv } from '../common/env';
import { validateProxySharedKey } from '../common/proxy-key';
import type { ProxyBackendConfigPayload } from './system.types';

@Injectable()
export class SystemProxyBackendService {
  validateProxyKey(proxyKey?: string) {
    validateProxySharedKey(proxyKey);
  }

  sanitizeProxyBackendBaseUrl(value?: string | null): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new BadRequestException(
        'backendBaseUrl must be a valid absolute URL',
      );
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException(
        'backendBaseUrl must start with http:// or https://',
      );
    }

    if (trimmed.includes('/api/backend')) {
      throw new BadRequestException(
        'backendBaseUrl must point to backend API (e.g. https://api.example.com/api), not /api/backend',
      );
    }

    return trimmed.replace(/\/+$/, '');
  }

  toProxyBackendPayload(settings: {
    draftBackendBaseUrl: string | null;
    publishedBackendBaseUrl: string | null;
    previousBackendBaseUrl: string | null;
    version: number;
    updatedAt: Date;
  }): ProxyBackendConfigPayload {
    return {
      draftBackendBaseUrl: this.sanitizeProxyBackendBaseUrl(
        settings.draftBackendBaseUrl,
      ),
      publishedBackendBaseUrl: this.sanitizeProxyBackendBaseUrl(
        settings.publishedBackendBaseUrl,
      ),
      previousBackendBaseUrl: this.sanitizeProxyBackendBaseUrl(
        settings.previousBackendBaseUrl,
      ),
      effectiveBackendBaseUrl: this.sanitizeProxyBackendBaseUrl(
        settings.publishedBackendBaseUrl,
      ),
      version: settings.version || 1,
      updatedAt: settings.updatedAt.toISOString(),
    };
  }

  getInfraRuntimeStatusProxyConfig() {
    return {
      sharedKeyConfigured: Boolean(readOptionalEnv('SOLERA_PROXY_SHARED_KEY')),
      allowDevFallbacks: false,
    };
  }
}
