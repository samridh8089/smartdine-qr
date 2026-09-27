'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, clearActiveUserCache } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import MockBanner from '@/components/shared/MockBanner';
import { Lock, Mail, AlertCircle, Phone, MessageCircle, HelpCircle, ExternalLink, Headphones } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeLang, setActiveLang] = useState<string>('hi');
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const isInvalidCreds = err?.message?.toLowerCase().includes('invalid login credentials') || err?.message?.toLowerCase().includes('invalid email');
      const friendlyMsg = isInvalidCreds
        ? (activeLang === 'hi'
            ? 'Email ya Password galat hai. Kripya dobara check karein.'
            : 'Invalid email or password. Please check your credentials.')
        : (err?.message || 'Invalid email or password. Please check your credentials.');
      setError(friendlyMsg);
      setLoading(false);
      setTimeout(() => {
        const errEl = document.getElementById('login-bottom-error');
        if (errEl) errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
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

    // Navigation to dashboard for verified users with redirect preservation
    const redirectParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('redirect') : null;
    const targetUrl = redirectParam && redirectParam.startsWith('/dashboard') ? redirectParam : '/dashboard';
    router.push(targetUrl);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <MockBanner />
      
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
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
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  error={error ? ' ' : undefined}
                />
              </div>

              {error && (
                <div 
                  id="login-bottom-error"
                  className="bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-400 dark:border-rose-800 text-rose-800 dark:text-rose-200 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-md animate-bounce"
                >
                  <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                  <span className="flex-1 leading-snug">{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full cursor-pointer font-bold h-11 text-sm shadow-md" isLoading={loading}>
                Sign In
              </Button>
            </form>

            {/* Need Help / Support Section */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Facing issues logging in?</span>
              <button
                type="button"
                onClick={() => setSupportModalOpen(true)}
                className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:underline cursor-pointer"
              >
                <Headphones className="h-3.5 w-3.5" />
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Support & Help Dialog */}
      <Dialog
        isOpen={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
        title="CleverOps 24x7 Support & Help"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            Our technical support team is available 24x7 to assist you with login, onboarding, or account recovery.
          </p>

          <div className="space-y-2.5">
            {/* WhatsApp Support */}
            <a
              href="https://wa.me/918949266064?text=Hi%20CleverOps%20Support%2C%20I%20need%20help%20with%20logging%20in"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100/70 transition-colors group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-emerald-500 text-white shrink-0">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                  WhatsApp Support (Fastest)
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400">+91 89492 66064 • Immediate response</div>
              </div>
            </a>

            {/* Direct Phone Call */}
            <a
              href="tel:+918949266064"
              className="flex items-center gap-3 p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 hover:bg-sky-100/70 transition-colors group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-sky-500 text-white shrink-0">
                <Phone className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-sky-950 dark:text-sky-200">
                  Direct Phone Support
                </div>
                <div className="text-[11px] text-sky-700 dark:text-sky-400">+91 89492 66064 / +91 77420 54535</div>
              </div>
            </a>

            {/* Email Support */}
            <a
              href="mailto:support@cleverops.in?subject=Login%20Support%20Request"
              className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-slate-700 dark:bg-slate-600 text-white shrink-0">
                <Mail className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-200">
                  Email Desk
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">support@cleverops.in</div>
              </div>
            </a>
          </div>

          <div className="pt-2 flex justify-between items-center text-xs">
            <Link
              href="/contact"
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
              onClick={() => setSupportModalOpen(false)}
            >
              Visit Full Contact & SLA Center →
            </Link>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setSupportModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
