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
  const activeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isSubscribedRef = useRef(false);

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

  // ─── Realtime Subscription (React Strict Mode Safe) ─────────────────────
  useEffect(() => {
    if (!restaurantId || !enabled) {
      setConnectionStatus('disconnected');
      return;
    }

    let isMounted = true;
    setConnectionStatus('connecting');

    // Helper to safely ingest and deduplicate events
    const ingestEvent = (newEvent: SystemEvent) => {
      if (!isMounted || !newEvent || !newEvent.id) return;
      setEvents((prev) => {
        if (prev.some((e) => e.id === newEvent.id)) return prev;
        const updated = [...prev, newEvent];
        return updated.length > MAX_EVENTS
          ? updated.slice(updated.length - MAX_EVENTS)
          : updated;
      });
      setTotalEventCount((prev) => prev + 1);
    };

    // 1. Load recent historical events on mount (with fallback to orders & audit_logs)
    void (async () => {
      try {
        let loaded = false;
        const { data, error } = await supabase
          .from('system_events')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false })
          .limit(200);

        if (isMounted && data && data.length > 0) {
          setEvents(data.reverse() as SystemEvent[]);
          setTotalEventCount(data.length);
          loaded = true;
        }

        // Fallback: If system_events table is pending/empty, synthesize events from orders
        if (!loaded && isMounted) {
          const { data: orderRows } = await supabase
            .from('orders')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('updated_at', { ascending: false })
            .limit(50);

          if (isMounted && orderRows && orderRows.length > 0) {
            const synthesized: SystemEvent[] = orderRows.map((ord: any) => {
              const status = ord.status || 'created';
              const evtType = `order_${status}`;
              const targetNode = EVENT_TO_NODE[evtType] || 'order_created';
              const orderCorrId = `corr_${ord.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`;

              return {
                id: `synth_${ord.id}_${status}`,
                restaurant_id: restaurantId,
                correlation_id: orderCorrId,
                order_id: ord.id,
                table_uuid: ord.table_id || undefined,
                actor_type: 'staff',
                event_type: evtType,
                source_node: 'order_created',
                target_node: targetNode,
                created_at: ord.updated_at || ord.created_at || new Date().toISOString(),
                metadata: {
                  table_name: ord.table_name || 'Table',
                  total: ord.total,
                  payment_status: ord.payment_status,
                },
              };
            });

            synthesized.sort((a, b) => a.created_at.localeCompare(b.created_at));
            setEvents(synthesized);
            setTotalEventCount(synthesized.length);
          }
        }
      } catch (e) {
        console.error('[useSystemEvents] Historical fetch error:', e);
      }
    })();

    // 2. Stable channel name (no Date.now())
    const channelName = `founder_events_${restaurantId}`;

    // 3. Clean up any existing channel with same topic before subscribing
    const existing = supabase.getChannels().find((ch) => ch.topic === `realtime:${channelName}`);
    if (existing) {
      supabase.removeChannel(existing);
    }

    // 4. Register all .on() callbacks BEFORE calling .subscribe()
    const channel = supabase
      .channel(channelName)
      // Transport A: Supabase Postgres Changes on system_events
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_events',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          ingestEvent(payload.new as SystemEvent);
        }
      )
      // Transport B: Realtime Broadcast on order-status-updated (Instant push fallback)
      .on('broadcast', { event: 'order-status-updated' }, ({ payload }) => {
        if (!isMounted || !payload) return;
        const ordId = payload.orderId || payload.updatedOrder?.id;
        const newStat = payload.newStatus || payload.updatedOrder?.status || 'preparing';
        const evtType = `order_${newStat}`;
        const corrId = ordId
          ? `corr_${ordId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`
          : `corr_${Date.now()}`;

        ingestEvent({
          id: `bc_${ordId || Date.now()}_${newStat}_${Date.now()}`,
          restaurant_id: restaurantId,
          correlation_id: corrId,
          order_id: ordId,
          actor_type: 'staff',
          event_type: evtType,
          target_node: EVENT_TO_NODE[evtType] || 'preparing',
          created_at: new Date().toISOString(),
          metadata: {
            staffName: payload.staffName || 'Staff',
            batchId: payload.batchId,
          },
        });
      })
      // Transport C: Realtime Broadcast on new-order
      .on('broadcast', { event: 'new-order' }, ({ payload }) => {
        if (!isMounted || !payload) return;
        const ord = payload.new || payload;
        const ordId = ord.id;
        const corrId = ordId
          ? `corr_${ordId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`
          : `corr_${Date.now()}`;

        ingestEvent({
          id: `bc_new_${ordId || Date.now()}_${Date.now()}`,
          restaurant_id: restaurantId,
          correlation_id: corrId,
          order_id: ordId,
          actor_type: 'customer',
          event_type: 'order_created',
          target_node: 'order_created',
          created_at: new Date().toISOString(),
          metadata: {
            table_name: ord.table_name,
            total: ord.total,
          },
        });
      })
      // Transport D: Realtime Broadcast on payment-updated
      .on('broadcast', { event: 'payment-updated' }, ({ payload }) => {
        if (!isMounted || !payload) return;
        const ordId = payload.orderId;
        const corrId = ordId
          ? `corr_${ordId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`
          : `corr_${Date.now()}`;

        ingestEvent({
          id: `bc_pay_${ordId || Date.now()}_${Date.now()}`,
          restaurant_id: restaurantId,
          correlation_id: corrId,
          order_id: ordId,
          actor_type: 'system',
          event_type: 'payment_success',
          target_node: 'payment',
          created_at: new Date().toISOString(),
          metadata: {
            paymentStatus: payload.paymentStatus,
          },
        });
      })
      .subscribe((status) => {
        if (!isMounted) return;
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
          setConnectionStatus('connected');
        } else if (status === 'CLOSED') {
          isSubscribedRef.current = false;
          setConnectionStatus('disconnected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          isSubscribedRef.current = false;
          setConnectionStatus('error');
        }
      });

    activeChannelRef.current = channel;

    // 5. Cleanup properly on unmount
    return () => {
      isMounted = false;
      isSubscribedRef.current = false;
      supabase.removeChannel(channel);
      activeChannelRef.current = null;
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
