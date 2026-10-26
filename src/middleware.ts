import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Enhanced Production-Grade Next.js Middleware.
 * Features:
 * 1. Distributed Rate Limiting via Upstash Redis (@upstash/ratelimit) with fallback sliding window.
 * 2. Strict Authentication Verification: Requests are ONLY treated as authenticated after cryptographic/auth verification.
 * 3. Endpoint-specific Rate Limiting with per-IP and per-account/email tracking.
 * 4. Exponential Backoff on rate limit violations.
 * 5. HTTP 429 response with Retry-After and rate limit telemetry headers.
 * 6. Strict CORS Allowlist & Preflight OPTIONS handling.
 * 7. Production Security Headers (CSP, HSTS, X-Content-Type-Options, etc.).
 */

interface RateLimitState {
  count: number;
  firstSeen: number;
  resetTime: number;
  violations: number;
  blockedUntil: number;
}

const localRateLimitMap = new Map<string, RateLimitState>();

// Periodic cleanup of expired local rate limit records
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, state] of localRateLimitMap.entries()) {
      if (now > state.resetTime && now > state.blockedUntil) {
        localRateLimitMap.delete(key);
      }
    }
  }, 60000);
}

// Upstash Redis connection (initialized when credentials are provided)
const redisRestUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisRestToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const redisClient = (redisRestUrl && redisRestToken)
  ? new Redis({ url: redisRestUrl, token: redisRestToken })
  : null;

const upstashLimiters = new Map<string, Ratelimit>();

function getUpstashLimiter(limit: number, windowMs: number): Ratelimit | null {
  if (!redisClient) return null;
  const key = `${limit}:${windowMs}`;
  if (!upstashLimiters.has(key)) {
    const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
    upstashLimiters.set(
      key,
      new Ratelimit({
        redis: redisClient,
        limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
        analytics: false,
        prefix: 'smartdine_rl',
      })
    );
  }
  return upstashLimiters.get(key)!;
}

// Token verification cache with 60s TTL to prevent auth spamming
const tokenVerificationCache = new Map<string, { isValid: boolean; expiresAt: number }>();

