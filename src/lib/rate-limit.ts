import { Redis } from '@upstash/redis';
import { LRUCache } from 'lru-cache';

export interface RateLimiter {
  check(limit: number, token: string): Promise<boolean>;
}

class UpstashRateLimiter implements RateLimiter {
  private redis: Redis;

  constructor(url: string, token: string) {
    this.redis = new Redis({ url, token });
  }

  async check(limit: number, token: string): Promise<boolean> {
    const key = `ratelimit:${token}`;
    const windowSeconds = 60; // 1 minute window
    
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, windowSeconds);
    }
    
    return count <= limit;
  }
}

class MemoryRateLimiter implements RateLimiter {
  private cache: LRUCache<string, number[]>;

  constructor() {
    this.cache = new LRUCache({
      max: 500,
      ttl: 60000, // 1 minute TTL
    });
  }

  async check(limit: number, token: string): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    const timestamps = this.cache.get(token) || [];
    const validTimestamps = timestamps.filter((t) => t > windowStart);
    validTimestamps.push(now);

    this.cache.set(token, validTimestamps);

    return validTimestamps.length <= limit;
  }
}

// Automatically select implementation based on environment variables
export const getRateLimiter = (): RateLimiter => {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    return new UpstashRateLimiter(redisUrl, redisToken);
  }
  
  return new MemoryRateLimiter();
};

export const rateLimiter = getRateLimiter();
