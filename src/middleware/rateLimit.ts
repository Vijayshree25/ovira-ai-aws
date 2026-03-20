import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

// Check if rate limiting is properly configured
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.trim().replace(/^["']|["']$/g, '');
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.trim().replace(/^["']|["']$/g, '');
const RATE_LIMIT_ENABLED = !!(REDIS_URL && REDIS_TOKEN && REDIS_URL.startsWith('https://'));

// Initialize Redis client only if properly configured
let redis: Redis | null = null;
let rateLimiters: Record<string, Ratelimit> | null = null;

if (RATE_LIMIT_ENABLED) {
  try {
    redis = new Redis({
      url: REDIS_URL!,
      token: REDIS_TOKEN!,
    });

    // Rate limit configurations
    rateLimiters = {
      bedrock: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
        analytics: true,
        prefix: 'ratelimit:bedrock',
      }),
      dynamodb: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
        analytics: true,
        prefix: 'ratelimit:dynamodb',
      }),
      general: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(50, '1 m'), // 50 requests per minute
        analytics: true,
        prefix: 'ratelimit:general',
      }),
    };
    console.log('[RateLimit] Initialized rate limiters successfully');
  } catch (error) {
    console.error('[RateLimit] Failed to initialize Redis client:', error);
    console.warn('[RateLimit] Rate limiting will be DISABLED');
  }
} else {
  console.warn('[RateLimit] Redis not configured properly - rate limiting DISABLED');
  console.warn('[RateLimit] REDIS_URL:', REDIS_URL ? 'present' : 'missing');
  console.warn('[RateLimit] REDIS_TOKEN:', REDIS_TOKEN ? 'present' : 'missing');
}

// Rate limit type
export type RateLimitType = keyof typeof rateLimiters;

// Get identifier from request (user ID or IP)
function getIdentifier(request: NextRequest): string {
  // Try to get user ID from auth header or session
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    // Extract user ID from JWT or session token
    return authHeader;
  }
  
  // Fallback to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  return ip;
}

// Rate limit middleware wrapper
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  limitType: RateLimitType = 'general'
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // If rate limiting is not enabled, just call the handler
    if (!RATE_LIMIT_ENABLED || !rateLimiters) {
      console.warn(`[RateLimit] Skipping rate limit check - not configured`);
      return handler(request);
    }

    try {
      const identifier = getIdentifier(request);
      const limiter = rateLimiters[limitType];
      
      const { success, limit, reset, remaining } = await limiter.limit(identifier);
      
      // Log rate limit check
      console.log(`[RateLimit] ${limitType} - ${identifier}: ${remaining}/${limit} remaining`);
      
      if (!success) {
        const retryAfter = Math.ceil((reset - Date.now()) / 1000);
        
        console.warn(`[RateLimit] ${limitType} - ${identifier}: BLOCKED (retry after ${retryAfter}s)`);
        
        return NextResponse.json(
          {
            success: false,
            error: 'RateLimitExceeded',
            message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
            retryAfter,
          },
          {
            status: 429,
            headers: {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': reset.toString(),
            },
          }
        );
      }
      
      // Add rate limit headers to successful response
      const response = await handler(request);
      response.headers.set('X-RateLimit-Limit', limit.toString());
      response.headers.set('X-RateLimit-Remaining', remaining.toString());
      response.headers.set('X-RateLimit-Reset', reset.toString());
      
      return response;
    } catch (error) {
      // If rate limiting fails, log error but allow request through
      console.error('[RateLimit] Error during rate limit check:', error);
      console.warn('[RateLimit] Allowing request through due to rate limit error');
      return handler(request);
    }
  };
}

// Export for testing/debugging
export { RATE_LIMIT_ENABLED };
