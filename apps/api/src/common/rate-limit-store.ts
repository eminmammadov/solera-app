import { createHash } from 'crypto';
import Redis from 'ioredis';

export type RateLimitBackend = 'memory' | 'redis';

export interface RateLimitRuntimeStatus {
  configuredBackend: RateLimitBackend;
  effectiveBackend: RateLimitBackend;
  redisConfigured: boolean;
  degraded: boolean;
  lastFallbackAt: string | null;
  lastErrorMessage: string | null;
}

export interface RateLimitConsumeInput {
  key: string;
  max: number;
  windowMs: number;
}

export interface RateLimitConsumeResult {
  allowed: boolean;
  count: number;
  resetAt: number;
}

export interface RateLimitStore {
  consume(input: RateLimitConsumeInput): Promise<RateLimitConsumeResult>;
}

let sharedRateLimitStore: RateLimitStore | null = null;

const runtimeStatus: RateLimitRuntimeStatus = {
  configuredBackend: 'redis',
  effectiveBackend: 'redis',
  redisConfigured: false,
  degraded: false,
  lastFallbackAt: null,
  lastErrorMessage: null,
};

const markConfiguredRedis = () => {
  runtimeStatus.configuredBackend = 'redis';
  runtimeStatus.effectiveBackend = 'redis';
  runtimeStatus.redisConfigured = true;
  runtimeStatus.degraded = false;
  runtimeStatus.lastFallbackAt = null;
  runtimeStatus.lastErrorMessage = null;
};

const markRedisHealthy = () => {
  runtimeStatus.effectiveBackend = 'redis';
  runtimeStatus.degraded = false;
  runtimeStatus.lastFallbackAt = null;
  runtimeStatus.lastErrorMessage = null;
};

const markRedisError = (error: unknown) => {
  runtimeStatus.effectiveBackend = 'redis';
  runtimeStatus.degraded = true;
  runtimeStatus.lastFallbackAt = new Date().toISOString();
  runtimeStatus.lastErrorMessage =
    error instanceof Error ? error.message : 'Rate-limit backend error';
};

export const getRateLimitRuntimeStatus = (): RateLimitRuntimeStatus => ({
  ...runtimeStatus,
});

class UpstashRedisRateLimitStore implements RateLimitStore {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly keyPrefix: string;

  constructor(options: { baseUrl: string; token: string; keyPrefix?: string }) {
    let parsed: URL;
    try {
      parsed = new URL(options.baseUrl.trim());
    } catch {
      throw new Error('Invalid Upstash base URL');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Invalid Upstash base URL protocol');
    }
    this.baseUrl = parsed.toString().replace(/\/+$/, '');
    this.token = options.token;
    this.keyPrefix = options.keyPrefix?.trim() || 'solera:ratelimit';
  }

  private buildRedisKey(rawKey: string): string {
    const digest = createHash('sha256').update(rawKey).digest('hex');
    return `${this.keyPrefix}:${digest}`;
  }

  private async callRedisCommand(command: string[]): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([[...command]]),
    });

    if (!response.ok) {
      throw new Error(`Upstash request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as Array<{
      error?: string;
      result?: unknown;
    }>;
    const first = payload?.[0];
    if (!first) {
      throw new Error('Upstash response is empty');
    }
    if (first.error) {
      throw new Error(first.error);
    }
    return first.result;
  }

  async consume(input: RateLimitConsumeInput): Promise<RateLimitConsumeResult> {
    const now = Date.now();
    const redisKey = this.buildRedisKey(input.key);
    const incrementResult = await this.callRedisCommand(['INCR', redisKey]);
    const count = Number(incrementResult);

    if (!Number.isFinite(count) || count <= 0) {
      throw new Error('Unexpected INCR response from Redis');
    }

    if (count === 1) {
      await this.callRedisCommand([
        'PEXPIRE',
        redisKey,
        Math.max(1, Math.trunc(input.windowMs)).toString(),
      ]);
    }

    const ttlResult = await this.callRedisCommand(['PTTL', redisKey]);
    const ttlMs = Number(ttlResult);
    const resetAt =
      Number.isFinite(ttlMs) && ttlMs > 0 ? now + ttlMs : now + input.windowMs;

    return {
      allowed: count <= input.max,
      count,
      resetAt,
    };
  }
}

class RedisSocketRateLimitStore implements RateLimitStore {
  private readonly client: Redis;
  private readonly keyPrefix: string;

  private readonly consumeScript = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return { current, ttl }
`;

  constructor(options: {
    url: string;
    keyPrefix?: string;
    connectTimeoutMs?: number;
    password?: string | null;
  }) {
    let parsed: URL;
    try {
      parsed = new URL(options.url.trim());
    } catch {
      throw new Error('Invalid Redis URL');
    }

    if (parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:') {
      throw new Error('Invalid Redis URL protocol');
    }

    this.keyPrefix = options.keyPrefix?.trim() || 'solera:ratelimit';
    this.client = new Redis(options.url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: Math.max(500, options.connectTimeoutMs ?? 2000),
      password: options.password ?? undefined,
      retryStrategy: (times) => Math.min(times * 50, 500),
      keepAlive: 10_000,
    });
  }

  private buildRedisKey(rawKey: string): string {
    const digest = createHash('sha256').update(rawKey).digest('hex');
    return `${this.keyPrefix}:${digest}`;
  }

  async consume(input: RateLimitConsumeInput): Promise<RateLimitConsumeResult> {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }

    const now = Date.now();
    const redisKey = this.buildRedisKey(input.key);
    const windowMs = Math.max(1, Math.trunc(input.windowMs));

    const rawResult = await this.client.eval(
      this.consumeScript,
      1,
      redisKey,
      windowMs.toString(),
    );

    if (!Array.isArray(rawResult) || rawResult.length < 2) {
      throw new Error('Unexpected Redis LUA response shape');
    }

    const count = Number(rawResult[0]);
    if (!Number.isFinite(count) || count <= 0) {
      throw new Error('Unexpected Redis count response');
    }

    const ttlMs = Number(rawResult[1]);
    const resetAt =
      Number.isFinite(ttlMs) && ttlMs > 0 ? now + ttlMs : now + windowMs;

    return {
      allowed: count <= input.max,
      count,
      resetAt,
    };
  }
}

