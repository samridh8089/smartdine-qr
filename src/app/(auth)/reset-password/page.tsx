'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import MockBanner from '@/components/shared/MockBanner';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function initRecoverySession() {
      try {
        if (typeof window !== 'undefined') {
          const searchParams = new URLSearchParams(window.location.search);
          const hashParams = window.location.hash ? new URLSearchParams(window.location.hash.substring(1)) : null;

          const errDesc = searchParams.get('error_description') || hashParams?.get('error_description');
          if (errDesc) {
            setError(decodeURIComponent(errDesc.replace(/\+/g, ' ')));
            return;
          }

          const code = searchParams.get('code');
          const tokenHash = searchParams.get('token_hash');
          const type = searchParams.get('type') as any;

          if (code) {
            const { error: codeErr } = await supabase.auth.exchangeCodeForSession(code);
            if (!codeErr) {
              console.log('[ResetPassword] Session established via PKCE code exchange.');
              return;
            }
          }

          if (tokenHash && type) {
            const { error: otpErr } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
            if (!otpErr) {
              console.log('[ResetPassword] Session established via OTP token verification.');
              return;
            }
          }

          if (hashParams) {
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');

            if (accessToken && refreshToken) {
              const { error: setErr } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });
              if (!setErr) {
                console.log('[ResetPassword] Session established via URL hash parameters.');
                return;
              }
            }
          }
        }

        await supabase.auth.getSession();
      } catch (err: any) {
        console.warn('[ResetPassword] Session init notice:', err);
      }
    }

    initRecoverySession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        console.log('[Auth] Password recovery session established.');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please check and try again.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });

      if (updateErr) {
        setError(updateErr.message || 'Failed to reset password. The link may have expired.');
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <MockBanner />
      
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto w-full sm:max-w-md">
          <div className="flex justify-center">
            <img src="/logo.png" alt="CleverOps Logo" className="h-12 w-auto object-contain drop-shadow-md" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
            Set New Password
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Enter your new account password below.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 border border-slate-100 shadow-xl rounded-2xl sm:px-10">
            {success ? (
              <div className="text-center py-4">
                <div className="flex justify-center mb-3">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Password Reset Complete</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Your password has been successfully updated. You can now sign in with your new password.
                </p>
                <div className="mt-6">
                  <Link href="/login">
                    <Button className="w-full">
                      Proceed to Login
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit} method="POST" autoComplete="off">
                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{error}</span>
                  </div>
                )}

                <Input
                  label="New Password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                />

                <Button type="submit" className="w-full" isLoading={loading}>
                  Update Password
                </Button>

                <div className="text-center text-xs">
                  <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-500 transition-colors">
                    Back to Sign In
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
