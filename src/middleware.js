import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';

// Note: Can't use verifyToken in middleware due to bcrypt/jwt issues in Edge runtime
// We'll do a simpler check here and rely on API routes for actual verification

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Get client IP address
  const ip = request.ip || 
             request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  // Check rate limit (100 requests per hour)
  const rateLimitResult = checkRateLimit(ip);
  
  if (!rateLimitResult.allowed) {
    console.log(`🚫 Rate limit blocked request from IP: ${ip}`);
    
    // Return 429 Too Many Requests
    return new NextResponse(
      JSON.stringify({
        error: 'Too Many Requests',
        message: rateLimitResult.message,
        resetIn: `${rateLimitResult.resetIn} minutes`
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetIn.toString()
        }
      }
    );
  }
  
  const token = request.cookies.get('auth-token')?.value;

  // Public paths
  if (pathname === '/login') {
    // If has token, redirect to home (let API verify if valid)
    if (token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Protected paths - require authentication
  const protectedPaths = ['/', '/history', '/game', '/users'];
  const isProtected = protectedPaths.some(path => pathname.startsWith(path));

  if (isProtected) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  // Add rate limit headers to response
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', '100');
  response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

