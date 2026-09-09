'use client';

/**
 * Phase-19: Founder Control Center — Realtime System Events Hook
 * Subscribes to system_events via Supabase postgres_changes.
 * No polling. Pure push-based.
 * Maintains a ring buffer of max 500 events.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { SystemEvent, OrderDotState } from '@/components/founder/types';
import { EVENT_TO_NODE, DOT_COLORS } from '@/components/founder/NodeDefinitions';

const MAX_EVENTS = 500;

interface UseSystemEventsOptions {
  restaurantId: string | null;
  enabled?: boolean;
}

interface UseSystemEventsReturn {
  events: SystemEvent[];
  orderDots: OrderDotState[];
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  totalEventCount: number;
  clearEvents: () => void;
}

export function useSystemEvents({
  restaurantId,
  enabled = true,
}: UseSystemEventsOptions): UseSystemEventsReturn {
  // ─── All hooks FIRST (React Hook Safety Rule) ────────────────────────────
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected');
  const [totalEventCount, setTotalEventCount] = useState(0);

  const colorMapRef = useRef<Map<string, string>>(new Map());
  const colorIndexRef = useRef(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const getOrAssignColor = useCallback((correlationId: string): string => {
    if (!colorMapRef.current.has(correlationId)) {
      colorMapRef.current.set(
        correlationId,
        DOT_COLORS[colorIndexRef.current % DOT_COLORS.length]
      );
      colorIndexRef.current++;
    }
    return colorMapRef.current.get(correlationId)!;
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setTotalEventCount(0);
    colorMapRef.current.clear();
    colorIndexRef.current = 0;
  }, []);

  // ─── Order Dots: derived from latest events per correlation_id ──────────
  const orderDots = useMemo<OrderDotState[]>(() => {
    const latestPerCorr = new Map<string, SystemEvent>();
    for (const evt of events) {
      const existing = latestPerCorr.get(evt.correlation_id);
      if (!existing || evt.created_at > existing.created_at) {
        latestPerCorr.set(evt.correlation_id, evt);
      }
    }

    return Array.from(latestPerCorr.values())
      .filter(evt => {
        const nodeId = evt.target_node || EVENT_TO_NODE[evt.event_type];
        return !!nodeId && nodeId !== 'session_closed';
      })
      .map(evt => {
        const nodeId = evt.target_node || EVENT_TO_NODE[evt.event_type] || 'order_created';
        const shortId = evt.correlation_id.replace('corr_', '').slice(0, 6);
        return {
          orderId: evt.order_id || evt.correlation_id,
          correlationId: evt.correlation_id,
          shortId,
          currentNodeId: nodeId,
          prevNodeId: evt.source_node,
          color: getOrAssignColor(evt.correlation_id),
          lastEventAt: evt.created_at,
          metadata: evt.metadata,
        };
      });
  }, [events, getOrAssignColor]);

  const isConnected = connectionStatus === 'connected';

  // ─── Realtime Subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!restaurantId || !enabled) {
      setConnectionStatus('disconnected');
      return;
    }

    setConnectionStatus('connecting');

    // Load recent events on mount
    void (async () => {
      try {
        const { data } = await supabase
          .from('system_events')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false })
          .limit(200);
        if (data && data.length > 0) {
          setEvents(data.reverse() as SystemEvent[]);
          setTotalEventCount(data.length);
        }
      } catch {
        // silent
      }
    })();

    // Subscribe to live inserts
    const channel = supabase
      .channel(`founder_events_${restaurantId}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_events',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const newEvent = payload.new as SystemEvent;
          setEvents(prev => {
            const updated = [...prev, newEvent];
            return updated.length > MAX_EVENTS
              ? updated.slice(updated.length - MAX_EVENTS)
              : updated;
          });
          setTotalEventCount(prev => prev + 1);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('error');
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      setConnectionStatus('disconnected');
    };
  }, [restaurantId, enabled]);

  return {
    events,
    orderDots,
    isConnected,
    connectionStatus,
    totalEventCount,
    clearEvents,
  };
}
