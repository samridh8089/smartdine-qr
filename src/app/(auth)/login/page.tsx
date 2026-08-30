'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, clearActiveUserCache } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import MockBanner from '@/components/shared/MockBanner';
import { Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    console.log("handleLogin fired");
    setLoading(true);
    setError('');
    clearActiveUserCache();

    // Authentication happens via Supabase Auth only.

    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    if (err || !data.user) {
      setError(err?.message || 'Invalid email or password. Please check your credentials.');
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
        profileData?.is_verified === true
      );

      if (!isVerified) {
        await supabase.auth.signOut().catch(() => {});
        setError('Email / OTP verification required. Please verify the 8-digit OTP sent to your email before logging in.');
        setLoading(false);
        return;
      }
    }

    // Navigation to dashboard for verified users
    router.push('/dashboard');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <MockBanner />
      
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto w-full sm:max-w-md">
          <div className="flex justify-center">
            <img src="/logo.png" alt="CleverOps Logo" className="h-12 w-auto object-contain drop-shadow-md" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Sign in to CleverOps
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
            Or{' '}
            <Link href="/signup" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
              create a new restaurant account
            </Link>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto w-full sm:max-w-md">
          <div className="bg-white dark:bg-slate-900 py-8 px-4 border border-slate-100 dark:border-slate-800 shadow-xl rounded-2xl sm:px-10">
            {error && (
              <div className="mb-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900 text-rose-700 dark:text-rose-300 px-4 py-3 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleLogin} autoComplete="off">
              <Input
                label="Email address"
                type="email"
                name="email"
                id="email"
                autoComplete="off"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                <Input
                  type="password"
                  name="password"
                  id="password"
                  autoComplete="off"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <Button type="button" onClick={handleLogin} className="w-full cursor-pointer font-bold" isLoading={loading}>
                Sign In
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
