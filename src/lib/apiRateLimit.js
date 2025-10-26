// API Route rate limiting utility
// Separate from middleware rate limiting for API-specific tracking

import { NextResponse } from 'next/server';

const apiRateLimitMap = new Map();

// Clean up old entries every 2 minutes
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  
  for (const [ip, data] of apiRateLimitMap.entries()) {
    data.timestamps = data.timestamps.filter(time => time > fiveMinutesAgo);
    
    if (data.timestamps.length === 0) {
      apiRateLimitMap.delete(ip);
    }
  }
}, 2 * 60 * 1000);

export function checkApiRateLimit(request) {
  // Get client IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  
  // Get or create rate limit data
  let ipData = apiRateLimitMap.get(ip);
  
  if (!ipData) {
    ipData = {
      timestamps: [],
      blocked: false,
      blockedUntil: null
    };
    apiRateLimitMap.set(ip, ipData);
  }
  
  // Remove old timestamps
  ipData.timestamps = ipData.timestamps.filter(time => time > fiveMinutesAgo);
  
  // Check if blocked
  if (ipData.blocked && ipData.blockedUntil > now) {
    const minutesLeft = Math.ceil((ipData.blockedUntil - now) / 60000);
    
    return NextResponse.json(
      {
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Blocked for ${minutesLeft} more minutes.`,
        resetIn: minutesLeft
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': minutesLeft.toString()
        }
      }
    );
  }
  
  // Unblock if expired
  if (ipData.blocked && ipData.blockedUntil <= now) {
    ipData.blocked = false;
    ipData.blockedUntil = null;
    ipData.timestamps = [];
  }
  
  // Check limit
  if (ipData.timestamps.length >= 100) {
    ipData.blocked = true;
    ipData.blockedUntil = now + 5 * 60 * 1000;
    
    return NextResponse.json(
      {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Too many API requests. Blocked for 5 minutes.',
        resetIn: 5
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': '5'
        }
      }
    );
  }
  
  // Add timestamp
  ipData.timestamps.push(now);
  
  // Return success with headers
  const remaining = 100 - ipData.timestamps.length;
  
  return {
    allowed: true,
    remaining,
    headers: {
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': remaining.toString()
    }
  };
}

// Middleware wrapper for API routes
export function withApiRateLimit(handler) {
  return async (request, context) => {
    const rateLimitCheck = checkApiRateLimit(request);
    
    // If rate limit exceeded, return error response
    if (rateLimitCheck instanceof NextResponse) {
      return rateLimitCheck;
    }
    
    // Otherwise, call the actual handler
    const response = await handler(request, context);
    
    // Add rate limit headers to response
    if (rateLimitCheck.headers) {
      Object.entries(rateLimitCheck.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
    }
    
    return response;
  };
}

