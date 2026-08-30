import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Enhanced Production-Grade Next.js Middleware.
 * Features:
 * 1. Endpoint-specific Rate Limiting with per-IP and per-account/email tracking.
 * 2. Exponential Backoff on rate limit violations (configurable limits & backoff via env vars).
 * 3. HTTP 429 response with Retry-After and rate limit telemetry headers.
 * 4. Strict CORS Allowlist & Preflight OPTIONS handling.
 * 5. Production Security Headers (CSP, HSTS, X-Content-Type-Options, etc.).
 */

interface RateLimitState {
  count: number;
  firstSeen: number;
  resetTime: number;
  violations: number;
  blockedUntil: number;
}

const rateLimitMap = new Map<string, RateLimitState>();

// Periodic cleanup of expired rate limit records
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, state] of rateLimitMap.entries()) {
      if (now > state.resetTime && now > state.blockedUntil) {
        rateLimitMap.delete(key);
      }
    }
  }, 60000);
}

const ALLOWED_ORIGINS = [
  'https://www.cleverops.in',
  'https://cleverops.in'
];

function getEnvNumber(key: string, defaultValue: number): number {
  const val = process.env[key];
  if (!val) return defaultValue;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) || parsed <= 0 ? defaultValue : parsed;
}

function checkRateLimit(
  key: string,
  maxLimit: number,
  windowMs: number,
  backoffBase: number,
  backoffMax: number
): { limited: boolean; retryAfterSeconds: number; remaining: number } {
  const now = Date.now();
  let state = rateLimitMap.get(key);

  if (!state) {
    state = { count: 1, firstSeen: now, resetTime: now + windowMs, violations: 0, blockedUntil: 0 };
    rateLimitMap.set(key, state);
    return { limited: false, retryAfterSeconds: 0, remaining: maxLimit - 1 };
  }

  if (now < state.blockedUntil) {
    const retryAfterSeconds = Math.ceil((state.blockedUntil - now) / 1000);
    return { limited: true, retryAfterSeconds, remaining: 0 };
  }

  if (now > state.resetTime) {
    state.count = 1;
    state.firstSeen = now;
    state.resetTime = now + windowMs;
    rateLimitMap.set(key, state);
    return { limited: false, retryAfterSeconds: 0, remaining: maxLimit - 1 };
  }

  state.count += 1;

  if (state.count > maxLimit) {
    state.violations += 1;
    const baseWindowSec = Math.max(1, Math.ceil(windowMs / 1000));
    const backoffSeconds = Math.min(
      backoffMax,
      Math.pow(backoffBase, state.violations) * baseWindowSec
    );
    state.blockedUntil = now + backoffSeconds * 1000;
    rateLimitMap.set(key, state);
    return { limited: true, retryAfterSeconds: backoffSeconds, remaining: 0 };
  }

  rateLimitMap.set(key, state);
  return { limited: false, retryAfterSeconds: 0, remaining: Math.max(0, maxLimit - state.count) };
}

