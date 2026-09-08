'use client';

import React, { useState } from 'react';
import { 
  Users, QrCode, Printer, Edit2, UserCheck, Layers, 
  Archive, X, Check, AlertTriangle, ChevronRight, Hash
} from 'lucide-react';
import { FloorPlanItem } from './types';

interface WaiterOption {
  id: string;
  name: string;
}

interface TableQuickActionPopoverProps {
  table: FloorPlanItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSeatGuest: (table: FloorPlanItem) => void;
  onViewQR: (table: FloorPlanItem) => void;
  onPrintQR: (table: FloorPlanItem) => void;
  onRenameTable: (table: FloorPlanItem, newDisplayNumber: string) => Promise<void> | void;
  onChangeSeats: (table: FloorPlanItem, newSeats: number) => Promise<void> | void;
  onAssignWaiter: (table: FloorPlanItem, waiterId: string | null) => Promise<void> | void;
  onMergeTable: (table: FloorPlanItem) => void;
  onArchiveTable: (table: FloorPlanItem) => Promise<void> | void;
  availableWaiters?: WaiterOption[];
  defaultZoneWaiterName?: string;
}

export const TableQuickActionPopover: React.FC<TableQuickActionPopoverProps> = ({
  table,
  isOpen,
  onClose,
  onSeatGuest,
  onViewQR,
  onPrintQR,
  onRenameTable,
  onChangeSeats,
  onAssignWaiter,
  onMergeTable,
  onArchiveTable,
  availableWaiters = [
    { id: 'w1', name: 'Priya Sharma' },
    { id: 'w2', name: 'Rahul Verma' },
    { id: 'w3', name: 'Amit Patel' },
    { id: 'w4', name: 'Sunita Roy' }
  ],
  defaultZoneWaiterName
}) => {
  const [subModal, setSubModal] = useState<'rename' | 'seats' | 'waiter' | 'archive' | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');
  const [customSeats, setCustomSeats] = useState<number>(4);
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [archiveError, setArchiveError] = useState<string>('');

  if (!isOpen || !table) return null;

  const currentDisplay = table.display_number || table.tableNumber || table.name.replace(/^Table\s*/i, '');
  const currentSeats = table.seats || 4;
  const isOccupied = table.status === 'occupied';

  const handleOpenRename = () => {
    setRenameValue(currentDisplay);
    setSubModal('rename');
  };

  const handleConfirmRename = async () => {
    if (!renameValue.trim()) return;
    setIsProcessing(true);
    try {
      await onRenameTable(table, renameValue.trim());
      setSubModal(null);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenSeats = () => {
    setCustomSeats(currentSeats);
    setSubModal('seats');
  };

  const handleConfirmSeats = async (seats: number) => {
    setIsProcessing(true);
    try {
      await onChangeSeats(table, seats);
      setSubModal(null);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenWaiter = () => {
    setSelectedWaiterId(table.assigned_waiter_id || '');
    setSubModal('waiter');
  };

  const handleConfirmWaiter = async (waiterId: string | null) => {
    setIsProcessing(true);
    try {
      await onAssignWaiter(table, waiterId);
      setSubModal(null);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenArchive = () => {
    setArchiveError('');
    setSubModal('archive');
  };

  const handleConfirmArchive = async () => {
    setIsProcessing(true);
    setArchiveError('');
    try {
      await onArchiveTable(table);
      setSubModal(null);
      onClose();
    } catch (err: any) {
      setArchiveError(err?.message || 'Cannot archive table with active orders');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-2xl max-w-sm w-full overflow-hidden text-[#171717]">
        {/* Header */}
        <div className="p-4 border-b border-[#EFEDE8] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#F8F8F6] border border-[#E7E5E4] flex items-center justify-center font-bold text-sm text-[#171717]">
              {currentDisplay}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm text-[#171717]">
                  Table {currentDisplay}
                </h3>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                    isOccupied
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : table.status === 'reserved'
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  }`}
                >
                  {table.status}
                </span>
              </div>
              <p className="text-[11px] text-[#737373] mt-0.5">
                {currentSeats} Seats &bull; Zone: {table.zone_name || 'General'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F4] rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-modals inside popover */}
        {subModal === 'rename' ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-[#171717]">
              <Edit2 className="w-3.5 h-3.5" />
              <span>Rename Table Display Number</span>
            </div>
            <p className="text-[11px] text-[#737373]">
              Changes visible number everywhere. QR code remains permanently valid.
            </p>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="e.g. 10, VIP-1, T-4"
              className="w-full px-3 py-2 border border-[#E7E5E4] rounded-lg text-sm font-semibold text-[#171717] focus:outline-none focus:border-[#171717]"
              autoFocus
            />
            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setSubModal(null)}
                className="flex-1 py-2 text-xs font-semibold text-[#525252] border border-[#E7E5E4] rounded-lg hover:bg-[#F5F5F4]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRename}
                disabled={isProcessing || !renameValue.trim()}
                className="flex-1 py-2 text-xs font-bold text-white bg-[#171717] hover:bg-[#262626] rounded-lg disabled:opacity-50"
              >
                {isProcessing ? 'Saving...' : 'Update Number'}
              </button>
            </div>
          </div>
        ) : subModal === 'seats' ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-[#171717]">
              <Users className="w-3.5 h-3.5" />
              <span>Change Seating Capacity</span>
            </div>
            <p className="text-[11px] text-[#737373]">
              Single source sync: Updates customer seat limit, waiter view, and reports.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[2, 4, 6, 8].map((s) => (
                <button
                  key={`seat_opt_${s}`}
                  type="button"
                  onClick={() => handleConfirmSeats(s)}
                  disabled={isProcessing}
                  className={`py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    currentSeats === s
                      ? 'bg-[#171717] text-white border-[#171717]'
                      : 'bg-[#FAFAF9] border-[#E7E5E4] text-[#171717] hover:bg-white'
                  }`}
                >
                  {s} Seats
                </button>
              ))}
            </div>
            <div className="pt-2 flex items-center space-x-2">
              <input
                type="number"
                min={1}
                max={24}
                value={customSeats}
                onChange={(e) => setCustomSeats(Number(e.target.value))}
                className="w-20 px-2 py-1.5 border border-[#E7E5E4] rounded-lg text-xs font-semibold text-center"
              />
              <button
                type="button"
                onClick={() => handleConfirmSeats(customSeats)}
                disabled={isProcessing}
                className="flex-1 py-2 text-xs font-bold text-white bg-[#171717] hover:bg-[#262626] rounded-lg"
              >
                Set Custom Seats
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSubModal(null)}
              className="w-full py-1.5 text-xs text-[#737373] hover:text-[#171717]"
            >
              Cancel
            </button>
          </div>
        ) : subModal === 'waiter' ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-[#171717]">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Assign Waiter Priority</span>
            </div>
            <p className="text-[11px] text-[#737373]">
              Priority: <strong>Manual Assignment</strong> overrides Zone Assignment.
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => handleConfirmWaiter(null)}
                className={`w-full text-left p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer ${
                  !table.assigned_waiter_id
                    ? 'border-emerald-600 bg-emerald-50/60 font-bold text-emerald-900'
                    : 'border-[#E7E5E4] hover:bg-stone-50 text-[#171717]'
                }`}
              >
                <div>
                  <span className="block">Inherit Zone Default</span>
                  <span className="text-[10px] text-[#737373]">
                    ({defaultZoneWaiterName || 'Zone Default Server'})
                  </span>
                </div>
                {!table.assigned_waiter_id && <Check className="w-4 h-4 text-emerald-600" />}
              </button>

              {availableWaiters.map((w) => {
                const isSelected = table.assigned_waiter_id === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => handleConfirmWaiter(w.id)}
                    className={`w-full text-left p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'border-[#171717] bg-[#171717] text-white font-bold'
                        : 'border-[#E7E5E4] hover:bg-stone-50 text-[#171717]'
                    }`}
                  >
                    <span>{w.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setSubModal(null)}
              className="w-full py-1.5 text-xs text-[#737373] hover:text-[#171717]"
            >
              Cancel
            </button>
          </div>
        ) : subModal === 'archive' ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-red-600">
              <AlertTriangle className="w-4 h-4" />
              <span>Archive Table {currentDisplay}?</span>
            </div>
            <p className="text-[11px] text-[#737373]">
              Soft-deletes table from live floor and menu. Historical orders remain intact for reports.
            </p>
            {archiveError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2 rounded-lg">
                {archiveError}
              </div>
            )}
            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setSubModal(null)}
                className="flex-1 py-2 text-xs font-semibold text-[#525252] border border-[#E7E5E4] rounded-lg hover:bg-[#F5F5F4]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                disabled={isProcessing}
                className="flex-1 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
              >
                {isProcessing ? 'Archiving...' : 'Confirm Archive'}
              </button>
            </div>
          </div>
        ) : (
          /* Main Quick Action Items */
          <div className="p-2 divide-y divide-[#EFEDE8]">
            {/* Action 1: Seat Guest */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onSeatGuest(table);
              }}
              className="w-full p-2.5 rounded-lg hover:bg-[#F8F8F6] flex items-center justify-between text-xs text-[#171717] font-semibold transition-colors cursor-pointer group"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <span>{isOccupied ? 'Manage Dining Session' : 'Seat Guest'}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#A8A29E] group-hover:text-[#171717]" />
            </button>

            {/* Action 2: View / Share QR */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onViewQR(table);
              }}
              className="w-full p-2.5 rounded-lg hover:bg-[#F8F8F6] flex items-center justify-between text-xs text-[#171717] font-semibold transition-colors cursor-pointer group"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-md bg-[#F5F5F4] text-[#171717] flex items-center justify-center">
                  <QrCode className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="block">View Permanent QR</span>
                  <span className="text-[10px] text-[#737373] font-normal">Never needs reprint</span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#A8A29E] group-hover:text-[#171717]" />
            </button>

            {/* Action 3: Print QR */}
            <button
              type="button"
              onClick={() => {
                onPrintQR(table);
              }}
              className="w-full p-2.5 rounded-lg hover:bg-[#F8F8F6] flex items-center justify-between text-xs text-[#171717] font-semibold transition-colors cursor-pointer group"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-md bg-[#F5F5F4] text-[#171717] flex items-center justify-center">
                  <Printer className="w-3.5 h-3.5" />
                </div>
                <span>Print Table Sticker</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#A8A29E] group-hover:text-[#171717]" />
            </button>

            {/* Action 4: Rename Table */}
            <button
              type="button"
              onClick={handleOpenRename}
              className="w-full p-2.5 rounded-lg hover:bg-[#F8F8F6] flex items-center justify-between text-xs text-[#171717] font-semibold transition-colors cursor-pointer group"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-md bg-[#F5F5F4] text-[#171717] flex items-center justify-center">
                  <Hash className="w-3.5 h-3.5" />
                </div>
                <span>Rename Table Number</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#A8A29E] group-hover:text-[#171717]" />
            </button>

            {/* Action 5: Change Seats */}
            <button
              type="button"
              onClick={handleOpenSeats}
              className="w-full p-2.5 rounded-lg hover:bg-[#F8F8F6] flex items-center justify-between text-xs text-[#171717] font-semibold transition-colors cursor-pointer group"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-md bg-[#F5F5F4] text-[#171717] flex items-center justify-center">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="block">Change Seats</span>
                  <span className="text-[10px] text-[#737373] font-normal">Currently {currentSeats} seats</span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#A8A29E] group-hover:text-[#171717]" />
            </button>

            {/* Action 6: Assign Waiter */}
            <button
              type="button"
              onClick={handleOpenWaiter}
              className="w-full p-2.5 rounded-lg hover:bg-[#F8F8F6] flex items-center justify-between text-xs text-[#171717] font-semibold transition-colors cursor-pointer group"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-md bg-[#F5F5F4] text-[#171717] flex items-center justify-center">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="block">Assign Waiter</span>
                  <span className="text-[10px] text-[#737373] font-normal">
                    {table.waiterName || table.assigned_waiter_id ? 'Manual Override' : 'Zone Inherited'}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#A8A29E] group-hover:text-[#171717]" />
            </button>

            {/* Action 7: Merge Table */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onMergeTable(table);
              }}
              className="w-full p-2.5 rounded-lg hover:bg-[#F8F8F6] flex items-center justify-between text-xs text-[#171717] font-semibold transition-colors cursor-pointer group"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-md bg-[#F5F5F4] text-[#171717] flex items-center justify-center">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <span>Merge Table</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#A8A29E] group-hover:text-[#171717]" />
            </button>

            {/* Action 8: Soft Delete / Archive */}
            <button
              type="button"
              onClick={handleOpenArchive}
              className="w-full p-2.5 rounded-lg hover:bg-red-50 flex items-center justify-between text-xs text-red-600 font-semibold transition-colors cursor-pointer group"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-md bg-red-50 text-red-600 flex items-center justify-center">
                  <Archive className="w-3.5 h-3.5" />
                </div>
                <span>Archive Table</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-red-400 group-hover:text-red-600" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
