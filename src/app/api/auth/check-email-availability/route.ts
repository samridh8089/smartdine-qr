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

// In-route rate limit map: 10 requests per IP per minute
const checkEmailRateLimits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = checkEmailRateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    checkEmailRateLimits.set(ip, { count: 1, resetAt: now + 60000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 10;
}

export async function POST(req: Request) {
  try {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

    if (isRateLimited(ip)) {
      return NextResponse.json({
        error: 'Too many requests. Please wait a minute and try again.',
        available: false
      }, { status: 429 });
    }

    const { email } = await req.json();

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Email or username is required' }, { status: 400 });
    }

    const cleanInput = email.trim().toLowerCase();
    const supabaseAdmin = getAdmin();

    // Look up directly in profiles table by email or username (indexed lookup, never listUsers)
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .or(`email.ilike.${cleanInput},id.eq.${cleanInput}`)
      .maybeSingle();

    if (existingProfile) {
      // Generic response: Never leak tenant, restaurant name, or internal user details
      return NextResponse.json({
        available: false,
        exists: true,
        message: 'This email is already registered. Please log in or use another email.'
      }, { status: 200 });
    }

    return NextResponse.json({ available: true, exists: false });
  } catch (err: any) {
    console.error('[Check Email Availability Error]:', err?.message);
    return NextResponse.json({ error: 'Failed to validate email availability' }, { status: 500 });
  }
}
