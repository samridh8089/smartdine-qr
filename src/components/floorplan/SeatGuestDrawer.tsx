'use client';

import React, { useState } from 'react';
import { 
  Users, Calendar, ShoppingBag, QrCode, Layers, 
  X, Check, Clock, ChefHat, Phone, AlertCircle
} from 'lucide-react';
import { FloorPlanItem } from './types';

interface SeatGuestDrawerProps {
  table: FloorPlanItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSeatGuest: (table: FloorPlanItem, guestCount: number, waiterName: string) => void;
  onClearTable: (table: FloorPlanItem) => void;
  onViewQR: (table: FloorPlanItem) => void;
  onOpenReservation: (table: FloorPlanItem) => void;
  onOpenTakeaway: () => void;
  onMergeRequest: (table: FloorPlanItem) => void;
}

export const SeatGuestDrawer: React.FC<SeatGuestDrawerProps> = ({
  table,
  isOpen,
  onClose,
  onSeatGuest,
  onClearTable,
  onViewQR,
  onOpenReservation,
  onOpenTakeaway,
  onMergeRequest
}) => {
  const [guestCount, setGuestCount] = useState<number>(() => table?.seats || 2);
  const [waiterName, setWaiterName] = useState<string>('Priya Sharma');
  const [activeTab, setActiveTab] = useState<'seat' | 'reservation' | 'info'>('seat');

  if (!isOpen || !table) return null;

  const isOccupied = table.status === 'occupied';
  const isReserved = table.status === 'reserved';

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center p-3 animate-slide-up pointer-events-none">
      <div className="bg-white border border-[#E7E5E4] rounded-2xl shadow-2xl max-w-2xl w-full p-4 pointer-events-auto text-[#171717]">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#EFEDE8]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#F8F8F6] border border-[#E7E5E4] flex items-center justify-center font-bold text-sm text-[#171717]">
              {table.tableNumber}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm text-[#171717]">
                  Table {table.tableNumber}
                </h3>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                    isOccupied
                      ? 'border-[#262626] bg-[#262626] text-white'
                      : isReserved
                      ? 'border-[#D7CEBE] bg-[#F5F0E6] text-[#78716C]'
                      : 'border-[#E7E5E4] bg-[#FAFAF9] text-[#737373]'
                  }`}
                >
                  {table.status}
                </span>
              </div>
              <p className="text-xs text-[#737373] mt-0.5">
                {table.seats} Seats capacity &bull; {table.shape || 'rectangle'}
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

        {/* Operational Body */}
        <div className="py-3.5">
          {isOccupied ? (
            /* Running Table Session View */
            <div className="space-y-3">
              <div className="bg-[#F8F8F6] border border-[#E7E5E4] rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#737373] block uppercase tracking-wider font-semibold">
                    Active Dining Session
                  </span>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-[#171717]" />
                    <span className="font-bold text-sm text-[#171717]">
                      {table.elapsedMinutes || 28} mins active
                    </span>
                    <span className="text-xs text-[#737373]">
                      &bull; {table.currentGuests || table.seats || 2} Guests
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-[#737373] block uppercase tracking-wider font-semibold">
                    Assigned Server
                  </span>
                  <span className="font-semibold text-xs text-[#171717]">
                    {table.waiterName || 'Rahul Verma'}
                  </span>
                </div>
              </div>

              <div className="flex space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => onViewQR(table)}
                  className="flex-1 py-2.5 px-3 border border-[#E7E5E4] rounded-lg text-xs font-semibold text-[#171717] hover:bg-[#FAFAF9] flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>View Table QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => onClearTable(table)}
                  className="flex-1 py-2.5 px-3 border border-[#171717] bg-[#171717] hover:bg-[#262626] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Complete & Clear Table
                </button>
              </div>
            </div>
          ) : isReserved ? (
            /* Reservation State View */
            <div className="space-y-3">
              <div className="bg-[#F5F0E6] border border-[#D7CEBE] rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#171717]">
                    Reservation Scheduled
                  </span>
                  <span className="text-[11px] font-semibold text-[#78716C]">
                    Slot: {table.reservationTime || '20:00'}
                  </span>
                </div>
                <div className="mt-2 text-xs space-y-1 text-[#57534E]">
                  <div>Guest: <strong className="text-[#171717]">{table.reservationPartyName || 'Sanjay Kapoor'}</strong> ({table.seats} Guests)</div>
                  {table.reservationPhone && <div>Contact: {table.reservationPhone}</div>}
                  <div className="text-[11px] text-[#78716C] pt-1">
                    *Kitchen will release order only when guest is seated.
                  </div>
                </div>
              </div>

              <div className="flex space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => onSeatGuest(table, table.seats, waiterName)}
                  className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Guest Arrived &bull; Seat Guest
                </button>
              </div>
            </div>
          ) : (
            /* Available Table: Direct Actions */
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#525252] uppercase tracking-wider mb-1">
                    Party Size (Guests)
                  </label>
                  <div className="flex items-center space-x-1.5">
                    {[2, 4, 6, 8].map((num) => (
                      <button
                        key={`g_${num}`}
                        type="button"
                        onClick={() => setGuestCount(num)}
                        className={`flex-1 py-1.5 rounded-md border text-xs font-bold transition-colors cursor-pointer ${
                          guestCount === num
                            ? 'border-[#171717] bg-[#171717] text-white'
                            : 'border-[#E7E5E4] bg-[#FAFAF9] text-[#171717] hover:bg-white'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#525252] uppercase tracking-wider mb-1">
                    Assigned Waiter
                  </label>
                  <select
                    value={waiterName}
                    onChange={(e) => setWaiterName(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-[#E7E5E4] rounded-md bg-[#FAFAF9] text-xs font-medium text-[#171717] focus:bg-white focus:outline-none"
                  >
                    <option value="Priya Sharma">Priya Sharma</option>
                    <option value="Rahul Verma">Rahul Verma</option>
                    <option value="Amit Patel">Amit Patel</option>
                    <option value="Sunita Roy">Sunita Roy</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => onSeatGuest(table, guestCount, waiterName)}
                  className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Seat Guest ({guestCount} Guests)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenReservation(table)}
                  className="py-2.5 px-3 border border-[#E7E5E4] rounded-lg text-xs font-semibold text-[#171717] hover:bg-[#FAFAF9] flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#525252]" />
                  <span>Reservation</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenTakeaway}
                  className="py-2.5 px-3 border border-[#E7E5E4] rounded-lg text-xs font-semibold text-[#171717] hover:bg-[#FAFAF9] flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#525252]" />
                  <span>Takeaway</span>
                </button>
                <button
                  type="button"
                  onClick={() => onViewQR(table)}
                  className="py-2.5 px-3 border border-[#E7E5E4] rounded-lg text-xs font-semibold text-[#171717] hover:bg-[#FAFAF9] transition-colors cursor-pointer"
                  title="View Table QR Code"
                >
                  <QrCode className="w-3.5 h-3.5 text-[#525252]" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