class ObservedRedisRateLimitStore implements RateLimitStore {
  constructor(private readonly primary: RateLimitStore) {}

  async consume(input: RateLimitConsumeInput): Promise<RateLimitConsumeResult> {
    try {
      const result = await this.primary.consume(input);
      markRedisHealthy();
      return result;
    } catch (error) {
      markRedisError(error);
      throw new Error(
        'Rate-limit backend unavailable. Restore Redis connectivity.',
      );
    }
  }
}

const readOptionalEnv = (name: string): string | null => {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
};

export const createRateLimitStore = (): RateLimitStore => {
  const redisSocketUrl = readOptionalEnv('RATE_LIMIT_REDIS_URL');
  const redisSocketPassword = readOptionalEnv('RATE_LIMIT_REDIS_PASSWORD');
  const redisConnectTimeoutMsRaw = readOptionalEnv(
    'RATE_LIMIT_REDIS_CONNECT_TIMEOUT_MS',
  );
  const redisConnectTimeoutMs = redisConnectTimeoutMsRaw
    ? Number.parseInt(redisConnectTimeoutMsRaw, 10)
    : 2000;

  if (redisSocketPassword && !redisSocketUrl) {
    throw new Error('RATE_LIMIT_REDIS_PASSWORD requires RATE_LIMIT_REDIS_URL.');
  }

  if (redisSocketUrl) {
    const redisStore = new RedisSocketRateLimitStore({
      url: redisSocketUrl,
      password: redisSocketPassword,
      connectTimeoutMs: Number.isFinite(redisConnectTimeoutMs)
        ? redisConnectTimeoutMs
        : 2000,
    });
    markConfiguredRedis();
    return new ObservedRedisRateLimitStore(redisStore);
  }

  const redisRestUrl = readOptionalEnv('RATE_LIMIT_REDIS_REST_URL');
  const redisRestToken = readOptionalEnv('RATE_LIMIT_REDIS_REST_TOKEN');
  const hasRedisRestUrl = Boolean(redisRestUrl);
  const hasRedisRestToken = Boolean(redisRestToken);

  if (hasRedisRestUrl !== hasRedisRestToken) {
    throw new Error(
      'RATE_LIMIT_REDIS_REST_URL and RATE_LIMIT_REDIS_REST_TOKEN must be provided together.',
    );
  }

  if (!hasRedisRestUrl || !hasRedisRestToken) {
    throw new Error(
      'Missing Redis rate-limit configuration. Define RATE_LIMIT_REDIS_URL (recommended) or RATE_LIMIT_REDIS_REST_URL + RATE_LIMIT_REDIS_REST_TOKEN.',
    );
  }

  const redisStore = new UpstashRedisRateLimitStore({
    baseUrl: redisRestUrl as string,
    token: redisRestToken as string,
  });

  markConfiguredRedis();
  return new ObservedRedisRateLimitStore(redisStore);
};

export const getSharedRateLimitStore = (): RateLimitStore => {
  if (!sharedRateLimitStore) {
    sharedRateLimitStore = createRateLimitStore();
  }
  return sharedRateLimitStore;
};
