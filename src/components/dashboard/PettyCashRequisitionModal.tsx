'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Banknote, PackageCheck, AlertCircle, CheckCircle2, 
  Loader2, ShieldCheck, ShoppingBag, ArrowRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ExpenseCategory, EXPENSE_CATEGORIES } from '@/lib/pnlEngine';
import { 
  recordPettyCashExpense, 
  issueStoreStockRequisition 
} from '@/lib/pettyCashRequisitionService';

interface PettyCashRequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  profile: any;
  activeRole?: string;
  initialTab?: 'petty_cash' | 'store_issue';
  preselectedItemId?: string;
  onSuccess?: () => void;
}

const QUICK_TAGS = [
  { label: 'Broom & Mop', title: 'Broom & Mop', category: 'maintenance' },
  { label: 'Phenyl & Detergent', title: 'Phenyl & Detergent', category: 'maintenance' },
  { label: 'Milk & Dairy', title: 'Milk & Dairy', category: 'other' },
  { label: 'Ice Cubes', title: 'Ice Cubes', category: 'other' },
  { label: 'Packaging & Bags', title: 'Packaging & Bags', category: 'packaging' },
  { label: 'Fresh Vegetables', title: 'Fresh Vegetables', category: 'other' },
];

export default function PettyCashRequisitionModal({
  isOpen,
  onClose,
  restaurantId,
  profile,
  activeRole = 'cashier',
  initialTab = 'petty_cash',
  preselectedItemId,
  onSuccess,
}: PettyCashRequisitionModalProps) {
  // 1. ALL HOOKS STRICTLY AT TOP-LEVEL (CleverOps React Hooks Safety Guardrail)
  const [activeTab, setActiveTab] = useState<'petty_cash' | 'store_issue'>(initialTab);
  const [mounted, setMounted] = useState(false);

  // Tab 1 (Petty Cash) Form States
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('maintenance');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi'>('cash');
  const [vendorName, setVendorName] = useState('');
  const [notes, setNotes] = useState('');

  // Tab 2 (Store Requisition) Form States
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(preselectedItemId || '');
  const [issueQuantity, setIssueQuantity] = useState('');
  const [issuedToName, setIssuedToName] = useState('');
  const [purposeNote, setPurposeNote] = useState('Daily maintenance');

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 2. useEffect Hooks
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSelectedItemId(preselectedItemId || '');
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen, initialTab, preselectedItemId]);

  // Load Inventory Items for Tab 2
  useEffect(() => {
    if (!isOpen || !restaurantId) return;

    let isCancelled = false;
    async function loadItems() {
      setIsLoadingItems(true);
      try {
        const { data, error } = await supabase
          .from('inventory_items')
          .select('id, name, unit, current_stock, cost_per_unit, category')
          .eq('restaurant_id', restaurantId)
          .eq('is_archived', false)
          .order('name', { ascending: true });

        if (!isCancelled && !error && data) {
          setInventoryItems(data);
          if (preselectedItemId && data.some(i => i.id === preselectedItemId)) {
            setSelectedItemId(preselectedItemId);
          }
        }
      } catch (_) {
      } finally {
        if (!isCancelled) setIsLoadingItems(false);
      }
    }

    loadItems();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, restaurantId, preselectedItemId]);

  // 3. useMemo Hooks
  const userRole = useMemo(() => {
    return (activeRole || profile?.role || 'cashier').toLowerCase();
  }, [activeRole, profile?.role]);

  const isCashier = useMemo(() => {
    return userRole === 'cashier';
  }, [userRole]);

  const selectedItem = useMemo(() => {
    return inventoryItems.find(i => i.id === selectedItemId) || null;
  }, [inventoryItems, selectedItemId]);

  const calculatedCost = useMemo(() => {
    if (!selectedItem) return 0;
    const qty = parseFloat(issueQuantity) || 0;
    const unitCost = Number(selectedItem.cost_per_unit || 0);
    return Math.round(qty * unitCost * 100) / 100;
  }, [selectedItem, issueQuantity]);

  // Filter items by useful maintenance/general categories for fast selection
  const maintenanceItems = useMemo(() => {
    return inventoryItems.filter(i => 
      ['Housekeeping & Cleaning', 'Packaging & Disposables', 'General'].includes(i.category)
    );
  }, [inventoryItems]);

  const otherItems = useMemo(() => {
    return inventoryItems.filter(i => 
      !['Housekeeping & Cleaning', 'Packaging & Disposables', 'General'].includes(i.category)
    );
  }, [inventoryItems]);

  // 4. useCallback Hooks
  const handleSelectQuickTag = useCallback((tag: { title: string; category: string }) => {
    setTitle(tag.title);
    setCategory(tag.category as ExpenseCategory);
  }, []);

  const resetForms = useCallback(() => {
    setTitle('');
    setAmount('');
    setCategory('maintenance');
    setPaymentMode('cash');
    setVendorName('');
    setNotes('');
    setIssueQuantity('');
    setIssuedToName('');
    setPurposeNote('Daily maintenance');
    setErrorMessage('');
    setSuccessMessage('');
  }, []);

  const handlePettyCashSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const amt = parseFloat(amount);
    if (!title.trim() || isNaN(amt) || amt <= 0) {
      setErrorMessage('Please enter a valid expense title and amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await recordPettyCashExpense({
        restaurantId,
        title: title.trim(),
        category,
        amount: amt,
        paymentMode,
        vendorName,
        notes,
        staffProfile: {
          id: profile?.id || '',
          name: profile?.full_name || profile?.role || 'Staff',
          role: userRole,
        },
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to record expense.');
        return;
      }

      setSuccessMessage(
        isCashier
          ? 'Expense submitted for Manager/Owner approval.'
          : 'Expense approved and recorded.'
      );

      setTimeout(() => {
        resetForms();
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error recording expense.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    amount, title, category, paymentMode, vendorName, notes, 
    restaurantId, profile, userRole, isCashier, resetForms, onSuccess, onClose
  ]);

  const handleStoreIssueSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const qty = parseFloat(issueQuantity);

    if (!selectedItemId || isNaN(qty) || qty <= 0) {
      setErrorMessage('Please select an item and enter a valid quantity.');
      return;
    }

    if (!issuedToName.trim()) {
      setErrorMessage('Please specify who this item is being issued to.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await issueStoreStockRequisition({
        restaurantId,
        inventoryItemId: selectedItemId,
        quantity: qty,
        issuedToName: issuedToName.trim(),
        purposeNote: purposeNote.trim(),
        staffProfile: {
          id: profile?.id || '',
          name: profile?.full_name || profile?.role || 'Staff',
          role: userRole,
        },
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to issue stock.');
        return;
      }

      setSuccessMessage(
        `Issued ${qty} ${selectedItem?.unit || 'units'} of ${selectedItem?.name}. Stock updated.`
      );

      setTimeout(() => {
        resetForms();
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error issuing stock.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    selectedItemId, issueQuantity, issuedToName, purposeNote,
    restaurantId, profile, userRole, selectedItem, resetForms, onSuccess, onClose
  ]);

  // Conditional return strictly AFTER all hooks
  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 rounded-xl">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Petty Cash & Store Requisition
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Recorded by: <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">{userRole}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-950/40 flex gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => { setActiveTab('petty_cash'); setErrorMessage(''); }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'petty_cash'
                ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Petty Cash Expense</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('store_issue'); setErrorMessage(''); }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'store_issue'
                ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <PackageCheck className="h-3.5 w-3.5" />
            <span>Store Stock Issue</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mx-5 mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* TAB 1: Petty Cash Form */}
        {activeTab === 'petty_cash' && (
          <form onSubmit={handlePettyCashSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
            {/* Approval Notice Banner */}
            {isCashier ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-2.5 text-[11px] text-amber-900 dark:text-amber-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <span className="font-bold">Approval Required:</span> This entry will be submitted for Manager or Owner approval before closing in the cash drawer and P&L.
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-xl flex items-center gap-2 text-[11px] text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Authorized as <strong>{userRole.toUpperCase()}</strong>: Automatically approved on submit.</span>
              </div>
            )}

            {/* Quick Tags */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Quick Selection
              </label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TAGS.map((tag, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectQuickTag(tag)}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Item Title */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Expense Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Broom, Mop, Phenyl, Detergent"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Amount & Payment Mode Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value as 'cash' | 'upi')}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="cash">Cash (Drawer)</option>
                  <option value="upi">UPI / Online</option>
                </select>
              </div>
            </div>

            {/* Category & Vendor Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Category
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 cursor-pointer"
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat.key} value={cat.key}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Vendor Name (Optional)
                </label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={e => setVendorName(e.target.value)}
                  placeholder="Local Vendor"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Cleaning floor before dinner shift"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>{isCashier ? 'Submit for Approval' : 'Save & Approve Expense'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: Store Requisition Form */}
        {activeTab === 'store_issue' && (
          <form onSubmit={handleStoreIssueSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
            <div className="p-2.5 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl flex items-center gap-2 text-[11px] text-indigo-900 dark:text-indigo-300">
              <PackageCheck className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>
                Store stock will be deducted from inventory and the cost will be recorded under Operating Expenses. The cash drawer is not affected.
              </span>
            </div>

            {/* Item Selection Dropdown */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Select Store Item *
              </label>
              {isLoadingItems ? (
                <div className="py-3 px-4 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs text-slate-400 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading stock items...
                </div>
              ) : (
                <select
                  required
                  value={selectedItemId}
                  onChange={e => setSelectedItemId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 cursor-pointer focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choose Item from Inventory --</option>
                  {maintenanceItems.length > 0 && (
                    <optgroup label="Cleaning & Packaging Supplies">
                      {maintenanceItems.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} (Stock: {item.current_stock} {item.unit} @ ₹{Number(item.cost_per_unit || 0)}/{item.unit})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {otherItems.length > 0 && (
                    <optgroup label="Raw Materials & Stock">
                      {otherItems.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} (Stock: {item.current_stock} {item.unit} @ ₹{Number(item.cost_per_unit || 0)}/{item.unit})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              )}
            </div>

            {/* Quantity and Live Cost Calculation */}
            <div className="grid grid-cols-2 gap-3 items-start">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Quantity to Issue ({selectedItem?.unit || 'Units'}) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  required
                  value={issueQuantity}
                  onChange={e => setIssueQuantity(e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  P&L Cost Impact
                </span>
                <span className="text-sm font-black text-indigo-700 dark:text-indigo-400">
                  ₹ {calculatedCost.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  (@ ₹{Number(selectedItem?.cost_per_unit || 0)} per {selectedItem?.unit || 'unit'})
                </span>
              </div>
            </div>

            {/* Issued To Staff Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Issued To *
              </label>
              <input
                type="text"
                required
                value={issuedToName}
                onChange={e => setIssuedToName(e.target.value)}
                placeholder="e.g. Cleaning Staff, Ramesh"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Purpose / Note */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Purpose Note
              </label>
              <input
                type="text"
                value={purposeNote}
                onChange={e => setPurposeNote(e.target.value)}
                placeholder="Floor cleaning, dining area, etc."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedItemId}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Deducting Stock...</span>
                  </>
                ) : (
                  <>
                    <span>Deduct Stock & Book Expense</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
