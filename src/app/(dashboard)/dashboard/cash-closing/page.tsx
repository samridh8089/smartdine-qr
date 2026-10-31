'use client';

import { useState, useMemo, useCallback, useEffect, useContext } from 'react';
import { RestaurantContext } from '../../layout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { getDayRangeInTimezone } from '@/lib/timestamp';
import { Calendar, CheckCircle, AlertTriangle, RefreshCw, ShieldCheck, Plus, Check, X, Clock, ShoppingBag } from 'lucide-react';
import PettyCashRequisitionModal from '@/components/dashboard/PettyCashRequisitionModal';
import { approveOrRejectExpense } from '@/lib/pettyCashRequisitionService';
import { RestaurantExpense } from '@/lib/pnlEngine';

interface CashClosingRecord {
  id: string;
  date: string;
  openingFloat: number;
  cashSales: number;
  cashExpenses: number;
  expectedCash: number;
  countedCash: number;
  variance: number;
  note: string;
  closedBy: string;
  createdAt: string;
}

const STORAGE_KEY = 'cleverops_cash_closings';

export default function CashClosingPage() {
  const restaurantContext = useContext(RestaurantContext);
  const restaurant = restaurantContext?.restaurant || null;
  const profile = restaurantContext?.profile || null;
  const activeRole = (restaurantContext?.activeRole || profile?.role || 'cashier').toLowerCase();

  // 1. useState hooks (Structured strictly per CleverOps React Hooks Safety Guardrail)
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [openingFloat, setOpeningFloat] = useState('2000');
  const [cashSales, setCashSales] = useState('0');
  const [cashExpenses, setCashExpenses] = useState('0');
  const [isPettyCashModalOpen, setIsPettyCashModalOpen] = useState(false);
  const [dayExpenses, setDayExpenses] = useState<RestaurantExpense[]>([]);
  const [isApprovingId, setIsApprovingId] = useState<string | null>(null);
  const [countedCash, setCountedCash] = useState('');
  const [note, setNote] = useState('');
  const [isLoadingRealData, setIsLoadingRealData] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [paymentBreakdown, setPaymentBreakdown] = useState<{
    cashOrdersCount: number;
    excludedOnlineSum: number;
    excludedOnlineCount: number;
  }>({
    cashOrdersCount: 0,
    excludedOnlineSum: 0,
    excludedOnlineCount: 0,
  });

  const [closings, setClosings] = useState<CashClosingRecord[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return [
      {
        id: '1',
        date: '2026-10-29',
        openingFloat: 2000,
        cashSales: 16800,
        cashExpenses: 400,
        expectedCash: 18400,
        countedCash: 18400,
        variance: 0,
        note: 'Balanced closing. All cash verified.',
        closedBy: 'Manager',
        createdAt: '2026-10-29T23:30:00Z',
      },
      {
        id: '2',
        date: '2026-10-28',
        openingFloat: 2000,
        cashSales: 15400,
        cashExpenses: 250,
        expectedCash: 17150,
        countedCash: 17100,
        variance: -50,
        note: 'Shortage of Rs 50 due to change rounding.',
        closedBy: 'Cashier',
        createdAt: '2026-10-28T23:15:00Z',
      },
    ];
  });

  // 2. useMemo hooks
  const expectedCash = useMemo(() => {
    const f = parseFloat(openingFloat) || 0;
    const s = parseFloat(cashSales) || 0;
    const e = parseFloat(cashExpenses) || 0;
    return Math.round((f + s - e) * 100) / 100;
  }, [openingFloat, cashSales, cashExpenses]);

  const variance = useMemo(() => {
    if (countedCash === '') return null;
    const c = parseFloat(countedCash) || 0;
    return Math.round((c - expectedCash) * 100) / 100;
  }, [countedCash, expectedCash]);

  const currencySymbol = useMemo(() => {
    const raw = restaurant?.settings?.currency;
    if (!raw) return '₹';
    if (raw === 'INR') return '₹';
    return raw;
  }, [restaurant?.settings?.currency]);

  // 3. useCallback hooks
  const fetchTodayFigures = useCallback(async () => {
    if (!restaurant?.id) return;
    setIsLoadingRealData(true);
    try {
      // Precise timezone-aware date range for restaurant's location (Asia/Kolkata)
      const tz = restaurant?.settings?.timezone || 'Asia/Kolkata';
      const { startIso, endIso } = getDayRangeInTimezone(date, tz);

      // Query paid orders for this day
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select('id, total, payment_status, payment_method, payment_reference, paid_at, created_at')
        .eq('restaurant_id', restaurant.id)
        .eq('payment_status', 'paid')
        .or(`and(created_at.gte.${startIso},created_at.lte.${endIso}),and(paid_at.gte.${startIso},paid_at.lte.${endIso})`);

      if (!ordersErr && ordersData) {
        let totalCash = 0;
        let cashCount = 0;
        let onlineTotal = 0;
        let onlineCount = 0;

        ordersData.forEach((order) => {
          const method = String(order.payment_method || '').toLowerCase().trim();
          const amount = Number(order.total) || 0;

          if (method === 'cash') {
            // Pure cash order: 100% counted in drawer
            totalCash += amount;
            cashCount += 1;
          } else if (method === 'split') {
            // Split order: Extract ONLY the cash share from payment_reference
            let hasCashSplit = false;
            try {
              if (order.payment_reference) {
                const parsed = JSON.parse(order.payment_reference);
                if (Array.isArray(parsed.splits)) {
                  parsed.splits.forEach((s: any) => {
                    const sm = String(s.method || '').toLowerCase().trim();
                    const sa = Number(s.amount) || 0;
                    if (sm === 'cash') {
                      totalCash += sa;
                      hasCashSplit = true;
                    } else {
                      onlineTotal += sa;
                    }
                  });
                }
              }
            } catch (_) {}
            if (hasCashSplit) {
              cashCount += 1;
            }
          } else {
            // UPI, Card, NetBanking, etc. -> STRICTLY EXCLUDED from cash drawer!
            onlineTotal += amount;
            onlineCount += 1;
          }
        });

        setCashSales(String(Math.round(totalCash)));
        setPaymentBreakdown({
          cashOrdersCount: cashCount,
          excludedOnlineSum: Math.round(onlineTotal),
          excludedOnlineCount: onlineCount,
        });
      }

      // Fetch expenses for this date
      const { data: expData, error: expErr } = await supabase
        .from('restaurant_expenses')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('expense_date', date)
        .order('created_at', { ascending: false });

      if (!expErr && expData) {
        setDayExpenses(expData as any);
        // Only cash payments affect physical cash drawer; exclude rejected
        const cashList = expData.filter((e: any) => e.payment_mode === 'cash' && e.approval_status !== 'rejected');
        const sumExp = cashList.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
        setCashExpenses(String(Math.round(sumExp)));
      } else {
        setDayExpenses([]);
      }
    } catch (_) {
      // Best-effort fetch; user can still manually adjust if needed
    } finally {
      setIsLoadingRealData(false);
    }
  }, [restaurant?.id, restaurant?.settings?.timezone, date]);

  const handleApproveReject = useCallback(async (expenseId: string, action: 'approved' | 'rejected') => {
    setIsApprovingId(expenseId);
    try {
      const res = await approveOrRejectExpense({
        expenseId,
        action,
        approverProfile: {
          id: profile?.id || '',
          name: profile?.full_name || profile?.role || 'Staff',
          role: activeRole,
        },
      });
      if (res.success) {
        await fetchTodayFigures();
      }
    } catch (_) {
    } finally {
      setIsApprovingId(null);
    }
  }, [profile, activeRole, fetchTodayFigures]);

  const handleCloseRegister = useCallback(() => {
    if (countedCash === '') return;
    const c = parseFloat(countedCash) || 0;
    const diff = Math.round((c - expectedCash) * 100) / 100;

    const newRecord: CashClosingRecord = {
      id: Date.now().toString(),
      date,
      openingFloat: parseFloat(openingFloat) || 0,
      cashSales: parseFloat(cashSales) || 0,
      cashExpenses: parseFloat(cashExpenses) || 0,
      expectedCash,
      countedCash: c,
      variance: diff,
      note: note || (diff === 0 ? 'Balanced register' : `Variance: ${diff}`),
      closedBy: profile?.full_name || profile?.role || 'Staff Member',
      createdAt: new Date().toISOString(),
    };

    const updated = [newRecord, ...closings];
    setClosings(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      if (restaurant?.id) {
        const freshSettings = { ...restaurant.settings, cash_closings: updated };
        void supabase.from('restaurants').update({ settings: freshSettings }).eq('id', restaurant.id);
      }
    } catch (_) {}

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    setCountedCash('');
    setNote('');
  }, [countedCash, expectedCash, date, openingFloat, cashSales, cashExpenses, note, profile, closings]);

  // 4. useEffect hooks
  useEffect(() => {
    if (restaurant?.id) {
      void fetchTodayFigures();
    }
  }, [restaurant?.id, date, fetchTodayFigures]);

  useEffect(() => {
    const dbClosings = (restaurant?.settings as any)?.cash_closings;
    if (Array.isArray(dbClosings) && dbClosings.length > 0) {
      setClosings(prev => {
        if (prev.length <= 1 || prev.length < dbClosings.length) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dbClosings));
          } catch (_) {}
          return dbClosings;
        }
        return prev;
      });
    }
  }, [restaurant?.settings]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Cash Register Closing
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Shift and day-end drawer cash reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <Calendar className="h-4 w-4 text-slate-400 mr-2" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-sm bg-transparent text-slate-700 font-semibold focus:outline-none cursor-pointer"
            />
          </div>

          {restaurant?.id && (
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTodayFigures}
              disabled={isLoadingRealData}
              className="text-xs flex items-center gap-1.5 h-9"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingRealData ? 'animate-spin' : ''}`} />
              <span>Sync Figures</span>
            </Button>
          )}
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-2xs">
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Register closed successfully for {date}. Record saved.</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Register Form */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Daily Cash Calculation
                </h2>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Only Cash Transactions</span>
                </div>
              </div>

              {/* Opening Float */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">
                  Opening Cash in Drawer (Float)
                </label>
                <div className="flex rounded-xl border border-slate-200 bg-white shadow-2xs focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 overflow-hidden">
                  <span className="bg-slate-100 text-slate-600 px-3.5 py-2.5 text-xs font-bold border-r border-slate-200 flex items-center select-none shrink-0">
                    {currencySymbol}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none bg-transparent"
                  />
                </div>
                <p className="text-[11px] text-slate-400">Cash kept in register at shift start.</p>
              </div>

              {/* Total Cash Sales */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600">
                    Total Cash Sales (Today)
                  </label>
                  <span className="text-[11px] font-semibold text-emerald-600">
                    Cash Only
                  </span>
                </div>
                <div className="flex rounded-xl border border-slate-200 bg-white shadow-2xs focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 overflow-hidden">
                  <span className="bg-slate-100 text-slate-600 px-3.5 py-2.5 text-xs font-bold border-r border-slate-200 flex items-center select-none shrink-0">
                    {currencySymbol}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={cashSales}
                    onChange={(e) => setCashSales(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none bg-transparent"
                  />
                </div>

                {/* Real-time Online / UPI Exclusion Transparency Badge */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    {paymentBreakdown.cashOrdersCount} Cash Orders Counted
                  </span>
                  {paymentBreakdown.excludedOnlineCount > 0 && (
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                      UPI & Card Excluded: {currencySymbol} {paymentBreakdown.excludedOnlineSum.toLocaleString('en-IN')} ({paymentBreakdown.excludedOnlineCount} orders)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Only cash receipts are counted. UPI and Card payments are strictly excluded from the drawer.
                </p>
              </div>

              {/* Cash Expenses Paid from Drawer */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600">
                    Cash Expenses Paid from Drawer
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsPettyCashModalOpen(true)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg cursor-pointer transition-colors shadow-2xs"
                  >
                    <Plus className="h-3 w-3" />
                    <span>+ Add Drawer Expense</span>
                  </button>
                </div>

                <div className="flex rounded-xl border border-slate-200 bg-white shadow-2xs focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 overflow-hidden">
                  <span className="bg-slate-100 text-slate-600 px-3.5 py-2.5 text-xs font-bold border-r border-slate-200 flex items-center select-none shrink-0">
                    {currencySymbol}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={cashExpenses}
                    onChange={(e) => setCashExpenses(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none bg-transparent"
                  />
                </div>
                <p className="text-[11px] text-slate-400">Cash taken from drawer for milk, ice, vegetables, cleaning, etc.</p>

                {/* Day Expenses Audit List */}
                {dayExpenses.length > 0 && (
                  <div className="mt-2 space-y-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl max-h-48 overflow-y-auto">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                      <span>Today&apos;s Expenses ({dayExpenses.length})</span>
                      <span className="text-[10px] lowercase text-slate-400">cash &amp; store items</span>
                    </div>

                    {dayExpenses.map((exp: any) => {
                      const isPending = exp.approval_status === 'pending_approval';
                      const isApproved = exp.approval_status === 'approved' || !exp.approval_status;
                      const isRejected = exp.approval_status === 'rejected';
                      const canApprove = ['owner', 'manager', 'super_admin'].includes(activeRole);

                      return (
                        <div
                          key={exp.id}
                          className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                            isRejected
                              ? 'bg-rose-50/50 border-rose-200 opacity-60'
                              : isPending
                              ? 'bg-amber-50/80 border-amber-200'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800 truncate">{exp.title}</span>
                              {exp.payment_mode === 'store_inventory' ? (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700">
                                  Store Stock
                                </span>
                              ) : (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700">
                                  Cash Drawer
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                              <span>By: {exp.staff_name || 'Staff'}</span>
                              {exp.notes && <span>• {exp.notes}</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold font-mono text-slate-900">
                              {currencySymbol} {Number(exp.amount || 0).toLocaleString('en-IN')}
                            </span>

                            {isPending && canApprove ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={isApprovingId === exp.id}
                                  onClick={() => handleApproveReject(exp.id, 'approved')}
                                  title="Approve Expense"
                                  className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-colors"
                                >
                                  <Check className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isApprovingId === exp.id}
                                  onClick={() => handleApproveReject(exp.id, 'rejected')}
                                  title="Reject Expense"
                                  className="p-1 rounded bg-rose-600 hover:bg-rose-500 text-white cursor-pointer transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : isPending ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" /> Pending
                              </span>
                            ) : isRejected ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                                Rejected
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                Approved
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Expected Total Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Expected Cash in Drawer</span>
                  <span className="font-mono text-[11px] text-slate-400">Opening + Cash Sales - Cash Expenses</span>
                </div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                  {currencySymbol} {expectedCash.toLocaleString('en-IN')}
                </div>
              </div>

              {/* Counted Cash Input */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Physical Counted Cash
                  </label>
                  <button
                    type="button"
                    onClick={() => setCountedCash(String(expectedCash))}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                  >
                    Match Expected
                  </button>
                </div>

                <div className="flex rounded-xl border-2 border-slate-300 bg-white shadow-2xs focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 overflow-hidden">
                  <span className="bg-slate-100 text-slate-700 px-3.5 py-3 text-sm font-bold border-r border-slate-300 flex items-center select-none shrink-0">
                    {currencySymbol}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="Enter physical cash count"
                    className="w-full px-3.5 py-3 text-base font-bold text-slate-900 focus:outline-none bg-transparent placeholder:text-slate-400 placeholder:font-normal"
                  />
                </div>

                {/* Variance Status Pill */}
                {variance !== null && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                      variance === 0
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : variance < 0
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {variance === 0 ? (
                        <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                      )}
                      <span>
                        {variance === 0
                          ? 'Status: Balanced'
                          : variance < 0
                          ? `Status: Short by ${currencySymbol} ${Math.abs(variance)}`
                          : `Status: Over by ${currencySymbol} ${variance}`}
                      </span>
                    </div>
                    <span className="font-mono text-sm">
                      {variance >= 0
                        ? `+${currencySymbol} ${variance}`
                        : `-${currencySymbol} ${Math.abs(variance)}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Note */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">
                  Remarks / Note (Optional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Reason for discrepancy if any"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  onClick={handleCloseRegister}
                  disabled={countedCash === ''}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm h-11 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Close Register
                </Button>
                {countedCash === '' && (
                  <p className="text-[11px] text-slate-400 text-center mt-1.5">
                    Enter physical counted cash above to close register.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: History Table */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Closing History
                </h2>
                <span className="text-xs text-slate-400 font-medium">
                  {closings.length} Records
                </span>
              </div>

              <div className="space-y-3">
                {closings.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-800 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {c.date}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          c.variance === 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.variance < 0
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.variance === 0
                          ? 'Balanced'
                          : c.variance < 0
                          ? `Short ${currencySymbol} ${Math.abs(c.variance)}`
                          : `Over +${currencySymbol} ${c.variance}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 text-slate-600">
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase font-medium">Float</span>
                        <span className="font-semibold text-slate-800">
                          {currencySymbol} {c.openingFloat}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase font-medium">Sales</span>
                        <span className="font-semibold text-slate-800">
                          {currencySymbol} {c.cashSales}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase font-medium">Counted</span>
                        <span className="font-bold text-slate-900">
                          {currencySymbol} {c.countedCash}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Closed by: {c.closedBy}</span>
                      <span className="truncate max-w-[180px] italic">{c.note}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <PettyCashRequisitionModal
        isOpen={isPettyCashModalOpen}
        onClose={() => setIsPettyCashModalOpen(false)}
        restaurantId={restaurant?.id || ''}
        profile={profile}
        activeRole={activeRole}
        initialTab="petty_cash"
        onSuccess={fetchTodayFigures}
      />
    </div>
  );
}
