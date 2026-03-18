import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { readProxySharedKey as readProxySharedKeyFromEnv } from './env';

export const readProxySharedKey = (): string => readProxySharedKeyFromEnv();

export const validateProxySharedKey = (proxyKey?: string): void => {
  const expected = readProxySharedKey();
  if (!expected) {
    throw new ServiceUnavailableException(
      'SOLERA_PROXY_SHARED_KEY is not configured on API service.',
    );
  }

  if (proxyKey?.trim() !== expected) {
    throw new UnauthorizedException('Invalid proxy key');
  }
};
