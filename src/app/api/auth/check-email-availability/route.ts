import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

let _adminClient: SupabaseClient | null = null;
function getAdmin(): SupabaseClient {
  if (!_adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is required');
    }
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!key) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is required');
    }
    _adminClient = createClient(url, key);
  }
  return _adminClient;
}

// Dual rate limit maps: 10 requests per IP per minute, 5 requests per email per minute
const checkEmailIpRateLimits = new Map<string, { count: number; resetAt: number }>();
const checkEmailTargetRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(map: Map<string, { count: number; resetAt: number }>, key: string, maxLimit: number): boolean {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry || now > entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + 60000 });
    return false;
  }
  entry.count += 1;
  return entry.count > maxLimit;
}

export async function POST(req: Request) {
  try {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

    // 1. IP-level rate limiting
    if (checkRateLimit(checkEmailIpRateLimits, ip, 10)) {
      return NextResponse.json({
        error: 'Too many requests from this IP. Please wait a minute and try again.',
        available: false
      }, { status: 429 });
    }

    const { email } = await req.json();

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Email or username is required' }, { status: 400 });
    }

    const cleanInput = email.trim().toLowerCase();

    // 2. Email-level rate limiting (anti-enumeration & anti-spraying)
    if (checkRateLimit(checkEmailTargetRateLimits, cleanInput, 5)) {
      return NextResponse.json({
        error: 'Too many lookup requests for this email. Please wait a minute and try again.',
        available: false
      }, { status: 429 });
    }

    const supabaseAdmin = getAdmin();

    // Look up directly in profiles table by email or username (indexed lookup, never listUsers)
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .or(`email.ilike.${cleanInput},id.eq.${cleanInput}`)
      .limit(1)
      .maybeSingle();

    // Generic response: Never disclose internal account metadata or tenant boundaries
    return NextResponse.json({
      available: !existingProfile,
      checked: true
    });
  } catch (err: any) {
    console.error('[Check Email Availability Error]', err?.message || err);
    return NextResponse.json({
      error: 'Unable to check availability at this time',
      available: false
    }, { status: 500 });
  }
}
