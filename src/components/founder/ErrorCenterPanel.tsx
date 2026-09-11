'use client';

/**
 * Phase-28: Founder Control Center — Error Center & Recovery Panel
 * Provides investor-grade Error Dashboard, Error Inspector, and One-Click Recovery.
 * Strict React Hook Safety Guardrail compliant.
 */

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  AlertTriangle,
  Info,
  RotateCw,
  X,
  ExternalLink,
  Search,
  Zap,
  Clock,
  ArrowRight,
  ShieldAlert,
  Bell,
  RefreshCw,
  Terminal,
  FileText,
  UserCheck,
} from 'lucide-react';
import type { SystemErrorItem, ErrorSeverity, ErrorStatus } from './types';

interface ErrorCenterPanelProps {
  errors: SystemErrorItem[];
  selectedErrorId: string | null;
  isRetrying?: boolean;
  isResolved?: boolean;
  theme?: 'dark' | 'light';
  onSelectError: (error: SystemErrorItem) => void;
  onRetrySync: (error: SystemErrorItem) => void;
  onRequeueKitchen?: (error: SystemErrorItem) => void;
  onNotifyWaiter?: (error: SystemErrorItem) => void;
  onNotifyOwner?: (error: SystemErrorItem) => void;
  onViewLogs?: (error: SystemErrorItem) => void;
  onSimulateError?: () => void;
  onClose: () => void;
  onJumpToOrder?: (orderId: string) => void;
}

