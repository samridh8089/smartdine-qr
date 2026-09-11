'use client';

/**
 * Phase-32: Unified Founder Live Sync Hook
 * Single Source of Truth for Super Admin Command Center and Founder Control Center.
 * Synchronizes: Active Orders, Floor Twin Tables, Graph Nodes, Timeline Events, and Counters.
 * Subscribes to Supabase postgres_changes with automatic cleanup on restaurant switch.
 * Strict React Hook Safety Guardrail compliant.
 */

import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { SystemEvent, OrderDotState } from '@/components/founder/types';
import type { ActiveTableDetails } from '@/components/founder/LeftPanel';

export interface FounderLiveSyncStats {
  activeOrdersCount: number;
  occupiedTablesCount: number;
  availableTablesCount: number;
  totalTablesCount: number;
}

export interface UseFounderLiveSyncOptions {
  restaurantId: string | null;
  enabled?: boolean;
}

export interface UseFounderLiveSyncReturn {
  activeOrders: any[];
  tables: ActiveTableDetails[];
  events: SystemEvent[];
  orderDots: OrderDotState[];
  stats: FounderLiveSyncStats;
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  totalEventCount: number;
  refresh: () => Promise<void>;
}

export function useFounderLiveSync({
  restaurantId,
  enabled = true,
}: UseFounderLiveSyncOptions): UseFounderLiveSyncReturn {
  // ─── 1. useState (Rule 1: Hooks Always First) ────────────────────────────
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [tables, setTables] = useState<ActiveTableDetails[]>([]);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [orderDots, setOrderDots] = useState<OrderDotState[]>([]);
  const [stats, setStats] = useState<FounderLiveSyncStats>({
    activeOrdersCount: 0,
    occupiedTablesCount: 0,
    availableTablesCount: 0,
    totalTablesCount: 0,
  });
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected');
  const [totalEventCount, setTotalEventCount] = useState(0);

  // ─── 2. useRef ───────────────────────────────────────────────────────────
  const activeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetchingRef = useRef(false);

  // ─── 3. useMemo ──────────────────────────────────────────────────────────
  const isConnected = useMemo(() => connectionStatus === 'connected', [connectionStatus]);

  // ─── 4. useCallback ──────────────────────────────────────────────────────
  const loadSyncData = useCallback(async (targetRestId: string) => {
    if (!targetRestId || isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const res = await fetch(`/api/admin/live-sync?restaurantId=${encodeURIComponent(targetRestId)}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`Live sync HTTP error ${res.status}`);
      }

      const data = await res.json();
      if (data && data.success) {
        setActiveOrders(data.activeOrders || []);
        setTables(data.tables || []);
        setEvents(data.events || []);
        setOrderDots(data.orderDots || []);
        setStats(data.stats || {
          activeOrdersCount: (data.activeOrders || []).length,
          occupiedTablesCount: 0,
          availableTablesCount: (data.tables || []).length,
          totalTablesCount: (data.tables || []).length,
        });
        setTotalEventCount((data.events || []).length);
        setConnectionStatus('connected');
      }
    } catch (err) {
      console.warn('[useFounderLiveSync] Sync error:', err);
      setConnectionStatus('error');
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  const triggerDebouncedReload = useCallback(() => {
    if (!restaurantId) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      loadSyncData(restaurantId);
    }, 250);
  }, [restaurantId, loadSyncData]);

  const refresh = useCallback(async () => {
    if (restaurantId) {
      await loadSyncData(restaurantId);
    }
  }, [restaurantId, loadSyncData]);

  // ─── 5. useEffect ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!restaurantId || !enabled) {
      // Instant cleanup on empty or disabled
      setActiveOrders([]);
      setTables([]);
      setEvents([]);
      setOrderDots([]);
      setStats({
        activeOrdersCount: 0,
        occupiedTablesCount: 0,
        availableTablesCount: 0,
        totalTablesCount: 0,
      });
      setConnectionStatus('disconnected');
      return;
    }

    let isMounted = true;
    setConnectionStatus('connecting');

    // 1. Clear old restaurant data immediately to eliminate any stale state
    setActiveOrders([]);
    setTables([]);
    setEvents([]);
    setOrderDots([]);
    setStats({
      activeOrdersCount: 0,
      occupiedTablesCount: 0,
      availableTablesCount: 0,
      totalTablesCount: 0,
    });

    // 2. Fetch fresh restaurant data immediately
    loadSyncData(restaurantId);

    // 3. Set up realtime postgres_changes listeners
    const channelName = `founder-sync-${restaurantId}-${Date.now()}`;
    const channel = supabase.channel(channelName);
    activeChannelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        () => {
          if (isMounted) triggerDebouncedReload();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_batches' },
        () => {
          if (isMounted) triggerDebouncedReload();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables', filter: `restaurant_id=eq.${restaurantId}` },
        () => {
          if (isMounted) triggerDebouncedReload();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_events', filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          if (!isMounted) return;
          if (payload.new && (payload.new as any).id) {
            const newEv = payload.new as SystemEvent;
            setEvents((prev) => [newEv, ...prev.filter((e) => e.id !== newEv.id)].slice(0, 200));
            setTotalEventCount((prev) => prev + 1);
          }
          triggerDebouncedReload();
        }
      )
      .subscribe((status) => {
        if (!isMounted) return;
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('error');
        }
      });

    // 4. Polling fallback every 8 seconds to guarantee 100% sync
    const pollInterval = setInterval(() => {
      if (isMounted && restaurantId) {
        loadSyncData(restaurantId);
      }
    }, 8000);

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (activeChannelRef.current) {
        supabase.removeChannel(activeChannelRef.current);
        activeChannelRef.current = null;
      }
    };
  }, [restaurantId, enabled, loadSyncData, triggerDebouncedReload]);

  return {
    activeOrders,
    tables,
    events,
    orderDots,
    stats,
    isConnected,
    connectionStatus,
    totalEventCount,
    refresh,
  };
}
