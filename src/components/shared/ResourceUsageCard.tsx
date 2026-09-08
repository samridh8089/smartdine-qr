'use client';

import React from 'react';
import { Lock, Sparkles, AlertCircle, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

interface ResourceUsageCardProps {
  title: string;
  used: number;
  limit: number | null; // null for unlimited, 0/number for fixed
  unitLabel?: string; // 'used' | 'credits used'
  isLocked?: boolean;
  lockedMessage?: string;
  resetNote?: string;
  icon?: React.ReactNode;
  upgradeHref?: string;
  compact?: boolean;
}

export default function ResourceUsageCard({
  title,
  used,
  limit,
  unitLabel = 'used',
  isLocked = false,
  lockedMessage = 'Upgrade to access feature',
  resetNote,
  icon,
  upgradeHref = '/dashboard/billing',
  compact = false
}: ResourceUsageCardProps) {
  if (isLocked) {
    return (
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {title}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 uppercase tracking-wider flex items-center gap-1">
            <Lock className="h-3 w-3" /> Locked
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3">
          {lockedMessage}
        </p>
        <Link href={upgradeHref} className="text-xs font-bold text-gray-900 hover:text-black dark:text-gray-100 flex items-center gap-1">
          Upgrade Plan <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  const isUnlimited = limit === null || limit === undefined;
  const remaining = isUnlimited ? null : Math.max(0, limit - used);
  const percentage = isUnlimited || limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));

  const isNearLimit = !isUnlimited && limit > 0 && percentage >= 85;
  const isAtLimit = !isUnlimited && limit > 0 && used >= limit;

  return (
    <div className={`p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between ${compact ? '' : 'space-y-3'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
          {title}
        </span>
        {isAtLimit ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-950 text-white dark:bg-white dark:text-gray-950 uppercase tracking-wider flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Limit Reached
          </span>
        ) : isNearLimit ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-700 uppercase tracking-wider">
            Near Limit
          </span>
        ) : null}
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-black text-slate-900 dark:text-white">
            {used} <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">/ {isUnlimited ? 'Unlimited' : limit} {unitLabel}</span>
          </span>
          <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300">
            {isUnlimited ? 'Unlimited' : `${remaining} remaining`}
          </span>
        </div>

        {!isUnlimited && (
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                isAtLimit ? 'bg-gray-950 dark:bg-white' : isNearLimit ? 'bg-gray-700 dark:bg-gray-300' : 'bg-gray-900 dark:bg-gray-100'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}
      </div>

      {resetNote && (
        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium block pt-1 border-t border-slate-100 dark:border-slate-800/60">
          {resetNote}
        </span>
      )}
    </div>
  );
}
