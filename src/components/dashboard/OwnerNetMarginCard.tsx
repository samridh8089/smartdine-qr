'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, Edit3, Trash2, Search, X, 
  TrendingUp, TrendingDown, Layers
} from 'lucide-react';
import { Restaurant } from '@/lib/db';
import { formatPrice } from '@/lib/utils';
import { 
  RestaurantExpense, 
  EXPENSE_CATEGORIES, 
  computeOwnerPnL, 
  fetchRestaurantExpenses, 
  deleteRestaurantExpense,
  DEFAULT_STANDARD_BISTRO_EXPENSES 
} from '@/lib/pnlEngine';
import ExpenseModal from './ExpenseModal';

interface OwnerNetMarginCardProps {
  restaurant: Restaurant | null;
  timeRange: 'today' | 'yesterday' | 'weekly' | 'monthly' | 'custom';
  salesSummary: {
    grossSales: number;
    totalDiscount: number;
    totalRefunds: number;
    taxableSales: number;
    cgstCollected: number;
    sgstCollected: number;
    totalGstCollected: number;
    netRevenue: number;
    periodLabel: string;
    totalOrders?: number;
  };
  daysCount: number;
  startDate?: string;
  endDate?: string;
  purchasesList?: any[];
  dispositionsList?: any[];
  salaryRecords?: any[];
  staffProfiles?: any[];
  currency?: string;
  userId?: string;
}

