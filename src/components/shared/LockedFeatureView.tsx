'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, Sparkles, ArrowRight, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface LockedFeatureViewProps {
  featureName: string;
  featureDescription?: string;
  planName?: string;
}

export default function LockedFeatureView({
  featureName,
  featureDescription,
  planName = 'STARTER'
}: LockedFeatureViewProps) {
  return (
    <div className="min-h-[65vh] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <Card className="max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-6 border-b border-slate-100 dark:border-slate-800 text-center relative">
          <div className="h-16 w-16 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-amber-500/30 shadow-inner">
            <Lock className="h-8 w-8" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 uppercase tracking-wider">
            <ShieldAlert className="h-3.5 w-3.5" /> Feature Locked
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-3">
            {featureName}
          </h2>
        </div>

        <CardContent className="p-6 sm:p-8 text-center space-y-5">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            {featureDescription || `${featureName} is not available on your current ${planName.toUpperCase()} plan.`}
          </p>

          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 text-left space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
              <Sparkles className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Unlock full access with an instant plan upgrade:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-slate-500">
              <li>Instant activation — no code changes or redeployment required</li>
              <li>Preserves all your existing restaurant data and settings</li>
              <li>Unlocks higher resource limits & AI quotas</li>
            </ul>
          </div>

          <div className="pt-2">
            <Link href="/dashboard/billing">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-600/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 text-sm cursor-pointer">
                <span>Upgrade Plan to Unlock</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
