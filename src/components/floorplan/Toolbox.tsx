'use client';

import React, { useState, useMemo } from 'react';
import { 
  PanelLeftClose, PanelLeft, Search,
  Utensils, Armchair, ChefHat, Building2, Sparkles, LayoutGrid
} from 'lucide-react';
import { FloorPlanItem, TableShape, FurnitureType } from './types';
import { FloorElementIcon } from './FloorElementIcons';

interface ToolboxProps {
  onAddItem: (itemTemplate: Partial<FloorPlanItem>) => void;
}

type CategoryKey = 'all' | 'tables' | 'seating' | 'kitchen' | 'structure' | 'decor';

export const Toolbox: React.FC<ToolboxProps> = ({ onAddItem }) => {
  // 1. useState declarations (Strict React Hooks Safety Guardrail)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 2. Data Definitions
  const tableTemplates: Array<{
    label: string;
    shape: TableShape;
    defaultSeats: number;
    width: number;
    height: number;
    category: 'tables';
  }> = [
    { label: '2 Seater Table', shape: 'two_seater', defaultSeats: 2, width: 70, height: 70, category: 'tables' },
    { label: 'Square Table', shape: 'square', defaultSeats: 4, width: 80, height: 80, category: 'tables' },
    { label: 'Round Table', shape: 'circle', defaultSeats: 4, width: 80, height: 80, category: 'tables' },
    { label: 'Rectangle Table', shape: 'rectangle', defaultSeats: 6, width: 130, height: 80, category: 'tables' },
    { label: 'Oval Table', shape: 'oval', defaultSeats: 6, width: 130, height: 80, category: 'tables' },
    { label: '6 Seater', shape: 'six_seater', defaultSeats: 6, width: 130, height: 80, category: 'tables' },
    { label: '8 Seater', shape: 'eight_seater', defaultSeats: 8, width: 160, height: 85, category: 'tables' },
    { label: '10 Seater', shape: 'ten_seater', defaultSeats: 10, width: 190, height: 90, category: 'tables' },
    { label: 'Bar Table', shape: 'bar_table', defaultSeats: 4, width: 85, height: 85, category: 'tables' }
  ];

  const seatingTemplates: Array<{
    label: string;
    shape: TableShape;
    defaultSeats: number;
    width: number;
    height: number;
    category: 'seating';
  }> = [
    { label: 'Booth', shape: 'booth', defaultSeats: 4, width: 110, height: 85, category: 'seating' },
    { label: 'L Booth', shape: 'l_booth', defaultSeats: 5, width: 120, height: 120, category: 'seating' },
    { label: 'U Booth', shape: 'u_booth', defaultSeats: 6, width: 130, height: 110, category: 'seating' },
    { label: 'Sofa Lounge', shape: 'sofa_lounge', defaultSeats: 4, width: 130, height: 85, category: 'seating' },
    { label: 'Window Bench', shape: 'window_bench', defaultSeats: 5, width: 130, height: 85, category: 'seating' },
    { label: 'VIP Lounge', shape: 'vip_lounge', defaultSeats: 4, width: 120, height: 110, category: 'seating' }
  ];

  const kitchenTemplates: Array<{
    label: string;
    type: FurnitureType;
    width: number;
    height: number;
    category: 'kitchen';
  }> = [
    { label: 'Service Counter', type: 'service_counter', width: 140, height: 50, category: 'kitchen' },
    { label: 'Kitchen Pass', type: 'kitchen_pass', width: 150, height: 70, category: 'kitchen' },
    { label: 'Stove', type: 'stove', width: 90, height: 90, category: 'kitchen' },
    { label: 'Fryer', type: 'fryer', width: 85, height: 85, category: 'kitchen' },
    { label: 'Pizza Oven', type: 'pizza_oven', width: 100, height: 100, category: 'kitchen' },
    { label: 'Sink', type: 'sink', width: 110, height: 65, category: 'kitchen' },
    { label: 'Refrigerator', type: 'refrigerator', width: 95, height: 75, category: 'kitchen' },
    { label: 'Prep Counter', type: 'prep_counter', width: 120, height: 65, category: 'kitchen' },
    { label: 'Storage Rack', type: 'storage_rack', width: 110, height: 55, category: 'kitchen' }
  ];

  const structureTemplates: Array<{
    label: string;
    type: FurnitureType;
    width: number;
    height: number;
    category: 'structure';
  }> = [
    { label: 'Entrance Door', type: 'entrance_door', width: 80, height: 60, category: 'structure' },
    { label: 'Double Door', type: 'double_door', width: 130, height: 70, category: 'structure' },
    { label: 'Sliding Door', type: 'sliding_door', width: 110, height: 40, category: 'structure' },
    { label: 'Window', type: 'window', width: 100, height: 25, category: 'structure' },
    { label: 'Divider Wall', type: 'divider_wall', width: 120, height: 20, category: 'structure' },
    { label: 'Curved Wall', type: 'curved_wall', width: 100, height: 80, category: 'structure' },
    { label: 'Glass Partition', type: 'glass_partition', width: 110, height: 25, category: 'structure' },
    { label: 'Pillar', type: 'pillar', width: 65, height: 65, category: 'structure' },
    { label: 'Cashier / POS', type: 'cash_counter', width: 110, height: 55, category: 'structure' },
    { label: 'Waiting Area', type: 'waiting_area', width: 130, height: 85, category: 'structure' },
    { label: 'Washroom', type: 'washroom', width: 90, height: 80, category: 'structure' },
    { label: 'Emergency Exit', type: 'emergency_exit', width: 80, height: 70, category: 'structure' }
  ];

  const decorTemplates: Array<{
    label: string;
    type: FurnitureType;
    width: number;
    height: number;
    category: 'decor';
  }> = [
    { label: 'Small Plant', type: 'plant_small', width: 60, height: 60, category: 'decor' },
    { label: 'Large Plant', type: 'plant_large', width: 85, height: 85, category: 'decor' },
    { label: 'Flower Pot', type: 'flower_pot', width: 65, height: 65, category: 'decor' },
    { label: 'Water Feature', type: 'water_feature', width: 95, height: 95, category: 'decor' },
    { label: 'Decorative Partition', type: 'decorative_partition', width: 110, height: 25, category: 'decor' }
  ];

  // 3. useMemo declarations
  const filteredTables = useMemo(() => {
    if (activeCategory !== 'all' && activeCategory !== 'tables') return [];
    if (!searchQuery.trim()) return tableTemplates;
    return tableTemplates.filter((t) => t.label.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [activeCategory, searchQuery]);

  const filteredSeating = useMemo(() => {
    if (activeCategory !== 'all' && activeCategory !== 'seating') return [];
    if (!searchQuery.trim()) return seatingTemplates;
    return seatingTemplates.filter((s) => s.label.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [activeCategory, searchQuery]);

  const filteredKitchen = useMemo(() => {
    if (activeCategory !== 'all' && activeCategory !== 'kitchen') return [];
    if (!searchQuery.trim()) return kitchenTemplates;
    return kitchenTemplates.filter((k) => k.label.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [activeCategory, searchQuery]);

  const filteredStructure = useMemo(() => {
    if (activeCategory !== 'all' && activeCategory !== 'structure') return [];
    if (!searchQuery.trim()) return structureTemplates;
    return structureTemplates.filter((s) => s.label.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [activeCategory, searchQuery]);

  const filteredDecor = useMemo(() => {
    if (activeCategory !== 'all' && activeCategory !== 'decor') return [];
    if (!searchQuery.trim()) return decorTemplates;
    return decorTemplates.filter((d) => d.label.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [activeCategory, searchQuery]);

  // ALL HOOKS STRICTLY DECLARED BEFORE ANY RETURN
  if (isCollapsed) {
    return (
      <div className="w-11 bg-[#0B0F14] border-r border-white/[0.08] flex flex-col items-center py-3 select-none shrink-0 transition-all font-sans">
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors cursor-pointer"
          title="Expand Element Library"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mt-6 [writing-mode:vertical-lr] rotate-180">
          Library
        </span>
      </div>
    );
  }

  return (
    <div className="w-64 md:w-72 bg-[#0B0F14] text-zinc-100 border-r border-white/[0.08] flex flex-col h-full select-none overflow-hidden shrink-0 transition-all font-sans">
      {/* Header */}
      <div className="p-3 border-b border-white/[0.08] flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-100">Element Library</h2>
          <p className="text-[10px] text-zinc-400 mt-0.5">Click element to place on canvas</p>
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          className="p-1 text-zinc-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors cursor-pointer"
          title="Collapse Toolbox"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="px-3 pt-2.5 pb-2 shrink-0">
        <div className="relative">
          <input
            type="text"
            placeholder="Search fixtures & tables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white/[0.03] border border-white/[0.08] rounded-lg text-zinc-200 focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] transition-all placeholder:text-zinc-500"
          />
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Category Pills Strip */}
      <div className="px-3 pb-2 border-b border-white/[0.08] flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
        {[
          { key: 'all' as CategoryKey, label: 'All', icon: LayoutGrid },
          { key: 'tables' as CategoryKey, label: 'Tables', icon: Utensils },
          { key: 'seating' as CategoryKey, label: 'Seating', icon: Armchair },
          { key: 'kitchen' as CategoryKey, label: 'Kitchen', icon: ChefHat },
          { key: 'structure' as CategoryKey, label: 'Structure', icon: Building2 },
          { key: 'decor' as CategoryKey, label: 'Decor', icon: Sparkles }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveCategory(tab.key)}
              className={`px-2.5 py-1 rounded-[10px] text-[10px] font-medium flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#16A34A] text-white shadow-xs'
                  : 'bg-white/[0.03] hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200 border border-white/[0.08]'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Scrollable Element Cards Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* 1. Tables Section */}
        {filteredTables.length > 0 && (
          <div>
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Utensils className="w-3 h-3 text-[#16A34A]" />
              Tables ({filteredTables.length})
            </span>
            <div className="grid grid-cols-2 gap-2">
              {filteredTables.map((t, idx) => (
                <button
                  key={`tbl_${t.shape}_${idx}`}
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
                  className="flex flex-col items-center justify-between p-2.5 rounded-[12px] border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-[#16A34A]/50 transition-all duration-150 text-center group cursor-pointer"
                >
                  <div className="h-12 w-full flex items-center justify-center">
                    <FloorElementIcon type={t.shape} className="w-12 h-10 object-contain group-hover:scale-105 transition-transform" />
                  </div>
                  <div className="w-full mt-1.5">
                    <span className="text-[11px] font-medium text-zinc-200 group-hover:text-white block leading-tight truncate">
                      {t.label}
                    </span>
                    <span className="text-[9px] text-zinc-500 block mt-0.5">
                      {t.defaultSeats} seats
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 2. Seating Section */}
        {filteredSeating.length > 0 && (
          <div>
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Armchair className="w-3 h-3 text-[#16A34A]" />
              Seating ({filteredSeating.length})
            </span>
            <div className="grid grid-cols-2 gap-2">
              {filteredSeating.map((s, idx) => (
                <button
                  key={`seat_${s.shape}_${idx}`}
                  type="button"
                  onClick={() =>
                    onAddItem({
                      kind: 'table',
                      shape: s.shape,
                      seats: s.defaultSeats,
                      width: s.width,
                      height: s.height,
                      status: 'available'
                    })
                  }
                  className="flex flex-col items-center justify-between p-2.5 rounded-[12px] border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-[#16A34A]/50 transition-all duration-150 text-center group cursor-pointer"
                >
                  <div className="h-12 w-full flex items-center justify-center">
                    <FloorElementIcon type={s.shape} className="w-12 h-10 object-contain group-hover:scale-105 transition-transform" />
                  </div>
                  <div className="w-full mt-1.5">
                    <span className="text-[11px] font-medium text-zinc-200 group-hover:text-white block leading-tight truncate">
                      {s.label}
                    </span>
                    <span className="text-[9px] text-zinc-500 block mt-0.5">
                      {s.defaultSeats} seats
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3. Kitchen Section */}
        {filteredKitchen.length > 0 && (
          <div>
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <ChefHat className="w-3 h-3 text-[#16A34A]" />
              Kitchen ({filteredKitchen.length})
            </span>
            <div className="grid grid-cols-2 gap-2">
              {filteredKitchen.map((k, idx) => (
                <button
                  key={`kit_${k.type}_${idx}`}
                  type="button"
                  onClick={() =>
                    onAddItem({
                      kind: 'furniture',
                      furnitureType: k.type,
                      width: k.width,
                      height: k.height,
                      name: k.label
                    })
                  }
                  className="flex flex-col items-center justify-between p-2.5 rounded-[12px] border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-[#16A34A]/50 transition-all duration-150 text-center group cursor-pointer"
                >
                  <div className="h-12 w-full flex items-center justify-center">
                    <FloorElementIcon type={k.type} className="w-12 h-10 object-contain group-hover:scale-105 transition-transform" />
                  </div>
                  <div className="w-full mt-1.5">
                    <span className="text-[11px] font-medium text-zinc-200 group-hover:text-white block leading-tight truncate">
                      {k.label}
                    </span>
                    <span className="text-[9px] text-zinc-500 block mt-0.5">
                      Kitchen
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. Structure Section */}
        {filteredStructure.length > 0 && (
          <div>
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Building2 className="w-3 h-3 text-[#16A34A]" />
              Structure ({filteredStructure.length})
            </span>
            <div className="grid grid-cols-2 gap-2">
              {filteredStructure.map((s, idx) => (
                <button
                  key={`struct_${s.type}_${idx}`}
                  type="button"
                  onClick={() =>
                    onAddItem({
                      kind: 'furniture',
                      furnitureType: s.type,
                      width: s.width,
                      height: s.height,
                      name: s.label
                    })
                  }
                  className="flex flex-col items-center justify-between p-2.5 rounded-[12px] border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-[#16A34A]/50 transition-all duration-150 text-center group cursor-pointer"
                >
                  <div className="h-12 w-full flex items-center justify-center">
                    <FloorElementIcon type={s.type} className="w-12 h-10 object-contain group-hover:scale-105 transition-transform" />
                  </div>
                  <div className="w-full mt-1.5">
                    <span className="text-[11px] font-medium text-zinc-200 group-hover:text-white block leading-tight truncate">
                      {s.label}
                    </span>
                    <span className="text-[9px] text-zinc-500 block mt-0.5">
                      Structure
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 5. Decor Section */}
        {filteredDecor.length > 0 && (
          <div>
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#16A34A]" />
              Decor ({filteredDecor.length})
            </span>
            <div className="grid grid-cols-2 gap-2">
              {filteredDecor.map((d, idx) => (
                <button
                  key={`dec_${d.type}_${idx}`}
                  type="button"
                  onClick={() =>
                    onAddItem({
                      kind: 'furniture',
                      furnitureType: d.type,
                      width: d.width,
                      height: d.height,
                      name: d.label
                    })
                  }
                  className="flex flex-col items-center justify-between p-2.5 rounded-[12px] border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-[#16A34A]/50 transition-all duration-150 text-center group cursor-pointer"
                >
                  <div className="h-12 w-full flex items-center justify-center">
                    <FloorElementIcon type={d.type} className="w-12 h-10 object-contain group-hover:scale-105 transition-transform" />
                  </div>
                  <div className="w-full mt-1.5">
                    <span className="text-[11px] font-medium text-zinc-200 group-hover:text-white block leading-tight truncate">
                      {d.label}
                    </span>
                    <span className="text-[9px] text-zinc-500 block mt-0.5">
                      Decor
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
