'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import MockBanner from '@/components/shared/MockBanner';
import { UtensilsCrossed, Sparkles } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRestaurantNameChange = (val: string) => {
    setRestaurantName(val);
    // Simple slugification: lowercase, spaces to dashes, remove special chars
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    setSlug(autoSlug);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          fullName,
          restaurantName,
          slug
        }
      }
    });

    if (err) {
      setError(err.message || 'Failed to create account');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <MockBanner />
      
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
              <UtensilsCrossed className="h-6 w-6" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
            Start your free 14-day trial
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Or{' '}
            <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-500 transition-colors">
              sign in to your existing account
            </Link>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 border border-slate-100 shadow-xl rounded-2xl sm:px-10">
            {error && (
              <div className="mb-4 bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSignup}>
              <Input
                label="Full Name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
              />

              <Input
                label="Email address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />

              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />

              <Input
                label="Restaurant Name"
                type="text"
                required
                value={restaurantName}
                onChange={(e) => handleRestaurantNameChange(e.target.value)}
                placeholder="The Bistro Cafe"
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Menu URL Slug
                </label>
                <div className="flex rounded-lg border border-slate-200 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 overflow-hidden bg-slate-50">
                  <span className="inline-flex items-center px-3 text-slate-400 text-xs md:text-sm select-none border-r border-slate-200">
                    smartdine.com/menu/
                  </span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    className="block flex-1 min-w-0 px-3 py-2 text-sm bg-white text-slate-900 border-none outline-none"
                    placeholder="bistro-cafe"
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-emerald-500" />
                  This is the URL your customers will scan to access the digital menu.
                </p>
              </div>

              <Button type="submit" className="w-full" isLoading={loading}>
                Create Restaurant Account
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
