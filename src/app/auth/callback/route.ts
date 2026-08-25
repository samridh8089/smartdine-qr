import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as any;
  const next = searchParams.get('next') || '/reset-password';

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  });

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.session) {
      const redirectUrl = `${origin}${next}#access_token=${data.session.access_token}&refresh_token=${data.session.refresh_token}&type=recovery`;
      return NextResponse.redirect(redirectUrl);
    }
    console.error('[Auth Callback] exchangeCodeForSession error:', error?.message);
  }

  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error && data?.session) {
      const redirectUrl = `${origin}${next}#access_token=${data.session.access_token}&refresh_token=${data.session.refresh_token}&type=recovery`;
      return NextResponse.redirect(redirectUrl);
    }
    if (error) {
      console.error('[Auth Callback] verifyOtp error:', error.message);
      return NextResponse.redirect(`${origin}${next}?error_description=${encodeURIComponent(error.message)}`);
    }
  }

  // Fallback: redirect to target next route anyway so client JS can attempt session resolution
  return NextResponse.redirect(`${origin}${next}`);
}
