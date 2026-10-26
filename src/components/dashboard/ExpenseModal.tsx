'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Trash2, Plus, Check } from 'lucide-react';
import { 
  RestaurantExpense, 
  ExpenseCategory, 
  EXPENSE_CATEGORIES, 
  saveRestaurantExpense, 
  updateRestaurantExpense, 
  deleteRestaurantExpense 
} from '@/lib/pnlEngine';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  userId?: string;
  initialExpense?: RestaurantExpense | null;
  onExpenseSaved: () => void;
}

export default function ExpenseModal({
  isOpen,
  onClose,
  restaurantId,
  userId,
  initialExpense,
  onExpenseSaved,
}: ExpenseModalProps) {
  // 1. All hooks at the very top (CleverOps React Hook Safety Rule)
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('electricity');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'bank_transfer' | 'card' | 'cheque'>('cash');
  const [vendorName, setVendorName] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mounted, setMounted] = useState(false);

  // Custom Category Add State (SS2 Request: "ss2 yaha add ka option chaiye")
  const [customCategories, setCustomCategories] = useState<{ key: string; label: string; defaultRecurring: boolean }[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialExpense) {
      setTitle(initialExpense.title || '');
      setCategory(initialExpense.category || 'other');
      setAmount(initialExpense.amount ? String(initialExpense.amount) : '');
      setExpenseDate(initialExpense.expense_date || new Date().toISOString().split('T')[0]);
      setPaymentMode(initialExpense.payment_mode || 'cash');
      setVendorName(initialExpense.vendor_name || '');
      setIsRecurring(Boolean(initialExpense.is_recurring));
      setNotes(initialExpense.notes || '');
    } else {
      setTitle('');
      setCategory('electricity');
      setAmount('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setPaymentMode('cash');
      setVendorName('');
      setIsRecurring(false);
      setNotes('');
    }
    setErrorMsg('');
    setIsAddingCategory(false);
    setNewCategoryInput('');
  }, [initialExpense, isOpen]);

  // Combined list of categories
  const allCategories = useMemo(() => {
    return [...EXPENSE_CATEGORIES, ...customCategories];
  }, [customCategories]);

  // Quick categories list (First 6 defaults + any added custom categories)
  const quickCategories = useMemo(() => {
    return [...EXPENSE_CATEGORIES.slice(0, 6), ...customCategories];
  }, [customCategories]);

  // Conditional return strictly AFTER all hooks
  if (!isOpen || !mounted) return null;

  const handleSelectQuickCategory = (catKey: string) => {
    setCategory(catKey);
    const meta = allCategories.find(c => c.key === catKey);
    if (!title || allCategories.some(c => c.label === title)) {
      setTitle(meta?.label || '');
    }
    if (meta?.defaultRecurring) {
      setIsRecurring(true);
    }
  };

  const handleAddCustomCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) {
      setIsAddingCategory(false);
      return;
    }

    const slug = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const existing = allCategories.find(c => c.key === slug || c.label.toLowerCase() === trimmed.toLowerCase());
    
    if (existing) {
      handleSelectQuickCategory(existing.key);
    } else {
      const newMeta = { key: slug, label: trimmed, defaultRecurring: false };
      setCustomCategories(prev => [...prev, newMeta]);
      setCategory(slug);
      if (!title || allCategories.some(c => c.label === title)) {
        setTitle(trimmed);
      }
    }

    setIsAddingCategory(false);
    setNewCategoryInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter an amount greater than ₹0');
      return;
    }

    if (!title.trim()) {
      setErrorMsg('Please enter a description for this expense');
      return;
    }

    setIsSubmitting(true);
    try {
      if (initialExpense?.id) {
        const res = await updateRestaurantExpense(restaurantId, initialExpense.id, {
          title: title.trim(),
          category: category as ExpenseCategory,
          amount: parsedAmount,
          expense_date: expenseDate,
          payment_mode: paymentMode,
          vendor_name: vendorName.trim() || null,
          is_recurring: isRecurring,
          recurring_frequency: isRecurring ? 'monthly' : null,
          notes: notes.trim() || null,
        });

        if (!res.success) {
          throw new Error(res.error || 'Failed to update expense');
        }
      } else {
        const res = await saveRestaurantExpense(
          restaurantId,
          {
            title: title.trim(),
            category: category as ExpenseCategory,
            amount: parsedAmount,
            expense_date: expenseDate,
            payment_mode: paymentMode,
            vendor_name: vendorName.trim() || null,
            is_recurring: isRecurring,
            recurring_frequency: isRecurring ? 'monthly' : null,
            notes: notes.trim() || null,
          },
          userId
        );

        if (!res.success) {
          throw new Error(res.error || 'Failed to save expense');
        }
      }

      onExpenseSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialExpense?.id) return;
    if (!confirm('Are you sure you want to delete this expense?')) return;
    setIsDeleting(true);
    try {
      const res = await deleteRestaurantExpense(restaurantId, initialExpense.id);
      if (!res.success) throw new Error(res.error || 'Failed to delete expense');
      onExpenseSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting expense');
    } finally {
      setIsDeleting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/70 dark:bg-slate-800/40">
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
              {initialExpense ? 'Edit Operating Expense' : 'Add Operating Expense'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isDeleting}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Compact Form Body (NO Vertical Scrollbar & Monochrome) */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="px-5 py-3.5 space-y-3">
            {errorMsg && (
              <div className="p-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            {/* Quick Category Chips with '+ Add Category' option (SS2 Request) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Quick Category
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {quickCategories.map((cat) => {
                  const isSelected = category === cat.key;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => handleSelectQuickCategory(cat.key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition text-center cursor-pointer ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900 font-bold shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {cat.label.split(' / ')[0]}
                    </button>
                  );
                })}

                {/* SS2: Add Category Option Button / Inline Input */}
                {isAddingCategory ? (
                  <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-300 dark:border-slate-700">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Category name..."
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomCategory();
                        } else if (e.key === 'Escape') {
                          setIsAddingCategory(false);
                          setNewCategoryInput('');
                        }
                      }}
                      className="px-2 py-0.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded focus:outline-none w-28 sm:w-36 text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomCategory}
                      className="px-2 py-0.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[11px] font-bold rounded cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCategory(false);
                        setNewCategoryInput('');
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(true)}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold border border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-500 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
                    title="Add new category"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add</span>
                  </button>
                )}
              </div>
            </div>

            {/* Row 1: Description & Category Dropdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Expense Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shop Rent, Power Bill"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-slate-900 dark:focus:ring-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => handleSelectQuickCategory(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-slate-900 dark:focus:ring-white focus:outline-none cursor-pointer"
                >
                  {allCategories.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Amount & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-xs font-black text-slate-400">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-6 pr-3 py-1.5 text-xs font-black text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-slate-900 dark:focus:ring-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Expense Date
                </label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-slate-900 dark:focus:ring-white focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Row 3: Payment Mode & Vendor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-slate-900 dark:focus:ring-white focus:outline-none cursor-pointer"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI / Online</option>
                  <option value="bank_transfer">Bank Transfer / NEFT</option>
                  <option value="card">Card</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Paid To / Vendor (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Landlord, Electricity Board"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-slate-900 dark:focus:ring-white focus:outline-none"
                />
              </div>
            </div>

            {/* Row 4: Repeat Monthly Toggle & Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
              <label 
                htmlFor="isRecurring" 
                className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/60 cursor-pointer select-none"
              >
                <input
                  id="isRecurring"
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="h-3.5 w-3.5 rounded text-slate-900 focus:ring-slate-900 border-slate-300 cursor-pointer accent-slate-900 dark:accent-white"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block leading-tight">
                    Repeat Monthly
                  </span>
                  <span className="text-[10px] text-slate-400 block leading-none">
                    Prorated in daily reports
                  </span>
                </div>
              </label>

              <div>
                <input
                  type="text"
                  placeholder="Invoice # or reference (Optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-slate-900 dark:focus:ring-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Compact Modal Footer */}
          <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-800/30">
            {initialExpense?.id ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting || isDeleting}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>Delete</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting || isDeleting}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isDeleting}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-bold rounded-lg shadow-2xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{initialExpense ? 'Update Expense' : 'Save Expense'}</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
