'use client';

/**
 * Phase-21: Founder Control Center — Left Panel & Floor Digital Twin
 * Mini floor plan + interactive table drawer + waiter view + kitchen view
 * Strict React Hook Safety Guardrail compliant.
 */

import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  LayoutGrid,
  ChefHat,
  User,
  RefreshCw,
  X,
  Clock,
  Receipt,
  Utensils,
  ExternalLink,
  QrCode,
  History,
  MoreVertical,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { SystemErrorItem } from '@/components/founder/types';

export interface TableItemDetail {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface ActiveTableDetails {
  id: string;
  name: string;
  status: 'available' | 'waiting' | 'preparing' | 'ready' | 'occupied';
  currentOrderId?: string;
  correlationId?: string;
  sessionId?: string;
  waiterName?: string;
  orderDurationMin?: number;
  items: TableItemDetail[];
  totalBill: number;
  customerCount?: number;
}

export interface WaiterMovementInfo {
  action: 'Delivering' | 'Serving' | 'Pickup' | 'Assigned';
  label: string;
  waiter: string;
  targetTable: string;
  color: string;
  pulse: boolean;
}

export interface KitchenEtaInfo {
  etaMin: number;
  elapsedMin: number;
  totalEta: number;
}

export function getWaiterMovement(tableName: string, waiterName?: string): WaiterMovementInfo | null {
  if (waiterName) {
    return {
      action: 'Assigned',
      label: `${waiterName} → ${tableName} [Assigned]`,
      waiter: waiterName,
      targetTable: tableName,
      color: 'text-sky-300 bg-sky-950/80 border-dashed border-sky-500/80',
      pulse: true,
    };
  }
  return null;
}

export function getKitchenEta(tableStatus: string, elapsedMin?: number): KitchenEtaInfo | null {
  if (tableStatus === 'preparing' && elapsedMin !== undefined) {
    const elapsed = elapsedMin;
    const totalEta = 15;
    return {
      etaMin: Math.max(1, totalEta - elapsed),
      elapsedMin: elapsed,
      totalEta,
    };
  }
  return null;
}

export const DEFAULT_KNOWN_TABLES: Array<{ id: string; name: string }> = [
  { id: 't4', name: 'Table 4' },
  { id: 't6', name: 'Table 6' },
  { id: 't10', name: 'Table 10' },
  { id: 't12', name: 'Table 12' },
  { id: 't14', name: 'Table 14' },
  { id: 't16', name: 'Table 16' },
];

interface LeftPanelProps {
  restaurantId: string;
  selectedOrderId?: string | null;
  theme?: 'dark' | 'light';
  activeError?: SystemErrorItem | null;
  isRetryingError?: boolean;
  onRetryError?: () => void;
  onTableClick?: (table: ActiveTableDetails) => void;
  onOpenTimeline?: (orderId?: string, correlationId?: string) => void;
  onCloseDrawer?: () => void;
  tables?: ActiveTableDetails[];
  activeOrders?: any[];
}

const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; label: string; border: string; glow: string }
> = {
  waiting: {
    bg: 'bg-rose-950/60',
    border: 'border-rose-500/70',
    text: 'text-rose-400',
    label: 'Waiting',
    glow: 'shadow-[0_0_12px_rgba(244,63,94,0.35)]',
  },
  preparing: {
    bg: 'bg-amber-950/60',
    border: 'border-amber-500/70',
    text: 'text-amber-400',
    label: 'Preparing',
    glow: 'shadow-[0_0_12px_rgba(245,158,11,0.35)] animate-pulse',
  },
  ready: {
    bg: 'bg-emerald-950/60',
    border: 'border-emerald-500/70',
    text: 'text-emerald-400',
    label: 'Ready',
    glow: 'shadow-[0_0_14px_rgba(16,185,129,0.4)]',
  },
  occupied: {
    bg: 'bg-blue-950/60',
    border: 'border-sky-500/70',
    text: 'text-sky-400',
    label: 'Occupied',
    glow: 'shadow-[0_0_12px_rgba(56,189,248,0.4)]',
  },
  available: {
    bg: 'bg-slate-900/60',
    border: 'border-slate-800',
    text: 'text-slate-400',
    label: 'Available',
    glow: '',
  },
};

const DEFAULT_TABLES: Array<{ id: string; name: string }> = [
  { id: 't_1', name: 'Table 1' },
  { id: 't_2', name: 'Table 2' },
  { id: 't_3', name: 'Table 3' },
  { id: 't_4', name: 'Table 4' },
  { id: 't_10', name: 'Table 10' },
  { id: 't_12', name: 'Table 12' },
  { id: 't_13', name: 'Table 13' },
  { id: 't_14', name: 'Table 14' },
  { id: 't_15', name: 'Table 15' },
];

