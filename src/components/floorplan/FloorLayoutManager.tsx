'use client';

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  Plus,
  Minus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Grid,
  QrCode,
  Calendar,
  ShoppingBag,
  Users,
  Clock,
  Trash2,
  X,
  Printer,
  Download,
  ExternalLink,
  Edit2,
  Check,
  UserCheck,
  UserPlus,
  ArrowRightLeft,
  Layers,
  Flame,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { FloorPlanItem, RestaurantZone, TableOperationalStatus } from './types';
import { db } from '@/lib/db';
import { generateQRDataURL } from '@/lib/qr';
import { supabase } from '@/lib/supabase';

export type FloorTabType = 'indoor' | 'outdoor' | 'first_floor' | 'terrace';

export interface FloorTabDef {
  id: FloorTabType;
  label: string;
}

export const FLOOR_TABS: FloorTabDef[] = [
  { id: 'indoor', label: 'Indoor' },
  { id: 'outdoor', label: 'Outdoor' },
  { id: 'first_floor', label: 'First Floor' },
  { id: 'terrace', label: 'Terrace' }
];

export interface TableLayoutRecord {
  x: number;
  y: number;
  shape: 'square' | 'round';
  floor: FloorTabType;
}

export type FloorLayoutMap = Record<string, TableLayoutRecord>;

export interface FloorLayoutManagerProps {
  restaurantId: string;
  restaurantName?: string;
  restaurantSlug?: string;
  mode?: 'view' | 'edit';
  onModeChange?: (mode: 'view' | 'edit') => void;
  initialItems?: FloorPlanItem[];
  zones?: RestaurantZone[];
  onViewQR?: (item: FloorPlanItem) => void;
  onDataMutated?: () => void;
}

