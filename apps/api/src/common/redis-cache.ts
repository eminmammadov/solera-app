import { createHash } from 'crypto';
import Redis from 'ioredis';

export interface RedisJsonCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
  del(key: string): Promise<void>;
}

let sharedRedisJsonCache: RedisJsonCache | null = null;

const readOptionalEnv = (name: string): string | null => {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
};

const buildRedisKey = (prefix: string, rawKey: string) => {
  const digest = createHash('sha256').update(rawKey).digest('hex');
  return `${prefix}:${digest}`;
};

class RedisSocketJsonCache implements RedisJsonCache {
  private readonly client: Redis;
  private readonly keyPrefix: string;

  constructor(options: {
    url: string;
    password?: string | null;
    keyPrefix?: string;
    connectTimeoutMs?: number;
  }) {
    this.keyPrefix = options.keyPrefix?.trim() || 'solera:cache';
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

  private toKey(rawKey: string) {
    return buildRedisKey(this.keyPrefix, rawKey);
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }

    const raw = await this.client.get(this.toKey(key));
    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }

    await this.client.set(
      this.toKey(key),
      JSON.stringify(value),
      'PX',
      Math.max(1, Math.trunc(ttlMs)),
    );
  }

  async del(key: string): Promise<void> {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }

    await this.client.del(this.toKey(key));
  }
}

class UpstashRestJsonCache implements RedisJsonCache {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly keyPrefix: string;

  constructor(options: { baseUrl: string; token: string; keyPrefix?: string }) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.token = options.token;
    this.keyPrefix = options.keyPrefix?.trim() || 'solera:cache';
  }

  private toKey(rawKey: string) {
    return buildRedisKey(this.keyPrefix, rawKey);
  }

  private async call(command: string[]): Promise<unknown> {
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

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.call(['GET', this.toKey(key)]);
    if (typeof raw !== 'string' || !raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    await this.call([
      'SET',
      this.toKey(key),
      JSON.stringify(value),
      'PX',
      Math.max(1, Math.trunc(ttlMs)).toString(),
    ]);
  }

  async del(key: string): Promise<void> {
    await this.call(['DEL', this.toKey(key)]);
  }
}

const createRedisJsonCache = (): RedisJsonCache => {
  const redisSocketUrl = readOptionalEnv('RATE_LIMIT_REDIS_URL');
  const redisSocketPassword = readOptionalEnv('RATE_LIMIT_REDIS_PASSWORD');
  const redisConnectTimeoutMsRaw = readOptionalEnv(
    'RATE_LIMIT_REDIS_CONNECT_TIMEOUT_MS',
  );
  const redisConnectTimeoutMs = redisConnectTimeoutMsRaw
    ? Number.parseInt(redisConnectTimeoutMsRaw, 10)
    : 2000;

  if (redisSocketUrl) {
    return new RedisSocketJsonCache({
      url: redisSocketUrl,
      password: redisSocketPassword,
      connectTimeoutMs: Number.isFinite(redisConnectTimeoutMs)
        ? redisConnectTimeoutMs
        : 2000,
    });
  }

  const redisRestUrl = readOptionalEnv('RATE_LIMIT_REDIS_REST_URL');
  const redisRestToken = readOptionalEnv('RATE_LIMIT_REDIS_REST_TOKEN');
  if (redisRestUrl && redisRestToken) {
    return new UpstashRestJsonCache({
      baseUrl: redisRestUrl,
      token: redisRestToken,
    });
  }

  throw new Error(
    'Missing Redis configuration. Define RATE_LIMIT_REDIS_URL or RATE_LIMIT_REDIS_REST_URL + RATE_LIMIT_REDIS_REST_TOKEN.',
  );
};

export const getSharedRedisJsonCache = (): RedisJsonCache => {
  if (!sharedRedisJsonCache) {
    sharedRedisJsonCache = createRedisJsonCache();
  }
  return sharedRedisJsonCache;
};
