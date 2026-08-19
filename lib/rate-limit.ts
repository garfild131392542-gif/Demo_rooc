/**
 * Simple in-memory sliding window rate limiter
 * Designed for Next.js API Routes and Server Actions
 * Automatically purges stale keys to prevent memory leaks
 */

interface RateLimitRecord {
  count: number
  resetTime: number
}

const rateLimitMap = new Map<string, RateLimitRecord>()

// Periodically clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetTime) {
        rateLimitMap.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

export interface RateLimitOptions {
  limit: number          // Max requests allowed within window
  windowMs: number       // Window size in milliseconds
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now()
  const { limit, windowMs } = options

  const existing = rateLimitMap.get(identifier)

  if (!existing || now > existing.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    })
    return {
      allowed: true,
      remaining: limit - 1,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    }
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetTime - now) / 1000))
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    }
  }

  existing.count += 1
  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetTime - now) / 1000)),
  }
}

/**
 * Extracts a client IP or fallback identifier from Next.js request headers
 */
export function getClientIp(headersList: Headers): string {
  const forwarded = headersList.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = headersList.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }
  const cfIp = headersList.get('cf-connecting-ip')
  if (cfIp) {
    return cfIp.trim()
  }
  return 'unknown-client'
}
