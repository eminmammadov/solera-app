import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuditLogService } from './audit-log.service';

interface AuthenticatedAdminUser {
  id?: string;
  walletAddress?: string;
  name?: string;
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedAdminUser;
}

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_ITEMS = 25;
const MAX_OBJECT_KEYS = 30;
const MAX_DEPTH = 4;
const REDACTED_KEYS = new Set([
  'password',
  'accessToken',
  'refreshToken',
  'token',
  'authorization',
  'signature',
  'message',
  'nonce',
]);

const sanitizeForAudit = (value: unknown, depth = 0): unknown => {
  if (value === null || value === undefined) return null;
  if (depth > MAX_DEPTH) return '[truncated-depth]';

  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}…`
      : value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();

  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return `[buffer:${value.length}]`;

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((entry) => sanitizeForAudit(entry, depth + 1));
  }

  if (typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};

    const keys = Object.keys(input).slice(0, MAX_OBJECT_KEYS);
    for (const key of keys) {
      if (REDACTED_KEYS.has(key)) {
        output[key] = '[redacted]';
        continue;
      }
      output[key] = sanitizeForAudit(input[key], depth + 1);
    }

    return output;
  }

  if (typeof value === 'symbol') {
    return value.toString();
  }

  return null;
};

const getHeaderValue = (
  value: string | string[] | undefined,
): string | null => {
  if (!value) return null;
  const normalized = Array.isArray(value) ? value[0] : value;
  if (!normalized) return null;
  const trimmed = normalized.trim();
  return trimmed || null;
};

const toRoutePath = (request: Request): string => {
  const baseUrl = request.baseUrl || '';
  const route = request.route as { path?: string } | undefined;
  const routePath =
    typeof route?.path === 'string'
      ? route.path
      : request.path || request.originalUrl.split('?')[0] || '/';

  const normalized = `${baseUrl}${routePath}`.replace(/\/{2,}/g, '/');
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
};

const deriveResourceType = (routePath: string): string | null => {
  const segments = routePath.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const resourceIndex = segments[0] === 'api' ? 1 : 0;
  return segments[resourceIndex] ?? null;
};

const deriveResourceId = (request: Request): string | null => {
  const params = request.params ?? {};
  const preferredKeys = ['id', 'pairId', 'walletAddress'];

  for (const key of preferredKeys) {
    const value = params[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim().slice(0, 120);
    }
  }

  const firstValue = Object.values(params)[0];
  if (typeof firstValue === 'string' && firstValue.trim()) {
    return firstValue.trim().slice(0, 120);
  }

  return null;
};

@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<AuthenticatedRequest>();
    const response = httpContext.getResponse<Response>();
    const method = request.method.toUpperCase();

    const adminUser = request.user;
    const hasAdminIdentity =
      Boolean(adminUser?.id) && Boolean(adminUser?.walletAddress);
    if (!hasAdminIdentity || !MUTATING_METHODS.has(method)) {
      return next.handle();
    }

    const routePath = toRoutePath(request);
    const requestId =
      getHeaderValue(request.headers['x-request-id']) ||
      getHeaderValue(request.headers['x-correlation-id']);
    const ipAddress =
      getHeaderValue(request.headers['x-solera-client-ip']) ||
      request.ip ||
      null;
    const userAgent = request.get('user-agent') || null;
    const resourceType = deriveResourceType(routePath);
    const resourceId = deriveResourceId(request);
    const action = `${method} ${routePath}`;
    const metadata = {
      params: sanitizeForAudit(request.params),
      query: sanitizeForAudit(request.query),
      body: sanitizeForAudit(request.body),
    };

    return next.handle().pipe(
      tap(() => {
        void this.auditLogService.logAdminAction({
          actorAdminId: adminUser?.id ?? null,
          actorWalletAddress: adminUser?.walletAddress ?? null,
          actorName: adminUser?.name ?? null,
          action,
          resourceType,
          resourceId,
          httpMethod: method,
          routePath,
          requestId,
          ipAddress,
          userAgent,
          status: 'success',
          statusCode: response.statusCode || HttpStatus.OK,
          metadata,
        });
      }),
      catchError((error: unknown) => {
        const statusCode =
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;
        const message =
          error instanceof Error ? error.message : 'Unknown error';

        void this.auditLogService.logAdminAction({
          actorAdminId: adminUser?.id ?? null,
          actorWalletAddress: adminUser?.walletAddress ?? null,
          actorName: adminUser?.name ?? null,
          action,
          resourceType,
          resourceId,
          httpMethod: method,
          routePath,
          requestId,
          ipAddress,
          userAgent,
          status: 'failure',
          statusCode,
          message,
          metadata,
        });

        return throwError(() => error);
      }),
    );
  }
}
