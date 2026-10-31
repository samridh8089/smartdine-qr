'use client';

import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Restaurant } from '@/lib/db';
import { Clock, AlertTriangle, ArrowRight, ShieldCheck, X } from 'lucide-react';

interface TrialCountdownBannerProps {
  restaurant: Restaurant;
  isOwner: boolean;
}

export default function TrialCountdownBanner({ restaurant, isOwner }: TrialCountdownBannerProps) {
  const router = useRouter();

  // 1. All useState hooks
  const [now, setNow] = useState<number>(Date.now());
  const [show24hModal, setShow24hModal] = useState<boolean>(false);
  const [showExpiredModal, setShowExpiredModal] = useState<boolean>(false);

  // 2. All useRef hooks
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const reminderTriggeredRef = useRef<{ [key: string]: boolean }>({});

  // 3. All useMemo hooks
  const trialInfo = useMemo(() => {
    if (!restaurant) return null;
    const planType = (restaurant.subscription_plan as string) || (restaurant as any).plan_type || (restaurant.settings as any)?.plan_type || 'starter';
    const isTrial = planType === 'trial_3_days' || planType === 'trial' || restaurant.subscription_status === 'trial';
    
    const expiryStr = (restaurant as any).plan_expires_at || (restaurant.settings as any)?.plan_expires_at || restaurant.trial_ends_at;
    if (!expiryStr) return null;

    const expiryTime = new Date(expiryStr).getTime();
    const diffMs = expiryTime - now;
    const isExpired = diffMs <= 0;
    const totalHoursLeft = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
    const daysLeft = Math.floor(totalHoursLeft / 24);
    const remainingHours = totalHoursLeft % 24;

    return {
      isTrial,
      expiryStr,
      expiryTime,
      diffMs,
      isExpired,
      totalHoursLeft,
      daysLeft,
      remainingHours,
      isUrgent: totalHoursLeft < 24 && !isExpired
    };
  }, [restaurant, now]);

  // 4. All useCallback hooks
  const triggerServerNotification = useCallback(async (type: '24h_reminder' | 'expiry_notice') => {
    if (!restaurant?.id || reminderTriggeredRef.current[type]) return;
    reminderTriggeredRef.current[type] = true;
    try {
      await fetch('/api/notifications/trial-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          notificationType: type,
          planExpiresAt: trialInfo?.expiryStr,
          ownerEmail: (restaurant.settings as any)?.owner_email,
          ownerPhone: restaurant.phone
        })
      });
    } catch (_) {}
  }, [restaurant?.id, (restaurant?.settings as any)?.owner_email, restaurant?.phone, trialInfo?.expiryStr]);

  // 5. All useEffect hooks
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setNow(Date.now());
    }, 30000); // 30s tick

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (!trialInfo || !trialInfo.isTrial || !isOwner) return;

    // Checkpoint 1: 24h before expiry
    if (trialInfo.totalHoursLeft <= 24 && !trialInfo.isExpired) {
      const dismissed24h = localStorage.getItem(`cleverops_dismiss_24h_${restaurant.id}`);
      if (!dismissed24h) {
        setShow24hModal(true);
      }
      triggerServerNotification('24h_reminder');
    }

    // Checkpoint 2: Expiry completed
    if (trialInfo.isExpired) {
      setShowExpiredModal(true);
      triggerServerNotification('expiry_notice');
    }
  }, [trialInfo, isOwner, restaurant.id, triggerServerNotification]);

  // If not trial or no info, render nothing
  if (!trialInfo || !trialInfo.isTrial || !isOwner) {
    return null;
  }

  const { isExpired, isUrgent, daysLeft, remainingHours, totalHoursLeft } = trialInfo;

  return (
    <>
      {/* ─── LIVE COUNTDOWN TOP BANNER ───────────────────────────────────── */}
      {!isExpired ? (
        <div
          className={`w-full px-4 py-2.5 transition-all text-xs font-semibold flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-xs border-b ${
            isUrgent
              ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white border-amber-700 animate-pulse'
              : 'bg-emerald-900 text-emerald-100 border-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2 text-center sm:text-left">
            {isUrgent ? (
              <AlertTriangle className="h-4 w-4 text-white shrink-0 animate-bounce" />
            ) : (
              <Clock className="h-4 w-4 text-emerald-300 shrink-0" />
            )}
            <span>
              {isUrgent ? (
                <>
                  <strong className="font-black text-amber-200">⚠️ Urgent:</strong> Aapka ₹3 Trial agle{' '}
                  <strong className="underline font-black">{totalHoursLeft} ghante</strong> me khatam hone wala hai! Apna restaurant bina ruke chalane ke liye abhi full plan chunein.
                </>
              ) : (
                <>
                  ⏳ <strong className="font-black text-white">3-Din Trial Active:</strong>{' '}
                  {daysLeft > 0 ? `${daysLeft} din ` : ''}
                  {remainingHours} ghante bache hain. Sabhi features 100% chalu hain.
                </>
              )}
            </span>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Link href="/dashboard/billing">
              <button
                type="button"
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs cursor-pointer shadow-xs transition-transform active:scale-95 flex items-center gap-1 ${
                  isUrgent
                    ? 'bg-white text-rose-700 hover:bg-slate-100'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
                }`}
              >
                <span>{isUrgent ? 'Abhi Upgrade Karein' : 'Plan Upgrade Karein'}</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="w-full bg-rose-950 border-b border-rose-900 text-white px-4 py-3 text-xs font-semibold flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>
              <strong className="font-black text-rose-300">🚨 Trial Samapt:</strong> Aapka 3-din ka trial pura ho gaya hai. Aapka sara data safe hai — billing aur orders chalu rakhne ke liye upgrade karein.
            </span>
          </div>
          <Link href="/dashboard/billing">
            <button
              type="button"
              className="bg-rose-500 hover:bg-rose-400 text-white font-black px-4 py-1.5 rounded-xl text-xs shadow-xs cursor-pointer flex items-center gap-1"
            >
              <span>Regular Plan Activate Karein</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </Link>
        </div>
      )}

      {/* ─── CHECKPOINT 1: 24-HOUR EXPIRY POPUP MODAL ────────────────────── */}
      {show24hModal && !isExpired && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => {
                setShow24hModal(false);
                localStorage.setItem(`cleverops_dismiss_24h_${restaurant.id}`, 'true');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 flex items-center justify-center">
              <Clock className="h-6 w-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                🔔 Reminder: 24 Ghante Bache Hain
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Aapka CleverOps 3-Din Trial agle 24 ghante me khatam ho jayega. Apne restaurant ke tables, orders aur billing ko bina kisi rukawat ke chalu rakhne ke liye abhi apna regular plan chunein.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-500 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                <ShieldCheck className="h-4 w-4" />
                <span>Aapka Sara Data 100% Safe Hai</span>
              </div>
              <p className="text-[11px]">Upgrade karne par aapka menu, inventory aur staff setup jaisa hai waisa hi chalu rahega.</p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShow24hModal(false);
                  localStorage.setItem(`cleverops_dismiss_24h_${restaurant.id}`, 'true');
                }}
                className="w-1/3 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                Baad Me
              </button>
              <Link href="/dashboard/billing" className="flex-1">
                <button
                  type="button"
                  onClick={() => setShow24hModal(false)}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Plan Upgrade Karein</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─── CHECKPOINT 2: TRIAL SAMAPT POPUP MODAL (EXPIRY) ─────────────── */}
      {showExpiredModal && isExpired && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border-2 border-rose-500/40 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl relative">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  🚨 Trial Samapt
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                  72 Hours Trial Period Completed
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Aapka 3-din ka ₹3 trial pura ho gaya hai. <strong>Aapka sara menu, inventory aur hisaab 100% safe hai</strong> — operations chalu rakhne ke liye apna regular plan activate karein.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <p className="text-slate-400 text-[10px] uppercase font-bold">Preserved</p>
                <p className="font-black text-slate-800 dark:text-slate-100">Menu & Recipes Safe ✓</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <p className="text-slate-400 text-[10px] uppercase font-bold">Preserved</p>
                <p className="font-black text-slate-800 dark:text-slate-100">Sales Reports Safe ✓</p>
              </div>
            </div>

            <div className="pt-2">
              <Link href="/dashboard/billing">
                <button
                  type="button"
                  onClick={() => setShowExpiredModal(false)}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black shadow-lg cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Regular Plan Activate Karein</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
