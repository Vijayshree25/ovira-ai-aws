import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Rate limit configurations
export const rateLimiters = {
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
  };
}

// Log rate limiter initialization
console.log('[RateLimit] Initialized rate limiters:', {
  bedrock: '10 requests/minute',
  dynamodb: '100 requests/minute',
  general: '50 requests/minute',
});
