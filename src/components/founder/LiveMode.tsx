'use client';

/**
 * Phase-19: Founder Control Center — Live Mode
 * Main live view: LeftPanel + GraphCanvas + RightPanel
 */

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Focus, X } from 'lucide-react';
import { useSystemEvents } from '@/hooks/useSystemEvents';
import LeftPanel from './LeftPanel';
import RightPanel from './RightPanel';
import type { OrderDotState, SystemEvent } from './types';

// Konva canvas must be dynamically imported (no SSR)
const GraphCanvas = dynamic(() => import('./GraphCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-slate-950">
      <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

interface LiveModeProps {
  restaurantId: string;
  followingOrderId: string | null;
  onFollowOrder: (id: string | null) => void;
  events?: SystemEvent[];
  orderDots?: OrderDotState[];
}

export default function LiveMode({
  restaurantId,
  followingOrderId,
  onFollowOrder,
  events: propEvents,
  orderDots: propOrderDots,
}: LiveModeProps) {
  // ─── All hooks FIRST ─────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedDot, setSelectedDot] = useState<OrderDotState | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'timeline' | 'inspector' | 'flight'>('timeline');

  // Only subscribe if parent did not provide events
  const fallback = useSystemEvents({ restaurantId, enabled: !propEvents });
  const events = propEvents ?? fallback.events;
  const orderDots = propOrderDots ?? fallback.orderDots;

  // Measure container
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setRightPanelTab('inspector');
  }, []);

  const handleDotClick = useCallback((dot: OrderDotState) => {
    setSelectedDot(dot);
    setRightPanelTab('flight');
  }, []);

  const handleFollow = useCallback((dot: OrderDotState) => {
    onFollowOrder(dot.orderId);
  }, [onFollowOrder]);

  const handleRightClose = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedDot(null);
  }, []);

  const followedDot = useMemo(
    () => orderDots.find(d => d.orderId === followingOrderId || d.correlationId === followingOrderId) ?? null,
    [orderDots, followingOrderId]
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Panel: 260px */}
      <div className="w-64 shrink-0 border-r border-slate-800 overflow-hidden">
        <LeftPanel restaurantId={restaurantId} />
      </div>

      {/* Center: Graph Canvas */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-slate-950">
        {containerSize.width > 100 && (
          <GraphCanvas
            containerWidth={containerSize.width}
            containerHeight={containerSize.height}
            orderDots={orderDots}
            events={events}
            followingOrderId={followingOrderId}
            onNodeClick={handleNodeClick}
            onDotClick={(dot) => {
              handleDotClick(dot);
            }}
          />
        )}

        {/* Follow Mode badge */}
        {followingOrderId && followedDot && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-slate-900/95 border border-emerald-500/50 rounded-full shadow-lg shadow-emerald-500/20 z-10">
            <Focus className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs text-emerald-300 font-mono font-medium">
              Following {followedDot.shortId}
            </span>
            <button
              onClick={() => onFollowOrder(null)}
              className="text-slate-400 hover:text-white ml-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Live stats overlay (bottom-left) */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 z-10">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/90 border border-slate-700 rounded-full">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-slate-300">{orderDots.length} active</span>
          </div>
          <div className="px-2.5 py-1 bg-slate-900/90 border border-slate-700 rounded-full">
            <span className="text-[10px] text-slate-400">{events.length} events</span>
          </div>
        </div>

        {/* Zoom hint */}
        <div className="absolute bottom-3 right-3 text-[9px] text-slate-600 z-10">
          Scroll to zoom · Drag to pan
        </div>
      </div>

      {/* Right Panel: 340px */}
      <div className="w-[340px] shrink-0 border-l border-slate-800 overflow-hidden">
        <RightPanel
          events={events}
          selectedNodeId={selectedNodeId || 'order_created'}
          selectedDot={selectedDot || (orderDots.length > 0 ? orderDots[0] : null)}
          onClose={handleRightClose}
        />
      </div>
    </div>
  );
}
