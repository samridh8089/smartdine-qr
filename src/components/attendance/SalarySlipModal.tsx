'use client';

import { useMemo } from 'react';
import { SalaryRecord } from '@/lib/attendoEngine';
import { Restaurant } from '@/lib/db';
import { Printer, X, CheckCircle, Clock } from 'lucide-react';

interface SalarySlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SalaryRecord | null;
  restaurant: Restaurant | null;
}

// Convert number to Indian currency words
function numberToWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ',
    'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ',
    'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    if (n < 20) return a[n];
    const digit = n % 10;
    if (n < 100) return b[Math.floor(n / 10)] + (digit ? '-' + a[digit] : ' ');
    if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 === 0 ? '' : inWords(n % 100));
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 === 0 ? '' : inWords(n % 1000));
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 === 0 ? '' : inWords(n % 100000));
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 === 0 ? '' : inWords(n % 10000000));
  }

  return inWords(Math.floor(num)).trim() + ' Rupees Only';
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function SalarySlipModal({
  isOpen,
  onClose,
  record,
  restaurant
}: SalarySlipModalProps) {
  // STRICT HOOK DECLARATION ORDER: useMemo
  const totals = useMemo(() => {
    if (!record) return { totalEarnings: 0, totalDeductions: 0, netSalary: 0 };
    const allowancesSum = (record.allowances || []).reduce((acc, a) => acc + (Number(a.amount) || 0), 0);
    const deductionsSum = (record.deductions || []).reduce((acc, d) => acc + (Number(d.amount) || 0), 0) + (Number(record.total_advance) || 0);
    const totalEarnings = (Number(record.gross_earned) || 0) + allowancesSum;
    const totalDeductions = deductionsSum;
    const netSalary = Math.max(0, totalEarnings - totalDeductions);
    return { totalEarnings, totalDeductions, netSalary };
  }, [record]);

  const monthName = useMemo(() => {
    if (!record) return '';
    return MONTH_NAMES[(record.month || 1) - 1] || '';
  }, [record]);

  // Conditional early return AFTER all hooks
  if (!isOpen || !record) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 bg-slate-950/75 backdrop-blur-sm flex justify-center items-start">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full my-4 sm:my-8 overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col">
        {/* Header Bar with Action Controls (Hidden in Print) */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Salary Slip Preview — {monthName} {record.year}
            </span>
            {record.status === 'paid' ? (
              <span className="inline-flex items-center text-[11px] font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-2 py-0.5 rounded-full">
                Paid
              </span>
            ) : (
              <span className="inline-flex items-center text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full">
                Pending Payment
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition"
            >
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Salary Slip Canvas */}
        <div id="salary-slip-print-area" className="p-8 space-y-6 bg-white text-slate-900">
          {/* Restaurant Branding Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-800 pb-5">
            <div className="flex items-start gap-4">
              {/* Restaurant Logo or Initial Monogram */}
              {restaurant?.logo_url ? (
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="w-14 h-14 rounded-2xl object-cover border border-slate-300 shadow-sm shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-2xl shadow-sm shrink-0 uppercase">
                  {restaurant?.name ? restaurant.name.charAt(0) : 'R'}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-black uppercase tracking-wide text-slate-900">
                  {restaurant?.name || 'CleverOps Restaurant'}
                </h1>
                <p className="text-xs text-slate-600 mt-1 max-w-md">
                  {restaurant?.address || 'Restaurant Floor, City Center'}
                </p>
                <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-1.5 font-medium">
                  {restaurant?.phone && <span>Phone: {restaurant.phone}</span>}
                  {restaurant?.gst_number && <span>GSTIN: {restaurant.gst_number}</span>}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-block px-3 py-1 bg-slate-900 text-white font-extrabold text-xs uppercase tracking-wider rounded">
                PAYSLIP
              </span>
              <p className="text-xs font-bold text-slate-700 mt-2">
                Month: {monthName} {record.year}
              </p>
              <p className="text-[11px] text-slate-500">
                Generated: {new Date().toLocaleDateString('en-IN')}
              </p>
            </div>
          </div>

          {/* Employee & Attendance Overview Grid */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Employee Name:</span>
                <span className="font-bold text-slate-800 uppercase">{record.staff_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Designation / Role:</span>
                <span className="font-bold text-slate-800 uppercase">{record.staff_role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Staff ID:</span>
                <span className="font-mono text-slate-700">{record.staff_id.slice(0, 10)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Pay Structure:</span>
                <span className="font-bold text-slate-800">
                  {record.salary_type === 'per_day' ? 'Per-Day Pro-rated' : 'Fixed Monthly'}
                </span>
              </div>
            </div>
            <div className="space-y-1.5 border-l border-slate-200 pl-4">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Days in Month:</span>
                <span className="font-bold text-slate-800">{record.total_days_in_month} Days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Days Present / Paid:</span>
                <span className="font-bold text-slate-800">{record.total_present_days} Full + {record.total_half_days} Half</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Late Marks:</span>
                <span className="font-bold text-slate-800">{record.total_late_days} Late</span>
              </div>
            </div>
          </div>

          {/* 2-Column Earnings & Deductions Table */}
          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-slate-300">
              {/* Earnings Column */}
              <div>
                <div className="bg-slate-100 px-4 py-2 text-xs font-extrabold uppercase text-slate-800 border-b border-slate-300 flex justify-between">
                  <span>Earnings / Allowances</span>
                  <span>Amount (₹)</span>
                </div>
                <div className="p-3 space-y-2 text-xs divide-y divide-slate-100">
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-600">Base Salary (Gross Monthly)</span>
                    <span className="font-semibold text-slate-800">₹{Number(record.base_salary).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between pt-1.5">
                    <span className="text-slate-600 font-medium">
                      {record.salary_type === 'per_day' ? 'Attendance Earned Pay' : 'Earned Base Salary'}
                    </span>
                    <span className="font-bold text-slate-800">₹{Number(record.gross_earned).toLocaleString('en-IN')}</span>
                  </div>
                  {(record.allowances || []).map((item, idx) => (
                    <div key={item.id || idx} className="flex justify-between pt-1.5 text-slate-700">
                      <span>{item.name}</span>
                      <span className="font-semibold">+₹{Number(item.amount).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deductions Column */}
              <div>
                <div className="bg-slate-100 px-4 py-2 text-xs font-extrabold uppercase text-slate-800 border-b border-slate-300 flex justify-between">
                  <span>Deductions / Advances</span>
                  <span>Amount (₹)</span>
                </div>
                <div className="p-3 space-y-2 text-xs divide-y divide-slate-100">
                  {Number(record.total_advance) > 0 && (
                    <div className="flex justify-between pt-1 text-slate-700">
                      <span>Salary Advance Repayment</span>
                      <span className="font-semibold">-₹{Number(record.total_advance).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {(record.deductions || []).map((item, idx) => (
                    <div key={item.id || idx} className="flex justify-between pt-1.5 text-slate-700">
                      <span>{item.name}</span>
                      <span className="font-semibold">-₹{Number(item.amount).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  {Number(record.total_advance) === 0 && (record.deductions || []).length === 0 && (
                    <div className="py-4 text-center text-slate-400 text-xs italic">
                      No deductions applied
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Subtotals Footer */}
            <div className="grid grid-cols-2 divide-x divide-slate-300 bg-slate-50 border-t border-slate-300 text-xs font-bold py-2.5 px-4">
              <div className="flex justify-between pr-4">
                <span>Total Gross Earnings:</span>
                <span className="text-slate-900 font-extrabold">₹{totals.totalEarnings.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between pl-4">
                <span>Total Deductions:</span>
                <span className="text-slate-900 font-extrabold">₹{totals.totalDeductions.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Net Pay Highlight Block */}
          <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Net Payable Salary
              </p>
              <p className="text-xs text-slate-200 font-medium italic mt-0.5">
                {numberToWords(totals.netSalary)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-white">
                ₹{totals.netSalary.toLocaleString('en-IN')}
              </span>
              <p className="text-[10px] text-slate-300 font-semibold uppercase">
                Payment Status: {record.status}
              </p>
            </div>
          </div>

          {/* Digital Verification Notice (No Physical Signatures Required) */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Verified System-Generated Payslip • CleverOps Payroll</span>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              This document is electronically generated. No physical signature required.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
