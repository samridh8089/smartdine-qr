import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Lightweight, production-grade Next.js Middleware.
 * Features:
 * 1. Production Security Headers (CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-Frame-Options, HSTS).
 * 2. Strict CORS Allowlist & Preflight OPTIONS handling.
 * 3. Sliding Window API Throttling & Rate Limiting.
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Periodic cleanup of expired rate limit records to maintain minimal memory footprint
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000);

// Allowed origins for API Access
const ALLOWED_ORIGINS = [
  'https://www.cleverops.in',
  'https://cleverops.in'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin') || '';

  // Determine allowed origin for CORS. Only set Access-Control-Allow-Origin when origin is explicitly allowed.
  const isLocalDev = process.env.NODE_ENV !== 'production' && (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1'));
  const isWhitelisted = ALLOWED_ORIGINS.includes(origin);
  const isVercelPreview = process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL && origin === `https://${process.env.VERCEL_URL}`;
  const corsOrigin = isWhitelisted || isLocalDev || isVercelPreview ? origin : null;

  // Handle preflight OPTIONS requests for APIs
  if (request.method === 'OPTIONS') {
    const preflightResponse = new NextResponse(null, { status: 204 });
    if (corsOrigin) {
      preflightResponse.headers.set('Access-Control-Allow-Origin', corsOrigin);
    }
    preflightResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    preflightResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Idempotency-Key');
    preflightResponse.headers.set('Access-Control-Max-Age', '86400');
    return preflightResponse;
  }

  // ─── 1. RATE LIMITING ENGINE ───────────────────────────────────────────────
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded ? forwarded.split(',')[0].trim() : realIp || '127.0.0.1';

  let limit = 60; // Default: 60 requests per minute
  const windowMs = 60000;

  if (pathname.startsWith('/api/auth/send-otp') || pathname.startsWith('/api/auth/verify-otp')) {
    limit = 10;
  } else if (pathname.startsWith('/api/staff/punch-order') || pathname.startsWith('/api/staff/update-order-status')) {
    limit = 60;
  } else if (pathname.startsWith('/api/payments') || pathname.startsWith('/api/razorpay') || pathname.startsWith('/api/ai-menu')) {
    limit = 30;
  }

  const rateKey = `${ip}:${pathname.startsWith('/api/staff') ? 'staff' : pathname.startsWith('/api/auth') ? 'auth' : 'public'}`;
  const now = Date.now();
  const currentRecord = rateLimitMap.get(rateKey);

  let isRateLimited = false;
  let retryAfterSeconds = 0;

  if (!currentRecord || now > currentRecord.resetTime) {
    rateLimitMap.set(rateKey, { count: 1, resetTime: now + windowMs });
  } else if (currentRecord.count >= limit) {
    isRateLimited = true;
    retryAfterSeconds = Math.ceil((currentRecord.resetTime - now) / 1000);
  } else {
    currentRecord.count += 1;
    rateLimitMap.set(rateKey, currentRecord);
  }

  if (isRateLimited) {
    const rateLimitResponse = NextResponse.json(
      {
        error: 'Too many requests. Please slow down and try again later.',
        retryAfterSeconds
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfterSeconds.toString(),
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'Content-Type': 'application/json'
        }
      }
    );
    if (corsOrigin) {
      rateLimitResponse.headers.set('Access-Control-Allow-Origin', corsOrigin);
    }
    return rateLimitResponse;
  }

  // ─── 2. ATTACH PRODUCTION SECURITY & CORS HEADERS ─────────────────────────
  const response = NextResponse.next();

  // CORS Headers
  if (pathname.startsWith('/api/')) {
    if (corsOrigin) {
      response.headers.set('Access-Control-Allow-Origin', corsOrigin);
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Idempotency-Key');
  }

  // Content Security Policy (CSP)
  const cspHeader = `
    default-src 'self';
    script-src 'self' https://checkout.razorpay.com https://*.supabase.co https://www.cleverops.in;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com data:;
    img-src 'self' data: blob: https:;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co https://checkout.razorpay.com https://api.razorpay.com https://lumberjack-cx.razorpay.com https://www.cleverops.in;
    frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'self';
  `.replace(/\s{2,}/g, ' ').trim();

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com")');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Rate limit telemetry headers
  const finalRecord = rateLimitMap.get(rateKey);
  const remaining = finalRecord ? Math.max(0, limit - finalRecord.count) : limit - 1;
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ]
};