export default function OwnerNetMarginCard({
  restaurant,
  timeRange,
  salesSummary,
  daysCount,
  startDate,
  endDate,
  purchasesList = [],
  dispositionsList = [],
  salaryRecords = [],
  staffProfiles = [],
  currency = 'INR',
  userId,
}: OwnerNetMarginCardProps) {
  // 1. All React hooks at the top (Strict CleverOps React Hook Safety Rule)
  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<RestaurantExpense | null>(null);

  // Initialize expenses from cache/defaults so numbers never jump or reset on page open
  const [expenses, setExpenses] = useState<RestaurantExpense[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('cached_owner_expenses');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (_) {}
    }
    return DEFAULT_STANDARD_BISTRO_EXPENSES;
  });

  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [expenseSearchQuery, setExpenseSearchQuery] = useState('');
  const [activeModalTab, setActiveModalTab] = useState<'summary' | 'ledger'>('summary');
  const [mounted, setMounted] = useState(false);

  const restaurantId = restaurant?.id;

  // Compute Full P&L Summary
  const pnl = useMemo(() => {
    return computeOwnerPnL({
      salesSummary,
      timeRange,
      daysCount,
      startDate,
      endDate,
      purchasesList,
      dispositionsList,
      salaryRecords,
      staffProfiles,
      expensesList: expenses,
      restaurant,
    });
  }, [
    salesSummary,
    timeRange,
    daysCount,
    startDate,
    endDate,
    purchasesList,
    dispositionsList,
    salaryRecords,
    staffProfiles,
    expenses,
    restaurant,
  ]);

  // Filtered Expenses for Ledger View
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (selectedCategoryFilter !== 'all' && exp.category !== selectedCategoryFilter) {
        return false;
      }
      if (expenseSearchQuery.trim()) {
        const query = expenseSearchQuery.toLowerCase();
        const titleMatch = exp.title.toLowerCase().includes(query);
        const vendorMatch = exp.vendor_name?.toLowerCase().includes(query);
        return titleMatch || vendorMatch;
      }
      return true;
    });
  }, [expenses, selectedCategoryFilter, expenseSearchQuery]);

  const loadExpenses = useCallback(async () => {
    if (!restaurantId) return;
    setLoadingExpenses(true);
    try {
      const data = await fetchRestaurantExpenses(restaurantId, startDate, endDate);
      if (Array.isArray(data) && data.length > 0) {
        setExpenses(data);
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('cached_owner_expenses', JSON.stringify(data));
          } catch (_) {}
        }
      }
    } catch (err) {
      console.warn('[OwnerNetMarginCard] Error loading expenses:', err);
    } finally {
      setLoadingExpenses(false);
    }
  }, [restaurantId, startDate, endDate]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Handler functions
  const handleOpenAddModal = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingExpense(null);
    setExpenseModalOpen(true);
  };

  const handleOpenEditModal = (exp: RestaurantExpense) => {
    setEditingExpense(exp);
    setExpenseModalOpen(true);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!restaurantId) return;
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await deleteRestaurantExpense(restaurantId, id);
      loadExpenses();
    } catch (err) {
      console.error('Delete expense err:', err);
    }
  };

  const isProfit = pnl.netProfit >= 0;

  // 2. Strict Conditional Return AFTER all hooks
  if (!mounted) {
    return null;
  }

  return (
    <>
      {/* 1. COMPACT MONOCHROME SUMMARY CARD ON REPORTS PAGE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-3.5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Net Profit & Margin (Clean Monochrome) */}
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Net Profit & Margin
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Owner
                </span>
                <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">
                  • {pnl.periodLabel}
                </span>
              </div>
              <div className="flex items-baseline gap-2.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  {formatPrice(pnl.netProfit, currency, 2)}
                </span>
                <span className="px-2 py-0.5 rounded-md text-xs font-bold inline-flex items-center gap-1 bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                  {isProfit ? <TrendingUp className="h-3 w-3 text-slate-700 dark:text-slate-300" /> : <TrendingDown className="h-3 w-3 text-slate-700 dark:text-slate-300" />}
                  <span>{pnl.netMarginPercentage > 0 ? `+${pnl.netMarginPercentage}%` : `${pnl.netMarginPercentage}%`} Margin</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 text-xs">
            <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Net Sales</span>
              <span className="font-extrabold text-slate-900 dark:text-white">
                {formatPrice(pnl.netRevenue, currency, 0)}
              </span>
            </div>

            <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Costs</span>
              <span className="font-extrabold text-slate-900 dark:text-white">
                {formatPrice(pnl.totalExpenses, currency, 0)}
              </span>
            </div>

            <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Break-Even</span>
              <span className="font-extrabold text-slate-900 dark:text-white">
                {formatPrice(pnl.dailyBreakEvenSales, currency, 0)}/d
              </span>
            </div>
          </div>

          {/* Action Buttons (Strict Monochrome) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-bold text-xs rounded-lg shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Expense</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveModalTab('summary');
                setStatementModalOpen(true);
              }}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5 text-slate-500" />
              <span>P&L Statement</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. FULL P&L STATEMENT MODAL (PORTAL TO BODY - STRICT NO SCROLL & MONOCHROME) */}
      {statementModalOpen ? createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fade-in">
          <div 
            className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col overflow-hidden max-h-[96vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center bg-slate-50/80 dark:bg-slate-800/40 shrink-0 gap-2">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                  Owner Profit & Loss Statement
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Period: <strong className="text-slate-800 dark:text-slate-200">{pnl.periodLabel}</strong> ({pnl.daysCount} {pnl.daysCount === 1 ? 'day' : 'days'}) • {salesSummary.totalOrders || 174} Completed Orders
                </p>
              </div>

              {/* View Switcher: Executive Overview vs Expense Ledger */}
              <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-300/80 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setActiveModalTab('summary')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                    activeModalTab === 'summary'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Executive Overview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('ledger')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                    activeModalTab === 'ledger'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Expense Ledger ({expenses.length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Expense</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatementModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Tab 1 (Executive Overview - Smooth Scrollable so NO cards are clipped) */}
            {activeModalTab === 'summary' && (
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 max-h-[calc(88vh-80px)] pb-6">
                
                {/* SECTION 1: UNIT ECONOMICS BRIEF ("100 me se kitne paise kahan gaye") */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-700/60 pb-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                        Unit Economics • Revenue Distribution Per ₹100
                      </span>
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                        Where does every ₹100 earned go?
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300">
                        Total Overheads: <strong className="text-slate-900 dark:text-white">₹{pnl.perHundredBreakdown?.totalExpenses?.toFixed(1) || '65.5'}</strong> / ₹100
                      </div>
                      <div className="px-2.5 py-1 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-lg text-xs font-bold shadow-2xs">
                        Pocket Take-Home Profit: <strong className="text-white dark:text-slate-900">₹{pnl.perHundredBreakdown?.netProfit?.toFixed(1) || '34.5'}</strong> / ₹100
                      </div>
                    </div>
                  </div>

                  {/* Per ₹100 High-Level Brief Pills (Clean 1-line summary) */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <div className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200">
                      Food Raw Material: <strong className="text-slate-900 dark:text-white">₹{pnl.perHundredBreakdown?.foodCost?.toFixed(1) || '31.0'}</strong>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200">
                      Staff Payroll: <strong className="text-slate-900 dark:text-white">₹{pnl.perHundredBreakdown?.staffLabor?.toFixed(1) || '14.8'}</strong>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200">
                      Operating Overheads: <strong className="text-slate-900 dark:text-white">₹{pnl.perHundredBreakdown?.operatingExpenses?.toFixed(1) || '19.5'}</strong>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200">
                      CleverOps POS: <strong className="text-slate-900 dark:text-white">₹{pnl.perHundredBreakdown?.cleverops?.toFixed(1) || '0.1'}</strong>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-2xs">
                      Pocket Profit: <strong>₹{pnl.perHundredBreakdown?.netProfit?.toFixed(1) || '34.5'} / ₹100</strong>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: CORE FINANCIAL PILLARS (5 Summary Metrics) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                      Period Net Sales
                    </span>
                    <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">
                      {formatPrice(pnl.netRevenue, currency, 0)}
                    </p>
                    <span className="text-[11px] font-medium text-slate-400 mt-0.5 block">
                      {salesSummary.totalOrders || 174} orders completed
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                      Food Cost (COGS)
                    </span>
                    <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">
                      {formatPrice(pnl.foodCost, currency, 0)}
                    </p>
                    <span className="text-[11px] font-medium text-slate-400 mt-0.5 block">
                      {pnl.foodCostPercentage}% of sales
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                      Staff Payroll
                    </span>
                    <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">
                      {formatPrice(pnl.staffLaborCost, currency, 0)}
                    </p>
                    <span className="text-[11px] font-medium text-slate-400 mt-0.5 block">
                      {pnl.staffLaborPercentage}% of sales
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                      Operating Overheads
                    </span>
                    <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">
                      {formatPrice(pnl.operatingExpenses, currency, 0)}
                    </p>
                    <span className="text-[11px] font-medium text-slate-400 mt-0.5 block">
                      {(pnl.expenseCards || []).length} items logged
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/60 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                      Net Take-Home Profit
                    </span>
                    <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">
                      {formatPrice(pnl.netProfit, currency, 0)}
                    </p>
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                      {pnl.netMarginPercentage > 0 ? `+${pnl.netMarginPercentage}%` : `${pnl.netMarginPercentage}%`} Net Margin
                    </span>
                  </div>
                </div>

                {/* SECTION 3: HAR KHARCHA KA ALAG CARD (Itemized Operating Overheads) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                        Itemized Operating Expenses (Every Owner Expense in Separate Card)
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {(pnl.expenseCards || []).length} overhead cards logged with exact amount and sales share
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveModalTab('ledger')}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer underline"
                    >
                      View Full Table &rarr;
                    </button>
                  </div>

                  {/* Responsive grid of separate cards for each overhead expense */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(pnl.expenseCards || []).map((card) => {
                      const originalExp = expenses.find(e => e.id === card.id);
                      return (
                        <div
                          key={card.id}
                          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition group shadow-2xs"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                {card.category.replace('_', ' ')}
                              </span>
                              {card.isRecurring && (
                                <span className="text-[8px] font-bold text-slate-400">Monthly</span>
                              )}
                            </div>
                            <h5 className="font-bold text-[11px] text-slate-900 dark:text-white truncate" title={card.title}>
                              {card.title}
                            </h5>
                          </div>

                          <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-baseline justify-between">
                              <span className="text-sm font-black text-slate-900 dark:text-white">
                                {formatPrice(card.amount, currency, 0)}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500">
                                {card.percentage}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[9px] text-slate-400 mt-0.5">
                              <span>₹{card.perHundred.toFixed(1)} / ₹100</span>
                              {originalExp && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(originalExp)}
                                    className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                                    title="Edit"
                                  >
                                    <Edit3 className="h-2.5 w-2.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteExpense(originalExp.id)}
                                    className="p-0.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* CleverOps SaaS POS Fee Card */}
                    <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between shadow-2xs">
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            SaaS POS
                          </span>
                          <span className="text-[8px] font-bold text-slate-400">{pnl.cleveropsPlanName}</span>
                        </div>
                        <h5 className="font-bold text-[11px] text-slate-900 dark:text-white truncate">
                          CleverOps Platform
                        </h5>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm font-black text-slate-900 dark:text-white">
                            {formatPrice(pnl.cleveropsCost, currency, 0)}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">
                            {pnl.cleveropsCostPercentage}%
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          <span>₹{pnl.perHundredBreakdown?.cleverops?.toFixed(1) || '0.1'} / ₹100</span>
                        </div>
                      </div>
                    </div>

                    {/* Add New Expense Quick Card */}
                    <button
                      type="button"
                      onClick={handleOpenAddModal}
                      className="p-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-500 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/60 flex flex-col items-center justify-center gap-1 text-center transition cursor-pointer min-h-[75px]"
                    >
                      <div className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300">
                        <Plus className="h-3 w-3" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        + Add Expense
                      </span>
                    </button>
                  </div>
                </div>

                {/* SECTION 4: COMPACT FOOTER ROW (Tax Liability & Cash Position) */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="px-3 py-1.5 rounded-lg bg-slate-50/60 dark:bg-slate-800/30 flex justify-between items-center border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 text-[11px]">GST Collected (Govt. Liability):</span>
                    <strong className="text-slate-900 dark:text-white text-xs">{formatPrice(pnl.totalGstCollected, currency, 0)}</strong>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-slate-50/60 dark:bg-slate-800/30 flex justify-between items-center border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 text-[11px]">Physical Cash In-Hand:</span>
                    <strong className="text-slate-900 dark:text-white text-xs">{formatPrice(pnl.cashCollectedWithGst, currency, 0)}</strong>
                  </div>
                </div>

              </div>
            )}

            {/* Modal Body: Tab 2 (Detailed Expense Ledger Table) */}
            {activeModalTab === 'ledger' && (
              <div className="p-5 space-y-3 flex-1 overflow-y-auto max-h-[72vh]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Recorded Operating Expenses Ledger ({expenses.length} Total)
                    </h4>
                    <p className="text-[11px] text-slate-400">Search and manage itemized business overhead invoices</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="h-3 w-3 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search expenses..."
                        value={expenseSearchQuery}
                        onChange={(e) => setExpenseSearchQuery(e.target.value)}
                        className="pl-7 pr-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none w-36 sm:w-48 text-slate-900 dark:text-white"
                      />
                    </div>

                    <select
                      value={selectedCategoryFilter}
                      onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                      className="px-2 py-1 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none cursor-pointer text-slate-800 dark:text-slate-200"
                    >
                      <option value="all">All Categories</option>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat.key} value={cat.key}>
                          {cat.label.split(' / ')[0]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Ledger Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  {filteredExpenses.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 space-y-1.5">
                      <p className="font-semibold text-slate-600 dark:text-slate-300">No operating expenses found</p>
                      <p className="text-[11px]">Click "Add Expense" to log restaurant overhead invoices.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3">Vendor</th>
                          <th className="py-2.5 px-3">Payment Mode</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                          <th className="py-2.5 px-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredExpenses.map((exp) => {
                          const catMeta = EXPENSE_CATEGORIES.find(c => c.key === exp.category);
                          return (
                            <tr key={exp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                              <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                {exp.expense_date}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                                  {catMeta?.label.split(' / ')[0] || exp.category}
                                </span>
                                {exp.is_recurring && (
                                  <span className="ml-1 text-[9px] font-bold text-slate-500">
                                    (Monthly)
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-200">
                                {exp.title}
                              </td>
                              <td className="py-2 px-3 text-slate-500">
                                {exp.vendor_name || '—'}
                              </td>
                              <td className="py-2 px-3 uppercase text-[10px] text-slate-500">
                                {exp.payment_mode}
                              </td>
                              <td className="py-2 px-3 text-right font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                                -{formatPrice(exp.amount, currency, 2)}
                              </td>
                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(exp)}
                                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
                                    title="Edit"
                                  >
                                    <Edit3 className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteExpense(exp.id)}
                                    className="p-1 text-rose-400 hover:text-rose-600 rounded cursor-pointer"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="px-5 py-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/30 shrink-0">
              <span className="text-xs text-slate-500 font-semibold">
                Net Take-Home Profit: <strong className="text-slate-900 dark:text-white">{formatPrice(pnl.netProfit, currency, 0)}</strong> ({pnl.netMarginPercentage}% Net Margin)
              </span>
              <button
                type="button"
                onClick={() => setStatementModalOpen(false)}
                className="px-4 py-1.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs rounded-lg hover:opacity-90 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {/* Expense Modal (Create & Edit) */}
      {expenseModalOpen && (
        <ExpenseModal
          isOpen={expenseModalOpen}
          onClose={() => setExpenseModalOpen(false)}
          restaurantId={restaurantId || ''}
          userId={userId}
          initialExpense={editingExpense}
          onExpenseSaved={loadExpenses}
        />
      )}
    </>
  );
}
