'use client';

import React, { useState } from 'react';
import { 
  Receipt, Printer, Split, CheckCircle2, 
  X, Banknote, CreditCard, QrCode, AlertCircle, Clock, User
} from 'lucide-react';
import { FloorPlanItem } from './types';
import { formatPrice } from '@/lib/utils';

interface OpenBillsDrawerProps {
  table: FloorPlanItem | null;
  isOpen: boolean;
  onClose: () => void;
  currency?: string;
  onSettleBill?: (table: FloorPlanItem, method: 'cash' | 'upi' | 'card') => void;
}

export const OpenBillsDrawer: React.FC<OpenBillsDrawerProps> = ({
  table,
  isOpen,
  onClose,
  currency = 'INR',
  onSettleBill
}) => {
  const [splitCount, setSplitCount] = useState<number>(2);
  const [showSplitView, setShowSplitView] = useState<boolean>(false);
  const [settlingMethod, setSettlingMethod] = useState<'cash' | 'upi' | 'card' | null>(null);
  const [isSettled, setIsSettled] = useState<boolean>(false);

  if (!isOpen || !table) return null;

  const displayNum = table.display_number || table.tableNumber || '1';
  const guests = table.currentGuests || table.seats || 2;
  const waiter = table.waiterName || 'Staff';
  
  // Sample active items for current dining session
  const activeItems = [
    { id: '1', name: 'Paneer Butter Masala', qty: 1, price: 280 },
    { id: '2', name: 'Butter Naan', qty: 3, price: 50 },
    { id: '3', name: 'Dal Makhani', qty: 1, price: 240 },
    { id: '4', name: 'Fresh Lime Soda', qty: 2, price: 80 }
  ];

  const subtotal = activeItems.reduce((acc, i) => acc + (i.price * i.qty), 0);
  const gst = Math.round(subtotal * 0.05);
  const grandTotal = subtotal + gst;
  const splitAmount = Math.round(grandTotal / splitCount);

  const handlePrint = () => {
    window.print();
  };

  const handleConfirmSettle = (method: 'cash' | 'upi' | 'card') => {
    setSettlingMethod(method);
    setTimeout(() => {
      setIsSettled(true);
      onSettleBill?.(table, method);
      setTimeout(() => {
        setIsSettled(false);
        setSettlingMethod(null);
        onClose();
      }, 1200);
    }, 600);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-3 animate-slide-up pointer-events-none">
      <div className="bg-white dark:bg-stone-900 border border-[#E7E5E4] dark:border-stone-800 rounded-2xl shadow-2xl max-w-xl w-full p-5 pointer-events-auto text-stone-900 dark:text-stone-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#F8F8F6] dark:bg-stone-800 border border-[#E7E5E4] dark:border-stone-700 flex items-center justify-center font-bold text-sm text-stone-900 dark:text-white">
              {displayNum}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                  Table {displayNum} &bull; Open Bill
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                  Unsettled
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1.5">
                <User className="w-3 h-3" /> {table.reservationPartyName || 'Dine-In Guest'} &bull; {guests} Guests &bull; Waiter: {waiter}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-900 dark:hover:text-white rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {isSettled ? (
          <div className="py-8 text-center space-y-2 animate-fade-in">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-base text-stone-900 dark:text-white">Bill Successfully Settled!</h4>
            <p className="text-xs text-stone-500">Paid {formatPrice(grandTotal, currency)} via {settlingMethod?.toUpperCase()}. Table marked ready for cleaning.</p>
          </div>
        ) : (
          <div className="py-3 space-y-4">
            {/* Items summary */}
            <div className="max-h-36 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800 text-xs">
              {activeItems.map((item) => (
                <div key={item.id} className="py-1.5 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900 dark:text-white">{item.qty}x</span>
                    <span className="text-stone-700 dark:text-stone-300">{item.name}</span>
                  </div>
                  <span className="font-mono font-medium text-stone-900 dark:text-white">
                    {formatPrice(item.price * item.qty, currency)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="bg-[#F8F8F6] dark:bg-stone-850 p-3 rounded-xl border border-[#E7E5E4] dark:border-stone-800 space-y-1 text-xs">
              <div className="flex justify-between text-stone-500">
                <span>Subtotal</span>
                <span className="font-mono">{formatPrice(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>GST (5%)</span>
                <span className="font-mono">{formatPrice(gst, currency)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-stone-900 dark:text-white pt-1 border-t border-stone-200 dark:border-stone-700">
                <span>Grand Total</span>
                <span className="font-mono">{formatPrice(grandTotal, currency)}</span>
              </div>
            </div>

            {/* Split View Toggle */}
            {showSplitView && (
              <div className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700 space-y-2 animate-fade-in text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 dark:text-white">Split Between Guests:</span>
                  <div className="flex items-center gap-2">
                    {[2, 3, 4, 5].map((cnt) => (
                      <button
                        key={`split_${cnt}`}
                        type="button"
                        onClick={() => setSplitCount(cnt)}
                        className={`px-2.5 py-1 rounded-md font-bold text-xs cursor-pointer ${
                          splitCount === cnt
                            ? 'bg-stone-900 text-white'
                            : 'bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-stone-600 dark:text-stone-300 font-medium text-center pt-1">
                  Each guest pays: <span className="font-bold font-mono text-stone-900 dark:text-white">{formatPrice(splitAmount, currency)}</span>
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-200 dark:border-stone-800 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSplitView(!showSplitView)}
                  className="px-3 py-1.5 text-xs font-semibold border border-stone-300 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <Split className="w-3.5 h-3.5" />
                  {showSplitView ? 'Hide Split' : 'Split Bill'}
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 text-xs font-semibold border border-stone-300 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleConfirmSettle('cash')}
                  disabled={settlingMethod !== null}
                  className="px-3 py-1.5 text-xs font-bold bg-stone-900 hover:bg-black text-white rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Banknote className="w-3.5 h-3.5" /> Cash
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmSettle('upi')}
                  disabled={settlingMethod !== null}
                  className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <QrCode className="w-3.5 h-3.5" /> UPI
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmSettle('card')}
                  disabled={settlingMethod !== null}
                  className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <CreditCard className="w-3.5 h-3.5" /> Card
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