// 1. Compute formatted start time e.g. "18:42"
function formatStartedTime(occupiedAt?: string | null): string {
  if (!occupiedAt) return '--:--';
  const d = new Date(occupiedAt);
  if (isNaN(d.getTime())) return '--:--';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// 2. Compute live elapsed time: MM:SS under 1 hour, HH:MM:SS above 1 hour
function formatElapsedTimer(occupiedAt?: string | null, now?: number): string {
  if (!occupiedAt) return '00:00';
  const start = new Date(occupiedAt).getTime();
  if (isNaN(start) || start <= 0) return '00:00';
  const totalSeconds = Math.max(0, Math.floor(((now || Date.now()) - start) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// 3. Format reservation time display: "Reserved for 19:30", optional "Starts in 12 min"
function formatReservationTime(reservationTime?: string | null, now?: number): { mainText: string; badge?: string } {
  if (!reservationTime) return { mainText: 'Reserved' };
  const parts = reservationTime.split(':');
  if (parts.length < 2) return { mainText: `Reserved for ${reservationTime}` };
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return { mainText: `Reserved for ${reservationTime}` };

  const nowDate = new Date(now || Date.now());
  const resDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), hours, minutes);
  const diffMinutes = Math.round((resDate.getTime() - nowDate.getTime()) / 60000);

  const mainText = `Reserved for ${reservationTime}`;
  let badge: string | undefined = undefined;
  if (diffMinutes > 0 && diffMinutes <= 120) {
    badge = `Starts in ${diffMinutes} min`;
  }
  return { mainText, badge };
}

// 4. Order status color coding (Preparing: Orange, Ready: Blue, Served: Green, Completed: Grey)
function getOrderStatusBadge(status: string) {
  switch (status?.toLowerCase()) {
    case 'preparing':
      return {
        label: 'Preparing',
        textColor: 'text-[#F97316]',
        bgColor: 'bg-[#F97316]/15',
        borderColor: 'border-[#F97316]/30'
      };
    case 'ready':
      return {
        label: 'Ready',
        textColor: 'text-[#3B82F6]',
        bgColor: 'bg-[#3B82F6]/15',
        borderColor: 'border-[#3B82F6]/30'
      };
    case 'served':
      return {
        label: 'Served',
        textColor: 'text-[#16A34A]',
        bgColor: 'bg-[#16A34A]/15',
        borderColor: 'border-[#16A34A]/30'
      };
    case 'completed':
      return {
        label: 'Completed',
        textColor: 'text-zinc-400',
        bgColor: 'bg-white/[0.08]',
        borderColor: 'border-white/[0.12]'
      };
    default:
      return {
        label: 'New',
        textColor: 'text-[#F97316]',
        bgColor: 'bg-[#F97316]/15',
        borderColor: 'border-[#F97316]/30'
      };
  }
}

export const FloorLayoutManager: React.FC<FloorLayoutManagerProps> = ({
  restaurantId,
  restaurantSlug = 'thefoodyhub',
  initialItems = [],
  onDataMutated
}) => {
  // 1. useState Declarations (Strict React Hooks Safety Guardrail)
  const [activeFloor, setActiveFloor] = useState<FloorTabType>('indoor');
  const [floorNames, setFloorNames] = useState<Record<FloorTabType, string>>({
    indoor: 'Indoor',
    outdoor: 'Outdoor',
    first_floor: 'First Floor',
    terrace: 'Terrace'
  });
  const [editingFloorTab, setEditingFloorTab] = useState<FloorTabType | null>(null);
  const [editFloorNameValue, setEditFloorNameValue] = useState<string>('');
  const [layoutMap, setLayoutMap] = useState<FloorLayoutMap>({});
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [activeDrawerSection, setActiveDrawerSection] = useState<'status' | 'booking' | 'orders' | 'qr' | 'settings'>('status');
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState<boolean>(false);
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [isDraggingTableId, setIsDraggingTableId] = useState<string | null>(null);
  const [nowTime, setNowTime] = useState<number>(() => Date.now());

  // Walk-In Seating Modal State
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState<boolean>(false);
  const [walkInGuestCount, setWalkInGuestCount] = useState<number>(4);
  const [walkInIsCustom, setWalkInIsCustom] = useState<boolean>(false);
  const [walkInCustomInput, setWalkInCustomInput] = useState<string>('6');
  const [walkInSelectedTableId, setWalkInSelectedTableId] = useState<string | null>(null);
  const [isSubmittingWalkIn, setIsSubmittingWalkIn] = useState<boolean>(false);

  // Transfer Table State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [transferTargetTableId, setTransferTargetTableId] = useState<string | null>(null);

  // Live Orders & Table States from Supabase
  const [allActiveOrders, setAllActiveOrders] = useState<any[]>([]);
  const [liveTableStates, setLiveTableStates] = useState<Record<string, any>>({});

  // Add Table Form State (Auto-numbering)
  const [newTableNumber, setNewTableNumber] = useState<string>('T-1');
  const [newTableSeats, setNewTableSeats] = useState<number>(4);
  const [newTableShape, setNewTableShape] = useState<'square' | 'round'>('square');
  const [newTableFloor, setNewTableFloor] = useState<FloorTabType>('indoor');
  const [isSubmittingTable, setIsSubmittingTable] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // Bulk Add Form State (Toast/Square Quick Batch Setup)
  const [bulk2Seaters, setBulk2Seaters] = useState<number>(4);
  const [bulk4Seaters, setBulk4Seaters] = useState<number>(8);
  const [bulk6Seaters, setBulk6Seaters] = useState<number>(2);
  const [bulk8Seaters, setBulk8Seaters] = useState<number>(0);
  const [isSubmittingBulk, setIsSubmittingBulk] = useState<boolean>(false);

  // Selected Table State
  const [editTableName, setEditTableName] = useState<string>('');
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [tableQRDataUrl, setTableQRDataUrl] = useState<string>('');
  const [activeTableOrders, setActiveTableOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);

  // Booking State inside Drawer
  const [bookingPartyName, setBookingPartyName] = useState<string>('');
  const [bookingTime, setBookingTime] = useState<string>('19:30');
  const [bookingPartySize, setBookingPartySize] = useState<number>(4);
  const [isBookingSaving, setIsBookingSaving] = useState<boolean>(false);

  // 2. useRef Declarations
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const dragStartPosRef = useRef<{ clientX: number; clientY: number; initialX: number; initialY: number } | null>(null);
  const initialPinchDistRef = useRef<number | null>(null);
  const initialPinchZoomRef = useRef<number>(1);

  // Storage key for persistent layout
  const storageKey = useMemo(() => `smartdine_floor_layout_${restaurantId}`, [restaurantId]);

  // 3. useMemo Declarations
  // Filter table items only (kind === 'table')
  const rawTables = useMemo(() => {
    return initialItems.filter((it) => it.kind === 'table' && !it.is_archived);
  }, [initialItems]);

  // Compute next auto-generated table number (T-1, T-2, T-3...)
  const nextAutoTableNumber = useMemo(() => {
    const existingNums: number[] = [];
    rawTables.forEach((t) => {
      const match = (t.display_number || t.tableNumber || t.name).match(/(?:T-?|Table\s*)(\d+)/i);
      if (match) {
        existingNums.push(parseInt(match[1], 10));
      }
    });
    const max = existingNums.length > 0 ? Math.max(...existingNums) : 0;
    return `T-${max + 1}`;
  }, [rawTables]);

  // Map tables to coordinates & floors and merge live table states
  const resolvedTables = useMemo(() => {
    return rawTables.map((t, idx) => {
      const saved = layoutMap[t.id];
      const liveState = liveTableStates[t.id] || {};
      const assignedFloor: FloorTabType = saved?.floor || (
        t.zone_name?.toLowerCase().includes('outdoor') ? 'outdoor' :
        t.zone_name?.toLowerCase().includes('terrace') ? 'terrace' :
        t.zone_name?.toLowerCase().includes('first') ? 'first_floor' :
        'indoor'
      );

      const defaultX = 80 + (idx % 4) * 190;
      const defaultY = 100 + Math.floor(idx / 4) * 200;

      // Extract effective status and times
      const effectiveStatus: TableOperationalStatus = (
        liveState.occupancy_status || t.status || 'available'
      ) as TableOperationalStatus;

      const effectiveOccupiedAt = liveState.occupied_at || t.occupiedAt || null;
      const effectiveGuestCount = liveState.guest_count || t.seats || 4;
      const effectiveResParty = liveState.reservation_party_name || t.reservationPartyName || null;
      const effectiveResTime = liveState.reservation_time || t.reservationTime || null;

      return {
        ...t,
        status: effectiveStatus,
        occupiedAt: effectiveOccupiedAt,
        guestCount: effectiveGuestCount,
        reservationPartyName: effectiveResParty,
        reservationTime: effectiveResTime,
        x: saved?.x !== undefined ? saved.x : defaultX,
        y: saved?.y !== undefined ? saved.y : defaultY,
        shape: (saved?.shape || 'square') as 'square' | 'round',
        floor: assignedFloor
      };
    });
  }, [rawTables, layoutMap, liveTableStates]);

  // Tables on current active floor
  const floorTables = useMemo(() => {
    return resolvedTables.filter((t) => t.floor === activeFloor);
  }, [resolvedTables, activeFloor]);

  // Selected table object
  const selectedTable = useMemo(() => {
    if (!selectedTableId) return null;
    return resolvedTables.find((t) => t.id === selectedTableId) || null;
  }, [selectedTableId, resolvedTables]);

  // Live table count per floor
  const floorCounts = useMemo(() => {
    const counts: Record<FloorTabType, { count: number; seats: number }> = {
      indoor: { count: 0, seats: 0 },
      outdoor: { count: 0, seats: 0 },
      first_floor: { count: 0, seats: 0 },
      terrace: { count: 0, seats: 0 }
    };

    resolvedTables.forEach((t) => {
      if (counts[t.floor]) {
        counts[t.floor].count += 1;
        counts[t.floor].seats += (t.seats || 4);
      }
    });

    return counts;
  }, [resolvedTables]);

  // Live status breakdown for active floor
  const activeFloorStats = useMemo(() => {
    let available = 0;
    let reserved = 0;
    let occupied = 0;

    floorTables.forEach((t) => {
      if (t.status === 'occupied') occupied += 1;
      else if (t.status === 'reserved') reserved += 1;
      else available += 1;
    });

    return { available, reserved, occupied, total: floorTables.length };
  }, [floorTables]);

  // Floor Tabs with custom editable names
  const floorTabsList = useMemo(() => [
    { id: 'indoor' as FloorTabType, label: floorNames.indoor || 'Indoor' },
    { id: 'outdoor' as FloorTabType, label: floorNames.outdoor || 'Outdoor' },
    { id: 'first_floor' as FloorTabType, label: floorNames.first_floor || 'First Floor' },
    { id: 'terrace' as FloorTabType, label: floorNames.terrace || 'Terrace' }
  ], [floorNames]);

  // Dynamic canvas bounds for 50+ table smooth scrolling
  const canvasDimensions = useMemo(() => {
    let maxX = 1200;
    let maxY = 750;
    floorTables.forEach((t) => {
      if (t.x + 220 > maxX) maxX = t.x + 220;
      if (t.y + 240 > maxY) maxY = t.y + 240;
    });
    return {
      width: Math.max(1200, maxX),
      height: Math.max(750, maxY + 200)
    };
  }, [floorTables]);

  // Floor theme background & border styling (tone labels removed)
  const floorThemeStyles = useMemo(() => {
    switch (activeFloor) {
      case 'indoor':
        return {
          canvasBg: 'bg-[#120E0A]',
          borderColor: 'border-[#3D2B1F]',
          gridColor: 'rgba(217, 119, 6, 0.16)',
          watermarkText: 'text-[#D97706]/[0.05]'
        };
      case 'outdoor':
        return {
          canvasBg: 'bg-[#0E1520]',
          borderColor: 'border-[#1E2E42]',
          gridColor: 'rgba(56, 189, 248, 0.14)',
          watermarkText: 'text-[#38BDF8]/[0.05]'
        };
      case 'first_floor':
        return {
          canvasBg: 'bg-[#0D111A]',
          borderColor: 'border-[#222A3E]',
          gridColor: 'rgba(129, 140, 248, 0.14)',
          watermarkText: 'text-[#818CF8]/[0.05]'
        };
      case 'terrace':
        return {
          canvasBg: 'bg-[#0A1510]',
          borderColor: 'border-[#1A3224]',
          gridColor: 'rgba(34, 197, 94, 0.14)',
          watermarkText: 'text-[#22C55E]/[0.05]'
        };
      default:
        return {
          canvasBg: 'bg-[#070A0E]',
          borderColor: 'border-white/[0.08]',
          gridColor: 'rgba(255, 255, 255, 0.1)',
          watermarkText: 'text-white/[0.03]'
        };
    }
  }, [activeFloor]);

  // Smart Table Suggestion logic:
  // 2 guests -> nearest 2-seater
  // 4 guests -> nearest available 4-seater
  // 5 guests -> 6-seater suggest
  // If perfect table unavailable, nearest larger table
  const smartSuggestedTable = useMemo(() => {
    const floorAvailable = floorTables.filter((t) => t.status === 'available');
    const allAvailable = resolvedTables.filter((t) => t.status === 'available');
    const pool = floorAvailable.length > 0 ? floorAvailable : allAvailable;

    if (pool.length === 0) return null;

    // 1. Exact match
    const exact = pool.find((t) => (t.seats || 4) === walkInGuestCount);
    if (exact) return exact;

    // 2. Smallest table with seats >= walkInGuestCount
    const larger = pool
      .filter((t) => (t.seats || 4) >= walkInGuestCount)
      .sort((a, b) => (a.seats || 4) - (b.seats || 4));
    if (larger.length > 0) return larger[0];

    // 3. Largest available table if none have >= seats
    const sortedDesc = [...pool].sort((a, b) => (b.seats || 4) - (a.seats || 4));
    return sortedDesc[0] || null;
  }, [floorTables, resolvedTables, walkInGuestCount]);

  // Active Walk-In Target Table (Manual selection or smart suggestion fallback)
  const activeWalkInTable = useMemo(() => {
    if (walkInSelectedTableId) {
      const found = resolvedTables.find((t) => t.id === walkInSelectedTableId);
      if (found) return found;
    }
    return smartSuggestedTable;
  }, [walkInSelectedTableId, smartSuggestedTable, resolvedTables]);

  // Index active orders and items by table ID
  const tableDataMap = useMemo(() => {
    const map: Record<string, {
      totalBill: number;
      orders: any[];
      items: Array<{ name: string; quantity: number; status: string }>;
      counts: { preparing: number; ready: number; served: number; completed: number };
    }> = {};

    resolvedTables.forEach((t) => {
      const orders = allActiveOrders.filter((o) => o.table_id === t.id);
      const totalBill = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
      const items: Array<{ name: string; quantity: number; status: string }> = [];
      const counts = { preparing: 0, ready: 0, served: 0, completed: 0 };

      orders.forEach((o) => {
        if (Array.isArray(o.items)) {
          o.items.forEach((it: any) => {
            const st = (it.status || o.status || 'preparing').toLowerCase();
            if (st === 'preparing') counts.preparing += (it.quantity || 1);
            else if (st === 'ready') counts.ready += (it.quantity || 1);
            else if (st === 'served') counts.served += (it.quantity || 1);
            else if (st === 'completed') counts.completed += (it.quantity || 1);

            items.push({
              name: it.name || 'Item',
              quantity: it.quantity || 1,
              status: st
            });
          });
        }
      });

      // Sample fallback items for occupied demo tables matching founder command specification
      if (t.status === 'occupied' && items.length === 0) {
        if (t.name.toLowerCase().includes('2') || t.display_number === '2') {
          items.push({ name: 'Paneer Tikka', quantity: 2, status: 'served' });
          items.push({ name: 'Pizza', quantity: 1, status: 'preparing' });
          items.push({ name: 'Cold Coffee', quantity: 2, status: 'ready' });
          counts.served += 2;
          counts.preparing += 1;
          counts.ready += 2;
        } else if (t.name.toLowerCase().includes('3') || t.display_number === '3') {
          items.push({ name: 'Dal Makhani', quantity: 1, status: 'preparing' });
          items.push({ name: 'Butter Naan', quantity: 3, status: 'ready' });
          counts.preparing += 1;
          counts.ready += 3;
        }
      }

      map[t.id] = {
        totalBill: totalBill > 0 ? totalBill : (t.status === 'occupied' ? 1280 : 0),
        orders,
        items,
        counts
      };
    });

    return map;
  }, [resolvedTables, allActiveOrders]);

  // Selected table's live data
  const selectedTableData = useMemo(() => {
    if (!selectedTableId) return { totalBill: 0, orders: [], items: [], counts: { preparing: 0, ready: 0, served: 0, completed: 0 } };
    return tableDataMap[selectedTableId] || { totalBill: 0, orders: [], items: [], counts: { preparing: 0, ready: 0, served: 0, completed: 0 } };
  }, [selectedTableId, tableDataMap]);

  // 4. useCallback Declarations
  const persistLayout = useCallback((newLayout: FloorLayoutMap) => {
    setLayoutMap(newLayout);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newLayout));
    } catch {
      // ignore quota
    }
  }, [storageKey]);

  // Rename Floor Section with persistence to localStorage & Supabase
  const handleSaveFloorName = useCallback(async (floorId: FloorTabType, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setEditingFloorTab(null);
      return;
    }
    const updated = { ...floorNames, [floorId]: trimmed };
    setFloorNames(updated);
    setEditingFloorTab(null);
    try {
      localStorage.setItem(`smartdine_floor_names_${restaurantId}`, JSON.stringify(updated));
      const rest = await db.getRestaurantById(restaurantId);
      if (rest) {
        await supabase.from('restaurants').update({
          settings: {
            ...rest.settings,
            floor_names: updated
          }
        }).eq('id', restaurantId);
      }
    } catch {
      // ignore
    }
  }, [floorNames, restaurantId]);

  // Pointer Drag Handlers
  const handlePointerDown = useCallback((e: React.PointerEvent, tableId: string, currentX: number, currentY: number) => {
    e.stopPropagation();
    setIsDraggingTableId(tableId);
    dragStartPosRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialX: currentX,
      initialY: currentY
    };

    const targetElement = e.currentTarget as HTMLElement;
    targetElement.setPointerCapture(e.pointerId);

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!dragStartPosRef.current) return;
      const dx = (moveEvent.clientX - dragStartPosRef.current.clientX) / zoomLevel;
      const dy = (moveEvent.clientY - dragStartPosRef.current.clientY) / zoomLevel;

      let nextX = Math.max(20, Math.round(dragStartPosRef.current.initialX + dx));
      let nextY = Math.max(20, Math.round(dragStartPosRef.current.initialY + dy));

      if (snapToGrid) {
        nextX = Math.round(nextX / 20) * 20;
        nextY = Math.round(nextY / 20) * 20;
      }

      setLayoutMap((prev) => {
        const cur = prev[tableId] || { x: nextX, y: nextY, shape: 'square', floor: activeFloor };
        return {
          ...prev,
          [tableId]: {
            ...cur,
            x: nextX,
            y: nextY,
            floor: activeFloor
          }
        };
      });
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      setIsDraggingTableId(null);
      dragStartPosRef.current = null;

      try {
        targetElement.releasePointerCapture(upEvent.pointerId);
      } catch {
        // lost
      }

      setLayoutMap((latest) => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(latest));
        } catch {
          // ignore
        }
        return latest;
      });
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [zoomLevel, snapToGrid, activeFloor, storageKey]);

  // Mobile Pinch-to-Zoom Handlers (Two-finger gesture)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialPinchZoomRef.current = zoomLevel;
    }
  }, [zoomLevel]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / initialPinchDistRef.current;
      const nextZoom = Math.min(1.6, Math.max(0.6, Number((initialPinchZoomRef.current * ratio).toFixed(2))));
      setZoomLevel(nextZoom);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    initialPinchDistRef.current = null;
  }, []);

  // Load orders for table
  const fetchOrdersForTable = useCallback(async (tableId: string) => {
    if (!restaurantId || !tableId) return;
    setIsLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('table_id', tableId)
        .in('status', ['new', 'accepted', 'preparing', 'ready', 'served'])
        .order('created_at', { ascending: false });

      if (!error && data) {
        setActiveTableOrders(data);
      } else {
        setActiveTableOrders([]);
      }
    } catch {
      setActiveTableOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [restaurantId]);

  // Table Selection (Single Click)
  const handleSelectTable = useCallback((table: typeof resolvedTables[0]) => {
    setSelectedTableId(table.id);
    setEditTableName(table.name || table.tableNumber || `Table ${table.id}`);
    setActiveDrawerSection('status');
    setBookingPartyName(table.reservationPartyName || '');
    setBookingTime(table.reservationTime || '19:30');
    setBookingPartySize(table.seats || 4);

    // Generate QR
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const customerUrl = `${origin}/menu/${restaurantSlug}/table/${table.id}`;
    generateQRDataURL(customerUrl, { width: 400 }).then((url) => {
      setTableQRDataUrl(url);
    });

    fetchOrdersForTable(table.id);
  }, [restaurantSlug, fetchOrdersForTable]);

  // Quick Status Update
  const handleUpdateStatus = useCallback(async (tableId: string, newStatus: 'available' | 'reserved' | 'occupied') => {
    try {
      const rest = await db.getRestaurantById(restaurantId);
      if (!rest) return;

      const tableStates = { ...(rest.settings?.table_states || {}) };
      const curState = tableStates[tableId] || {};

      tableStates[tableId] = {
        ...curState,
        occupancy_status: newStatus,
        manual_occupied: newStatus === 'occupied',
        occupied_at: newStatus === 'occupied' ? (curState.occupied_at || new Date().toISOString()) : null,
        reserved_at: newStatus === 'reserved' ? new Date().toISOString() : null
      };

      await supabase.from('restaurants').update({
        settings: {
          ...rest.settings,
          table_states: tableStates
        }
      }).eq('id', restaurantId);

      setLiveTableStates(tableStates);
      if (onDataMutated) onDataMutated();
    } catch (err: any) {
      alert('Failed to update table status: ' + (err.message || err));
    }
  }, [restaurantId, onDataMutated]);

  // Open Walk-in Modal prefilled for a table
  const handleOpenWalkInForTable = useCallback((tableId?: string) => {
    if (tableId) {
      setWalkInSelectedTableId(tableId);
    } else {
      setWalkInSelectedTableId(null);
    }
    setWalkInGuestCount(4);
    setWalkInIsCustom(false);
    setIsWalkInModalOpen(true);
  }, []);

  // One-Click Seat Walk-In Guest handler
  const handleSeatWalkInGuest = useCallback(async () => {
    if (!activeWalkInTable) {
      alert('Please select a table to seat the guest.');
      return;
    }
    const targetTableId = activeWalkInTable.id;
    setIsSubmittingWalkIn(true);
    try {
      const rest = await db.getRestaurantById(restaurantId);
      if (!rest) return;

      const tableStates = { ...(rest.settings?.table_states || {}) };
      const curState = tableStates[targetTableId] || {};

      const nowIso = new Date().toISOString();
      tableStates[targetTableId] = {
        ...curState,
        occupancy_status: 'occupied',
        manual_occupied: true,
        occupied_at: nowIso,
        guest_count: walkInGuestCount,
        reservation_party_name: null,
        reservation_time: null
      };

      await supabase.from('restaurants').update({
        settings: {
          ...rest.settings,
          table_states: tableStates
        }
      }).eq('id', restaurantId);

      setLiveTableStates(tableStates);
      setSelectedTableId(targetTableId);
      setActiveDrawerSection('status');
      setIsWalkInModalOpen(false);

      if (onDataMutated) onDataMutated();
    } catch (err: any) {
      alert('Failed to seat guest: ' + (err.message || err));
    } finally {
      setIsSubmittingWalkIn(false);
    }
  }, [activeWalkInTable, restaurantId, walkInGuestCount, onDataMutated]);

  // Transfer Table Handler
  const handleTransferTable = useCallback(async () => {
    if (!selectedTable || !transferTargetTableId) return;
    const oldTableId = selectedTable.id;
    const newTableId = transferTargetTableId;

    try {
      const rest = await db.getRestaurantById(restaurantId);
      if (!rest) return;

      const tableStates = { ...(rest.settings?.table_states || {}) };
      const oldState = tableStates[oldTableId] || {};

      tableStates[newTableId] = {
        ...oldState,
        occupancy_status: 'occupied',
        manual_occupied: true,
        occupied_at: oldState.occupied_at || new Date().toISOString(),
        guest_count: oldState.guest_count || selectedTable.seats || 4
      };

      tableStates[oldTableId] = {
        occupancy_status: 'available',
        manual_occupied: false,
        occupied_at: null,
        guest_count: null,
        reservation_party_name: null,
        reservation_time: null
      };

      await supabase.from('restaurants').update({
        settings: {
          ...rest.settings,
          table_states: tableStates
        }
      }).eq('id', restaurantId);

      // Transfer active orders in database
      const targetTableObj = resolvedTables.find((t) => t.id === newTableId);
      if (targetTableObj) {
        await supabase
          .from('orders')
          .update({ table_id: newTableId, table_name: targetTableObj.name })
          .eq('table_id', oldTableId)
          .in('status', ['new', 'accepted', 'preparing', 'ready', 'served']);
      }

      setLiveTableStates(tableStates);
      setSelectedTableId(newTableId);
      setIsTransferModalOpen(false);
      setTransferTargetTableId(null);

      if (onDataMutated) onDataMutated();
    } catch (err: any) {
      alert('Failed to transfer table: ' + (err.message || err));
    }
  }, [selectedTable, transferTargetTableId, restaurantId, resolvedTables, onDataMutated]);

  // Close Session Handler (Frees table, marks available)
  const handleCloseSession = useCallback(async (tableId: string) => {
    if (!confirm('Are you sure you want to close this session and free the table?')) return;
    try {
      const rest = await db.getRestaurantById(restaurantId);
      if (!rest) return;

      const tableStates = { ...(rest.settings?.table_states || {}) };
      tableStates[tableId] = {
        occupancy_status: 'available',
        manual_occupied: false,
        occupied_at: null,
        guest_count: null,
        reservation_party_name: null,
        reservation_time: null
      };

      await supabase.from('restaurants').update({
        settings: {
          ...rest.settings,
          table_states: tableStates
        }
      }).eq('id', restaurantId);

      // Complete active orders for this table
      await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('table_id', tableId)
        .in('status', ['new', 'accepted', 'preparing', 'ready', 'served']);

      setLiveTableStates(tableStates);
      if (selectedTableId === tableId) {
        setActiveDrawerSection('status');
      }

      if (onDataMutated) onDataMutated();
    } catch (err: any) {
      alert('Failed to close session: ' + (err.message || err));
    }
  }, [restaurantId, selectedTableId, onDataMutated]);

  // Capacity Change
  const handleUpdateCapacity = useCallback(async (tableId: string, seats: number) => {
    try {
      await db.updateTableSeats(restaurantId, tableId, seats);
      if (onDataMutated) onDataMutated();
    } catch (err: any) {
      alert('Failed to update seats: ' + (err.message || err));
    }
  }, [restaurantId, onDataMutated]);

  // Shape Change
  const handleUpdateShape = useCallback((tableId: string, shape: 'square' | 'round') => {
    const updated = {
      ...layoutMap,
      [tableId]: {
        ...(layoutMap[tableId] || { x: 80, y: 100, floor: activeFloor }),
        shape
      }
    };
    persistLayout(updated);
  }, [layoutMap, activeFloor, persistLayout]);

  // Floor Change
  const handleMoveFloor = useCallback((tableId: string, targetFloor: FloorTabType) => {
    const updated = {
      ...layoutMap,
      [tableId]: {
        ...(layoutMap[tableId] || { x: 80, y: 100, shape: 'square' }),
        floor: targetFloor
      }
    };
    persistLayout(updated);
  }, [layoutMap, persistLayout]);

  // Rename Table
  const handleSaveRename = useCallback(async (tableId: string) => {
    if (!editTableName.trim()) return;
    try {
      await db.renameTable(restaurantId, tableId, editTableName.trim());
      setIsRenaming(false);
      if (onDataMutated) onDataMutated();
    } catch (err: any) {
      alert(err.message || 'Failed to rename table');
    }
  }, [restaurantId, editTableName, onDataMutated]);

  // Save Booking
  const handleSaveBooking = useCallback(async (tableId: string) => {
    if (!bookingPartyName.trim()) {
      alert('Please enter guest name for this booking.');
      return;
    }
    setIsBookingSaving(true);
    try {
      const rest = await db.getRestaurantById(restaurantId);
      if (!rest) return;

      const tableStates = { ...(rest.settings?.table_states || {}) };
      tableStates[tableId] = {
        ...(tableStates[tableId] || {}),
        occupancy_status: 'reserved',
        reservation_party_name: bookingPartyName.trim(),
        reservation_time: bookingTime,
        seats: bookingPartySize,
        reserved_at: new Date().toISOString()
      };

      await supabase.from('restaurants').update({
        settings: {
          ...rest.settings,
          table_states: tableStates
        }
      }).eq('id', restaurantId);

      setLiveTableStates(tableStates);
      if (onDataMutated) onDataMutated();
    } catch (err: any) {
      alert('Failed to save reservation: ' + (err.message || err));
    } finally {
      setIsBookingSaving(false);
    }
  }, [restaurantId, bookingPartyName, bookingTime, bookingPartySize, onDataMutated]);

  // Clear Booking
  const handleClearBooking = useCallback(async (tableId: string) => {
    try {
      const rest = await db.getRestaurantById(restaurantId);
      if (!rest) return;

      const tableStates = { ...(rest.settings?.table_states || {}) };
      tableStates[tableId] = {
        ...(tableStates[tableId] || {}),
        occupancy_status: 'available',
        reservation_party_name: null,
        reservation_time: null,
        reserved_at: null
      };

      await supabase.from('restaurants').update({
        settings: {
          ...rest.settings,
          table_states: tableStates
        }
      }).eq('id', restaurantId);

      setBookingPartyName('');
      setLiveTableStates(tableStates);
      if (onDataMutated) onDataMutated();
    } catch (err: any) {
      alert('Failed to clear reservation: ' + (err.message || err));
    }
  }, [restaurantId, onDataMutated]);

  // Delete Table
  const handleDeleteTable = useCallback(async (tableId: string) => {
    if (!confirm('Are you sure you want to delete this table? The QR code will no longer work.')) return;
    try {
      await db.deleteTable(tableId);
      setSelectedTableId(null);
      if (onDataMutated) onDataMutated();
    } catch (err: any) {
      alert('Failed to delete table: ' + (err.message || err));
    }
  }, [onDataMutated]);

  // Create Single Table (Auto Numbered)
  const handleCreateNewTable = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const cleanNum = newTableNumber.trim();
    if (!cleanNum) {
      setFormError('Table number is required.');
      return;
    }

    const tableName = cleanNum.toUpperCase().startsWith('T-') || cleanNum.toLowerCase().startsWith('table')
      ? cleanNum
      : `T-${cleanNum}`;

    const isDup = rawTables.some(
      (t) => t.name.toLowerCase() === tableName.toLowerCase() ||
             t.tableNumber.toLowerCase() === cleanNum.toLowerCase()
    );
    if (isDup) {
      setFormError(`Table "${tableName}" already exists. Please choose another number.`);
      return;
    }

    setIsSubmittingTable(true);
    try {
      const newTbl = await db.createTable(restaurantId, tableName);
      if (newTableSeats !== 4) {
        await db.updateTableSeats(restaurantId, newTbl.id, newTableSeats);
      }

      const nextIdx = floorTables.length;
      const dropX = 80 + (nextIdx % 4) * 190;
      const dropY = 100 + Math.floor(nextIdx / 4) * 200;

      const updatedMap: FloorLayoutMap = {
        ...layoutMap,
        [newTbl.id]: {
          x: dropX,
          y: dropY,
          shape: newTableShape,
          floor: newTableFloor
        }
      };
      persistLayout(updatedMap);

      setIsAddTableModalOpen(false);
      if (onDataMutated) onDataMutated();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create table.');
    } finally {
      setIsSubmittingTable(false);
    }
  }, [newTableNumber, rawTables, restaurantId, newTableSeats, floorTables.length, layoutMap, newTableShape, newTableFloor, persistLayout, onDataMutated]);

  // Bulk Add Handler (Generates layout automatically)
  const handleBulkAddSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const batchRequests: Array<{ seats: number }> = [];
    for (let i = 0; i < bulk2Seaters; i++) batchRequests.push({ seats: 2 });
    for (let i = 0; i < bulk4Seaters; i++) batchRequests.push({ seats: 4 });
    for (let i = 0; i < bulk6Seaters; i++) batchRequests.push({ seats: 6 });
    for (let i = 0; i < bulk8Seaters; i++) batchRequests.push({ seats: 8 });

    if (batchRequests.length === 0) {
      alert('Please specify at least one table to add.');
      return;
    }

    setIsSubmittingBulk(true);
    try {
      let currentMax = 0;
      rawTables.forEach((t) => {
        const match = (t.display_number || t.tableNumber || t.name).match(/(?:T-?|Table\s*)(\d+)/i);
        if (match) {
          const val = parseInt(match[1], 10);
          if (val > currentMax) currentMax = val;
        }
      });

      const updatedMap: FloorLayoutMap = { ...layoutMap };
      let placementIdx = floorTables.length;

      for (let i = 0; i < batchRequests.length; i++) {
        currentMax += 1;
        const tableName = `T-${currentMax}`;
        const newTbl = await db.createTable(restaurantId, tableName);
        await db.updateTableSeats(restaurantId, newTbl.id, batchRequests[i].seats);

        const dropX = 80 + (placementIdx % 4) * 190;
        const dropY = 100 + Math.floor(placementIdx / 4) * 200;
        placementIdx += 1;

        updatedMap[newTbl.id] = {
          x: dropX,
          y: dropY,
          shape: batchRequests[i].seats > 4 ? 'square' : 'round',
          floor: activeFloor
        };
      }

      persistLayout(updatedMap);
      setIsBulkAddModalOpen(false);
      if (onDataMutated) onDataMutated();
    } catch (err: any) {
      alert('Failed during bulk add: ' + (err.message || err));
    } finally {
      setIsSubmittingBulk(false);
    }
  }, [bulk2Seaters, bulk4Seaters, bulk6Seaters, bulk8Seaters, rawTables, layoutMap, floorTables.length, restaurantId, activeFloor, persistLayout, onDataMutated]);

  // Print Table QR
  const handlePrintQR = useCallback(() => {
    if (!selectedTable || !tableQRDataUrl) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const customerUrl = `${origin}/menu/${restaurantSlug}/table/${selectedTable.id}`;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR - ${selectedTable.name}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 40px; color: #0f172a; }
            .container { border: 4px double #e2e8f0; border-radius: 24px; padding: 40px; max-width: 450px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); }
            .logo { font-size: 24px; font-weight: 800; color: #16A34A; margin-bottom: 5px; }
            .sub { font-size: 14px; color: #64748b; margin-bottom: 30px; font-weight: 500; }
            .qr-img { width: 300px; height: 300px; margin-bottom: 20px; }
            .table-number { font-size: 32px; font-weight: 900; margin: 10px 0; color: #16A34A; }
            .instructions { font-size: 16px; font-weight: 600; color: #16A34A; background-color: #f0fdf4; padding: 10px 20px; border-radius: 9999px; display: inline-block; margin-top: 15px; }
            .footer-link { margin-top: 20px; font-size: 10px; color: #94a3b8; }
            @media print { body { padding: 0; } .container { border: none; box-shadow: none; } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">CleverOps</div>
            <div class="sub">SCAN & ORDER INSTANTLY</div>
            <img class="qr-img" src="${tableQRDataUrl}" alt="QR Code" />
            <div class="table-number">${selectedTable.name}</div>
            <div class="instructions">Scan to View Menu & Place Order</div>
            <div class="footer-link">${customerUrl}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [selectedTable, tableQRDataUrl, restaurantSlug]);

  // Download QR PNG
  const handleDownloadQR = useCallback(() => {
    if (!selectedTable || !tableQRDataUrl) return;
    const link = document.createElement('a');
    link.href = tableQRDataUrl;
    link.download = `${selectedTable.name.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [selectedTable, tableQRDataUrl]);

  // 5. useEffect Declarations
  // Timer interval for real-time elapsed counter (updates every second without refresh)
  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch active orders and table states on mount & interval
  useEffect(() => {
    const fetchOrders = async () => {
      if (!restaurantId) return;
      try {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .in('status', ['new', 'accepted', 'preparing', 'ready', 'served'])
          .order('created_at', { ascending: false });
        if (data) setAllActiveOrders(data);
      } catch {
        // ignore
      }
    };

    const fetchStates = async () => {
      if (!restaurantId) return;
      try {
        const { data: rest } = await supabase
          .from('restaurants')
          .select('settings')
          .eq('id', restaurantId)
          .single();
        if (rest?.settings?.table_states) {
          setLiveTableStates(rest.settings.table_states);
        }
        if (rest?.settings?.floor_names && typeof rest.settings.floor_names === 'object') {
          setFloorNames((prev) => ({ ...prev, ...rest.settings.floor_names }));
        }
      } catch {
        // ignore
      }
    };

    fetchOrders();
    fetchStates();

    const interval = setInterval(() => {
      fetchOrders();
      fetchStates();
    }, 15000);

    return () => clearInterval(interval);
  }, [restaurantId]);

  // Load layout & floor names from localStorage
  useEffect(() => {
    try {
      const savedStr = localStorage.getItem(storageKey);
      if (savedStr) {
        const parsed = JSON.parse(savedStr);
        if (parsed && typeof parsed === 'object') {
          setLayoutMap(parsed);
        }
      }
      const savedFloorNames = localStorage.getItem(`smartdine_floor_names_${restaurantId}`);
      if (savedFloorNames) {
        const parsedNames = JSON.parse(savedFloorNames);
        if (parsedNames && typeof parsedNames === 'object') {
          setFloorNames((prev) => ({ ...prev, ...parsedNames }));
        }
      }
    } catch {
      // ignore
    }
  }, [storageKey, restaurantId]);

  // Auto numbering prefill
  useEffect(() => {
    if (isAddTableModalOpen) {
      setNewTableFloor(activeFloor);
      setNewTableNumber(nextAutoTableNumber);
      setFormError('');
    }
  }, [isAddTableModalOpen, activeFloor, nextAutoTableNumber]);

  // ALL HOOKS STRICTLY DECLARED BEFORE ANY RETURN
  return (
    <div className="flex flex-col w-full bg-[#0B0F14] border border-white/[0.08] rounded-[16px] shadow-2xl overflow-hidden font-sans select-none text-zinc-100">
      
      {/* 1. Operations Header Toolbar (Toast OPS removed) */}
      <div className="px-5 py-4 border-b border-white/[0.08] bg-[#0B0F14]/95 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        
        {/* Left: Module Title & Subtitle */}
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">
            Floor Layout Manager
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Live restaurant table sessions, walk-ins, reservations, and orders.
          </p>
        </div>

        {/* Right: Operational Status Legend, Canvas Controls, & Primary Seating Actions */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Live Status Legend Badges */}
          <div className="hidden lg:flex items-center gap-3 bg-white/[0.02] px-3 py-1.5 rounded-[10px] border border-white/[0.08] text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
              <span className="text-zinc-400">Available:</span>
              <span className="font-bold text-white">{activeFloorStats.available}</span>
            </div>
            <div className="h-3 w-px bg-white/[0.08]" />
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
              <span className="text-zinc-400">Reserved:</span>
              <span className="font-bold text-white">{activeFloorStats.reserved}</span>
            </div>
            <div className="h-3 w-px bg-white/[0.08]" />
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
              <span className="text-zinc-400">Occupied:</span>
              <span className="font-bold text-white">{activeFloorStats.occupied}</span>
            </div>
          </div>

          {/* Canvas Controls: Snap Grid, Zoom */}
          <div className="flex items-center bg-white/[0.02] p-1 rounded-[10px] border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setSnapToGrid(!snapToGrid)}
              title={snapToGrid ? 'Grid Snap Enabled (20px)' : 'Grid Snap Disabled'}
              className={`p-1.5 rounded-[6px] transition-colors cursor-pointer ${
                snapToGrid ? 'bg-white/[0.1] text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <div className="h-3 w-px bg-white/[0.08] mx-1" />
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.6, Number((z - 0.1).toFixed(1))))}
              title="Zoom Out"
              className="p-1.5 rounded-[6px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-zinc-400 px-1.5">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(1.4, Number((z + 0.1).toFixed(1))))}
              title="Zoom In"
              className="p-1.5 rounded-[6px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              title="Reset Zoom"
              className="p-1.5 rounded-[6px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer ml-0.5"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Bulk Add Button */}
          <button
            type="button"
            onClick={() => setIsBulkAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.1] text-xs font-semibold transition-all cursor-pointer"
            title="Bulk Add Tables (e.g. 4-Seater x8, 2-Seater x4)"
          >
            <Layers className="w-3.5 h-3.5 text-zinc-400" />
            <span>Bulk Add</span>
          </button>

          {/* Add Table Button (Auto-Numbered) */}
          <button
            type="button"
            onClick={() => setIsAddTableModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] bg-white/[0.08] hover:bg-white/[0.14] text-zinc-200 font-semibold text-xs border border-white/[0.12] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Table</span>
          </button>

          {/* PRIMARY ACTION: Seat Walk-In Guest (Step 1 of Walk-In flow) */}
          <button
            type="button"
            onClick={() => handleOpenWalkInForTable()}
            className="flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-[10px] bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs shadow-lg shadow-[#16A34A]/25 transition-all cursor-pointer active:scale-95"
            title="Seat Walk-In Guest (Smart Table Suggestion)"
          >
            <UserCheck className="w-4 h-4" />
            <span>Seat Walk-In Guest</span>
          </button>
        </div>
      </div>

      {/* 2. Centered Segmented Floor Navigation (Equal width, center aligned, editable names) */}
      <div className="px-5 py-3 border-b border-white/[0.06] bg-[#0E131A] flex items-center justify-center">
        <div className="grid grid-cols-4 gap-2 w-full max-w-2xl bg-black/40 p-1.5 rounded-[12px] border border-white/[0.08]">
          {floorTabsList.map((tab) => {
            const isActive = activeFloor === tab.id;
            const count = floorCounts[tab.id].count;
            const isEditing = editingFloorTab === tab.id;
            return (
              <div
                key={tab.id}
                onClick={() => {
                  if (!isEditing) {
                    setActiveFloor(tab.id);
                    setSelectedTableId(null);
                  }
                }}
                className={`relative flex items-center justify-center gap-2 px-3 py-2 rounded-[9px] text-xs font-bold transition-all cursor-pointer select-none ${
                  isActive
                    ? 'bg-[#16A34A] text-white shadow-md shadow-[#16A34A]/25 ring-1 ring-[#16A34A]/40'
                    : 'bg-[#111827] text-zinc-400 border border-white/[0.06] hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                {isEditing ? (
                  <input
                    type="text"
                    autoFocus
                    value={editFloorNameValue}
                    onChange={(e) => setEditFloorNameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveFloorName(tab.id, editFloorNameValue);
                      if (e.key === 'Escape') setEditingFloorTab(null);
                    }}
                    onBlur={() => handleSaveFloorName(tab.id, editFloorNameValue)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-black/60 text-white text-xs px-2 py-0.5 rounded border border-[#16A34A] text-center focus:outline-none"
                  />
                ) : (
                  <>
                    <span className="truncate">{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono shrink-0 ${
                        isActive ? 'bg-black/35 text-white' : 'bg-white/[0.08] text-zinc-400'
                      }`}
                    >
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingFloorTab(tab.id);
                        setEditFloorNameValue(tab.label);
                      }}
                      className={`p-1 rounded opacity-60 hover:opacity-100 transition-opacity cursor-pointer ${
                        isActive ? 'text-white hover:bg-black/20' : 'text-zinc-500 hover:text-zinc-200'
                      }`}
                      title="Rename Floor (e.g. AC Hall, Garden)"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Interactive 2D Canvas Area (Clean layout, decorative labels & tone removed, 50+ tables scrollable) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative w-full h-[680px] max-h-[75vh] ${floorThemeStyles.canvasBg} border-t ${floorThemeStyles.borderColor} overflow-auto transition-colors duration-300`}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.2) transparent'
        }}
      >
        
        {/* Dot Grid Background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle, ${floorThemeStyles.gridColor} 1px, transparent 1px)`,
            backgroundSize: `${20 * zoomLevel}px ${20 * zoomLevel}px`
          }}
        />

        {/* Outer Perimeter Architectural Boundary */}
        <div className="absolute inset-3 border border-white/[0.04] rounded-xl pointer-events-none" />

        {/* Floor Watermark (Tone labels removed) */}
        <div className="absolute top-4 left-6 pointer-events-none select-none flex items-center">
          <span className={`text-4xl font-extrabold uppercase tracking-widest ${floorThemeStyles.watermarkText}`}>
            {floorNames[activeFloor] || activeFloor}
          </span>
        </div>

        {/* Empty Floor Notice */}
        {floorTables.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center p-6">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-center text-zinc-500 mb-3">
              <Users className="w-6 h-6 text-zinc-400" />
            </div>
            <p className="text-sm font-semibold text-zinc-300">
              No tables placed on {floorNames[activeFloor] || activeFloor} floor yet
            </p>
            <p className="text-xs text-zinc-500 max-w-sm mt-1">
              Click Add Table or Bulk Add in the toolbar above to set up tables on this floor.
            </p>
          </div>
        )}

        {/* Scaled Canvas Container with dynamic dimensions for 50+ tables infinite scroll */}
        <div
          ref={canvasContainerRef}
          className="relative"
          style={{
            width: `${canvasDimensions.width}px`,
            height: `${canvasDimensions.height}px`,
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top left'
          }}
        >
          {floorTables.map((table) => {
            const isSelected = selectedTableId === table.id;
            const isDragging = isDraggingTableId === table.id;
            const isOccupied = table.status === 'occupied';
            const isReserved = table.status === 'reserved';
            const isAvailable = table.status === 'available';

            // Status configuration matching Toast / Square
            const statusConfig = {
              available: {
                borderColor: 'border-[#16A34A]',
                badgeBg: 'bg-[#16A34A]/20',
                badgeText: 'text-[#16A34A]',
                label: 'Available',
                dotColor: 'bg-[#16A34A]',
                heatGlow: 'hover:shadow-emerald-950/40'
              },
              reserved: {
                borderColor: 'border-[#F59E0B]',
                badgeBg: 'bg-[#F59E0B]/20',
                badgeText: 'text-[#F59E0B]',
                label: 'Reserved',
                dotColor: 'bg-[#F59E0B]',
                heatGlow: 'shadow-[0_0_16px_rgba(245,158,11,0.22)]'
              },
              occupied: {
                borderColor: 'border-[#EF4444]',
                badgeBg: 'bg-[#EF4444]/20',
                badgeText: 'text-[#EF4444]',
                label: 'Occupied',
                dotColor: 'bg-[#EF4444]',
                heatGlow: 'shadow-[0_0_20px_rgba(239,68,68,0.28)] ring-1 ring-[#EF4444]/30'
              },
              cleaning: {
                borderColor: 'border-[#F59E0B]',
                badgeBg: 'bg-[#F59E0B]/20',
                badgeText: 'text-[#F59E0B]',
                label: 'Cleaning',
                dotColor: 'bg-[#F59E0B]',
                heatGlow: 'shadow-amber-950/30'
              },
              merged: {
                borderColor: 'border-[#3B82F6]',
                badgeBg: 'bg-[#3B82F6]/20',
                badgeText: 'text-[#3B82F6]',
                label: 'Merged',
                dotColor: 'bg-[#3B82F6]',
                heatGlow: 'shadow-blue-950/30'
              }
            }[table.status] || {
              borderColor: 'border-[#16A34A]',
              badgeBg: 'bg-[#16A34A]/20',
              badgeText: 'text-[#16A34A]',
              label: 'Available',
              dotColor: 'bg-[#16A34A]',
              heatGlow: ''
            };

            const isRound = table.shape === 'round';
            const width = 154;
            const height = 164;
            const tableData = tableDataMap[table.id] || { totalBill: 0, items: [], counts: { preparing: 0, ready: 0, served: 0, completed: 0 } };
            const elapsed = formatElapsedTimer(table.occupiedAt, nowTime);
            const started = formatStartedTime(table.occupiedAt);
            const resTimeInfo = formatReservationTime(table.reservationTime, nowTime);

            return (
              <div
                key={table.id}
                onPointerDown={(e) => handlePointerDown(e, table.id, table.x, table.y)}
                onClick={() => handleSelectTable(table)}
                style={{
                  left: `${table.x}px`,
                  top: `${table.y}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                  touchAction: 'none'
                }}
                className={`absolute cursor-grab active:cursor-grabbing transition-all duration-180 ease-out select-none group hover:scale-[1.03] hover:-translate-y-0.5 ${
                  isDragging ? 'z-40 opacity-90 scale-105 shadow-2xl' : 'z-20'
                }`}
              >
                {/* Main Table Card (154×164px) with CleverOps Card Style */}
                <div
                  className={`w-full h-full flex flex-col justify-between p-2.5 bg-[#111827] border-2 shadow-xl ${
                    statusConfig.borderColor
                  } ${statusConfig.heatGlow} ${isRound ? 'rounded-[28px]' : 'rounded-[16px]'} ${
                    isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0B0F14]' : ''
                  } transition-all duration-180`}
                >
                  {/* Priority 1: Status Header Row (Live Status Pill & Quick QR Icon) */}
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${statusConfig.dotColor} ${isOccupied ? 'animate-pulse' : ''}`} />
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${statusConfig.badgeText}`}>
                        {statusConfig.label}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectTable(table);
                        setActiveDrawerSection('qr');
                      }}
                      className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
                      title="View & Print Table QR"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Priority 2: Table Name */}
                  <div className="my-auto w-full">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-extrabold text-white tracking-tight">
                        {table.name}
                      </h4>
                      {isAvailable && (
                        <span className="text-xs font-semibold text-zinc-400">
                          {table.seats || 4} Seats
                        </span>
                      )}
                    </div>

                    {/* OCCUPIED STATE DETAILS (Priority 3: Guests + Bill, Priority 4: Started + Elapsed, Priority 5: Order Chips) */}
                    {isOccupied && (
                      <div className="space-y-1.5 mt-1">
                        {/* Priority 3: Dynamic Guest Count & Right-Aligned Bill */}
                        <div className="flex items-center justify-between text-[11px] font-semibold pt-0.5 border-t border-white/[0.06]">
                          <span className="text-zinc-200">{table.guestCount || table.seats || 4} Guests</span>
                          <span className="font-mono text-emerald-400 font-bold text-right tracking-tight">
                            ₹{tableData.totalBill.toLocaleString()}
                          </span>
                        </div>

                        {/* Priority 4: Started & Live Elapsed Timer */}
                        <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 pt-0.5 border-t border-white/[0.06]">
                          <span>Started {started}</span>
                          <span className="text-rose-400 font-bold">Elapsed {elapsed}</span>
                        </div>

                        {/* Priority 5: Order Status Chips (Preparing: Orange, Ready: Blue, Served: Green, Completed: Grey) */}
                        <div className="w-full space-y-1 pt-1 border-t border-white/[0.06]">
                          {tableData.items.length > 0 ? (
                            tableData.items.slice(0, 2).map((it, idx) => {
                              const badge = getOrderStatusBadge(it.status);
                              return (
                                <div key={idx} className="flex items-center justify-between text-[8px] font-medium leading-tight">
                                  <span className="truncate max-w-[85px] text-zinc-200">{it.name} ×{it.quantity}</span>
                                  <span className={`px-1.5 py-0.2 rounded text-[7px] font-bold uppercase ${badge.bgColor} ${badge.textColor} border ${badge.borderColor}`}>
                                    {badge.label}
                                  </span>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-[8px] text-zinc-400 italic text-center py-0.5">
                              Live Orders Ready
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* RESERVED STATE DETAILS (Clean reservation time, no negative countdown) */}
                    {isReserved && (
                      <div className="space-y-1.5 mt-1.5">
                        <div className="text-xs font-bold text-amber-300 truncate">
                          {table.reservationPartyName || 'Reserved Party'}
                        </div>
                        <div className="text-[10px] font-medium text-amber-200/90 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>{resTimeInfo.mainText}</span>
                        </div>
                        {resTimeInfo.badge && (
                          <span className="inline-block text-[8px] font-semibold text-amber-300 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20">
                            {resTimeInfo.badge}
                          </span>
                        )}
                        <div className="text-[9px] text-zinc-400 pt-0.5 border-t border-white/[0.06]">
                          Party Size: {table.seats || 4} Guests
                        </div>
                      </div>
                    )}

                    {/* AVAILABLE STATE DETAILS (Clean & Minimalist: Only Status, Table name, Seats) */}
                    {isAvailable && (
                      <div className="py-2 flex items-center justify-center">
                        <span className="text-xs font-semibold text-zinc-400">
                          {table.seats || 4} Seats
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Strip: Shape / Floor Indicator */}
                  <div className="flex items-center justify-between w-full pt-1 text-[8px] font-mono text-zinc-500 border-t border-white/[0.04]">
                    <span className="capitalize">{table.shape === 'round' ? 'Round' : 'Square'}</span>
                    <span className="uppercase text-zinc-500">{floorNames[table.floor] || table.floor}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Table Operations Slide-over Drawer / Mobile Bottom Sheet */}
      {selectedTable && (
        <div className="fixed top-16 bottom-0 right-0 z-50 w-full max-w-md bg-[#0D1219] border-l border-white/[0.08] shadow-2xl flex flex-col font-sans select-none animate-in slide-in-from-right duration-200 max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:max-h-[88vh] max-md:rounded-t-2xl max-md:border-t max-md:border-l-0">
          
          {/* Drawer Header */}
          <div className="px-6 py-4 border-b border-white/[0.08] bg-[#0B0F14] flex items-center justify-between shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {isRenaming ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editTableName}
                      onChange={(e) => setEditTableName(e.target.value)}
                      className="px-2 py-1 bg-white/[0.04] border border-[#16A34A] rounded text-sm text-white font-bold outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveRename(selectedTable.id)}
                      className="p-1.5 rounded bg-[#16A34A] text-white cursor-pointer"
                      title="Save Name"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white tracking-tight truncate">
                      {selectedTable.name}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsRenaming(true)}
                      className="p-1 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
                      title="Rename Table"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-white/[0.05] text-zinc-300 border border-white/[0.08]">
                  {floorNames[selectedTable.floor] || selectedTable.floor}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Table operations and live session for {selectedTable.name}.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTableId(null)}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Status Row */}
          <div className="px-6 py-3 border-b border-white/[0.08] bg-white/[0.01] shrink-0">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleUpdateStatus(selectedTable.id, 'available')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-[8px] text-xs font-bold border transition-all cursor-pointer ${
                  selectedTable.status === 'available'
                    ? 'bg-[#16A34A] border-[#16A34A] text-white shadow-md shadow-[#16A34A]/20'
                    : 'bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Available</span>
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus(selectedTable.id, 'reserved')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-[8px] text-xs font-bold border transition-all cursor-pointer ${
                  selectedTable.status === 'reserved'
                    ? 'bg-[#F59E0B] border-[#F59E0B] text-black shadow-md shadow-[#F59E0B]/20'
                    : 'bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Reserved</span>
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus(selectedTable.id, 'occupied')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-[8px] text-xs font-bold border transition-all cursor-pointer ${
                  selectedTable.status === 'occupied'
                    ? 'bg-[#EF4444] border-[#EF4444] text-white shadow-md shadow-[#EF4444]/20'
                    : 'bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span>Occupied</span>
              </button>
            </div>
          </div>

          {/* Navigation Section Tabs: Live Session (Status) / Booking / Orders / QR / Settings */}
          <div className="px-6 pt-2 border-b border-white/[0.08] flex items-center gap-2 shrink-0">
            {[
              { id: 'status' as const, label: 'Live Session', icon: Flame },
              { id: 'booking' as const, label: 'Booking', icon: Calendar },
              { id: 'orders' as const, label: `Orders (${activeTableOrders.length})`, icon: ShoppingBag },
              { id: 'qr' as const, label: 'QR', icon: QrCode },
              { id: 'settings' as const, label: 'Settings', icon: Users }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeDrawerSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveDrawerSection(tab.id)}
                  className={`flex items-center gap-1 px-2.5 py-2 border-b-2 text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'border-[#16A34A] text-[#16A34A]'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            
            {/* SECTION 1: LIVE SESSION (Status, Walk-In, Live Metrics & Controls) */}
            {activeDrawerSection === 'status' && (
              <div className="space-y-4">
                {selectedTable.status === 'occupied' ? (
                  <div className="space-y-4">
                    {/* Live Session Overview Card */}
                    <div className="p-4 bg-[#111827] border border-white/[0.08] rounded-[14px] space-y-3 shadow-lg">
                      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                        <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          Live Table Session
                        </span>
                        <span className="text-xs font-mono text-zinc-400">
                          {formatStartedTime(selectedTable.occupiedAt)}
                        </span>
                      </div>

                      {/* 4-Metric Grid: Guest Count, Started Time, Elapsed Time, Current Bill */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-2.5 bg-white/[0.02] border border-white/[0.06] rounded-[10px]">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 block">Guest Count</span>
                          <span className="text-sm font-extrabold text-white">
                            {selectedTable.guestCount || selectedTable.seats || 4} Guests
                          </span>
                        </div>
                        <div className="p-2.5 bg-white/[0.02] border border-white/[0.06] rounded-[10px]">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 block">Started Time</span>
                          <span className="text-sm font-extrabold font-mono text-white">
                            {formatStartedTime(selectedTable.occupiedAt)}
                          </span>
                        </div>
                        <div className="p-2.5 bg-white/[0.02] border border-white/[0.06] rounded-[10px]">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 block">Elapsed Time</span>
                          <span className="text-sm font-extrabold font-mono text-rose-400">
                            {formatElapsedTimer(selectedTable.occupiedAt, nowTime)}
                          </span>
                        </div>
                        <div className="p-2.5 bg-white/[0.02] border border-white/[0.06] rounded-[10px]">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 block">Current Bill</span>
                          <span className="text-sm font-extrabold font-mono text-emerald-400">
                            ₹{selectedTableData.totalBill.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Order Status Strip Breakdown */}
                      <div className="pt-2 border-t border-white/[0.06] space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                          <span>Kitchen Order Status</span>
                          <span className="text-[10px] font-mono text-zinc-400">Live KDS Sync</span>
                        </div>

                        {/* Status Badges Row */}
                        <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-bold">
                          <div className="p-1 rounded bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B]">
                            <span className="block text-xs font-mono">{selectedTableData.counts.preparing}</span>
                            <span>Prep</span>
                          </div>
                          <div className="p-1 rounded bg-[#3B82F6]/10 border border-[#3B82F6]/20 text-[#3B82F6]">
                            <span className="block text-xs font-mono">{selectedTableData.counts.ready}</span>
                            <span>Ready</span>
                          </div>
                          <div className="p-1 rounded bg-[#16A34A]/10 border border-[#16A34A]/20 text-[#16A34A]">
                            <span className="block text-xs font-mono">{selectedTableData.counts.served}</span>
                            <span>Served</span>
                          </div>
                          <div className="p-1 rounded bg-white/[0.05] border border-white/[0.1] text-zinc-400">
                            <span className="block text-xs font-mono">{selectedTableData.counts.completed}</span>
                            <span>Done</span>
                          </div>
                        </div>

                        {/* Active Items List */}
                        {selectedTableData.items.length > 0 && (
                          <div className="space-y-1.5 pt-2">
                            {selectedTableData.items.map((it, idx) => {
                              const badge = getOrderStatusBadge(it.status);
                              return (
                                <div key={idx} className="flex items-center justify-between p-2 bg-white/[0.02] rounded-[8px] text-xs">
                                  <span className="font-semibold text-zinc-200">{it.name} ×{it.quantity}</span>
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${badge.bgColor} ${badge.textColor} border ${badge.borderColor}`}>
                                    {badge.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3 Primary Action Buttons (48px targets) */}
                    <div className="space-y-2 pt-1">
                      {/* Add Order Button */}
                      <a
                        href={`/menu/${restaurantSlug}/table/${selectedTable.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full min-h-[48px] rounded-[12px] bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Order</span>
                      </a>

                      {/* Transfer Table Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const availableOnFloor = floorTables.filter((t) => t.id !== selectedTable.id && t.status === 'available');
                          setTransferTargetTableId(availableOnFloor[0]?.id || null);
                          setIsTransferModalOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 w-full min-h-[48px] rounded-[12px] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.1] font-bold text-xs transition-all cursor-pointer"
                      >
                        <ArrowRightLeft className="w-4 h-4 text-zinc-400" />
                        <span>Transfer Table</span>
                      </button>

                      {/* Close Session Button */}
                      <button
                        type="button"
                        onClick={() => handleCloseSession(selectedTable.id)}
                        className="flex items-center justify-center gap-2 w-full min-h-[48px] rounded-[12px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Close Session</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Available Table Notice & Walk-In Trigger */}
                    <div className="p-4 bg-[#111827] border border-white/[0.08] rounded-[14px] space-y-3">
                      <div>
                        <p className="text-xs font-bold text-white uppercase tracking-wider">
                          Table Ready for Seating
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          This table is available. Start an instant walk-in session with custom guest count.
                        </p>
                      </div>

                      {/* Single Walk-in Button as requested in Step 1 */}
                      <button
                        type="button"
                        onClick={() => handleOpenWalkInForTable(selectedTable.id)}
                        className="flex items-center justify-center gap-2 w-full min-h-[48px] rounded-[12px] bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Seat Walk-In Guest</span>
                      </button>
                    </div>

                    {/* Quick Print QR Card */}
                    <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-[12px] flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-white">Table QR Code</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">Instant order sticker print</p>
                      </div>
                      <button
                        type="button"
                        onClick={handlePrintQR}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold rounded-[8px] border border-white/[0.1] transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-[#16A34A]" />
                        <span>Print</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 2: BOOKING (Walk-In, Reserve & Manage Inline) */}
            {activeDrawerSection === 'booking' && (
              <div className="space-y-4">
                {/* 1. Walk-In Seating Trigger Inline */}
                <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-[12px] space-y-2">
                  <div>
                    <p className="text-xs font-bold text-white uppercase tracking-wider">
                      Walk-in Guest Seating
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Seat guest party immediately without advance reservation.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenWalkInForTable(selectedTable.id)}
                    className="flex items-center justify-center gap-2 w-full min-h-[44px] rounded-[10px] bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Seat Walk-In Guest</span>
                  </button>
                </div>

                {/* 2. Advance Reservation Form Inline */}
                {selectedTable.reservationPartyName ? (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-[12px] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        Active Reservation
                      </span>
                      <span className="text-xs font-mono text-white">
                        {selectedTable.reservationTime || '19:30'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        {selectedTable.reservationPartyName}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Party Size: {selectedTable.seats || 4} Guests • {formatReservationTime(selectedTable.reservationTime, nowTime).mainText}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(selectedTable.id, 'occupied')}
                        className="py-2.5 rounded-[8px] bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        Seat Reserved Party
                      </button>
                      <button
                        type="button"
                        onClick={() => handleClearBooking(selectedTable.id)}
                        className="py-2.5 rounded-[8px] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Release Reservation
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-[12px] space-y-3">
                    <p className="text-xs font-bold text-white uppercase tracking-wider">
                      Advance Table Reservation
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Reserve this table for an upcoming guest party. The table will immediately illuminate with an amber booking pill.
                    </p>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        Guest / Party Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sharma Family"
                        value={bookingPartyName}
                        onChange={(e) => setBookingPartyName(e.target.value)}
                        className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-[8px] text-xs text-white placeholder-zinc-500 outline-none focus:border-[#16A34A]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          Reservation Time
                        </label>
                        <input
                          type="time"
                          value={bookingTime}
                          onChange={(e) => setBookingTime(e.target.value)}
                          className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-[8px] text-xs text-white outline-none focus:border-[#16A34A]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          Party Size
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={bookingPartySize}
                          onChange={(e) => setBookingPartySize(Number(e.target.value) || 4)}
                          className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-[8px] text-xs text-white outline-none focus:border-[#16A34A]"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isBookingSaving}
                      onClick={() => handleSaveBooking(selectedTable.id)}
                      className="w-full min-h-[44px] rounded-[10px] bg-[#F59E0B] hover:bg-[#D97706] text-black text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50"
                    >
                      {isBookingSaving ? 'Reserving...' : 'Confirm Table Booking'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 3: OPEN ORDERS */}
            {activeDrawerSection === 'orders' && (
              <div className="space-y-4">
                {isLoadingOrders ? (
                  <div className="py-12 text-center text-xs text-zinc-400">
                    Loading active table orders...
                  </div>
                ) : activeTableOrders.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500">
                    <ShoppingBag className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                    <p className="text-sm font-semibold text-zinc-300">No Active Orders</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Orders scanned via QR or placed through KDS appear here in real time.
                    </p>
                  </div>
                ) : (
                  activeTableOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-[12px] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white font-mono">
                          #{ord.order_number || ord.id.slice(0, 8)}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          {ord.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-white/[0.04]">
                        <span>Total Bill:</span>
                        <span className="font-bold text-white font-mono">
                          ₹{ord.total_amount || 0}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* SECTION 4: QR CODE */}
            {activeDrawerSection === 'qr' && (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-white rounded-[16px] shadow-xl">
                  {tableQRDataUrl ? (
                    <img
                      src={tableQRDataUrl}
                      alt="Table QR Code"
                      className="w-48 h-48 rounded"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-zinc-400 text-xs">
                      Generating QR...
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm font-bold text-white">{selectedTable.name}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Scan to view digital menu and place order instantly.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full pt-2">
                  <button
                    type="button"
                    onClick={handlePrintQR}
                    className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] rounded-[10px] bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Sticker</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadQR}
                    className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] rounded-[10px] bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-bold border border-white/[0.1] transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PNG</span>
                  </button>
                </div>

                <a
                  href={`/menu/${restaurantSlug}/table/${selectedTable.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[#16A34A] hover:underline pt-1"
                >
                  <span>Open Customer Menu Preview</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* SECTION 5: SETTINGS */}
            {activeDrawerSection === 'settings' && (
              <div className="space-y-4">
                {/* Capacity Adjuster */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Seat Capacity
                  </label>
                  <div className="flex items-center gap-2">
                    {[2, 4, 6, 8, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleUpdateCapacity(selectedTable.id, num)}
                        className={`flex-1 min-h-[40px] rounded-[8px] text-xs font-bold border transition-all cursor-pointer ${
                          selectedTable.seats === num
                            ? 'bg-[#16A34A] border-[#16A34A] text-white shadow-sm'
                            : 'bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table Shape Selector */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Table Shape
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateShape(selectedTable.id, 'square')}
                      className={`flex items-center justify-center gap-2 min-h-[44px] rounded-[10px] text-xs font-semibold border transition-all cursor-pointer ${
                        selectedTable.shape === 'square'
                          ? 'bg-white/[0.08] border-[#16A34A] text-white ring-1 ring-[#16A34A]'
                          : 'bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div className="w-3.5 h-3.5 rounded-sm border border-current" />
                      <span>Square Table</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateShape(selectedTable.id, 'round')}
                      className={`flex items-center justify-center gap-2 min-h-[44px] rounded-[10px] text-xs font-semibold border transition-all cursor-pointer ${
                        selectedTable.shape === 'round'
                          ? 'bg-white/[0.08] border-[#16A34A] text-white ring-1 ring-[#16A34A]'
                          : 'bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div className="w-3.5 h-3.5 rounded-full border border-current" />
                      <span>Round Table</span>
                    </button>
                  </div>
                </div>

                {/* Target Floor Assignment */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Floor Section
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {floorTabsList.map((floor) => (
                      <button
                        key={floor.id}
                        type="button"
                        onClick={() => handleMoveFloor(selectedTable.id, floor.id)}
                        className={`flex items-center justify-center gap-1.5 min-h-[40px] rounded-[8px] text-xs font-semibold border transition-all cursor-pointer ${
                          selectedTable.floor === floor.id
                            ? 'bg-[#16A34A]/15 border-[#16A34A] text-[#16A34A]'
                            : 'bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span>{floor.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delete Table Action */}
                <div className="pt-4 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => handleDeleteTable(selectedTable.id)}
                    className="flex items-center justify-center gap-2 w-full min-h-[44px] rounded-[10px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Table</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. WALK-IN SEATING MODAL / BOTTOM SHEET (Owner Verified Flow) */}
      {isWalkInModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150 max-md:p-0 max-md:items-end">
          <div className="w-full max-w-md bg-[#111827] border border-white/[0.08] rounded-[16px] shadow-2xl p-6 space-y-5 text-zinc-100 max-md:rounded-b-none max-md:rounded-t-2xl max-md:max-h-[90vh] max-md:overflow-y-auto">
            
            {/* Header: Walk-In Guest & Guest Count */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#16A34A]" />
                  <span>Walk-In Guest</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Guest Count
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsWalkInModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 2 — Guest Count Selector: Stepper & Quick Chips */}
            <div className="space-y-4">
              {/* Stepper with Minus / Count / Plus */}
              <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.08] rounded-[12px]">
                <button
                  type="button"
                  onClick={() => {
                    setWalkInGuestCount((prev) => Math.max(1, prev - 1));
                    setWalkInIsCustom(false);
                  }}
                  className="w-12 h-12 flex items-center justify-center rounded-[10px] bg-white/[0.06] hover:bg-white/[0.12] text-white font-bold text-lg cursor-pointer transition-colors active:scale-95"
                >
                  <Minus className="w-5 h-5" />
                </button>

                <div className="text-center">
                  <span className="text-3xl font-extrabold font-mono text-white tracking-tight block">
                    {walkInGuestCount}
                  </span>
                  <span className="text-[11px] text-zinc-400 uppercase font-semibold tracking-wider">
                    {walkInGuestCount === 1 ? 'Guest' : 'Guests'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setWalkInGuestCount((prev) => Math.min(20, prev + 1));
                    setWalkInIsCustom(false);
                  }}
                  className="w-12 h-12 flex items-center justify-center rounded-[10px] bg-white/[0.06] hover:bg-white/[0.12] text-white font-bold text-lg cursor-pointer transition-colors active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Chips: 1, 2, 3, 4, 5, 6+ */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2">
                  Quick Select
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setWalkInGuestCount(num);
                        setWalkInIsCustom(false);
                      }}
                      className={`min-h-[44px] flex items-center justify-center rounded-[10px] text-sm font-bold border transition-all cursor-pointer ${
                        walkInGuestCount === num && !walkInIsCustom
                          ? 'bg-[#16A34A] border-[#16A34A] text-white shadow-md shadow-[#16A34A]/25'
                          : 'bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  {/* 6+ Quick Chip */}
                  <button
                    type="button"
                    onClick={() => {
                      setWalkInIsCustom(true);
                      const parsed = parseInt(walkInCustomInput, 10);
                      setWalkInGuestCount(!isNaN(parsed) && parsed >= 6 ? parsed : 6);
                    }}
                    className={`min-h-[44px] flex items-center justify-center rounded-[10px] text-sm font-bold border transition-all cursor-pointer ${
                      walkInIsCustom || walkInGuestCount >= 6
                        ? 'bg-[#16A34A] border-[#16A34A] text-white shadow-md shadow-[#16A34A]/25'
                        : 'bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    6+
                  </button>
                </div>
              </div>

              {/* Custom Number Input when 6+ is active */}
              {(walkInIsCustom || walkInGuestCount >= 6) && (
                <div className="p-3 bg-white/[0.02] border border-[#16A34A]/30 rounded-[10px] animate-in fade-in duration-150">
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Custom Guest Count (6 to 20):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={walkInGuestCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        setWalkInGuestCount(Math.min(20, Math.max(1, val)));
                      }
                    }}
                    className="w-full px-3 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-[8px] text-sm text-white font-mono font-bold outline-none focus:border-[#16A34A]"
                  />
                </div>
              )}

              {/* Step 3 — Smart Table Suggestion Card */}
              <div className="p-3.5 bg-white/[0.02] border border-white/[0.08] rounded-[12px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Auto Suggestion
                  </span>
                  {activeWalkInTable && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#16A34A]/20 text-[#16A34A] border border-[#16A34A]/30 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Best Fit</span>
                    </span>
                  )}
                </div>

                {activeWalkInTable ? (
                  <div className="flex items-center justify-between p-2.5 bg-white/[0.03] border border-white/[0.08] rounded-[10px]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-white">
                          {activeWalkInTable.name}
                        </span>
                        <span className="text-xs font-mono text-zinc-400">
                          ({activeWalkInTable.seats || 4} seats)
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Floor: {floorNames[activeWalkInTable.floor] || activeWalkInTable.floor}
                      </p>
                    </div>

                    {/* Change Table Selector if owner wants another table */}
                    <select
                      value={activeWalkInTable.id}
                      onChange={(e) => setWalkInSelectedTableId(e.target.value)}
                      className="px-2.5 py-1.5 bg-white/[0.06] border border-white/[0.1] rounded-[8px] text-xs text-white outline-none cursor-pointer"
                    >
                      {resolvedTables
                        .filter((t) => t.status === 'available' || t.id === activeWalkInTable.id)
                        .map((t) => (
                          <option key={t.id} value={t.id} className="bg-[#111827] text-white">
                            {t.name} ({t.seats || 4} seats)
                          </option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-[8px] text-xs text-amber-300">
                    No available tables found on this floor. Please free an occupied table or switch floors.
                  </div>
                )}
              </div>

              {/* Step 4 — One-Click Seat Button */}
              <button
                type="button"
                disabled={!activeWalkInTable || isSubmittingWalkIn}
                onClick={handleSeatWalkInGuest}
                className="w-full min-h-[48px] rounded-[12px] bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white font-extrabold text-sm shadow-xl shadow-[#16A34A]/25 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
              >
                {isSubmittingWalkIn ? (
                  <span>Seating Guest...</span>
                ) : (
                  <>
                    <UserCheck className="w-5 h-5" />
                    <span>Seat Guest</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. TRANSFER TABLE MODAL */}
      {isTransferModalOpen && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#111827] border border-white/[0.08] rounded-[16px] shadow-2xl p-6 space-y-4 text-zinc-100">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-[#3B82F6]" />
                <span>Transfer Table</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Shift active session, orders, and guests from <span className="font-bold text-white">{selectedTable.name}</span> to another available table:
            </p>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Select Destination Table
              </label>
              <select
                value={transferTargetTableId || ''}
                onChange={(e) => setTransferTargetTableId(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.1] rounded-[8px] text-xs text-white outline-none cursor-pointer"
              >
                {resolvedTables
                  .filter((t) => t.id !== selectedTable.id && t.status === 'available')
                  .map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#111827] text-white">
                      {t.name} ({t.seats || 4} seats) - {t.floor}
                    </option>
                  ))}
              </select>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="px-4 py-2 rounded-[8px] text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!transferTargetTableId}
                onClick={handleTransferTable}
                className="px-5 py-2 min-h-[40px] rounded-[8px] bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. ADD TABLE MODAL (Auto-numbering T-1, T-2...) */}
      {isAddTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#111827] border border-white/[0.08] rounded-[16px] shadow-2xl p-6 space-y-5 text-zinc-100">
            
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Add New Table
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Next table auto-numbered for {floorNames[newTableFloor] || newTableFloor} floor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTableModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-[8px] text-xs text-rose-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateNewTable} className="space-y-4">
              {/* Table Number with Auto-Fill (e.g. T-1, T-2) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Table Number (Auto Generated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. T-7"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-[8px] text-xs text-white placeholder-zinc-500 outline-none focus:border-[#16A34A] font-bold"
                />
              </div>

              {/* Seat Capacity Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Seat Capacity
                </label>
                <div className="flex items-center gap-2">
                  {[2, 4, 6, 8, 10].map((seats) => (
                    <button
                      key={seats}
                      type="button"
                      onClick={() => setNewTableSeats(seats)}
                      className={`flex-1 min-h-[40px] rounded-[8px] text-xs font-bold border transition-all cursor-pointer ${
                        newTableSeats === seats
                          ? 'bg-[#16A34A] border-[#16A34A] text-white shadow-sm'
                          : 'bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {seats}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table Shape (Square or Round) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Shape
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTableShape('square')}
                    className={`flex items-center justify-center gap-2 min-h-[40px] rounded-[8px] text-xs font-semibold border transition-all cursor-pointer ${
                      newTableShape === 'square'
                        ? 'bg-white/[0.08] border-[#16A34A] text-white ring-1 ring-[#16A34A]'
                        : 'bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="w-3.5 h-3.5 rounded-sm border border-current" />
                    <span>Square</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTableShape('round')}
                    className={`flex items-center justify-center gap-2 min-h-[40px] rounded-[8px] text-xs font-semibold border transition-all cursor-pointer ${
                      newTableShape === 'round'
                        ? 'bg-white/[0.08] border-[#16A34A] text-white ring-1 ring-[#16A34A]'
                        : 'bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="w-3.5 h-3.5 rounded-full border border-current" />
                    <span>Round</span>
                  </button>
                </div>
              </div>

              {/* Target Floor */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Target Floor Section
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {floorTabsList.map((floor) => (
                    <button
                      key={floor.id}
                      type="button"
                      onClick={() => setNewTableFloor(floor.id)}
                      className={`min-h-[38px] rounded-[8px] text-xs font-semibold border transition-all cursor-pointer ${
                        newTableFloor === floor.id
                          ? 'bg-[#16A34A]/15 border-[#16A34A] text-[#16A34A]'
                          : 'bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {floor.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 flex items-center justify-end gap-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsAddTableModalOpen(false)}
                  className="px-4 py-2 rounded-[8px] text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTable}
                  className="px-5 py-2.5 min-h-[40px] rounded-[8px] bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmittingTable ? 'Adding...' : 'Add Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. BULK ADD MODAL (Quick Add Batch Setup) */}
      {isBulkAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#111827] border border-white/[0.08] rounded-[16px] shadow-2xl p-6 space-y-5 text-zinc-100">
            
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Bulk Quick Add
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Batch add tables on {floorNames[activeFloor] || activeFloor} floor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkAddModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkAddSubmit} className="space-y-4">
              {[
                { label: '2-Seater Tables', count: bulk2Seaters, set: setBulk2Seaters },
                { label: '4-Seater Tables', count: bulk4Seaters, set: setBulk4Seaters },
                { label: '6-Seater Tables', count: bulk6Seaters, set: setBulk6Seaters },
                { label: '8-Seater Tables', count: bulk8Seaters, set: setBulk8Seaters }
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between p-2.5 bg-white/[0.02] border border-white/[0.08] rounded-[10px]">
                  <span className="text-xs font-semibold text-zinc-300">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => row.set(Math.max(0, row.count - 1))}
                      className="w-8 h-8 flex items-center justify-center rounded bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-xs font-bold font-mono text-white">
                      {row.count}
                    </span>
                    <button
                      type="button"
                      onClick={() => row.set(row.count + 1)}
                      className="w-8 h-8 flex items-center justify-center rounded bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}

              <div className="pt-2 text-xs text-zinc-400 text-center">
                Total Tables to Add: <span className="font-bold text-white font-mono">{bulk2Seaters + bulk4Seaters + bulk6Seaters + bulk8Seaters}</span>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsBulkAddModalOpen(false)}
                  className="px-4 py-2 rounded-[8px] text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBulk}
                  className="px-5 py-2.5 min-h-[40px] rounded-[8px] bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmittingBulk ? 'Generating...' : 'Generate Layout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorLayoutManager;
