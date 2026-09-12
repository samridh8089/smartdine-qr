// SmartDine AI Floor Planner — Business Impact & Revenue Optimizer Card
// Clean Linear/Notion aesthetic: #0B0F14 background, border-white/[0.08], 16px radius, emerald accent (#16A34A)

import React from 'react';
import { TrendingUp, Users, Footprints, Clock, ShieldAlert } from 'lucide-react';
import { BusinessImpactMetrics } from '@/lib/ai/floorPlanner';

interface BusinessImpactCardProps {
  impact: BusinessImpactMetrics;
  layoutName: string;
  className?: string;
}

export const BusinessImpactCard: React.FC<BusinessImpactCardProps> = ({
  impact,
  layoutName,
  className = ''
}) => {
  return (
    <div className={`p-4 bg-white/[0.02] rounded-[16px] border border-white/[0.08] space-y-3 font-sans ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-[10px] bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-[#16A34A]" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white flex items-center gap-2">
              Business Impact &amp; Revenue Projection
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-[6px] bg-[#16A34A]/15 text-[#16A34A] border border-[#16A34A]/30">
                {impact.revenueScoreBadge}
              </span>
            </div>
            <div className="text-[11px] text-zinc-400">Projected for {layoutName}</div>
          </div>
        </div>

        <span className="text-[11px] font-medium px-2 py-0.5 rounded-[6px] bg-white/[0.04] text-zinc-300 border border-white/[0.08]">
          {impact.waiterEfficiencyBadge}
        </span>
      </div>

      {/* Primary Comparison Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
        {/* Seats Comparison */}
        <div className="bg-white/[0.02] p-2.5 rounded-[12px] border border-white/[0.08] space-y-1">
          <div className="text-[10px] uppercase font-medium text-zinc-400 flex items-center justify-center gap-1">
            <Users className="w-3 h-3 text-[#16A34A]" />
            <span>Capacity</span>
          </div>
          <div className="text-sm font-semibold text-white">
            <span className="text-zinc-500 line-through text-xs mr-1">{impact.currentSeats}</span>
            <span className="text-[#16A34A]">{impact.suggestedSeats} Seats</span>
          </div>
          <div className="text-[10px] text-[#16A34A] font-medium">
            +{impact.extraSeats} Extra Seats
          </div>
        </div>

        {/* Peak-Hour Seating Boost */}
        <div className="bg-white/[0.02] p-2.5 rounded-[12px] border border-white/[0.08] space-y-1">
          <div className="text-[10px] uppercase font-medium text-zinc-400 flex items-center justify-center gap-1">
            <TrendingUp className="w-3 h-3 text-[#16A34A]" />
            <span>Peak Seating</span>
          </div>
          <div className="text-sm font-semibold text-white">
            +{impact.peakHourCapacityIncreasePercent}%
          </div>
          <div className="text-[10px] text-zinc-400">Rush Throughput</div>
        </div>

        {/* Walking Aisle Width */}
        <div className="bg-white/[0.02] p-2.5 rounded-[12px] border border-white/[0.08] space-y-1">
          <div className="text-[10px] uppercase font-medium text-zinc-400 flex items-center justify-center gap-1">
            <Footprints className="w-3 h-3 text-zinc-400" />
            <span>Aisle Width</span>
          </div>
          <div className="text-sm font-semibold text-white">
            {impact.walkingAisleWidthFt} ft
          </div>
          <div className="text-[10px] text-[#16A34A] font-medium">ADA Clear</div>
        </div>

        {/* Waiter Path Efficiency */}
        <div className="bg-white/[0.02] p-2.5 rounded-[12px] border border-white/[0.08] space-y-1">
          <div className="text-[10px] uppercase font-medium text-zinc-400 flex items-center justify-center gap-1">
            <Clock className="w-3 h-3 text-zinc-400" />
            <span>Transit Time</span>
          </div>
          <div className="text-sm font-semibold text-white">
            -{impact.shorterWaiterPathPercent}%
          </div>
          <div className="text-[10px] text-zinc-400">Shorter Steps</div>
        </div>
      </div>

      {/* Transparent Disclaimer */}
      <div className="text-[10px] text-zinc-400 bg-white/[0.01] p-2.5 rounded-[10px] border border-white/[0.08] flex items-center gap-2">
        <ShieldAlert className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
        <span>Projections calibrated from dining turnover ratios and structural clearance models. Actual revenue varies by operations.</span>
      </div>
    </div>
  );
};
