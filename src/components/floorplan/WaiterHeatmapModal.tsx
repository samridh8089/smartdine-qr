'use client';

import React from 'react';
import { UserCheck, X, AlertTriangle, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { FloorPlanItem } from './types';

interface WaiterHeatmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: FloorPlanItem[];
  waiters?: Array<{ id: string; name: string }>;
}

export const WaiterHeatmapModal: React.FC<WaiterHeatmapModalProps> = ({
  isOpen,
  onClose,
  items,
  waiters = [
    { id: 'w1', name: 'Priya Sharma' },
    { id: 'w2', name: 'Rahul Verma' },
    { id: 'w3', name: 'Amit Patel' },
    { id: 'w4', name: 'Sunita Roy' }
  ]
}) => {
  if (!isOpen) return null;

  const tableItems = items.filter((it) => it.kind === 'table' && !it.is_archived);

  // Compute workload for each waiter
  const workloadStats = waiters.map((waiter) => {
    const assignedTables = tableItems.filter((t) => {
      // Direct match or waiter name match
      return t.assigned_waiter_id === waiter.id || t.waiterName === waiter.name;
    });

    const activeOccupied = assignedTables.filter((t) => t.status === 'occupied').length;
    const totalSeats = assignedTables.reduce((acc, t) => acc + (t.seats || 4), 0);
    const tableCount = assignedTables.length;

    // Load category: Green: 1-2, Amber: 3-4, Red: 5+
    let loadCategory: 'green' | 'amber' | 'red' = 'green';
    let loadLabel = 'Optimal';
    if (tableCount >= 5) {
      loadCategory = 'red';
      loadLabel = 'High Load';
    } else if (tableCount >= 3) {
      loadCategory = 'amber';
      loadLabel = 'Moderate';
    } else if (tableCount === 0) {
      loadLabel = 'Idle';
    }

    return {
      ...waiter,
      tableCount,
      assignedTables,
      activeOccupied,
      totalSeats,
      loadCategory,
      loadLabel
    };
  });

  const unassignedTables = tableItems.filter((t) => {
    return !t.assigned_waiter_id && !t.waiterName;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-2xl max-w-lg w-full p-5 text-[#171717]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#EFEDE8]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F5F5F4] border border-[#E7E5E4] flex items-center justify-center text-[#171717]">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#171717]">
                Waiter Workload Heatmap
              </h3>
              <p className="text-[11px] text-[#737373]">Live floor load distribution</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#737373] hover:text-[#171717] rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Legend */}
        <div className="my-3 flex items-center justify-between bg-[#F8F8F6] border border-[#E7E5E4] rounded-lg px-3 py-2 text-[11px]">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-[#525252]">1–2 Tables (Optimal)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-[#525252]">3–4 Tables (Moderate)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-[#525252]">5+ Tables (High)</span>
          </div>
        </div>

        {/* Waiter Workload List */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {workloadStats.map((w) => (
            <div
              key={w.id}
              className="p-3 border border-[#E7E5E4] rounded-xl bg-white hover:border-[#171717]/30 transition-all flex items-center justify-between"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-[#171717]">{w.name}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      w.loadCategory === 'red'
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : w.loadCategory === 'amber'
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {w.loadLabel}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-[11px] text-[#737373] mt-1">
                  <span>{w.tableCount} Tables assigned</span>
                  <span>&bull;</span>
                  <span>{w.totalSeats} Total seats</span>
                  <span>&bull;</span>
                  <span className="text-stone-900 font-semibold">{w.activeOccupied} Occupied</span>
                </div>
              </div>

              {/* Workload Progress Bar Pill */}
              <div className="w-20 bg-stone-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    w.loadCategory === 'red'
                      ? 'bg-red-500'
                      : w.loadCategory === 'amber'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (w.tableCount / 6) * 100)}%` }}
                />
              </div>
            </div>
          ))}

          {unassignedTables.length > 0 && (
            <div className="p-3 border border-amber-200 rounded-xl bg-amber-50/50 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-amber-900 font-semibold">
                  {unassignedTables.length} Tables currently unassigned
                </span>
              </div>
              <span className="text-[11px] text-amber-700">
                (Handled by General pool)
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-3 border-t border-[#EFEDE8] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 bg-[#171717] hover:bg-[#262626] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Close Heatmap
          </button>
        </div>
      </div>
    </div>
  );
};
