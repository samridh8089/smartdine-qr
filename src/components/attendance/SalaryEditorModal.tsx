'use client';

import { useState, useMemo, useEffect } from 'react';
import { SalaryRecord, SalaryItem, saveStaffProfile } from '@/lib/attendoEngine';
import { Plus, Trash2, X, Check, Save, DollarSign } from 'lucide-react';

interface SalaryEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SalaryRecord | null;
  onSave: (updatedRecord: SalaryRecord) => Promise<void>;
}

export default function SalaryEditorModal({
  isOpen,
  onClose,
  record,
  onSave
}: SalaryEditorModalProps) {
  // STRICT HOOK DECLARATION ORDER: useState
  const [baseSalary, setBaseSalary] = useState<number>(0);
  const [salaryType, setSalaryType] = useState<'fixed' | 'per_day'>('fixed');
  const [grossEarned, setGrossEarned] = useState<number>(0);
  const [allowances, setAllowances] = useState<SalaryItem[]>([]);
  const [deductions, setDeductions] = useState<SalaryItem[]>([]);
  const [totalAdvance, setTotalAdvance] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending');
  const [saving, setSaving] = useState(false);

  // New item inputs
  const [newAllowanceName, setNewAllowanceName] = useState('');
  const [newAllowanceAmount, setNewAllowanceAmount] = useState('');
  const [newDeductionName, setNewDeductionName] = useState('');
  const [newDeductionAmount, setNewDeductionAmount] = useState('');

  // useMemo: Live Totals Calculation
  const liveTotals = useMemo(() => {
    if (!record) return { totalEarnings: 0, totalDeductions: 0, netSalary: 0 };
    const allowancesSum = allowances.reduce((acc, a) => acc + (Number(a.amount) || 0), 0);
    const deductionsSum = deductions.reduce((acc, d) => acc + (Number(d.amount) || 0), 0) + (Number(totalAdvance) || 0);
    const totalEarnings = (Number(grossEarned) || 0) + allowancesSum;
    const totalDeductions = deductionsSum;
    const netSalary = Math.max(0, totalEarnings - totalDeductions);
    return { totalEarnings, totalDeductions, netSalary };
  }, [record, grossEarned, allowances, deductions, totalAdvance]);

  // useEffect: Populate state when record changes
  useEffect(() => {
    if (record) {
      const base = Number(record.base_salary) || 0;
      const type = record.salary_type || 'fixed';
      setBaseSalary(base);
      setSalaryType(type);
      setGrossEarned(Number(record.gross_earned) || (type === 'fixed' ? base : 0));
      setAllowances(record.allowances || []);
      setDeductions(record.deductions || []);
      setTotalAdvance(Number(record.total_advance) || 0);
      setPaymentStatus(record.status || 'pending');
    }
  }, [record]);

  // Conditional early return AFTER all hooks
  if (!isOpen || !record) return null;

  const handleSalaryTypeChange = (newType: 'fixed' | 'per_day') => {
    setSalaryType(newType);
    if (record) {
      if (newType === 'fixed') {
        setGrossEarned(baseSalary);
      } else {
        const days = record.total_days_in_month || 30;
        const effectiveDays = (Number(record.total_present_days) || 0) + (Number(record.total_half_days) || 0) * 0.5;
        const dailyRate = days > 0 ? baseSalary / days : 0;
        setGrossEarned(Math.round(effectiveDays * dailyRate));
      }
    }
  };

  const handleBaseSalaryChange = (newBase: number) => {
    setBaseSalary(newBase);
    if (record) {
      if (salaryType === 'fixed') {
        setGrossEarned(newBase);
      } else {
        const days = record.total_days_in_month || 30;
        const effectiveDays = (Number(record.total_present_days) || 0) + (Number(record.total_half_days) || 0) * 0.5;
        const dailyRate = days > 0 ? newBase / days : 0;
        setGrossEarned(Math.round(effectiveDays * dailyRate));
      }
    }
  };

  const handleAddAllowance = () => {
    if (!newAllowanceName.trim() || !newAllowanceAmount) return;
    setAllowances(prev => [
      ...prev,
      {
        id: `al_${Date.now()}`,
        name: newAllowanceName.trim(),
        amount: Math.max(0, parseFloat(newAllowanceAmount) || 0)
      }
    ]);
    setNewAllowanceName('');
    setNewAllowanceAmount('');
  };

  const handleRemoveAllowance = (id: string) => {
    setAllowances(prev => prev.filter(a => a.id !== id));
  };

  const handleAddDeduction = () => {
    if (!newDeductionName.trim() || !newDeductionAmount) return;
    setDeductions(prev => [
      ...prev,
      {
        id: `ded_${Date.now()}`,
        name: newDeductionName.trim(),
        amount: Math.max(0, parseFloat(newDeductionAmount) || 0)
      }
    ]);
    setNewDeductionName('');
    setNewDeductionAmount('');
  };

  const handleRemoveDeduction = (id: string) => {
    setDeductions(prev => prev.filter(d => d.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Update staff profile base salary & salary type in database so it sticks permanently
      try {
        await saveStaffProfile({
          id: record.staff_id,
          restaurant_id: record.restaurant_id,
          name: record.staff_name || '',
          base_salary: baseSalary,
          salary_type: salaryType
        });
      } catch (err) {
        console.warn('Failed updating staff profile base salary:', err);
      }

      // 2. Update monthly salary record
      const updated: SalaryRecord = {
        ...record,
        base_salary: baseSalary,
        salary_type: salaryType,
        gross_earned: grossEarned,
        allowances,
        deductions,
        total_advance: totalAdvance,
        net_salary: liveTotals.netSalary,
        status: paymentStatus,
        paid_at: paymentStatus === 'paid' ? (record.paid_at || new Date().toISOString()) : null,
        updated_at: new Date().toISOString()
      };

      await onSave(updated);
      onClose();
    } catch (e) {
      console.error('Failed saving salary record:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full my-6 overflow-hidden flex flex-col text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-white">
              Edit Salary, Allowances & Deductions
            </h2>
            <p className="text-xs text-slate-500">
              Staff: <strong className="text-slate-700 dark:text-slate-300">{record.staff_name}</strong> ({record.staff_role}) — Month {record.month}/{record.year}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Section 0: EDITABLE BASE MONTHLY SALARY */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  Monthly Base Salary (₹)
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Change staff base salary here. Gross earned and net pay will recalculate automatically.
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm">
                <span className="text-base font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={baseSalary}
                  onChange={e => handleBaseSalaryChange(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-32 text-base font-bold text-right bg-transparent text-slate-900 dark:text-white outline-none"
                  placeholder="Base Salary"
                />
              </div>
            </div>
          </div>

          {/* Salary Calculation Mode: Fixed Monthly vs Per-Day Attendance */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <span>Calculation Mode:</span>
                <span className="text-slate-900 dark:text-white font-bold">
                  {salaryType === 'fixed' ? 'Fixed Monthly Pay' : 'Per-Day Attendance Pro-rated'}
                </span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {salaryType === 'fixed'
                  ? `Fixed Monthly: Pays full monthly base salary (₹${baseSalary.toLocaleString('en-IN')}) irrespective of punch records.`
                  : `Per-Day Pro-rated: Calculated strictly based on present days (${record.total_present_days} full days × daily rate).`}
              </p>
            </div>
            <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-700/60 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => handleSalaryTypeChange('fixed')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                  salaryType === 'fixed'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Fixed Monthly
              </button>
              <button
                type="button"
                onClick={() => handleSalaryTypeChange('per_day')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                  salaryType === 'per_day'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Per-Day Attendance
              </button>
            </div>
          </div>

          {/* Base Summary Calculation Badge */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl text-center text-xs border border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-slate-500">Days Present</p>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                {record.total_present_days} Full + {record.total_half_days} Half
              </p>
            </div>
            <div>
              <p className="text-slate-500">Gross Earned</p>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">₹{Number(grossEarned).toLocaleString('en-IN')}</p>
              <span className="text-[10px] text-slate-400 block font-normal">
                {salaryType === 'fixed' ? 'Fixed Base' : 'Days × Rate'}
              </span>
            </div>
            <div>
              <p className="text-slate-500">Live Net Salary</p>
              <p className="font-bold text-slate-900 dark:text-white text-sm">₹{liveTotals.netSalary.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Section 1: Custom Allowances / Earnings */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Allowances & Additional Earnings (Uniform, Rent, Bonus, Food)
            </label>

            {/* List */}
            <div className="space-y-2">
              {allowances.map(a => (
                <div key={a.id} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{a.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-800 dark:text-slate-200">+₹{Number(a.amount).toLocaleString('en-IN')}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAllowance(a.id)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Allowance Row */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Allowance Name (e.g. Uniform Allowance, Rent)"
                value={newAllowanceName}
                onChange={e => setNewAllowanceName(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
              <input
                type="number"
                placeholder="Amount (₹)"
                value={newAllowanceAmount}
                onChange={e => setNewAllowanceAmount(e.target.value)}
                className="w-28 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={handleAddAllowance}
                className="flex items-center gap-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>

          {/* Section 2: Deductions & Advances */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Deductions & Advance Repayments
            </label>

            {/* Total Advance Repayment Input */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Salary Advance Repayment:</span>
                <p className="text-[10px] text-slate-500">Directly subtracted from net pay</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-bold">₹</span>
                <input
                  type="number"
                  min="0"
                  value={totalAdvance}
                  onChange={e => setTotalAdvance(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-28 px-3 py-1.5 text-xs font-bold text-right rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Other Deductions List */}
            <div className="space-y-2">
              {deductions.map(d => (
                <div key={d.id} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{d.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-800 dark:text-slate-200">-₹{Number(d.amount).toLocaleString('en-IN')}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDeduction(d.id)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Deduction Row */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Deduction Name (e.g. Damage, Late Cut)"
                value={newDeductionName}
                onChange={e => setNewDeductionName(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
              <input
                type="number"
                placeholder="Amount (₹)"
                value={newDeductionAmount}
                onChange={e => setNewDeductionAmount(e.target.value)}
                className="w-28 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={handleAddDeduction}
                className="flex items-center gap-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>

          {/* Section 3: Payment Status Toggle */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Salary Payment Status:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPaymentStatus('pending')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                  paymentStatus === 'pending'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setPaymentStatus('paid')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                  paymentStatus === 'paid'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Paid
              </button>
            </div>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
          <div>
            <span className="text-xs text-slate-500">Updated Net Pay:</span>
            <p className="text-base font-extrabold text-slate-900 dark:text-white">₹{liveTotals.netSalary.toLocaleString('en-IN')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Salary & Breakdown'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