async function verifyAuthToken(token: string): Promise<boolean> {
  if (!token || token.length < 20) return false;

  // 1. Service role key fast path
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey && serviceKey.length > 20 && token === serviceKey) {
    return true;
  }

  // 2. Cache lookup
  const now = Date.now();
  const cached = tokenVerificationCache.get(token);
  if (cached && cached.expiresAt > now) {
    return cached.isValid;
  }

  // 3. Cryptographic / API verification via Supabase Auth
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return false;
    }

    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${token}`
      }
    });

    const isValid = res.ok;
    tokenVerificationCache.set(token, {
      isValid,
      expiresAt: now + (isValid ? 60000 : 10000)
    });
    return isValid;
  } catch {
    return false;
  }
}

async function extractAndVerifySession(request: NextRequest): Promise<boolean> {
  // 1. Authorization header
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (await verifyAuthToken(token)) {
      return true;
    }
  }

  // 2. Cookie extraction
  const cookieHeader = request.headers.get('cookie') || '';
  const cookieMatches = cookieHeader.match(/(?:smartdine_auth_token_v2|sb-[^=]+-auth-token(?:\.\d+)?)=([^;]+)/g) || [];
  for (const m of cookieMatches) {
    const val = m.split('=')[1];
    if (!val) continue;
    try {
      const rawVal = decodeURIComponent(val);
      let candidateToken = '';
      if (rawVal.startsWith('base64-')) {
        const decoded = Buffer.from(rawVal.substring(7), 'base64').toString('utf8');
        const parsed = JSON.parse(decoded);
        candidateToken = Array.isArray(parsed) ? (parsed[0]?.access_token || parsed[0]) : (parsed?.access_token || parsed);
      } else {
        const parsed = JSON.parse(rawVal);
        candidateToken = Array.isArray(parsed) ? (parsed[0]?.access_token || parsed[0]) : (parsed?.access_token || parsed);
      }
      if (candidateToken && typeof candidateToken === 'string' && candidateToken.length > 20) {
        if (await verifyAuthToken(candidateToken)) {
          return true;
        }
      }
    } catch {
      if (val.length > 20) {
        if (await verifyAuthToken(decodeURIComponent(val))) {
          return true;
        }
      }
    }
  }

  return false;
}

function checkRateLimitLocal(
  key: string,
  maxLimit: number,
  windowMs: number,
  backoffBase: number,
  backoffMax: number
): { limited: boolean; retryAfterSeconds: number; remaining: number } {
  const now = Date.now();
  let state = localRateLimitMap.get(key);

  if (!state) {
    state = { count: 1, firstSeen: now, resetTime: now + windowMs, violations: 0, blockedUntil: 0 };
    localRateLimitMap.set(key, state);
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
    localRateLimitMap.set(key, state);
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
    localRateLimitMap.set(key, state);
    return { limited: true, retryAfterSeconds: backoffSeconds, remaining: 0 };
  }

  localRateLimitMap.set(key, state);
  return { limited: false, retryAfterSeconds: 0, remaining: Math.max(0, maxLimit - state.count) };
}

async function checkRateLimit(
  key: string,
  maxLimit: number,
  windowMs: number,
  backoffBase: number,
  backoffMax: number
): Promise<{ limited: boolean; retryAfterSeconds: number; remaining: number }> {
  const upstash = getUpstashLimiter(maxLimit, windowMs);
  if (upstash) {
    try {
      const result = await upstash.limit(key);
      if (!result.success) {
        const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
        return { limited: true, retryAfterSeconds, remaining: 0 };
      }
      return { limited: false, retryAfterSeconds: 0, remaining: result.remaining };
    } catch {
      // In case Upstash Redis encounters a transient error, safely fallback
    }
  }

  return checkRateLimitLocal(key, maxLimit, windowMs, backoffBase, backoffMax);
}

function getEnvNumber(key: string, defaultValue: number): number {
  const val = process.env[key];
  if (!val) return defaultValue;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) || parsed <= 0 ? defaultValue : parsed;
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

  let ipThreshold = getEnvNumber('RATE_LIMIT_PUBLIC_PER_IP', 60);
  let remaining = 999;

  // Rate limiting ONLY applies to API routes (/api/*).
  if (pathname.startsWith('/api/')) {
    const isStrictAuthApi = 
      pathname.startsWith('/api/auth/send-otp') ||
      pathname.startsWith('/api/auth/verify-otp') ||
      pathname.startsWith('/api/auth/check-email-availability') ||
      pathname.startsWith('/api/auth/change-owner-password') ||
      pathname.startsWith('/api/auth/onboarding-provision') ||
      pathname.startsWith('/api/staff/verify-otp') ||
      pathname.startsWith('/api/staff/reset-password') ||
      pathname.startsWith('/api/staff/create-invite') ||
      pathname.startsWith('/api/staff/resend-verification');

    const isPaymentApi = 
      pathname.startsWith('/api/payments/') ||
      pathname.startsWith('/api/razorpay/') ||
      pathname.startsWith('/api/webhooks/');

    const isAuthApi = isStrictAuthApi || pathname.startsWith('/api/auth/');

    // Cryptographically verified authentication check: NEVER trust unverified header or cookie
    const isAuthUser = await extractAndVerifySession(request);

    let accountThreshold = getEnvNumber('RATE_LIMIT_AUTH_PER_ACCOUNT', 5);

    if (isStrictAuthApi) {
      ipThreshold = getEnvNumber('RATE_LIMIT_LOGIN_PER_IP', 10);
      accountThreshold = getEnvNumber('RATE_LIMIT_LOGIN_PER_ACCOUNT', 5);
    } else if (isPaymentApi) {
      ipThreshold = getEnvNumber('RATE_LIMIT_PAYMENT_PER_IP', 30);
      accountThreshold = getEnvNumber('RATE_LIMIT_PAYMENT_PER_ACCOUNT', 15);
    } else if (isAuthUser || isLocalDev) {
      ipThreshold = isLocalDev ? 1000 : getEnvNumber('RATE_LIMIT_AUTHENTICATED_PER_IP', 300);
      accountThreshold = isLocalDev ? 1000 : 300;
    } else if (isAuthApi) {
      ipThreshold = getEnvNumber('RATE_LIMIT_AUTH_PER_IP', 20);
      accountThreshold = getEnvNumber('RATE_LIMIT_AUTH_PER_ACCOUNT', 10);
    }

    // Rate check by IP
    const ipKey = `ip:${ip}:${isStrictAuthApi ? 'strict_api' : isPaymentApi ? 'payment_api' : isAuthApi ? 'auth_api' : isAuthUser ? 'authed_api' : 'pub_api'}`;
    const ipRes = await checkRateLimit(ipKey, ipThreshold, windowMs, backoffBase, backoffMax);

    // Rate check by Account/Email if applicable
    let accountRes = { limited: false, retryAfterSeconds: 0, remaining: 999 };
    if (isAuthApi) {
      const accountId = await extractAccountIdentifier(request);
      if (accountId) {
        const accountKey = `acc:${accountId}:${pathname}`;
        accountRes = await checkRateLimit(accountKey, accountThreshold, windowMs, backoffBase, backoffMax);
      }
    }

    const isRateLimited = ipRes.limited || accountRes.limited;
    const retryAfterSeconds = Math.max(ipRes.retryAfterSeconds, accountRes.retryAfterSeconds);
    remaining = Math.min(ipRes.remaining, accountRes.remaining);

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

  const isProd = process.env.NODE_ENV === 'production';
  const scriptEval = isProd ? '' : "'unsafe-eval'";

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' ${scriptEval} https://checkout.razorpay.com https://cdn.razorpay.com https://cdn.jsdelivr.net https://*.supabase.co https://www.cleverops.in https://cleverops.in;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net;
    font-src 'self' https://fonts.gstatic.com data:;
    img-src 'self' data: blob: https:;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net https://checkout.razorpay.com https://cdn.razorpay.com https://api.razorpay.com https://lumberjack.razorpay.com https://lumberjack-cx.razorpay.com https://www.cleverops.in https://cleverops.in;
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
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(self), payment=(self "https://checkout.razorpay.com")');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  if (pathname.startsWith('/api/')) {
    response.headers.set('X-RateLimit-Limit', ipThreshold.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ]
};