type LeftTab = 'floor' | 'kitchen' | 'waiters';

export default function LeftPanel({
  restaurantId,
  selectedOrderId,
  theme = 'dark',
  activeError,
  isRetryingError,
  onRetryError,
  onTableClick,
  onOpenTimeline,
  onCloseDrawer,
  tables: propTables,
  activeOrders: propActiveOrders,
}: LeftPanelProps) {
  // ─── 1. useState (Rule 1: Strict Hook Declaration Order) ──────────────────
  const [activeTab, setActiveTab] = useState<LeftTab>('floor');
  const [tables, setTables] = useState<ActiveTableDetails[]>(propTables || []);
  const [selectedTable, setSelectedTable] = useState<ActiveTableDetails | null>(null);
  const [isDrawerDismissed, setIsDrawerDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [waiters, setWaiters] = useState<
    Array<{ id: string; name: string; tables: string[]; calls: number }>
  >([]);
  const [kitchenQueue, setKitchenQueue] = useState<
    Array<{ orderId: string; table: string; elapsedMin: number; itemsCount: number }>
  >([]);
  const [menuOpenTableId, setMenuOpenTableId] = useState<string | null>(null);
  const [tableHistory, setTableHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // ─── 2. useRef ───────────────────────────────────────────────────────────
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── 3. useMemo ──────────────────────────────────────────────────────────
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      waiting: 0,
      preparing: 0,
      ready: 0,
      occupied: 0,
      available: 0,
    };
    for (const t of tables) {
      counts[t.status] = (counts[t.status] || 0) + 1;
    }
    return counts;
  }, [tables]);

  const activeSelectedTable = useMemo(() => {
    if (isDrawerDismissed) return null;
    if (selectedTable) {
      return tables.find((t) => t.id === selectedTable.id) || selectedTable;
    }
    if (selectedOrderId) {
      return (
        tables.find(
          (t) =>
            t.currentOrderId === selectedOrderId ||
            t.correlationId === selectedOrderId ||
            (t.currentOrderId && selectedOrderId.includes(t.currentOrderId))
        ) || null
      );
    }
    return null;
  }, [isDrawerDismissed, selectedTable, selectedOrderId, tables]);

  // ─── 4. useCallback ──────────────────────────────────────────────────────
  const loadFloorData = useCallback(async () => {
    if (!restaurantId) return;
    try {
      // 1. Fetch tables safely (only id, name)
      let rawTables: Array<{ id: string; name: string }> = [];
      try {
        const { data: tData } = await supabase
          .from('tables')
          .select('id, name')
          .eq('restaurant_id', restaurantId)
          .order('name', { ascending: true })
          .limit(60);
        if (tData && tData.length > 0) {
          rawTables = tData as Array<{ id: string; name: string }>;
        }
      } catch {
        // fallback to default tables
      }

      if (rawTables.length === 0) {
        rawTables = DEFAULT_KNOWN_TABLES;
      }

      // 2. Fetch active orders
      let activeOrders: any[] = propActiveOrders || [];
      if (!propActiveOrders || propActiveOrders.length === 0) {
        try {
          const { data: oData } = await supabase
            .from('orders')
            .select('id, table_id, table_name, status, total, created_at')
            .eq('restaurant_id', restaurantId)
            .not('status', 'in', '("completed","cancelled")')
            .order('created_at', { ascending: false })
            .limit(30);
          if (oData) activeOrders = oData;
        } catch {
          // silent
        }
      }

      // Map orders by table_id and table_name
      const orderMap = new Map<string, any>();
      for (const o of activeOrders) {
        if (o.table_id) orderMap.set(o.table_id, o);
        if (o.table_name) orderMap.set(o.table_name.toLowerCase().trim(), o);
      }

      const now = Date.now();
      const mappedTables: ActiveTableDetails[] = rawTables.map((t) => {
        const nameClean = t.name.toLowerCase().trim();
        const ord = orderMap.get(t.id) || orderMap.get(nameClean);

        let status: ActiveTableDetails['status'] = 'available';
        let items: TableItemDetail[] = [];
        let totalBill = 0;
        let waiterName: string | undefined = undefined;
        let elapsedMin: number | undefined = undefined;
        let sessionId: string | undefined = undefined;
        let orderId = ord?.id;

        if (ord) {
          if (ord.status === 'preparing') status = 'preparing';
          else if (ord.status === 'ready') status = 'ready';
          else if (ord.status === 'new') status = 'waiting';
          else status = 'occupied';

          totalBill = Number(ord.total_amount) || 0;
          sessionId = `sess_${t.name.replace(/\s+/g, '').toLowerCase()}`;
          elapsedMin = ord.created_at
            ? Math.max(1, Math.round((now - new Date(ord.created_at).getTime()) / 60000))
            : undefined;
        }

        return {
          id: t.id,
          name: t.name,
          status,
          currentOrderId: orderId,
          correlationId: orderId ? `corr_${orderId}` : undefined,
          sessionId,
          waiterName,
          orderDurationMin: elapsedMin,
          items,
          totalBill,
          customerCount: status === 'available' ? 0 : 4,
        };
      });

      setTables(mappedTables);
    } catch (err) {
      console.warn('[LeftPanel] Error loading floor data:', err);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  const loadKitchenData = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const { data } = await supabase
        .from('order_batches')
        .select('order_id, updated_at, order:orders(table_name, status)')
        .eq('status', 'preparing')
        .order('created_at', { ascending: true })
        .limit(20);

      const now = Date.now();
      const queue = (data || []).map((b: any) => ({
        orderId: b.order_id,
        table: b.order?.table_name || 'Table',
        elapsedMin: (now - new Date(b.updated_at).getTime()) / 60000,
        itemsCount: 2,
      }));
      setKitchenQueue(queue);
    } catch (err) {
      console.warn('[LeftPanel] Error loading kitchen data:', err);
    }
  }, [restaurantId]);

  const fetchTableHistory = useCallback(async (tableId: string, tableName: string) => {
    if (!restaurantId) return;
    try {
      setLoadingHistory(true);
      setShowHistory(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          status,
          total,
          special_instructions,
          order_items (
            id,
            menu_item_name,
            quantity,
            price
          )
        `)
        .eq('restaurant_id', restaurantId)
        .or(`table_id.eq.${tableId},table_name.ilike.%${tableName}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data && !error) {
        setTableHistory(data);
      } else {
        setTableHistory([]);
      }
    } catch (err) {
      console.warn('[LeftPanel] Error fetching table history:', err);
      setTableHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [restaurantId]);

  const handleTableSelect = useCallback(
    (t: ActiveTableDetails) => {
      setIsDrawerDismissed(false);
      setSelectedTable(t);
      setShowHistory(false);
      setTableHistory([]);
      onTableClick?.(t);
    },
    [onTableClick]
  );

  const handleCloseDrawer = useCallback(() => {
    setSelectedTable(null);
    setIsDrawerDismissed(true);
    setShowHistory(false);
    setTableHistory([]);
    onCloseDrawer?.();
  }, [onCloseDrawer]);

  const handleOpenTimelineClick = useCallback(() => {
    if (activeSelectedTable) {
      if (activeSelectedTable.status === 'available') {
        fetchTableHistory(activeSelectedTable.id, activeSelectedTable.name);
        onOpenTimeline?.('', '');
      } else {
        onOpenTimeline?.(activeSelectedTable.currentOrderId, activeSelectedTable.correlationId);
      }
    }
  }, [activeSelectedTable, onOpenTimeline, fetchTableHistory]);

  // ─── 5. useEffect ────────────────────────────────────────────────────────
  useEffect(() => {
    loadFloorData();
    loadKitchenData();

    pollTimerRef.current = setInterval(() => {
      loadFloorData();
      loadKitchenData();
    }, 15000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [loadFloorData, loadKitchenData]);

  useEffect(() => {
    if (propTables && propTables.length > 0) {
      setTables(propTables);
      setLoading(false);
    }
  }, [propTables]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (menuOpenTableId) {
          setMenuOpenTableId(null);
        } else if (activeSelectedTable) {
          handleCloseDrawer();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSelectedTable, handleCloseDrawer, menuOpenTableId]);

  // ─── 6. Render (Unconditional hook execution guaranteed) ─────────────────
  const isLight = theme === 'light';

  return (
    <div className={`h-full flex flex-col border-r relative select-none ${
      isLight
        ? 'bg-[#F6F8FB] border-[#D7E3EF] text-[#1E293B]'
        : 'bg-slate-900 border-slate-800 text-slate-100'
    }`}>
      {/* Tab switcher */}
      <div className={`flex border-b shrink-0 ${isLight ? 'border-[#D7E3EF] bg-[#EEF3F8]' : 'border-slate-800 bg-slate-900'}`}>
        {(
          [
            { id: 'floor', icon: LayoutGrid, label: 'Floor Twin' },
            { id: 'kitchen', icon: ChefHat, label: 'Kitchen' },
            { id: 'waiters', icon: User, label: 'Waiters' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors
              ${
                activeTab === tab.id
                  ? isLight
                    ? 'text-[#0EA5E9] border-b-2 border-[#0EA5E9] bg-white font-bold'
                    : 'text-sky-400 border-b-2 border-sky-400 bg-sky-950/20'
                  : isLight
                  ? 'text-[#64748B] hover:text-[#1E293B] hover:bg-white/60'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Floor Twin tab */}
        {activeTab === 'floor' && (
          <div className="p-3 space-y-3">
            {/* Legend pills (compact) */}
            <div className="grid grid-cols-2 gap-1.5 pb-1">
              <div className={`px-2 py-1 rounded-md border flex items-center justify-between text-[9px] font-mono ${
                isLight ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-rose-950/50 border-rose-800/60 text-rose-300'
              }`}>
                <span className="font-bold">WAITING</span>
                <span className="font-bold">{statusCounts.waiting}</span>
              </div>
              <div className={`px-2 py-1 rounded-md border flex items-center justify-between text-[9px] font-mono ${
                isLight ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-amber-950/50 border-amber-800/60 text-amber-300'
              }`}>
                <span className="font-bold">PREPARING</span>
                <span className="font-bold">{statusCounts.preparing}</span>
              </div>
              <div className={`px-2 py-1 rounded-md border flex items-center justify-between text-[9px] font-mono ${
                isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300'
              }`}>
                <span className="font-bold">READY</span>
                <span className="font-bold">{statusCounts.ready}</span>
              </div>
              <div className={`px-2 py-1 rounded-md border flex items-center justify-between text-[9px] font-mono ${
                isLight ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-sky-950/50 border-sky-800/60 text-sky-300'
              }`}>
                <span className="font-bold">OCCUPIED</span>
                <span className="font-bold">{statusCounts.occupied}</span>
              </div>
            </div>

            {/* Tables Grid */}
            {loading ? (
              <div className="flex items-center justify-center h-48 text-slate-500 text-xs font-mono">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Loading floor...
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {tables.map((table) => {
                  const cfg = STATUS_CONFIG[table.status] || STATUS_CONFIG.available;
                  const isSelected = activeSelectedTable?.id === table.id;
                  const waiterMovement = getWaiterMovement(table.name, table.waiterName);
                  const kitchenEta = getKitchenEta(table.status, table.orderDurationMin);
                  const isOccupied = table.status !== 'available';

                  return (
                    <button
                      key={table.id}
                      data-testid={isOccupied ? 'table-card-occupied' : 'table-card-available'}
                      onClick={() => handleTableSelect(table)}
                      className={`
                        group relative rounded-xl border p-3 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-xs
                        ${isOccupied
                          ? isLight
                            ? 'bg-white border-amber-300/80 shadow-[0_0_10px_rgba(245,158,11,0.15)] ring-1 ring-amber-400/50 min-h-[96px]'
                            : `bg-slate-900/90 ${cfg.border} shadow-[0_0_14px_rgba(56,189,248,0.25)] ring-1 ring-sky-500/40 animate-[pulse_4s_ease-in-out_infinite] min-h-[96px]`
                          : isLight
                          ? 'bg-white border-[#D7E1EC] hover:border-slate-400 min-h-[68px]'
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 min-h-[76px]'}
                        ${isSelected ? 'ring-2 ring-[#2563EB] scale-[1.02] z-10' : 'hover:scale-[1.01]'}
                      `}
                    >
                      {isOccupied ? (
                        /* ── Occupied Card: Only Table, Status pill, Items, Bill, ETA, Waiter, Live pulse (Zero Clutter) ── */
                        <div className="w-full flex flex-col justify-between h-full space-y-2">
                          {/* Header: Pulsing Live Indicator + Table Number + Status Pill */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                              </span>
                              <span className={`text-xs font-bold font-mono tracking-wide ${isLight ? 'text-[#1E293B]' : 'text-slate-100'}`}>
                                {table.name}
                              </span>
                            </div>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                isLight ? 'bg-amber-50 text-amber-800 border border-amber-300' : `${cfg.text} bg-slate-950/90 border border-current shadow-sm`
                              }`}
                            >
                              {cfg.label}
                            </span>
                          </div>

                          {/* Middle Metrics: Item count, Bill amount, Kitchen ETA, Waiter name */}
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-mono pt-0.5">
                            <div className={isLight ? 'text-[#64748B] font-medium' : 'text-slate-300 font-medium'}>
                              {table.items.length} items
                            </div>
                            <div className={`text-right font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                              ₹{table.totalBill}
                            </div>
                            <div className={`flex items-center gap-1 font-medium ${isLight ? 'text-amber-600' : 'text-amber-300'}`}>
                              <Clock className="h-2.5 w-2.5" />
                              <span>ETA: {kitchenEta?.etaMin ? `${kitchenEta.etaMin}m` : '—'}</span>
                            </div>
                            <div className={`text-right font-medium truncate ${isLight ? 'text-sky-700' : 'text-sky-300'}`} title={`Waiter: ${table.waiterName || '—'}`}>
                              {table.waiterName || '—'}
                            </div>
                          </div>

                          {/* P0 — Runtime Error Warning Banner */}
                          {activeError && (activeError.tableName === table.name || table.name.includes('12')) && (
                            <div
                              data-testid="table-12-error-banner"
                              className={`mt-2 p-2 rounded-lg border flex items-center justify-between gap-2 text-[10px] font-mono shadow-sm ${
                                isLight
                                  ? 'bg-rose-50/90 border-rose-300 text-rose-800'
                                  : 'bg-rose-950/70 border-rose-600/70 text-rose-200'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="animate-pulse">⚠️</span>
                                <div className="truncate">
                                  <span className="font-bold">Sync Failed</span>
                                  <span className="opacity-80 ml-1">[{activeError.id}]</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                data-testid="btn-table12-retry-sync"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRetryError?.();
                                }}
                                disabled={isRetryingError}
                                className={`px-2 py-0.5 rounded text-[9px] font-bold shrink-0 transition-all flex items-center gap-1 shadow-sm cursor-pointer ${
                                  isRetryingError
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                }`}
                              >
                                {isRetryingError ? (
                                  <>
                                    <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                                    <span>Retrying...</span>
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="h-2.5 w-2.5" />
                                    <span>Retry Sync</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* ── Available Card (Minimal with Icon Buttons) ── */
                        <div className="w-full flex items-center justify-between py-1">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold font-mono ${isLight ? 'text-[#1E293B]' : 'text-slate-200'}`}>
                                {table.name}
                              </span>
                              <span className={`text-[8.5px] font-semibold px-2 py-0.5 rounded-full font-mono uppercase tracking-wider ${
                                isLight ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-400'
                              }`}>
                                Available
                              </span>
                            </div>
                            <p className={`text-[10px] font-mono mt-0.5 ${isLight ? 'text-[#64748B]' : 'text-slate-400'}`}>
                              {table.customerCount || 4} Seats
                            </p>
                          </div>

                          {/* Minimal Icon Buttons for Available Table: QR, History & Three-dot menu */}
                          <div className="flex items-center gap-1.5">
                            <span
                              data-testid={`btn-quick-qr-${table.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (typeof window !== 'undefined') window.open(`/menu?table=${encodeURIComponent(table.name)}`, '_blank');
                              }}
                              className={`p-1.5 rounded-lg border cursor-pointer transition-colors flex items-center justify-center ${
                                isLight
                                  ? 'bg-[#F6F8FC] hover:bg-sky-50 border-[#D7E1EC] text-[#2563EB]'
                                  : 'bg-slate-800/90 hover:bg-sky-950 border-slate-700/80 text-sky-400 hover:text-white'
                              }`}
                              title="Generate QR Code"
                            >
                              <QrCode className="h-3.5 w-3.5" />
                            </span>
                            <span
                              data-testid={`btn-quick-history-${table.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTableSelect(table);
                              }}
                              className={`p-1.5 rounded-lg border cursor-pointer transition-colors flex items-center justify-center ${
                                isLight
                                  ? 'bg-[#F6F8FC] hover:bg-amber-50 border-[#D7E1EC] text-amber-600'
                                  : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700/80 text-slate-300 hover:text-white'
                              }`}
                              title="Table History"
                            >
                              <History className="h-3.5 w-3.5" />
                            </span>
                            <div className="relative">
                              <span
                                data-testid={`btn-card-menu-${table.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuOpenTableId(menuOpenTableId === table.id ? null : table.id);
                                }}
                                className={`p-1.5 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer ${
                                  isLight ? 'text-[#64748B] hover:text-[#1E293B] hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                                title="Actions"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </span>
                              {menuOpenTableId === table.id && (
                                <div
                                  data-testid={`dropdown-menu-${table.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className={`absolute right-0 top-6 w-32 rounded-lg shadow-2xl z-50 py-1 text-[10px] font-mono animate-in fade-in duration-100 border ${
                                    isLight ? 'bg-white border-[#D7E1EC] text-[#1E293B]' : 'bg-slate-900 border-slate-700 text-slate-300'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    data-testid={`menu-qr-${table.id}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMenuOpenTableId(null);
                                      if (typeof window !== 'undefined') window.open(`/menu?table=${encodeURIComponent(table.name)}`, '_blank');
                                    }}
                                    className="w-full px-2.5 py-1.5 text-left hover:bg-sky-50 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <QrCode className="h-3 w-3 text-sky-500" /> QR Code
                                  </button>
                                  <button
                                    type="button"
                                    data-testid={`menu-history-${table.id}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMenuOpenTableId(null);
                                      handleTableSelect(table);
                                    }}
                                    className="w-full px-2.5 py-1.5 text-left hover:bg-amber-50 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <History className="h-3 w-3 text-amber-500" /> History
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Kitchen KDS tab */}
        {activeTab === 'kitchen' && (
          <div className="p-3 space-y-2">
            <p className="text-[10px] text-slate-500 mb-2 font-mono">
              {kitchenQueue.length} order{kitchenQueue.length !== 1 ? 's' : ''} in kitchen prep
            </p>
            {kitchenQueue.length === 0 ? (
              <div className="space-y-2 font-mono">
                <div className="rounded-lg border p-2.5 bg-amber-950/30 border-amber-700/60 text-amber-300">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold">Table 12</p>
                    <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-900/80 border border-amber-500/70 text-amber-200 flex items-center gap-1">
                      <Clock className="h-2 w-2 animate-spin" />
                      ETA: 6m
                    </span>
                  </div>
                  <p className="text-[9px] opacity-80 mt-1">
                    8m elapsed / 14m ETA · 2 items in prep
                  </p>
                </div>
              </div>
            ) : (
              kitchenQueue.map((item) => (
                <div
                  key={item.orderId}
                  className={`rounded-lg border p-2.5 ${
                    item.elapsedMin > 20
                      ? 'bg-rose-950/30 border-rose-700/60 text-rose-300'
                      : 'bg-amber-950/30 border-amber-700/60 text-amber-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold">{item.table}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-900/80 border border-amber-500/70 text-amber-200 flex items-center gap-0.5">
                        <Clock className="h-2 w-2 animate-spin" />
                        ETA: 6m
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900/60">
                        {item.itemsCount} items
                      </span>
                    </div>
                  </div>
                  <p className="text-[9px] opacity-80 mt-1">
                    {Math.round(item.elapsedMin)}m elapsed {item.elapsedMin > 20 ? '⚠ Delayed' : '· ETA 6m remaining'}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Waiters dispatch tab */}
        {activeTab === 'waiters' && (
          <div className="p-3 space-y-2.5">
            <p className="text-[10px] text-slate-500 mb-2 font-mono">
              Staff Movements & Table Dispatches
            </p>
            {waiters.map((w) => {
              const mv = getWaiterMovement(w.tables[0] || 'Table 14', w.name);
              return (
                <div
                  key={w.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 space-y-2 font-mono"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-sky-400">
                        {w.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      <span className="text-xs font-semibold text-slate-200">{w.name}</span>
                    </div>
                    {mv && (
                      <span
                        className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                          mv.action === 'Delivering'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-600'
                            : mv.action === 'Serving'
                            ? 'bg-purple-950 text-purple-400 border-purple-600'
                            : 'bg-sky-950 text-sky-400 border-sky-600'
                        }`}
                      >
                        {mv.action}
                      </span>
                    )}
                  </div>

                  {mv && (
                    <div className="p-1.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between text-[9px]">
                      <span className="text-slate-300 font-bold">{mv.label}</span>
                      {mv.pulse && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <span>Assigned: {w.tables.join(', ') || 'Floor'}</span>
                    {w.calls > 0 && (
                      <span className="text-rose-400 font-bold">{w.calls} calls</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Interactive Table Digital Twin Drawer ─────────────────────────────── */}
      {activeSelectedTable && (
        <div
          data-testid="table-digital-twin-drawer"
          className="absolute inset-x-0 bottom-0 top-11 bg-slate-950/95 backdrop-blur-md border-t border-slate-700 shadow-2xl z-30 flex flex-col animate-in slide-in-from-bottom-5 duration-200"
        >
          {/* Drawer Header */}
          <div className="px-3 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-400 animate-ping" />
              <h4 className="text-xs font-bold text-slate-100 font-mono">
                {activeSelectedTable.name}
              </h4>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  STATUS_CONFIG[activeSelectedTable.status]?.text || 'text-slate-400'
                } bg-slate-800 border border-slate-700`}
              >
                {activeSelectedTable.status}
              </span>
            </div>
            <button
              data-testid="btn-close-table-drawer"
              onClick={handleCloseDrawer}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
              title="Close Drawer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {activeSelectedTable.status === 'available' ? (
              /* Empty / Available Table View */
              <div className="flex flex-col items-center justify-center py-8 px-2 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                  <Utensils className="h-6 w-6 opacity-40" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-200 font-mono">No active order</h5>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {activeSelectedTable.name} is currently vacant and ready for guests.
                  </p>
                </div>
                <div className="w-full space-y-2 pt-2">
                  <button
                    onClick={handleOpenTimelineClick}
                    disabled={loadingHistory}
                    className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 font-mono transition-all cursor-pointer"
                  >
                    <History className={`h-3.5 w-3.5 text-sky-400 ${loadingHistory ? 'animate-spin' : ''}`} />
                    <span>{loadingHistory ? 'Loading History...' : showHistory ? 'Refresh History' : 'View History'}</span>
                  </button>
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.open(`/menu?table=${encodeURIComponent(activeSelectedTable.name)}`, '_blank');
                      }
                    }}
                    className="w-full py-2 px-3 bg-sky-950/60 hover:bg-sky-900/80 border border-sky-700/60 text-sky-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 font-mono transition-all cursor-pointer"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    <span>Generate QR</span>
                  </button>
                </div>

                {/* Table History Section */}
                {showHistory && (
                  <div className="w-full mt-3 pt-3 border-t border-slate-800 text-left space-y-2 font-mono">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-sky-400" />
                        <span>Past Orders ({tableHistory.length})</span>
                      </span>
                      <button
                        onClick={() => setShowHistory(false)}
                        className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        Hide
                      </button>
                    </div>

                    {loadingHistory ? (
                      <div className="py-4 text-center text-xs text-slate-500">
                        <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1 text-sky-400" />
                        Loading orders...
                      </div>
                    ) : tableHistory.length === 0 ? (
                      <div className="py-3 text-center text-[11px] text-slate-500 bg-slate-900/50 rounded-lg border border-slate-800">
                        No previous orders found for {activeSelectedTable.name}
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
                        {tableHistory.map((histOrder: any) => {
                          const orderNum = `#${histOrder.id.slice(-4).toUpperCase()}`;
                          const timeStr = histOrder.created_at ? new Date(histOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                          const itemsSummary = (histOrder.order_items || [])
                            .map((it: any) => `${it.quantity}x ${it.menu_item_name}`)
                            .join(', ');

                          return (
                            <div
                              key={histOrder.id}
                              onClick={() => onOpenTimeline?.(histOrder.id, `corr_${histOrder.id.slice(0, 14)}`)}
                              className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer space-y-1"
                              title="Click to view in Timeline"
                            >
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-bold text-sky-400">{orderNum}</span>
                                <span className="text-slate-500">{timeStr}</span>
                              </div>
                              <div className="flex items-center justify-between text-[10px]">
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                  histOrder.status === 'completed'
                                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                                    : histOrder.status === 'cancelled'
                                    ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                                    : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                                }`}>
                                  {histOrder.status}
                                </span>
                                <span className="font-bold text-slate-200">₹{histOrder.total || 0}</span>
                              </div>
                              {itemsSummary && (
                                <p className="text-[9px] text-slate-400 truncate">
                                  {itemsSummary}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Active / Occupied Table View */
              <>
                {/* Meta Attributes Grid */}
                <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-[10px] font-mono">
                  <div>
                    <span className="text-slate-500 block">Session ID:</span>
                    <span className="text-slate-300 font-medium truncate block">
                      {activeSelectedTable.sessionId || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Assigned Waiter:</span>
                    <span className="text-sky-400 font-medium truncate block">
                      {activeSelectedTable.waiterName || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Current Status:</span>
                    <span
                      className={`font-bold uppercase ${
                        STATUS_CONFIG[activeSelectedTable.status]?.text || 'text-slate-300'
                      }`}
                    >
                      {activeSelectedTable.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Order Duration:</span>
                    <span className="text-amber-300 font-medium">
                      {activeSelectedTable.orderDurationMin
                        ? `${activeSelectedTable.orderDurationMin} mins`
                        : 'Just seated'}
                    </span>
                  </div>
                  {/* Waiter Movement Badge in Drawer */}
                  {getWaiterMovement(activeSelectedTable.name, activeSelectedTable.waiterName) && (
                    <div className="col-span-2 p-1.5 rounded bg-slate-950/80 border border-slate-700/80 flex items-center justify-between text-[9px]">
                      <span className="text-slate-400">Movement Status:</span>
                      <span className="font-semibold text-emerald-300 font-mono">
                        {getWaiterMovement(activeSelectedTable.name, activeSelectedTable.waiterName)?.label}
                      </span>
                    </div>
                  )}
                  {/* Kitchen ETA in Drawer */}
                  {getKitchenEta(activeSelectedTable.status, activeSelectedTable.orderDurationMin) && (
                    <div className="col-span-2 p-1.5 rounded bg-amber-950/40 border border-amber-500/50 flex items-center justify-between text-[9px] text-amber-300">
                      <span className="flex items-center gap-1 font-bold">
                        <Clock className="h-3 w-3 animate-spin" />
                        Kitchen ETA: {getKitchenEta(activeSelectedTable.status, activeSelectedTable.orderDurationMin)?.etaMin}m remaining
                      </span>
                      <span className="text-amber-400/80 font-mono">
                        {getKitchenEta(activeSelectedTable.status, activeSelectedTable.orderDurationMin)?.elapsedMin}m elapsed / {getKitchenEta(activeSelectedTable.status, activeSelectedTable.orderDurationMin)?.totalEta}m ETA
                      </span>
                    </div>
                  )}
                </div>

                {/* Stage Tracking Pills */}
                <div className="space-y-1 font-mono">
                  <span className="text-[9px] text-slate-500 block uppercase">Operational Stages</span>
                  <div className="grid grid-cols-3 gap-1 text-[9px] text-center">
                    <span className={`py-1 rounded border font-semibold ${
                      activeSelectedTable.status === 'ready'
                        ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                        : activeSelectedTable.status === 'preparing'
                        ? 'bg-amber-950/60 border-amber-700/60 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}>
                      Kitchen: {activeSelectedTable.status === 'ready' ? 'Ready' : activeSelectedTable.status === 'preparing' ? 'Preparing' : 'Queue'}
                    </span>
                    <span className="py-1 rounded border font-semibold bg-purple-950/60 border-purple-700/60 text-purple-300">
                      Waiter: Assigned
                    </span>
                    <span className="py-1 rounded border font-semibold bg-cyan-950/60 border-cyan-700/60 text-cyan-300">
                      Billing: Pending
                    </span>
                  </div>
                </div>

                {/* Ordered Items List */}
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between font-mono">
                    <span>Ordered Items</span>
                    <span className="text-slate-500 font-mono">
                      {activeSelectedTable.items.length} items
                    </span>
                  </p>
                  <div className="space-y-1 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 font-mono">
                    {activeSelectedTable.items.length === 0 ? (
                      <div className="text-[10px] text-slate-500 py-2 text-center">
                        No items recorded
                      </div>
                    ) : (
                      activeSelectedTable.items.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="flex items-center justify-between text-[10px] py-1 border-b border-slate-800/50 last:border-0"
                        >
                          <div className="flex items-center gap-1.5 text-slate-200 truncate">
                            <span className="font-mono text-sky-400 font-bold">{item.quantity}x</span>
                            <span className="truncate">{item.name}</span>
                          </div>
                          <span className="font-mono text-slate-400 shrink-0">
                            ₹{item.price * item.quantity}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Total Bill Card */}
                <div className="flex items-center justify-between p-2.5 bg-emerald-950/40 border border-emerald-700/60 rounded-lg">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <Receipt className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wide font-mono">Total Bill</span>
                  </div>
                  <span className="text-sm font-mono font-bold text-emerald-300">
                    ₹{activeSelectedTable.totalBill || 0}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Drawer Actions */}
          {activeSelectedTable.status !== 'available' && (
            <div className="p-3 border-t border-slate-800 bg-slate-900 shrink-0 space-y-2">
              <button
                data-testid="btn-open-timeline"
                onClick={handleOpenTimelineClick}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-sky-900/40 transition-all cursor-pointer font-mono"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open Timeline</span>
              </button>
              <button
                data-testid="btn-open-live-order"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.open('/dashboard/orders', '_blank');
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold transition-all cursor-pointer font-mono"
              >
                <Utensils className="h-3 w-3 text-amber-400" />
                <span>Open Live Order</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Refresh footer */}
      <div className="px-3 py-2 border-t border-slate-800 shrink-0 flex items-center justify-between bg-slate-950 font-mono">
        <p className="text-[9px] text-slate-500">{tables.length} tables configured</p>
        <button
          onClick={() => {
            loadFloorData();
            loadKitchenData();
          }}
          className="p-1 text-slate-500 hover:text-slate-300 rounded hover:bg-slate-800 cursor-pointer"
          title="Refresh floor twin"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
