'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, User, DollarSign, ArrowRight, MoveHorizontal } from 'lucide-react';

interface StickyHorizontalScrollbarProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
  label?: string;
}

export default function StickyHorizontalScrollbar({
  targetRef,
  label = 'Payroll Table'
}: StickyHorizontalScrollbarProps) {
  // 1. useState
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isFloating, setIsFloating] = useState(false);
  const [isTableVisible, setIsTableVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<{ left: number; width: number } | null>(null);

  // 2. useRef
  const isSyncingRef = useRef(false);

  // 3. useMemo
  const maxScroll = useMemo(() => {
    return Math.max(0, scrollWidth - clientWidth);
  }, [scrollWidth, clientWidth]);

  const hasOverflow = useMemo(() => {
    return scrollWidth > clientWidth + 5;
  }, [scrollWidth, clientWidth]);

  const scrollPercentage = useMemo(() => {
    if (maxScroll <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((scrollLeft / maxScroll) * 100)));
  }, [scrollLeft, maxScroll]);

  // 4. useEffect: Monitor metrics, table position, DOM changes & visibility
  useEffect(() => {
    const tableEl = targetRef.current;
    if (!tableEl) return;

    const updateMetrics = () => {
      const el = targetRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const sWidth = el.scrollWidth;
      const cWidth = el.clientWidth;
      const sLeft = el.scrollLeft;

      setScrollWidth(sWidth);
      setClientWidth(cWidth);
      setScrollLeft(sLeft);
      setTargetRect({ left: Math.max(0, rect.left), width: rect.width });

      const windowH = window.innerHeight;
      const tableInView = rect.top < windowH - 60 && rect.bottom > 140;
      const bottomOffscreen = rect.bottom > windowH - 10;
      const overflows = sWidth > cWidth + 5;

      setIsTableVisible(tableInView && overflows);
      setIsFloating(tableInView && bottomOffscreen && overflows);
    };

    updateMetrics();

    // Immediate microtask & timeout updates to catch asynchronous data rendering
    const timer1 = setTimeout(updateMetrics, 100);
    const timer2 = setTimeout(updateMetrics, 500);

    // Listen to resize and scroll
    window.addEventListener('resize', updateMetrics);
    window.addEventListener('scroll', updateMetrics, { passive: true });
    document.addEventListener('scroll', updateMetrics, { passive: true });

    const scrollParent = tableEl.closest('.overflow-y-auto') || window;
    scrollParent.addEventListener('scroll', updateMetrics, { passive: true });

    // ResizeObserver on both container and inner table
    const resizeObserver = new ResizeObserver(updateMetrics);
    resizeObserver.observe(tableEl);
    const innerTable = tableEl.querySelector('table');
    if (innerTable) {
      resizeObserver.observe(innerTable);
    }

    // MutationObserver to capture any table row changes, filtering, or month switches
    const mutationObserver = new MutationObserver(updateMetrics);
    mutationObserver.observe(tableEl, { childList: true, subtree: true, attributes: true });

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', updateMetrics);
      window.removeEventListener('scroll', updateMetrics);
      document.removeEventListener('scroll', updateMetrics);
      scrollParent.removeEventListener('scroll', updateMetrics);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [targetRef]);

  // 5. useEffect: Sync from table scroll to slider state
  useEffect(() => {
    const tableEl = targetRef.current;
    if (!tableEl) return;

    const handleTableScroll = () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      const curLeft = tableEl.scrollLeft;
      setScrollLeft(curLeft);
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    };

    tableEl.addEventListener('scroll', handleTableScroll, { passive: true });
    return () => tableEl.removeEventListener('scroll', handleTableScroll);
  }, [targetRef]);

  // Early return AFTER ALL HOOKS (Mandatory React Hook Safety standard)
  if (!hasOverflow || !isTableVisible) {
    return null;
  }

  // Column Jump Handler reading live DOM metrics with direct scrollLeft fallback
  const handleScrollToTarget = (type: 'staff' | 'earnings' | 'netpay' | 'actions') => {
    const el = targetRef.current;
    if (!el) return;
    const liveMax = Math.max(0, el.scrollWidth - el.clientWidth);
    if (liveMax <= 0) return;

    let targetLeft = 0;
    if (type === 'staff') {
      targetLeft = 0;
    } else if (type === 'actions') {
      targetLeft = liveMax;
    } else {
      const col = el.querySelector(`[data-col="${type}"]`) as HTMLElement;
      if (col) {
        targetLeft = Math.min(liveMax, Math.max(0, col.offsetLeft - 170));
      } else {
        targetLeft = type === 'earnings' ? Math.round(liveMax * 0.35) : Math.round(liveMax * 0.7);
      }
    }

    setScrollLeft(targetLeft);
    try {
      el.scrollTo({ left: targetLeft, behavior: 'smooth' });
    } catch (_) {
      el.scrollLeft = targetLeft;
    }

    setTimeout(() => {
      if (el && Math.abs(el.scrollLeft - targetLeft) > 5) {
        el.scrollLeft = targetLeft;
      }
    }, 100);
  };

  const handleScrollBy = (amount: number) => {
    const el = targetRef.current;
    if (!el) return;
    const liveMax = Math.max(0, el.scrollWidth - el.clientWidth);
    if (liveMax <= 0) return;

    const targetLeft = Math.max(0, Math.min(liveMax, el.scrollLeft + amount));
    setScrollLeft(targetLeft);

    try {
      el.scrollTo({ left: targetLeft, behavior: 'smooth' });
    } catch (_) {
      el.scrollLeft = targetLeft;
    }

    setTimeout(() => {
      if (el && Math.abs(el.scrollLeft - targetLeft) > 5) {
        el.scrollLeft = targetLeft;
      }
    }, 100);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = targetRef.current;
    const val = Number(e.target.value);
    setScrollLeft(val);
    if (el) {
      el.scrollLeft = val;
    }
  };

  return (
    <div
      style={
        isFloating && targetRect
          ? {
              left: `${targetRect.left}px`,
              width: `${targetRect.width}px`
            }
          : undefined
      }
      className={`transition-all duration-150 ${
        isFloating
          ? 'fixed bottom-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t-2 border-slate-300 dark:border-slate-700 shadow-[0_-8px_25px_rgba(0,0,0,0.18)] rounded-t-2xl py-2 px-3'
          : 'relative border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 py-2 px-3'
      }`}
    >
      <div className="flex flex-col gap-1.5 w-full">
        {/* Top Controls Row: Quick Jump Pills & Percentage */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0">
              <MoveHorizontal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">{label}:</span>
            </span>

            {/* Quick jump pills */}
            <button
              type="button"
              onClick={() => handleScrollToTarget('staff')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1 ${
                scrollPercentage < 15
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
              title="Jump to Employee Name & Role"
            >
              <User className="w-2.5 h-2.5" />
              <span>Staff</span>
            </button>

            <button
              type="button"
              onClick={() => handleScrollToTarget('earnings')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1 ${
                scrollPercentage >= 15 && scrollPercentage < 55
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
              title="Jump to Base Salary, Gross Earned & Overtime"
            >
              <DollarSign className="w-2.5 h-2.5" />
              <span>Earnings &amp; OT</span>
            </button>

            <button
              type="button"
              onClick={() => handleScrollToTarget('netpay')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1 ${
                scrollPercentage >= 55 && scrollPercentage < 85
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
              title="Jump to Net Salary & Deductions"
            >
              <span>Net Salary</span>
            </button>

            <button
              type="button"
              onClick={() => handleScrollToTarget('actions')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1 ${
                scrollPercentage >= 85
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              }`}
              title="Jump to Actions: Calendar, Approval, Breakdown & Payslip"
            >
              <ArrowRight className="w-2.5 h-2.5" />
              <span>Actions &amp; Slips</span>
            </button>
          </div>

          {/* Indicator & Arrow Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 hidden xs:inline">
              {scrollPercentage}%
            </span>
            <button
              type="button"
              onClick={() => handleScrollBy(-260)}
              disabled={scrollLeft <= 5}
              className="p-1 rounded-lg bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Slide Left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleScrollBy(260)}
              disabled={scrollLeft >= maxScroll - 5}
              className="p-1 rounded-lg bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Slide Right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Real-time Interactive Range Slider */}
        <div className="w-full flex items-center py-1">
          <input
            type="range"
            min={0}
            max={maxScroll > 0 ? maxScroll : 1}
            value={Math.min(scrollLeft, maxScroll)}
            onChange={handleSliderChange}
            aria-label="Table horizontal scroll slider"
            className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-hidden"
            title="Drag slider or click anywhere to scroll table"
          />
        </div>
      </div>
    </div>
  );
}