async function extractAccountIdentifier(request: NextRequest): Promise<string | null> {
  try {
    const emailParam = request.nextUrl.searchParams.get('email') || 
                       request.nextUrl.searchParams.get('account') || 
                       request.nextUrl.searchParams.get('phone');
    if (emailParam) return emailParam.trim().toLowerCase();

    const emailHeader = request.headers.get('x-user-email') || request.headers.get('x-account-identifier');
    if (emailHeader) return emailHeader.trim().toLowerCase();

    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const clone = request.clone();
        const body = await clone.json().catch(() => null);
        if (body && typeof body === 'object') {
          const identifier = body.email || body.account || body.username || body.phone || body.identifier;
          if (typeof identifier === 'string' && identifier.trim()) {
            return identifier.trim().toLowerCase();
          }
        }
      }
    }
  } catch {
    // Ignore body parsing failures
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin') || '';

  // Strict CORS Origin Resolution: NEVER return '*'
  const isWhitelisted = origin === 'https://www.cleverops.in' || origin === 'https://cleverops.in';
  const isLocalDev = process.env.NODE_ENV !== 'production' && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'));
  const isVercelPreview = process.env.VERCEL_ENV === 'preview' && Boolean(process.env.VERCEL_URL) && origin === `https://${process.env.VERCEL_URL}`;

  // Only set corsOrigin if origin is explicitly allowed and non-wildcard
  const corsOrigin = (isWhitelisted || isLocalDev || isVercelPreview) && origin && origin !== '*' ? origin : null;

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


  // ─── 1. RATE LIMITING CONFIGURATION & ENFORCEMENT ──────────────────────────
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded ? forwarded.split(',')[0].trim() : realIp || '127.0.0.1';

  // Configurable thresholds via environment variables
  const windowMs = getEnvNumber('RATE_LIMIT_WINDOW_MS', 60000);
  const backoffBase = getEnvNumber('RATE_LIMIT_BACKOFF_BASE', 2);
  const backoffMax = getEnvNumber('RATE_LIMIT_BACKOFF_MAX', 3600);

  const isStrictLoginRoute = 
    pathname.startsWith('/api/auth/send-otp') ||
    pathname.startsWith('/api/auth/verify-otp') ||
    pathname.startsWith('/api/auth/change-owner-password') ||
    pathname.startsWith('/api/auth/onboarding-provision') ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password';

  const isAuthRoute = isStrictLoginRoute || pathname.startsWith('/api/auth') || pathname.startsWith('/auth');

  const isAuthUser = 
    request.headers.has('authorization') ||
    request.cookies.has('sb-access-token') ||
    request.cookies.has('supabase-auth-token') ||
    request.cookies.has('next-auth.session-token');

  let ipThreshold = getEnvNumber('RATE_LIMIT_PUBLIC_PER_IP', 60);
  let accountThreshold = getEnvNumber('RATE_LIMIT_AUTH_PER_ACCOUNT', 5);

  if (isStrictLoginRoute) {
    ipThreshold = getEnvNumber('RATE_LIMIT_LOGIN_PER_IP', 5);
    accountThreshold = getEnvNumber('RATE_LIMIT_LOGIN_PER_ACCOUNT', 3);
  } else if (isAuthRoute) {
    ipThreshold = getEnvNumber('RATE_LIMIT_AUTH_PER_IP', 10);
    accountThreshold = getEnvNumber('RATE_LIMIT_AUTH_PER_ACCOUNT', 5);
  } else if (isAuthUser) {
    ipThreshold = getEnvNumber('RATE_LIMIT_AUTHENTICATED_PER_IP', 120);
  }

  // Rate check by IP
  const ipKey = `ip:${ip}:${isStrictLoginRoute ? 'login' : isAuthRoute ? 'auth' : isAuthUser ? 'authed' : 'pub'}`;
  const ipRes = checkRateLimit(ipKey, ipThreshold, windowMs, backoffBase, backoffMax);

  // Rate check by Account/Email if applicable
  let accountRes = { limited: false, retryAfterSeconds: 0, remaining: 999 };
  if (isAuthRoute) {
    const accountId = await extractAccountIdentifier(request);
    if (accountId) {
      const accountKey = `acc:${accountId}:${pathname}`;
      accountRes = checkRateLimit(accountKey, accountThreshold, windowMs, backoffBase, backoffMax);
    }
  }

  const isRateLimited = ipRes.limited || accountRes.limited;
  const retryAfterSeconds = Math.max(ipRes.retryAfterSeconds, accountRes.retryAfterSeconds);
  const remaining = Math.min(ipRes.remaining, accountRes.remaining);

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
          'X-RateLimit-Limit': ipThreshold.toString(),
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

  if (pathname.startsWith('/api/')) {
    if (corsOrigin) {
      response.headers.set('Access-Control-Allow-Origin', corsOrigin);
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Idempotency-Key');
  }

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

  response.headers.set('X-RateLimit-Limit', ipThreshold.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ]
};

