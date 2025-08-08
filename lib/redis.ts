import Redis from 'ioredis'

// Reuse a single Redis client instance across hot reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var redisClient: Redis | undefined
}

let client: Redis | undefined

if (process.env.REDIS_URL) {
  client = global.redisClient ?? new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    enableAutoPipelining: true,
  })

  // Best-effort connect; avoid throwing on import in serverless
  client
    .connect()
    .catch(() => {
      // Swallow connection errors here; route code will degrade gracefully
    })

  if (!global.redisClient) {
    global.redisClient = client
  }
}

export function isRedisEnabled(): boolean {
  return Boolean(client)
}

export async function getJson<T>(key: string): Promise<T | null> {
  if (!client) return null
  try {
    const value = await client.get(key)
    return value ? (JSON.parse(value) as T) : null
  } catch (_err) {
    return null
  }
}

export async function setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  if (!client) return
  try {
    const payload = JSON.stringify(value)
    if (ttlSeconds && ttlSeconds > 0) {
      await client.set(key, payload, 'EX', ttlSeconds)
    } else {
      await client.set(key, payload)
    }
  } catch (_err) {
    // ignore failing cache writes
  }
}

export default client


