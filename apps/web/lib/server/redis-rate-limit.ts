import { createHash } from "node:crypto"
import Redis from "ioredis"
import { readIntegerEnv, readOptionalEnv } from "@/lib/config/env"

export interface RedisRateLimitInput {
  key: string
  max: number
  windowMs: number
  keyPrefix?: string
}

export interface RedisRateLimitResult {
  allowed: boolean
  count: number
  resetAt: number
}

interface RedisRateLimitStore {
  consume(input: RedisRateLimitInput): Promise<RedisRateLimitResult>
}

let sharedStore: RedisRateLimitStore | null = null

const toRedisKey = (rawKey: string, keyPrefix: string) => {
  const digest = createHash("sha256").update(rawKey).digest("hex")
  return `${keyPrefix}:${digest}`
}

const CONSUME_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return { current, ttl }
`

class RedisSocketStore implements RedisRateLimitStore {
  private readonly client: Redis

  constructor() {
    const redisUrl = readOptionalEnv("RATE_LIMIT_REDIS_URL")
    if (!redisUrl) {
      throw new Error("RATE_LIMIT_REDIS_URL is missing.")
    }

    const redisPassword = readOptionalEnv("RATE_LIMIT_REDIS_PASSWORD")
    const connectTimeoutMs = readIntegerEnv(
      "RATE_LIMIT_REDIS_CONNECT_TIMEOUT_MS",
      2000,
    )

    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout:
        Number.isFinite(connectTimeoutMs) && connectTimeoutMs > 0
          ? connectTimeoutMs
          : 2000,
      password: redisPassword || undefined,
      retryStrategy: (times) => Math.min(times * 50, 500),
      keepAlive: 10_000,
    })
  }

  async consume(input: RedisRateLimitInput): Promise<RedisRateLimitResult> {
    if (this.client.status === "wait") {
      await this.client.connect()
    }

    const now = Date.now()
    const windowMs = Math.max(1, Math.trunc(input.windowMs))
    const redisKey = toRedisKey(
      input.key,
      input.keyPrefix ?? "solera:ratelimit:web",
    )

    const rawResult = await this.client.eval(
      CONSUME_SCRIPT,
      1,
      redisKey,
      windowMs.toString(),
    )

    if (!Array.isArray(rawResult) || rawResult.length < 2) {
      throw new Error("Unexpected Redis LUA response shape")
    }

    const count = Number(rawResult[0])
    const ttlMs = Number(rawResult[1])

    if (!Number.isFinite(count) || count <= 0) {
      throw new Error("Unexpected Redis count response")
    }

    return {
      allowed: count <= input.max,
      count,
      resetAt:
        Number.isFinite(ttlMs) && ttlMs > 0 ? now + ttlMs : now + windowMs,
    }
  }
}

class UpstashRestStore implements RedisRateLimitStore {
  private readonly baseUrl: string
  private readonly token: string

  constructor() {
    const baseUrl = readOptionalEnv("RATE_LIMIT_REDIS_REST_URL")
    const token = readOptionalEnv("RATE_LIMIT_REDIS_REST_TOKEN")
    if (!baseUrl || !token) {
      throw new Error(
        "RATE_LIMIT_REDIS_REST_URL and RATE_LIMIT_REDIS_REST_TOKEN are required together.",
      )
    }

    this.baseUrl = baseUrl.replace(/\/+$/, "")
    this.token = token
  }

  private async callCommand(command: string[]): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([[...command]]),
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`Upstash request failed with status ${response.status}`)
    }

    const payload = (await response.json()) as Array<{
      error?: string
      result?: unknown
    }>
    const first = payload?.[0]
    if (!first) {
      throw new Error("Upstash response is empty")
    }
    if (first.error) {
      throw new Error(first.error)
    }
    return first.result
  }

  async consume(input: RedisRateLimitInput): Promise<RedisRateLimitResult> {
    const now = Date.now()
    const windowMs = Math.max(1, Math.trunc(input.windowMs))
    const redisKey = toRedisKey(
      input.key,
      input.keyPrefix ?? "solera:ratelimit:web",
    )

    const incrementResult = await this.callCommand(["INCR", redisKey])
    const count = Number(incrementResult)

    if (!Number.isFinite(count) || count <= 0) {
      throw new Error("Unexpected INCR response from Upstash")
    }

    if (count === 1) {
      await this.callCommand(["PEXPIRE", redisKey, windowMs.toString()])
    }

    const ttlResult = await this.callCommand(["PTTL", redisKey])
    const ttlMs = Number(ttlResult)

    return {
      allowed: count <= input.max,
      count,
      resetAt:
        Number.isFinite(ttlMs) && ttlMs > 0 ? now + ttlMs : now + windowMs,
    }
  }
}

const createStore = (): RedisRateLimitStore => {
  const socketUrl = readOptionalEnv("RATE_LIMIT_REDIS_URL")
  if (socketUrl) {
    return new RedisSocketStore()
  }

  const restUrl = readOptionalEnv("RATE_LIMIT_REDIS_REST_URL")
  const restToken = readOptionalEnv("RATE_LIMIT_REDIS_REST_TOKEN")
  if (restUrl || restToken) {
    return new UpstashRestStore()
  }

  throw new Error(
    "Missing Redis rate-limit configuration. Set RATE_LIMIT_REDIS_URL or RATE_LIMIT_REDIS_REST_URL + RATE_LIMIT_REDIS_REST_TOKEN.",
  )
}

export const consumeRedisRateLimit = async (
  input: RedisRateLimitInput,
): Promise<RedisRateLimitResult> => {
  if (!sharedStore) {
    sharedStore = createStore()
  }

  return sharedStore.consume(input)
}
