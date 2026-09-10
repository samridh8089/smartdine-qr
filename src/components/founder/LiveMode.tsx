'use client';

/**
 * Phase-21: Founder Control Center — Live Mode
 * Main live view: LeftPanel + GraphCanvas + RightPanel
 * Connects Interactive Digital Twin, Node Highlighting, and Timeline Traces
 * Strict React Hook Safety Guardrail compliant.
 */

import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Focus, X } from 'lucide-react';
import { useSystemEvents } from '@/hooks/useSystemEvents';
import LeftPanel from './LeftPanel';
import RightPanel from './RightPanel';
import type { OrderDotState, SystemEvent } from './types';

// Konva canvas dynamically imported (no SSR)
const GraphCanvas = dynamic(() => import('./GraphCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-slate-950">
      <div className="h-6 w-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

interface LiveModeProps {
  restaurantId: string;
  followingOrderId: string | null;
  onFollowOrder: (id: string | null) => void;
  events?: SystemEvent[];
  orderDots?: OrderDotState[];
  theme?: 'dark' | 'light';
}

export default function LiveMode({
  restaurantId,
  followingOrderId,
  onFollowOrder,
  events: propEvents,
  orderDots: propOrderDots,
  theme = 'dark',
}: LiveModeProps) {
  // ─── 1. useState (Rule 1: Hooks Always First) ────────────────────────────
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedDot, setSelectedDot] = useState<OrderDotState | null>(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'timeline' | 'inspector' | 'flight'>('timeline');

  // ─── 2. useRef ───────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Custom hook for fallback events
  const fallback = useSystemEvents({ restaurantId, enabled: !propEvents });
  const events = propEvents ?? fallback.events;
  const orderDots = propOrderDots ?? fallback.orderDots;

  // ─── 3. useMemo ──────────────────────────────────────────────────────────
  const followedDot = useMemo(
    () =>
      orderDots.find(
        (d) => d.orderId === followingOrderId || d.correlationId === followingOrderId
      ) ?? null,
    [orderDots, followingOrderId]
  );

  // ─── 4. useCallback ──────────────────────────────────────────────────────
  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setHighlightedNodeId(nodeId);
    setRightPanelTab('inspector');
  }, []);

  const handleDotClick = useCallback(
    (dot: OrderDotState) => {
      setSelectedDot(dot);
      setSelectedNodeId(dot.currentNodeId);
      setHighlightedNodeId(dot.currentNodeId);
      onFollowOrder(dot.orderId);
      setRightPanelTab('flight');
    },
    [onFollowOrder]
  );

  const handleNodeHighlight = useCallback((nodeId: string) => {
    setHighlightedNodeId(nodeId);
    setSelectedNodeId(nodeId);

    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedNodeId(null);
    }, 4500);
  }, []);

  const handleOpenTimelineFromTable = useCallback(
    (orderId?: string, correlationId?: string) => {
      if (orderId || correlationId) {
        // Find if an active dot exists for this order
        const dot = orderDots.find(
          (d) =>
            (orderId && d.orderId === orderId) ||
            (correlationId && d.correlationId === correlationId)
        );
        if (dot) {
          setSelectedDot(dot);
          setRightPanelTab('flight');
        } else {
          // Open timeline tab
          setRightPanelTab('timeline');
        }
      } else {
        setRightPanelTab('timeline');
      }
    },
    [orderDots]
  );

  const handleRightClose = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedDot(null);
    setHighlightedNodeId(null);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    onFollowOrder(null);
    setSelectedDot(null);
    setSelectedNodeId(null);
    setHighlightedNodeId(null);
  }, [onFollowOrder]);

  // ─── 5. useEffect ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
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

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  // ─── 6. Render (Unconditional hook execution guaranteed) ─────────────────
  return (
    <div className={`flex h-full overflow-hidden select-none ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-950'}`}>
      {/* Left Panel: Floor Digital Twin (260px) */}
      <div className={`w-64 shrink-0 border-r overflow-hidden ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
        <LeftPanel
          restaurantId={restaurantId}
          selectedOrderId={followingOrderId || selectedDot?.orderId || null}
          theme={theme}
          onCloseDrawer={handleCloseDrawer}
          onTableClick={(table) => {
            if (table.currentOrderId) {
              onFollowOrder(table.currentOrderId);
              const dot = orderDots.find(
                (d) =>
                  d.orderId === table.currentOrderId ||
                  (table.correlationId && d.correlationId === table.correlationId)
              );
              if (dot) {
                setSelectedDot(dot);
                setSelectedNodeId(dot.currentNodeId);
                setHighlightedNodeId(dot.currentNodeId);
              }
              setRightPanelTab('flight');
            }
          }}
          onOpenTimeline={handleOpenTimelineFromTable}
        />
      </div>

      {/* Center: Graph Canvas */}
      <div ref={containerRef} className={`flex-1 relative overflow-hidden ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-950'}`}>
        {containerSize.width > 100 && (
          <GraphCanvas
            containerWidth={containerSize.width}
            containerHeight={containerSize.height}
            orderDots={orderDots}
            events={events}
            followingOrderId={followingOrderId}
            highlightedNodeId={highlightedNodeId}
            theme={theme}
            onNodeClick={handleNodeClick}
            onDotClick={handleDotClick}
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
              className="text-slate-400 hover:text-white ml-1 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Node Highlight Toast Indicator */}
        {highlightedNodeId && (
          <div className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 bg-sky-950/90 border border-sky-500/60 rounded-lg shadow-lg shadow-sky-500/20 z-10 animate-in fade-in">
            <span className="h-2 w-2 rounded-full bg-sky-400 animate-ping" />
            <span className="text-xs text-sky-200 font-mono font-bold">
              Inspecting {highlightedNodeId}
            </span>
          </div>
        )}

        {/* Floating live summary badge */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 font-mono z-10">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/90 border border-slate-700 rounded-full">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-slate-300">{orderDots.length} active orders</span>
          </div>
          <div className="px-2.5 py-1 bg-slate-900/90 border border-slate-700 rounded-full">
            <span className="text-[10px] text-slate-400">{events.length} events logged</span>
          </div>
        </div>

        {/* Zoom hint */}
        <div className="absolute bottom-3 right-3 text-[9px] text-slate-600 z-10 font-mono">
          Scroll to zoom · Drag to pan · Click node or dot to inspect
        </div>
      </div>

      {/* Right Panel: 340px */}
      <div className={`w-[340px] shrink-0 border-l overflow-hidden ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
        <RightPanel
          events={events}
          selectedNodeId={selectedNodeId}
          selectedDot={selectedDot}
          restaurantId={restaurantId}
          theme={theme}
          onClose={handleRightClose}
          onNodeSelect={handleNodeHighlight}
          activeTab={rightPanelTab}
          onTabChange={setRightPanelTab}
        />
      </div>
    </div>
  );
}
