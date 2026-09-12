'use client';

import React, { useState, useMemo, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, Layers, Sparkles,
  LayoutGrid, Utensils, Armchair, Coffee, ChefHat,
  Flower2, Building, DoorClosed
} from 'lucide-react';
import { FloorPlanItem, TableShape, FurnitureType } from './types';
import { FloorElementIcon } from './FloorElementIcons';

interface AssetLibraryCarouselProps {
  onAddItem: (itemTemplate: Partial<FloorPlanItem>) => void;
}

type CarouselCategory = 
  | 'all' 
  | 'tables' 
  | 'seating' 
  | 'kitchen' 
  | 'structure' 
  | 'decor';

interface AssetItem {
  id: string;
  name: string;
  category: CarouselCategory;
  kind: 'table' | 'furniture';
  shape?: TableShape;
  furnitureType?: FurnitureType;
  defaultSeats?: number;
  width: number;
  height: number;
  iconType: string;
  tag?: string;
}

const ASSET_LIBRARY: AssetItem[] = [
  // 1. Tables
  { id: 'tbl-2s', name: '2 Seater Table', category: 'tables', kind: 'table', shape: 'two_seater', defaultSeats: 2, width: 70, height: 70, iconType: 'two_seater', tag: '2s' },
  { id: 'tbl-sq', name: 'Square Table', category: 'tables', kind: 'table', shape: 'square', defaultSeats: 4, width: 80, height: 80, iconType: 'square', tag: '4s' },
  { id: 'tbl-rd', name: 'Round Table', category: 'tables', kind: 'table', shape: 'circle', defaultSeats: 4, width: 80, height: 80, iconType: 'circle', tag: '4s' },
  { id: 'tbl-rec', name: 'Rectangle Table', category: 'tables', kind: 'table', shape: 'rectangle', defaultSeats: 6, width: 130, height: 80, iconType: 'rectangle', tag: '6s' },
  { id: 'tbl-ov', name: 'Oval Table', category: 'tables', kind: 'table', shape: 'oval', defaultSeats: 6, width: 130, height: 80, iconType: 'oval', tag: '6s' },
  { id: 'tbl-6s', name: '6 Seater', category: 'tables', kind: 'table', shape: 'six_seater', defaultSeats: 6, width: 130, height: 80, iconType: 'six_seater', tag: '6s' },
  { id: 'tbl-8s', name: '8 Seater', category: 'tables', kind: 'table', shape: 'eight_seater', defaultSeats: 8, width: 160, height: 85, iconType: 'eight_seater', tag: '8s' },
  { id: 'tbl-10s', name: '10 Seater', category: 'tables', kind: 'table', shape: 'ten_seater', defaultSeats: 10, width: 190, height: 90, iconType: 'ten_seater', tag: '10s' },
  { id: 'tbl-bar', name: 'Bar High Table', category: 'tables', kind: 'table', shape: 'bar_table', defaultSeats: 4, width: 85, height: 85, iconType: 'bar_table', tag: '4s' },

  // 2. Seating
  { id: 'chr-dining', name: 'Dining Chair', category: 'seating', kind: 'furniture', furnitureType: 'bar_seats', width: 45, height: 45, iconType: 'bar_seats', tag: 'Chair' },
  { id: 'chr-barstool', name: 'Bar Stool', category: 'seating', kind: 'furniture', furnitureType: 'bar_seats', width: 40, height: 40, iconType: 'bar_seats', tag: 'Stool' },
  { id: 'sof-booth', name: 'Dining Booth', category: 'seating', kind: 'table', shape: 'booth', defaultSeats: 4, width: 110, height: 85, iconType: 'booth', tag: 'Booth' },
  { id: 'sof-lbooth', name: 'L-Booth Lounge', category: 'seating', kind: 'table', shape: 'l_booth', defaultSeats: 5, width: 120, height: 120, iconType: 'l_booth', tag: 'Corner' },
  { id: 'sof-ubooth', name: 'U-Booth Dining', category: 'seating', kind: 'table', shape: 'u_booth', defaultSeats: 6, width: 130, height: 110, iconType: 'u_booth', tag: 'Banquette' },
  { id: 'sof-lounge', name: 'Sofa Lounge', category: 'seating', kind: 'table', shape: 'sofa_lounge', defaultSeats: 4, width: 130, height: 85, iconType: 'sofa_lounge', tag: 'Lounge' },
  { id: 'sof-bench', name: 'Window Bench', category: 'seating', kind: 'table', shape: 'window_bench', defaultSeats: 5, width: 130, height: 85, iconType: 'window_bench', tag: 'Bench' },
  { id: 'sof-vip', name: 'VIP Lounge', category: 'seating', kind: 'table', shape: 'vip_lounge', defaultSeats: 4, width: 120, height: 110, iconType: 'vip_lounge', tag: 'VIP' },
  { id: 'sof-wait', name: 'Waiting Lounge', category: 'seating', kind: 'furniture', furnitureType: 'waiting_area', width: 130, height: 85, iconType: 'waiting_area', tag: 'Waiting' },

  // 3. Kitchen & Service Counters
  { id: 'cnt-pos', name: 'Marble Cashier POS', category: 'kitchen', kind: 'furniture', furnitureType: 'cash_counter', width: 110, height: 55, iconType: 'cash_counter', tag: 'POS' },
  { id: 'cnt-bar', name: 'Premium Bar Counter', category: 'kitchen', kind: 'furniture', furnitureType: 'bar_seats', width: 140, height: 55, iconType: 'bar_seats', tag: 'Bar' },
  { id: 'cnt-srv', name: 'Service Counter', category: 'kitchen', kind: 'furniture', furnitureType: 'service_counter', width: 140, height: 50, iconType: 'service_counter', tag: 'Pass' },
  { id: 'kit-pass', name: 'Kitchen Pass', category: 'kitchen', kind: 'furniture', furnitureType: 'kitchen_pass', width: 150, height: 70, iconType: 'kitchen_pass', tag: 'Hot Pass' },
  { id: 'kit-stove', name: 'Commercial Stove', category: 'kitchen', kind: 'furniture', furnitureType: 'stove', width: 90, height: 90, iconType: 'stove', tag: 'Range' },
  { id: 'kit-fryer', name: 'Deep Fryer', category: 'kitchen', kind: 'furniture', furnitureType: 'fryer', width: 85, height: 85, iconType: 'fryer', tag: 'Fryer' },
  { id: 'kit-oven', name: 'Pizza Oven', category: 'kitchen', kind: 'furniture', furnitureType: 'pizza_oven', width: 100, height: 100, iconType: 'pizza_oven', tag: 'Oven' },
  { id: 'kit-sink', name: 'Kitchen Sink', category: 'kitchen', kind: 'furniture', furnitureType: 'sink', width: 110, height: 65, iconType: 'sink', tag: 'Sink' },
  { id: 'kit-fridge', name: 'Commercial Fridge', category: 'kitchen', kind: 'furniture', furnitureType: 'refrigerator', width: 95, height: 75, iconType: 'refrigerator', tag: 'Cold' },
  { id: 'kit-prep', name: 'Prep Counter', category: 'kitchen', kind: 'furniture', furnitureType: 'prep_counter', width: 120, height: 65, iconType: 'prep_counter', tag: 'Prep' },
  { id: 'kit-rack', name: 'Storage Rack', category: 'kitchen', kind: 'furniture', furnitureType: 'storage_rack', width: 110, height: 55, iconType: 'storage_rack', tag: 'Dry' },

  // 4. Structure & Access
  { id: 'dr-main', name: 'Entrance Door', category: 'structure', kind: 'furniture', furnitureType: 'entrance_door', width: 80, height: 60, iconType: 'entrance_door', tag: 'Door' },
  { id: 'dr-dbl', name: 'Double Door', category: 'structure', kind: 'furniture', furnitureType: 'double_door', width: 130, height: 70, iconType: 'double_door', tag: 'Double' },
  { id: 'dr-slide', name: 'Sliding Glass Door', category: 'structure', kind: 'furniture', furnitureType: 'sliding_door', width: 110, height: 40, iconType: 'sliding_door', tag: 'Sliding' },
  { id: 'dr-win', name: 'Glass Window', category: 'structure', kind: 'furniture', furnitureType: 'window', width: 100, height: 25, iconType: 'window', tag: 'Window' },
  { id: 'dr-exit', name: 'Emergency Exit', category: 'structure', kind: 'furniture', furnitureType: 'emergency_exit', width: 80, height: 70, iconType: 'emergency_exit', tag: 'Exit' },
  { id: 'str-wall', name: 'Divider Wall', category: 'structure', kind: 'furniture', furnitureType: 'divider_wall', width: 120, height: 20, iconType: 'divider_wall', tag: 'Wall' },
  { id: 'str-curv', name: 'Curved Wall', category: 'structure', kind: 'furniture', furnitureType: 'curved_wall', width: 100, height: 80, iconType: 'curved_wall', tag: 'Arch' },
  { id: 'str-glass', name: 'Glass Partition', category: 'structure', kind: 'furniture', furnitureType: 'glass_partition', width: 110, height: 25, iconType: 'glass_partition', tag: 'Glass' },
  { id: 'dec-wash', name: 'Restroom Basin', category: 'structure', kind: 'furniture', furnitureType: 'washroom', width: 90, height: 80, iconType: 'washroom', tag: 'Restroom' },

  // 5. Decor & Ambience
  { id: 'plt-sm', name: 'Small Table Plant', category: 'decor', kind: 'furniture', furnitureType: 'plant_small', width: 60, height: 60, iconType: 'plant_small', tag: 'Small' },
  { id: 'plt-lg', name: 'Botanical Planter', category: 'decor', kind: 'furniture', furnitureType: 'plant_large', width: 85, height: 85, iconType: 'plant_large', tag: 'Floor' },
  { id: 'plt-pot', name: 'Terracotta Pot', category: 'decor', kind: 'furniture', furnitureType: 'flower_pot', width: 65, height: 65, iconType: 'flower_pot', tag: 'Pot' },
  { id: 'dec-pillar', name: 'Architectural Pillar', category: 'decor', kind: 'furniture', furnitureType: 'pillar', width: 65, height: 65, iconType: 'pillar', tag: 'Column' },
  { id: 'dec-water', name: 'Water Feature', category: 'decor', kind: 'furniture', furnitureType: 'water_feature', width: 95, height: 95, iconType: 'water_feature', tag: 'Fountain' },
  { id: 'str-wood', name: 'Wooden Slat Screen', category: 'decor', kind: 'furniture', furnitureType: 'decorative_partition', width: 110, height: 25, iconType: 'decorative_partition', tag: 'Wood' }
];

