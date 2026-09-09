'use client';

import React, { useState } from 'react';
import { 
  Square, Circle, Armchair, DoorOpen, ChefHat, 
  Layers, Plus, CreditCard, Users, ShieldAlert, Sparkles,
  ChevronLeft, ChevronRight, PanelLeftClose, PanelLeft
} from 'lucide-react';
import { FloorPlanItem, TableShape, FurnitureType } from './types';

interface ToolboxProps {
  onAddItem: (itemTemplate: Partial<FloorPlanItem>) => void;
}

export const Toolbox: React.FC<ToolboxProps> = ({ onAddItem }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const tableTemplates: Array<{
    label: string;
    shape: TableShape;
    defaultSeats: number;
    width: number;
    height: number;
    icon: any;
  }> = [
    { label: 'Square Table', shape: 'square', defaultSeats: 4, width: 80, height: 80, icon: Square },
    { label: 'Round Table', shape: 'circle', defaultSeats: 4, width: 80, height: 80, icon: Circle },
    { label: 'Rectangle Table', shape: 'rectangle', defaultSeats: 6, width: 130, height: 80, icon: Square },
    { label: 'Oval Table', shape: 'oval', defaultSeats: 6, width: 140, height: 85, icon: Circle },
    { label: 'Booth', shape: 'booth', defaultSeats: 4, width: 110, height: 85, icon: Armchair },
    { label: 'Sofa Lounge', shape: 'square', defaultSeats: 3, width: 120, height: 60, icon: Armchair }
  ];

  const furnitureTemplates: Array<{
    label: string;
    type: FurnitureType;
    width: number;
    height: number;
    icon: any;
  }> = [
    { label: 'Service Counter', type: 'counter', width: 140, height: 45, icon: Layers },
    { label: 'Bar Seats', type: 'bar_seats', width: 140, height: 45, icon: Users },
    { label: 'Waiting Area', type: 'waiting_area', width: 120, height: 80, icon: Users },
    { label: 'Kitchen Pass', type: 'kitchen', width: 160, height: 70, icon: ChefHat },
    { label: 'Washroom', type: 'washroom', width: 90, height: 70, icon: DoorOpen },
    { label: 'Entrance Door', type: 'door', width: 70, height: 50, icon: DoorOpen },
    { label: 'Divider Wall', type: 'divider', width: 110, height: 16, icon: Layers },
    { label: 'Cashier / POS', type: 'cash_counter', width: 110, height: 50, icon: CreditCard }
  ];

  if (isCollapsed) {
    return (
      <div className="w-11 bg-white border-r border-[#E7E5E4] flex flex-col items-center py-3 select-none shrink-0 shadow-sm transition-all">
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
          title="Expand Toolbox"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-6 [writing-mode:vertical-lr] rotate-180">
          Elements
        </span>
      </div>
    );
  }

  return (
    <div className="w-60 md:w-64 bg-white border-r border-[#E7E5E4] flex flex-col h-full select-none overflow-y-auto shrink-0 shadow-sm transition-all">
      {/* Header */}
      <div className="p-3 border-b border-[#EFEDE8] flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#171717]">Elements</h2>
          <p className="text-[10px] text-[#737373] mt-0.5">Click to add to layout</p>
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          className="p-1 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
          title="Collapse Toolbox"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Tables Section */}
      <div className="p-3 border-b border-[#EFEDE8]">
        <span className="text-[11px] font-semibold text-[#525252] uppercase tracking-wider block mb-2">
          Tables & Seating
        </span>
        <div className="grid grid-cols-2 gap-2">
          {tableTemplates.map((t, idx) => {
            const Icon = t.icon;
            return (
              <button
                key={`tbl_${idx}`}
                type="button"
                onClick={() =>
                  onAddItem({
                    kind: 'table',
                    shape: t.shape,
                    seats: t.defaultSeats,
                    width: t.width,
                    height: t.height,
                    status: 'available'
                  })
                }
                className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] hover:bg-white hover:border-[#171717] hover:shadow-xs transition-all duration-150 text-left group cursor-pointer"
              >
                <Icon className="w-5 h-5 text-[#525252] group-hover:text-[#171717] transition-colors mb-1.5" />
                <span className="text-[11px] font-semibold text-[#171717] text-center leading-tight">
                  {t.label}
                </span>
                <span className="text-[10px] text-[#737373] mt-0.5">
                  {t.defaultSeats} seats
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Architectural Elements Section */}
      <div className="p-3">
        <span className="text-[11px] font-semibold text-[#525252] uppercase tracking-wider block mb-2">
          Fixtures & Layout
        </span>
        <div className="grid grid-cols-2 gap-2">
          {furnitureTemplates.map((f, idx) => {
            const Icon = f.icon;
            return (
              <button
                key={`furn_${idx}`}
                type="button"
                onClick={() =>
                  onAddItem({
                    kind: 'furniture',
                    furnitureType: f.type,
                    width: f.width,
                    height: f.height,
                    name: f.label
                  })
                }
                className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] hover:bg-white hover:border-[#171717] hover:shadow-xs transition-all duration-150 text-left group cursor-pointer"
              >
                <Icon className="w-4 h-4 text-[#525252] group-hover:text-[#171717] transition-colors mb-1.5" />
                <span className="text-[11px] font-semibold text-[#171717] text-center leading-tight">
                  {f.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
