'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, clearActiveUserCache } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import MockBanner from '@/components/shared/MockBanner';
import { Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight, Store, Headphones, ShieldCheck, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeLang, setActiveLang] = useState<string>('hi');
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [pendingUserRole, setPendingUserRole] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const reason = params.get('reason');
      if (reason === 'session_revoked') {
        setError('Your session was logged out from another device.');
      }
      const urlLang = params.get('lang');
      if (urlLang === 'en' || urlLang === 'hi') {
        setActiveLang(urlLang);
        localStorage.setItem('language', urlLang);
      } else {
        const stored = localStorage.getItem('language');
        if (stored === 'en' || stored === 'hi') {
          setActiveLang(stored);
        }
      }
    }
  }, []);


  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId || !mfaCode.trim()) return;
    setLoading(true);
    setError('');

    try {
      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId: mfaFactorId
      });
      if (challengeErr || !challengeData?.id) {
        throw new Error(challengeErr?.message || 'Failed to create MFA challenge');
      }

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challengeData.id,
        code: mfaCode.trim()
      });

      if (verifyErr) {
        throw new Error(verifyErr.message || 'Invalid 6-digit authenticator code. Please check your authenticator app.');
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('cleverops_auth_timestamp', String(Date.now()));
      }

      if (pendingUserRole === 'super_admin') {
        router.push('/super-admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please try again.');
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    clearActiveUserCache();

    let { data, error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    if (err || !data?.user) {
      const rawMsg = err?.message || (err as any)?.msg || (err as any)?.error_description || '';
      let displayMsg = 'Invalid email or password. Please check your credentials.';

      const lower = typeof rawMsg === 'string' ? rawMsg.toLowerCase() : '';
      if (
        lower.includes('invalid login credentials') ||
        lower.includes('invalid credentials') ||
        lower.includes('invalid_grant') ||
        lower.includes('wrong password')
      ) {
        displayMsg = activeLang === 'hi'
          ? 'गलत ईमेल या पासवर्ड। कृपया अपनी लॉगिन जानकारी की जांच करें। (Invalid email or password)'
          : 'Invalid email or password. Please check your credentials.';
      } else if (lower.includes('email not confirmed')) {
        displayMsg = activeLang === 'hi'
          ? 'कृपया पहले अपना ईमेल सत्यापित करें। (Email not verified)'
          : 'Please verify your email address before logging in.';
      } else if (rawMsg && rawMsg.trim() && rawMsg !== '{}') {
        displayMsg = rawMsg;
      }

      setError(displayMsg);
      setLoading(false);
      return;
    }

    const userId = data.user.id;

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    const userRole = profileData?.role || data.user.user_metadata?.role || 'owner';


    // Check if MFA (TOTP) is required
    try {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedTotp = factorsData?.totp?.find((f: any) => f.status === 'verified');

      if (verifiedTotp && (aalData?.currentLevel === 'aal1' || aalData?.nextLevel === 'aal2')) {
        setMfaFactorId(verifiedTotp.id);
        setPendingUserRole(userRole);
        setLoading(false);
        return;
      }
    } catch (mfaCheckErr) {
      console.warn('[Login MFA check notice]:', mfaCheckErr);
    }

    // Super Admin routing
    if (userRole === 'super_admin') {
      router.push('/super-admin');
      return;
    }

    // Staff Verification Guard: Ensure non-owner staff are verified before allowing login
    const isOwnerOrSuper = userRole === 'owner' || userRole === 'super_admin';
    if (!isOwnerOrSuper) {
      const isVerified = Boolean(
        data.user.email_confirmed_at ||
        data.user.user_metadata?.is_verified === true ||
        data.user.user_metadata?.verification_status === 'active' ||
        profileData?.is_verified === true ||
        profileData?.role === 'supervisor' ||
        profileData?.is_active === true
      );

      if (!isVerified) {
        await supabase.auth.signOut().catch(() => {});
        setError('Email / OTP verification required. Please verify the 8-digit OTP sent to your email before logging in.');
        setLoading(false);
        return;
      }
    }

    // Navigation to dashboard for verified users with role-aware default landing
    const redirectParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('redirect') : null;
    let targetUrl = redirectParam && redirectParam.startsWith('/dashboard') ? redirectParam : '/dashboard';
    if (targetUrl === '/dashboard') {
      if (userRole === 'kitchen') targetUrl = '/dashboard/kds';
      else if (userRole === 'waiter' || userRole === 'cashier' || userRole === 'supervisor') targetUrl = '/dashboard/orders';
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('cleverops_auth_timestamp', String(Date.now()));
    }
    router.push(targetUrl);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-slate-950 transition-colors duration-300">
      <MockBanner />

      {/* ========================================================================= */}
      {/* 1. MOBILE APP VIEW (md:hidden) — 100% IDENTICAL TO APP SCREENSHOT        */}
      {/* ========================================================================= */}
      <div className="md:hidden flex-1 flex flex-col justify-between py-6 px-4 max-w-sm mx-auto w-full">
        {/* Top Branding */}
        <div className="flex flex-col items-center mt-2">
          <img src="/logo.png" alt="CleverOps" className="h-16 w-16 object-contain" />
          <h1 className="text-2xl font-black text-[#0f172a] tracking-tight mt-3">CleverOps</h1>
          <p className="text-xs font-semibold text-[#64748b] tracking-normal mt-0.5">Smart Restaurant Operations</p>
        </div>

        {/* Main White Card Container */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 w-full mt-6">
          <h2 className="text-xl font-black text-[#0f172a] mb-5">Sign In</h2>

          
          {mfaFactorId ? (
            <form onSubmit={handleVerifyMfa} autoComplete="off" className="space-y-4">
              <div className="flex flex-col items-center text-center mb-4">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Two-Factor Authentication</h3>
                <p className="text-xs text-slate-500 mt-1">Enter the 6-digit code from Google Authenticator to verify your Super Admin access.</p>
              </div>

              <div>
                <label htmlFor="mobile-mfa" className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-center">
                  6-DIGIT AUTHENTICATOR CODE
                </label>
                <div className="relative flex items-center bg-[#f8fafc] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
                  <KeyRound className="w-5 h-5 text-slate-400 mr-2.5 flex-shrink-0" />
                  <input
                    id="mobile-mfa"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    value={mfaCode}
                    onChange={(e) => { setMfaCode(e.target.value.replace(/\D/g, '')); setError(''); }}
                    placeholder="123456"
                    className="w-full bg-transparent text-center tracking-widest text-lg font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              {error && (
                <div role="alert" className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-sm">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span className="flex-1 leading-relaxed">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || mfaCode.length < 6}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm cursor-pointer shadow-sm transition-all mt-4"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Verify Code & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setMfaFactorId(null); setMfaCode(''); setError(''); }}
                className="w-full text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 py-2 text-center transition-colors cursor-pointer"
              >
                ← Back to Login
              </button>
            </form>
          ) : (
          <form onSubmit={handleLogin} autoComplete="off" className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="mobile-email" className="block text-[11px] font-black text-[#1e293b] tracking-wider uppercase mb-1.5">
                EMAIL ADDRESS
              </label>
              <div className="relative flex items-center bg-[#f8fafc] border border-slate-200 rounded-xl px-3.5 py-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                <Mail className="w-5 h-5 text-slate-400 mr-2.5 flex-shrink-0" />
                <input
                  id="mobile-email"
                  type="email"
                  autoComplete="off"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="staff@restaurant.com"
                  className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="mobile-password" className="block text-[11px] font-black text-[#1e293b] tracking-wider uppercase">
                  PASSWORD
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative flex items-center bg-[#f8fafc] border border-slate-200 rounded-xl px-3.5 py-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                <Lock className="w-5 h-5 text-slate-400 mr-2.5 flex-shrink-0" />
                <input
                  id="mobile-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-medium pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 focus:outline-none p-1 cursor-pointer transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-slate-500" />
                  ) : (
                    <Eye className="w-5 h-5 text-slate-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-sm"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span className="flex-1 leading-relaxed">{error}</span>
              </div>
            )}

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#059669] hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-70 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all text-sm mt-5 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Create Restaurant Account Button */}
            <Link
              href={`/signup?lang=${activeLang}`}
              className="w-full bg-[#ecfdf5] hover:bg-emerald-100/70 border border-emerald-200/80 text-[#059669] font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all text-sm mt-3"
            >
              <Store className="w-4 h-4 text-[#059669]" />
              <span>Create Restaurant Account</span>
            </Link>
          </form>
          )}

          {/* Dedicated Support Contact Card */}
          <div className="bg-white rounded-2xl p-3.5 mt-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Headphones className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-extrabold text-[#0f172a] leading-tight truncate">CleverOps 24x7 Support</h3>
                <p className="text-[11px] font-medium text-slate-500 leading-tight truncate">Deepak Kumar Soni · Technical Help</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs font-bold text-slate-700">
              <a href="tel:8949266064" className="hover:text-blue-600 transition-colors flex items-center gap-1">
                📞 89492 66064
              </a>
              <a href="tel:7742054535" className="hover:text-emerald-600 transition-colors flex items-center gap-1">
                📞 77420 54535
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 mb-2 text-center text-xs font-medium text-slate-400">
          Powered by CleverOps · cleverops.in
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 2. DESKTOP WEB VIEW (hidden md:block) — UNTOUCHED FOR DESKTOP EXPERIENCE   */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-1 flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-2xl bg-white shadow-md border border-slate-200/80 flex items-center justify-center p-2">
              <img src="/logo.png" alt="CleverOps Logo" className="h-full w-full object-contain" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Sign in to CleverOps
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
            Or{' '}
            <Link href={`/signup?lang=${activeLang}`} className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
              create a new restaurant account
            </Link>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto w-full sm:max-w-md">
          <div className="bg-white dark:bg-slate-900 py-8 px-4 border border-slate-100 dark:border-slate-800 shadow-xl rounded-2xl sm:px-10">
            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 px-4 py-3 rounded-xl text-sm font-medium shadow-sm transition-all animate-fadeIn"
              >
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                <span className="flex-1 leading-relaxed">{error}</span>
              </div>
            )}

            
            {mfaFactorId ? (
              <form onSubmit={handleVerifyMfa} autoComplete="off" className="space-y-6">
                <div className="flex flex-col items-center text-center mb-4">
                  <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">Two-Factor Authentication</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Enter the 6-digit code from Google Authenticator to verify your Super Admin access.</p>
                </div>

                <div>
                  <label htmlFor="desktop-mfa" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 text-center">
                    6-DIGIT AUTHENTICATOR CODE
                  </label>
                  <div className="relative flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
                    <KeyRound className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
                    <input
                      id="desktop-mfa"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      required
                      value={mfaCode}
                      onChange={(e) => { setMfaCode(e.target.value.replace(/\D/g, '')); setError(''); }}
                      placeholder="123456"
                      className="w-full bg-transparent text-center tracking-widest text-xl font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full cursor-pointer font-bold bg-indigo-600 hover:bg-indigo-700" isLoading={loading} disabled={mfaCode.length < 6}>
                  Verify Code & Continue
                </Button>

                <button
                  type="button"
                  onClick={() => { setMfaFactorId(null); setMfaCode(''); setError(''); }}
                  className="w-full text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 py-2 text-center transition-colors cursor-pointer"
                >
                  ← Back to Login
                </button>
              </form>
            ) : (
            <form className="space-y-6" onSubmit={handleLogin} autoComplete="off">
              <Input
                label="Email address"
                type="email"
                name="email"
                id="email"
                autoComplete="off"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="you@example.com"
              />

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    id="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="••••••••"
                    className="block w-full px-3.5 py-2 pr-11 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    ) : (
                      <Eye className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full cursor-pointer font-bold" isLoading={loading}>
                Sign In
              </Button>
            </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
