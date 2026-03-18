import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { getSharedRateLimitStore } from './rate-limit-store';

const GLOBAL_RATE_LIMIT_MAX = 100;
const GLOBAL_RATE_LIMIT_WINDOW_MS = 60_000;

const normalizeIpAddress = (
  value: string | null | undefined,
): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('::ffff:')) {
    return trimmed.slice(7) || null;
  }
  return trimmed;
};

const resolveRequestIp = (request: Request): string => {
  const forwardedFor = request.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string') {
    const first = normalizeIpAddress(forwardedFor.split(',')[0]);
    if (first) return first;
  } else if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    const first = normalizeIpAddress(forwardedFor[0]);
    if (first) return first;
  }

  const forwardedRealIp =
    typeof request.headers['x-real-ip'] === 'string'
      ? normalizeIpAddress(request.headers['x-real-ip'])
      : null;
  if (forwardedRealIp) return forwardedRealIp;

  const proxyIp =
    typeof request.headers['x-solera-client-ip'] === 'string'
      ? normalizeIpAddress(request.headers['x-solera-client-ip'])
      : null;
  if (proxyIp) return proxyIp;

  const reqIp = normalizeIpAddress(request.ip);
  if (reqIp) return reqIp;

  const socketIp = normalizeIpAddress(request.socket?.remoteAddress);
  if (socketIp) return socketIp;

  return 'unknown';
};

@Injectable()
export class GlobalRateLimitGuard implements CanActivate {
  private readonly rateLimitStore = getSharedRateLimitStore();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method?.toUpperCase() ?? 'GET';

    if (method === 'OPTIONS') {
      return true;
    }

    const route = request.route as { path?: string } | undefined;
    const routePath =
      (typeof route?.path === 'string' && route.path) ||
      request.path ||
      request.originalUrl ||
      'unknown';

    const key = `global:${resolveRequestIp(request)}:${method}:${routePath}`;
    const result = await this.rateLimitStore.consume({
      key,
      max: GLOBAL_RATE_LIMIT_MAX,
      windowMs: GLOBAL_RATE_LIMIT_WINDOW_MS,
    });

    if (result.allowed) {
      return true;
    }

    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((result.resetAt - Date.now()) / 1000),
    );

    throw new HttpException(
      {
        message: 'Too many requests. Please retry shortly.',
        retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
