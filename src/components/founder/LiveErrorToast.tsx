'use client';

/**
 * Phase-28: Founder Control Center — Live Error Toast
 * Top-right animated alert toast with Investigate and Retry actions.
 * Strict React Hook Safety Guardrail compliant.
 */

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { AlertOctagon, RotateCw, Search, X, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { SystemErrorItem } from './types';

interface LiveErrorToastProps {
  error: SystemErrorItem | null;
  isRetrying?: boolean;
  isResolved?: boolean;
  theme?: 'dark' | 'light';
  onInvestigate: (error: SystemErrorItem) => void;
  onRetry: (error: SystemErrorItem) => void;
  onDismiss?: () => void;
}

export default function LiveErrorToast({
  error,
  isRetrying = false,
  isResolved = false,
  theme = 'dark',
  onInvestigate,
  onRetry,
  onDismiss,
}: LiveErrorToastProps) {
  // ── 1. useState ────────────────────────────────────────────────────────────
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  // ── 2. useRef ─────────────────────────────────────────────────────────────
  const toastRef = useRef<HTMLDivElement>(null);

  // ── 3. useMemo ────────────────────────────────────────────────────────────
  const isVisible = useMemo(() => {
    if (!error) return false;
    if (dismissedId === error.id && !isRetrying && !isResolved) return false;
    return true;
  }, [error, dismissedId, isRetrying, isResolved]);

  // ── 4. useCallback ────────────────────────────────────────────────────────
  const handleDismiss = useCallback(() => {
    if (error) setDismissedId(error.id);
    if (onDismiss) onDismiss();
  }, [error, onDismiss]);

  const handleInvestigateClick = useCallback(() => {
    if (error) onInvestigate(error);
  }, [error, onInvestigate]);

  const handleRetryClick = useCallback(() => {
    if (error) onRetry(error);
  }, [error, onRetry]);

  // ── 5. useEffect ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isResolved) {
      const timer = setTimeout(() => {
        if (error) setDismissedId(error.id);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isResolved, error]);

  // ── Conditional Return after all hooks ─────────────────────────────────────
  if (!isVisible || !error) return null;

  const isLight = theme === 'light';

  return (
    <div
      ref={toastRef}
      data-testid="live-error-toast"
      className={`fixed top-16 right-4 z-50 w-96 rounded-2xl shadow-2xl p-4 transition-all duration-300 animate-in slide-in-from-top-3 border select-none ${
        isResolved
          ? isLight
            ? 'bg-emerald-50/95 border-emerald-300 text-emerald-900 shadow-emerald-100'
            : 'bg-emerald-950/95 border-emerald-600/80 text-emerald-100 shadow-emerald-950/60'
          : isRetrying
          ? isLight
            ? 'bg-amber-50/95 border-amber-300 text-amber-900 shadow-amber-100'
            : 'bg-amber-950/95 border-amber-600/80 text-amber-100 shadow-amber-950/60'
          : isLight
          ? 'bg-white/98 border-rose-300 text-[#1E293B] shadow-rose-100/50'
          : 'bg-slate-900/98 border-rose-600/80 text-slate-100 shadow-rose-950/80'
      }`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2">
          {isResolved ? (
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          ) : isRetrying ? (
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-500 border border-amber-500/30 animate-spin">
              <RotateCw className="h-4 w-4" />
            </div>
          ) : (
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-500 border border-rose-500/30 animate-pulse">
              <AlertOctagon className="h-4 w-4" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold font-mono">
                {isResolved
                  ? `Kitchen Sync Restored — ${error.tableName}`
                  : isRetrying
                  ? `Retrying Sync — ${error.tableName}...`
                  : `Kitchen Sync Failed — ${error.tableName}`}
              </h4>
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase border ${
                isResolved
                  ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-600 border-rose-500/30'
              }`}>
                {isResolved ? 'Resolved' : error.severity}
              </span>
            </div>
            <p className={`text-[11px] font-mono mt-0.5 ${isLight ? 'text-[#64748B]' : 'text-slate-400'}`}>
              {isResolved
                ? 'Order preparing resumed on KDS Station #1'
                : `${error.cause} (${error.id})`}
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className={`p-1 rounded-md transition-colors ${
            isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Action Buttons */}
      {!isResolved && (
        <div className="mt-3 pt-2.5 border-t flex items-center justify-end gap-2 border-inherit/40 font-mono text-xs">
          <button
            data-testid="btn-toast-investigate"
            onClick={handleInvestigateClick}
            className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all text-[11px] cursor-pointer border ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-[#1E293B]'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
          >
            <Search className="h-3 w-3 text-sky-400" />
            <span>Investigate</span>
          </button>

          <button
            data-testid="btn-toast-retry"
            disabled={isRetrying}
            onClick={handleRetryClick}
            className="px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all text-[11px] cursor-pointer bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-900/30 disabled:opacity-50"
          >
            <RotateCw className={`h-3 w-3 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Retrying (800ms)...' : 'Retry Sync'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
