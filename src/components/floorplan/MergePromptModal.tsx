'use client';

import React from 'react';
import { Layers, X, Check } from 'lucide-react';
import { FloorPlanItem } from './types';

interface MergePromptModalProps {
  tableA: FloorPlanItem | null;
  tableB: FloorPlanItem | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const MergePromptModal: React.FC<MergePromptModalProps> = ({
  tableA,
  tableB,
  onConfirm,
  onCancel
}) => {
  if (!tableA || !tableB) return null;

  const totalSeats = (tableA.seats || 2) + (tableB.seats || 2);
  const combinedName = `${tableA.tableNumber.replace(/^T-?/, '')} + ${tableB.tableNumber.replace(/^T-?/, '')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-xl border border-[#E7E5E4] shadow-2xl max-w-sm w-full p-5 text-[#171717]">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-[#F5F5F4] flex items-center justify-center text-[#171717]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#171717]">Merge Tables?</h3>
              <p className="text-[11px] text-[#737373]">Combine seating capacity</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-[#737373] hover:text-[#171717] rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Details Card */}
        <div className="bg-[#F8F8F6] border border-[#E7E5E4] rounded-lg p-3.5 my-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#737373]">Tables to merge:</span>
            <span className="font-bold text-[#171717]">
              Table {tableA.display_number || tableA.tableNumber} & Table {tableB.display_number || tableB.tableNumber}
            </span>
          </div>

          {/* Merge Capacity Preview */}
          <div className="p-2.5 bg-white border border-[#E7E5E4] rounded-lg">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#737373] block mb-1.5">
              Merge Capacity Preview
            </span>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs">
                <span className="px-2 py-0.5 bg-stone-100 rounded text-stone-800 font-semibold">
                  T{tableA.display_number || tableA.tableNumber}: {tableA.seats || 4}s
                </span>
                <span className="text-stone-400 font-bold">+</span>
                <span className="px-2 py-0.5 bg-stone-100 rounded text-stone-800 font-semibold">
                  T{tableB.display_number || tableB.tableNumber}: {tableB.seats || 4}s
                </span>
              </div>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-md font-bold text-xs">
                = {totalSeats} Seats
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-[#737373]">Combined Entity:</span>
            <span className="font-bold text-[#171717]">Table {combinedName}</span>
          </div>
          <div className="text-[11px] text-[#737373] pt-1 border-t border-[#E7E5E4]">
            Permanent QR codes remain unchanged. Split back into individual tables anytime.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 px-3 border border-[#E7E5E4] rounded-lg text-xs font-semibold text-[#525252] hover:bg-[#F5F5F4] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            Merge Tables
          </button>
        </div>
      </div>
    </div>
  );
};