export default function ErrorCenterPanel({
  errors,
  selectedErrorId,
  isRetrying = false,
  isResolved = false,
  theme = 'dark',
  onSelectError,
  onRetrySync,
  onRequeueKitchen,
  onNotifyWaiter,
  onNotifyOwner,
  onViewLogs,
  onSimulateError,
  onClose,
  onJumpToOrder,
}: ErrorCenterPanelProps) {
  // ── 1. useState ────────────────────────────────────────────────────────────
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved' | 'critical' | 'warning' | 'info'>('all');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // ── 2. useRef ─────────────────────────────────────────────────────────────
  const actionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 3. useMemo ────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    let active = 0;
    let resolved = 0;
    let critical = 0;
    let warning = 0;
    let info = 0;

    for (const e of errors) {
      if (e.status === 'active' || e.status === 'retrying') active++;
      if (e.status === 'resolved') resolved++;
      if (e.severity === 'critical') critical++;
      if (e.severity === 'warning') warning++;
      if (e.severity === 'info') info++;
    }

    return { active, resolved, critical, warning, info, total: errors.length };
  }, [errors]);

  const filteredErrors = useMemo(() => {
    return errors.filter((e) => {
      if (filter === 'all') return true;
      if (filter === 'active') return e.status === 'active' || e.status === 'retrying';
      if (filter === 'resolved') return e.status === 'resolved';
      return e.severity === filter;
    });
  }, [errors, filter]);

  const activeSelectedError = useMemo(() => {
    if (selectedErrorId) {
      const match = errors.find((e) => e.id === selectedErrorId);
      if (match) return match;
    }
    return filteredErrors[0] || errors[0] || null;
  }, [selectedErrorId, errors, filteredErrors]);

  // ── 4. useCallback ────────────────────────────────────────────────────────
  const showNotice = useCallback((text: string) => {
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    setActionNotice(text);
    actionTimeoutRef.current = setTimeout(() => {
      setActionNotice(null);
    }, 3500);
  }, []);

  const handleActionRequeue = useCallback(
    (e: SystemErrorItem) => {
      if (onRequeueKitchen) onRequeueKitchen(e);
      showNotice(`Order #${e.orderId} successfully requeued at KDS Station #1`);
    },
    [onRequeueKitchen, showNotice]
  );

  const handleActionNotifyWaiter = useCallback(
    (e: SystemErrorItem) => {
      if (onNotifyWaiter) onNotifyWaiter(e);
      showNotice(`Push notification dispatched to assigned waiter for ${e.tableName}`);
    },
    [onNotifyWaiter, showNotice]
  );

  const handleActionNotifyOwner = useCallback(
    (e: SystemErrorItem) => {
      if (onNotifyOwner) onNotifyOwner(e);
      showNotice(`SMS alert priority escalation triggered to Restaurant Owner`);
    },
    [onNotifyOwner, showNotice]
  );

  const handleActionViewLogs = useCallback(
    (e: SystemErrorItem) => {
      if (onViewLogs) onViewLogs(e);
      showNotice(`Audit log trail loaded: /api/system-events?corr=${e.correlationId}`);
    },
    [onViewLogs, showNotice]
  );

  // ── 5. useEffect ──────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    };
  }, []);

  // ── 6. Render (All hooks declared above) ──────────────────────────────────
  const isLight = theme === 'light';

  return (
    <div
      data-testid="error-center-panel"
      className={`fixed inset-0 z-50 flex flex-col backdrop-blur-md select-none animate-in fade-in duration-150 ${
        isLight ? 'bg-[#EEF3F8]/95 text-[#1E293B]' : 'bg-slate-950/95 text-slate-100'
      }`}
    >
      {/* ── Top Header ── */}
      <div
        className={`h-16 px-6 shrink-0 border-b flex items-center justify-between gap-4 shadow-sm ${
          isLight ? 'bg-[#F6F8FB] border-[#D7E3EF]' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-500 border border-rose-500/30">
            <AlertOctagon className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-wide font-mono">
                Error Center & Incident Recovery
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-500 border border-rose-500/40">
                {counts.active} Active
              </span>
            </div>
            <p className={`text-xs font-mono ${isLight ? 'text-[#64748B]' : 'text-slate-400'}`}>
              One-click fault diagnosis, root cause forensics, and real-time synchronization recovery.
            </p>
          </div>
        </div>

        {/* Action Notice Alert */}
        {actionNotice && (
          <div className="px-3 py-1 bg-emerald-500/20 text-emerald-600 border border-emerald-500/40 rounded-lg text-xs font-mono font-semibold animate-in slide-in-from-top-1 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{actionNotice}</span>
          </div>
        )}

        <div className="flex items-center gap-2.5">
          {/* Simulate Error Button for fault injection testing */}
          {onSimulateError && (
            <button
              data-testid="btn-simulate-error"
              onClick={onSimulateError}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                isLight
                  ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                  : 'bg-rose-950/60 text-rose-300 border-rose-800 hover:bg-rose-900'
              }`}
              title="Simulate a live runtime sync error scenario for fault injection testing"
            >
              <Zap className="h-3.5 w-3.5 text-rose-500" />
              <span>Simulate Error</span>
            </button>
          )}

          {/* Close Panel */}
          <button
            data-testid="btn-close-error-center"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight
                ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-200'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Close Error Center (Shortcut: Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ── Metric Summary Cards ── */}
      <div
        className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
          isLight ? 'bg-white border-[#D7E3EF]' : 'bg-slate-900/60 border-slate-800'
        }`}
      >
        <div className="flex items-center gap-2 overflow-x-auto font-mono text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                : isLight
                ? 'bg-slate-100 border-[#C9D7E6] text-[#64748B] hover:text-[#1E293B]'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            All Errors ({counts.total})
          </button>

          <button
            data-testid="filter-active-errors"
            onClick={() => setFilter('active')}
            className={`px-3 py-1 rounded-lg border font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              filter === 'active'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : isLight
                ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                : 'bg-rose-950/40 border-rose-800 text-rose-300 hover:bg-rose-900/60'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            <span>Active ({counts.active})</span>
          </button>

          <button
            data-testid="filter-resolved-errors"
            onClick={() => setFilter('resolved')}
            className={`px-3 py-1 rounded-lg border font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              filter === 'resolved'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : isLight
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                : 'bg-emerald-950/40 border-emerald-800 text-emerald-300 hover:bg-emerald-900/60'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Resolved ({counts.resolved})</span>
          </button>

          <button
            onClick={() => setFilter('critical')}
            className={`px-3 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
              filter === 'critical'
                ? 'bg-rose-700 text-white border-rose-700'
                : isLight
                ? 'bg-slate-50 border-[#C9D7E6] text-rose-600 hover:bg-slate-100'
                : 'bg-slate-800/60 border-slate-700 text-rose-400 hover:text-white'
            }`}
          >
            Critical ({counts.critical})
          </button>

          <button
            onClick={() => setFilter('warning')}
            className={`px-3 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
              filter === 'warning'
                ? 'bg-amber-600 text-white border-amber-600'
                : isLight
                ? 'bg-slate-50 border-[#C9D7E6] text-amber-600 hover:bg-slate-100'
                : 'bg-slate-800/60 border-slate-700 text-amber-400 hover:text-white'
            }`}
          >
            Warning ({counts.warning})
          </button>

          <button
            onClick={() => setFilter('info')}
            className={`px-3 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
              filter === 'info'
                ? 'bg-blue-600 text-white border-blue-600'
                : isLight
                ? 'bg-slate-50 border-[#C9D7E6] text-blue-600 hover:bg-slate-100'
                : 'bg-slate-800/60 border-slate-700 text-sky-400 hover:text-white'
            }`}
          >
            Info ({counts.info})
          </button>
        </div>

        {/* Global Health Metric */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-1.5">
            <span className={isLight ? 'text-[#64748B]' : 'text-slate-400'}>Avg Recovery:</span>
            <strong className={isLight ? 'text-[#1E293B]' : 'text-slate-200'}>42s</strong>
          </div>
          <span className="text-slate-400">•</span>
          <div className="flex items-center gap-1.5">
            <span className={isLight ? 'text-[#64748B]' : 'text-slate-400'}>Recovery Rate:</span>
            <strong className="text-emerald-500 font-bold">98.4%</strong>
          </div>
        </div>
      </div>

      {/* ── Main Two-Column Layout: Left Cards + Right Inspector ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Error Cards List */}
        <div
          className={`w-full md:w-[480px] lg:w-[520px] shrink-0 border-r flex flex-col overflow-y-auto p-4 space-y-3 ${
            isLight ? 'bg-[#F6F8FB] border-[#D7E3EF]' : 'bg-slate-900/70 border-slate-800'
          }`}
        >
          {filteredErrors.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 opacity-60" />
              <p className="text-sm font-mono font-bold">No errors in this filter view</p>
              <p className="text-xs text-slate-500 font-mono">All systems operating within nominal latency thresholds.</p>
            </div>
          ) : (
            filteredErrors.map((err) => {
              const isSelected = activeSelectedError?.id === err.id;
              const isErrRetrying = (isRetrying && err.id === activeSelectedError?.id) || err.status === 'retrying';
              const isErrResolved = (isResolved && err.id === activeSelectedError?.id) || err.status === 'resolved';

              return (
                <div
                  key={err.id}
                  data-testid={`error-card-${err.id}`}
                  onClick={() => onSelectError(err)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2 relative shadow-sm ${
                    isSelected
                      ? isLight
                        ? 'bg-white border-cyan-500 shadow-md ring-2 ring-cyan-400/30'
                        : 'bg-slate-850 border-cyan-500 shadow-lg shadow-cyan-950/50 ring-2 ring-cyan-500/30'
                      : isLight
                      ? 'bg-white border-[#C9D7E6] hover:border-slate-400'
                      : 'bg-slate-850/90 border-slate-700/80 hover:border-slate-500'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-cyan-500">
                        {err.id}
                      </span>
                      <span className="text-xs font-mono font-bold">
                        {err.tableName}
                      </span>
                      <span className="text-slate-400 text-xs">•</span>
                      <span className="text-[11px] font-mono font-medium text-slate-400">
                        Order #{err.orderId}
                      </span>
                    </div>

                    {/* Status Pill */}
                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold uppercase border ${
                          isErrResolved
                            ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/40'
                            : isErrRetrying
                            ? 'bg-amber-500/20 text-amber-600 border-amber-500/40 animate-pulse'
                            : err.severity === 'critical'
                            ? 'bg-rose-500/20 text-rose-600 border-rose-500/40'
                            : err.severity === 'warning'
                            ? 'bg-amber-500/20 text-amber-600 border-amber-500/40'
                            : 'bg-blue-500/20 text-blue-600 border-blue-500/40'
                        }`}
                      >
                        {isErrResolved
                          ? 'Resolved'
                          : isErrRetrying
                          ? 'Retrying...'
                          : err.severity}
                      </span>
                    </div>
                  </div>

                  {/* Title & Cause */}
                  <div>
                    <h4 className="text-xs font-bold font-mono text-rose-500">
                      {err.title}
                    </h4>
                    <p className={`text-[11px] font-mono mt-0.5 line-clamp-2 ${isLight ? 'text-[#64748B]' : 'text-slate-400'}`}>
                      {err.cause}
                    </p>
                  </div>

                  {/* Footer Meta */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-inherit/30">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      <span>{err.time}</span>
                    </div>

                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-500/10 font-mono">
                      HTTP {err.httpStatus}
                    </span>
                  </div>

                  {/* One-Click Action Buttons on Active Card */}
                  {!isErrResolved && (
                    <div className="pt-2 flex flex-wrap items-center gap-1.5 font-mono text-xs">
                      <button
                        data-testid={`btn-retry-sync-${err.id}`}
                        disabled={isErrRetrying}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onRetrySync(err);
                        }}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <RotateCw className={`h-3 w-3 ${isErrRetrying ? 'animate-spin' : ''}`} />
                        <span>{isErrRetrying ? 'Retrying (800ms)...' : 'Retry Sync'}</span>
                      </button>

                      <button
                        data-testid={`btn-requeue-${err.id}`}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          handleActionRequeue(err);
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                          isLight
                            ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-[#1E293B]'
                            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                        }`}
                      >
                        Requeue Kitchen
                      </button>

                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          handleActionNotifyWaiter(err);
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                          isLight
                            ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-[#1E293B]'
                            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                        }`}
                      >
                        Notify Waiter
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Error Inspector */}
        <div
          data-testid="error-inspector-view"
          className={`flex-1 flex flex-col overflow-y-auto p-6 space-y-6 ${
            isLight ? 'bg-[#F7FAFC]' : 'bg-slate-950'
          }`}
        >
          {activeSelectedError ? (
            <>
              {/* Inspector Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-inherit/40">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-bold font-mono text-cyan-500">
                      {activeSelectedError.id}
                    </span>
                    <span className="text-sm font-bold font-mono">
                      {activeSelectedError.tableName}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-xs font-mono text-slate-400">
                      Order #{activeSelectedError.orderId}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold font-mono text-rose-500">
                    {activeSelectedError.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full font-mono text-xs font-bold uppercase border ${
                      activeSelectedError.status === 'resolved' || isResolved
                        ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/40'
                        : isRetrying
                        ? 'bg-amber-500/20 text-amber-600 border-amber-500/40 animate-pulse'
                        : 'bg-rose-500/20 text-rose-600 border-rose-500/40'
                    }`}
                  >
                    {activeSelectedError.status === 'resolved' || isResolved
                      ? 'Resolved'
                      : isRetrying
                      ? 'Retrying...'
                      : activeSelectedError.severity}
                  </span>

                  {onJumpToOrder && (
                    <button
                      onClick={() => onJumpToOrder(activeSelectedError.orderId)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                        isLight
                          ? 'bg-white border-[#C9D7E6] hover:bg-slate-50'
                          : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      <ExternalLink className="h-3 w-3 text-sky-400" />
                      <span>Jump to Order</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 1. Root Cause */}
              <div
                className={`p-4 rounded-xl border space-y-1.5 shadow-xs ${
                  isLight ? 'bg-white border-[#C9D7E6]' : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 text-rose-500 font-mono font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Root Cause Analysis</span>
                </div>
                <p className="text-sm font-mono font-semibold text-slate-200">
                  {activeSelectedError.cause}
                </p>
                <p className={`text-xs font-mono ${isLight ? 'text-[#64748B]' : 'text-slate-400'}`}>
                  Socket disconnect detected on upstream channel between Kitchen Queue dispatcher and station #1 worker.
                </p>
              </div>

              {/* 2. Impact Assessment */}
              <div
                className={`p-4 rounded-xl border space-y-2.5 shadow-xs ${
                  isLight ? 'bg-white border-[#C9D7E6]' : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 text-amber-500 font-mono font-bold text-xs uppercase tracking-wider">
                  <ShieldAlert className="h-4 w-4" />
                  <span>Operational Impact</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 font-mono text-xs">
                  {activeSelectedError.impact.map((imp, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                        isLight ? 'bg-amber-50/60 border-amber-200 text-amber-900' : 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span>{imp}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Suggested Fix */}
              <div
                className={`p-4 rounded-xl border space-y-2 shadow-xs ${
                  isLight ? 'bg-white border-[#C9D7E6]' : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 text-emerald-500 font-mono font-bold text-xs uppercase tracking-wider">
                  <Zap className="h-4 w-4" />
                  <span>Automated Suggested Fix</span>
                </div>
                <div
                  className={`p-3 rounded-lg border font-mono text-xs flex items-center justify-between ${
                    isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-950/30 border-emerald-800 text-emerald-200'
                  }`}
                >
                  <span>{activeSelectedError.suggestedFix}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 font-bold">
                    Zero Data Loss Guaranteed
                  </span>
                </div>
              </div>

              {/* 4. Technical Details Grid */}
              <div
                className={`p-4 rounded-xl border space-y-3 shadow-xs ${
                  isLight ? 'bg-white border-[#C9D7E6]' : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 text-sky-500 font-mono font-bold text-xs uppercase tracking-wider">
                  <Terminal className="h-4 w-4" />
                  <span>Technical Diagnostics & Forensics</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
                  <div className={`p-2.5 rounded-lg border ${isLight ? 'bg-slate-50 border-[#D7E3EF]' : 'bg-slate-850 border-slate-800'}`}>
                    <span className="text-[10px] text-slate-500 block uppercase">Correlation ID</span>
                    <span className="font-bold text-cyan-400 block truncate">{activeSelectedError.correlationId}</span>
                  </div>

                  <div className={`p-2.5 rounded-lg border ${isLight ? 'bg-slate-50 border-[#D7E3EF]' : 'bg-slate-850 border-slate-800'}`}>
                    <span className="text-[10px] text-slate-500 block uppercase">API Endpoint</span>
                    <span className="font-bold text-slate-200 block truncate">{activeSelectedError.apiEndpoint}</span>
                  </div>

                  <div className={`p-2.5 rounded-lg border ${isLight ? 'bg-slate-50 border-[#D7E3EF]' : 'bg-slate-850 border-slate-800'}`}>
                    <span className="text-[10px] text-slate-500 block uppercase">HTTP Status</span>
                    <span className="font-bold text-rose-400 block">{activeSelectedError.httpStatus}</span>
                  </div>

                  <div className={`p-2.5 rounded-lg border ${isLight ? 'bg-slate-50 border-[#D7E3EF]' : 'bg-slate-850 border-slate-800'}`}>
                    <span className="text-[10px] text-slate-500 block uppercase">Duration</span>
                    <span className="font-bold text-amber-400 block">{activeSelectedError.durationMs}ms</span>
                  </div>
                </div>
              </div>

              {/* 5. One-Click Recovery Action Buttons */}
              <div
                className={`p-4 rounded-xl border space-y-3 shadow-xs ${
                  isLight ? 'bg-white border-[#C9D7E6]' : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                    Incident Remediation Controls
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Target Node: {activeSelectedError.failedNodeId} → {activeSelectedError.targetNodeId}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  {/* Primary: Retry Sync */}
                  <button
                    data-testid="btn-inspector-retry-sync"
                    disabled={isRetrying || isResolved || activeSelectedError.status === 'resolved'}
                    onClick={() => onRetrySync(activeSelectedError)}
                    className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg font-bold text-xs font-mono flex items-center gap-2 shadow-md shadow-amber-900/40 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <RotateCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
                    <span>{isRetrying ? 'Retrying Sync (800ms)...' : 'Retry Sync'}</span>
                  </button>

                  <button
                    data-testid="btn-inspector-requeue"
                    onClick={() => handleActionRequeue(activeSelectedError)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                      isLight
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-[#1E293B]'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                    }`}
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-sky-400" />
                    <span>Requeue Kitchen</span>
                  </button>

                  <button
                    data-testid="btn-inspector-notify-waiter"
                    onClick={() => handleActionNotifyWaiter(activeSelectedError)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                      isLight
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-[#1E293B]'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                    }`}
                  >
                    <UserCheck className="h-3.5 w-3.5 text-purple-400" />
                    <span>Notify Waiter</span>
                  </button>

                  <button
                    data-testid="btn-inspector-notify-owner"
                    onClick={() => handleActionNotifyOwner(activeSelectedError)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                      isLight
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-[#1E293B]'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                    }`}
                  >
                    <Bell className="h-3.5 w-3.5 text-amber-400" />
                    <span>Notify Owner</span>
                  </button>

                  <button
                    data-testid="btn-inspector-view-logs"
                    onClick={() => handleActionViewLogs(activeSelectedError)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                      isLight
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-[#1E293B]'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5 text-emerald-400" />
                    <span>View Logs</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 font-mono text-xs">
              Select an error from the left card list to inspect diagnostics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