const CATEGORIES: Array<{ id: CarouselCategory; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'tables', label: 'Tables' },
  { id: 'seating', label: 'Seating' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'structure', label: 'Structure' },
  { id: 'decor', label: 'Decor' }
];

export const AssetLibraryCarousel: React.FC<AssetLibraryCarouselProps> = ({ onAddItem }) => {
  // 1. useState declarations (Strict React Hooks Safety Guardrail)
  const [activeCategory, setActiveCategory] = useState<CarouselCategory>('all');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // 2. useRef declarations
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 3. useMemo declarations
  const filteredAssets = useMemo(() => {
    if (activeCategory === 'all') return ASSET_LIBRARY;
    return ASSET_LIBRARY.filter((a) => a.category === activeCategory);
  }, [activeCategory]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const offset = direction === 'left' ? -280 : 280;
    scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  const handleSelectAndAdd = (asset: AssetItem) => {
    setSelectedAssetId(asset.id);
    if (asset.kind === 'table') {
      onAddItem({
        kind: 'table',
        shape: asset.shape,
        seats: asset.defaultSeats || 4,
        width: asset.width,
        height: asset.height
      });
    } else {
      onAddItem({
        kind: 'furniture',
        furnitureType: asset.furnitureType,
        name: asset.name,
        width: asset.width,
        height: asset.height
      });
    }
  };

  // ALL HOOKS STRICTLY ABOVE ANY CONDITIONAL RETURNS
  return (
    <div className="absolute bottom-3 inset-x-4 z-20 pointer-events-auto select-none">
      <div className="bg-[#0B0F14]/95 backdrop-blur-md border border-white/[0.08] rounded-[16px] shadow-2xl p-2.5 flex flex-col gap-2">
        {/* Top Category Pill Filter Bar */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-white/[0.08]">
          <div className="flex items-center gap-1.5 shrink-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-[#16A34A] text-white font-semibold shadow-xs'
                    : 'bg-white/[0.04] text-stone-400 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Carousel Arrow Navigation */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              className="p-1 rounded-full bg-white/[0.05] text-stone-400 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
              title="Scroll Left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              className="p-1 rounded-full bg-white/[0.05] text-stone-400 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
              title="Scroll Right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Horizontal Carousel of Asset Cards */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 no-scrollbar scroll-smooth"
        >
          {filteredAssets.map((asset) => {
            const isSelected = selectedAssetId === asset.id;
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => handleSelectAndAdd(asset)}
                className={`flex items-center gap-2 px-3 py-2 rounded-[12px] border transition-all shrink-0 cursor-pointer text-left ${
                  isSelected
                    ? 'border-emerald-500/60 bg-white/[0.06] shadow-xs'
                    : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12]'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                  <FloorElementIcon type={asset.iconType} className="w-4 h-4" />
                </div>
                <div className="min-w-0 pr-1">
                  <div className="text-xs font-medium text-white truncate max-w-[100px]">{asset.name}</div>
                  <div className="text-[10px] text-stone-500 font-normal">
                    {asset.defaultSeats ? `${asset.defaultSeats} seats` : (asset.tag || 'Item')}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
