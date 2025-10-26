// Test endpoint to verify rate limiting is working
// This endpoint can be called to test the rate limit functionality

import { NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';

export async function GET(request) {
  // Check rate limit
  const rateLimitCheck = checkApiRateLimit(request);
  
  // If rate limit exceeded, return error
  if (rateLimitCheck instanceof NextResponse) {
    return rateLimitCheck;
  }
  
  // Get IP for display
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  // Return success response with rate limit info
  const response = NextResponse.json({
    success: true,
    message: 'Rate limit test successful',
    ip,
    rateLimit: {
      limit: 100,
      remaining: rateLimitCheck.remaining,
      info: 'You can make up to 100 requests per 5 minutes'
    }
  });
  
  // Add rate limit headers
  if (rateLimitCheck.headers) {
    Object.entries(rateLimitCheck.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  
  return response;
}

