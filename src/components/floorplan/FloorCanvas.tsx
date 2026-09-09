'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Stage, Layer } from 'react-konva';
import Konva from 'konva';
import { 
  ZoomIn, ZoomOut, RotateCcw, Grid, Undo2, Redo2, 
  Save, Eye, Edit3, Plus, Layers, AlertCircle, Compass, X,
  TrendingUp, Users, ChevronDown, ChevronRight
} from 'lucide-react';

import { FloorPlanItem, TableShape, FloorPlanBlueprint } from './types';
import { GridLayer } from './GridLayer';
import { SnapGuide, GuideLine } from './SnapGuide';
import { TableNode } from './TableNode';
import { FurnitureNode } from './FurnitureNode';
import { SelectionBox } from './SelectionBox';
import { Toolbox } from './Toolbox';
import { PropertyPanel } from './PropertyPanel';
import { MergePromptModal } from './MergePromptModal';
import { SeatGuestDrawer } from './SeatGuestDrawer';
import { TableQuickActionPopover } from './TableQuickActionPopover';
import { OpenBillsDrawer } from './OpenBillsDrawer';
import { TableQRPopover } from './TableQRPopover';
import { WaiterHeatmapModal } from './WaiterHeatmapModal';
import { ZoneManagerModal } from './ZoneManagerModal';
import { HistoryManager } from './HistoryManager';
import { AutoSaveEngine } from './AutoSaveEngine';
import { findCollidingTable, mergeTables, splitTable } from './CollisionEngine';
import { db, RestaurantZone, STANDARD_ZONES } from '@/lib/db';
import { generateQRDataURL } from '@/lib/qr';

interface FloorCanvasProps {
  restaurantId: string;
  restaurantName?: string;
  restaurantSlug?: string;
  mode: 'view' | 'edit';
  onModeChange: (mode: 'view' | 'edit') => void;
  initialItems?: FloorPlanItem[];
  zones?: RestaurantZone[];
  onViewQR?: (item: FloorPlanItem) => void;
  onDataMutated?: () => void;
}

// Default initial layout for realistic restaurant floor with Standard Sections
export const DEFAULT_INITIAL_ITEMS: FloorPlanItem[] = [
  // Indoor AC Seating Zone
  { id: 'tbl-1', tableNumber: '1', display_number: '1', name: 'Table 1', kind: 'table', shape: 'square', x: 80, y: 80, width: 80, height: 80, rotation: 0, seats: 4, zone_id: 'zone_indoor', zone_name: 'Indoor AC', status: 'available' },
  { id: 'tbl-2', tableNumber: '2', display_number: '2', name: 'Table 2', kind: 'table', shape: 'square', x: 220, y: 80, width: 80, height: 80, rotation: 0, seats: 4, zone_id: 'zone_indoor', zone_name: 'Indoor AC', status: 'occupied', elapsedMinutes: 28, currentGuests: 3, waiterName: 'Priya Sharma' },
  { id: 'tbl-3', tableNumber: '3', display_number: '3', name: 'Table 3', kind: 'table', shape: 'rectangle', x: 360, y: 80, width: 130, height: 80, rotation: 0, seats: 6, zone_id: 'zone_indoor', zone_name: 'Indoor AC', status: 'reserved', reservationPartyName: 'Sanjay Kapoor', reservationTime: '20:00', reservationPhone: '+91 98110 33481' },
  { id: 'tbl-4', tableNumber: '4', display_number: '4', name: 'Table 4', kind: 'table', shape: 'square', x: 80, y: 220, width: 80, height: 80, rotation: 0, seats: 4, zone_id: 'zone_indoor', zone_name: 'Indoor AC', status: 'occupied', elapsedMinutes: 42, currentGuests: 4, waiterName: 'Rahul Verma' },
  
  // VIP Seating Zone
  { 
    id: 'tbl-5-6-merged', 
    tableNumber: '5 + 6',
    display_number: '5 + 6',
    name: 'Table 5 + 6', 
    kind: 'table', 
    shape: 'rectangle', 
    x: 220, 
    y: 220, 
    width: 170, 
    height: 80, 
    rotation: 0, 
    seats: 8, 
    zone_id: 'zone_vip',
    zone_name: 'VIP',
    status: 'merged', 
    isMerged: true, 
    mergedWithIds: ['tbl-5', 'tbl-6'], 
    originalSeats: 4,
    elapsedMinutes: 31,
    currentGuests: 7,
    waiterName: 'Priya Sharma'
  },
  { id: 'tbl-7', tableNumber: '7', display_number: '7', name: 'Table 7', kind: 'table', shape: 'circle', x: 440, y: 220, width: 85, height: 85, rotation: 0, seats: 4, zone_id: 'zone_vip', zone_name: 'VIP', status: 'occupied', elapsedMinutes: 14, currentGuests: 4, waiterName: 'Amit Patel' },

  // Outdoor Seating Zone
  { id: 'tbl-8', tableNumber: '8', display_number: '8', name: 'Table 8', kind: 'table', shape: 'rectangle', x: 80, y: 360, width: 130, height: 80, rotation: 0, seats: 6, zone_id: 'zone_outdoor', zone_name: 'Outdoor', status: 'reserved', reservationPartyName: 'Dr. Ramesh Nair', reservationTime: '19:30', reservationPhone: '+91 97401 88921' },
  { id: 'tbl-9', tableNumber: '9', display_number: '9', name: 'Table 9', kind: 'table', shape: 'circle', x: 260, y: 360, width: 80, height: 80, rotation: 0, seats: 4, zone_id: 'zone_outdoor', zone_name: 'Outdoor', status: 'cleaning' },
  { id: 'tbl-10', tableNumber: '10', display_number: '10', name: 'Table 10', kind: 'table', shape: 'square', x: 380, y: 360, width: 80, height: 80, rotation: 0, seats: 4, zone_id: 'zone_outdoor', zone_name: 'Outdoor', status: 'available' },

  // Terrace Seating Zone
  { id: 'tbl-11', tableNumber: '11', display_number: '11', name: 'Table 11', kind: 'table', shape: 'booth', x: 80, y: 490, width: 110, height: 85, rotation: 0, seats: 4, zone_id: 'zone_terrace', zone_name: 'Terrace', status: 'available' },
  { id: 'tbl-12', tableNumber: '12', display_number: '12', name: 'Table 12', kind: 'table', shape: 'booth', x: 230, y: 490, width: 110, height: 85, rotation: 0, seats: 4, zone_id: 'zone_terrace', zone_name: 'Terrace', status: 'available' },

  // Right Service & Architectural Fixtures
  { id: 'furn-bar', tableNumber: '', name: 'Artisan Beverage Bar', kind: 'furniture', furnitureType: 'bar_seats', x: 620, y: 80, width: 180, height: 45, rotation: 0, seats: 5, status: 'available' },
  { id: 'furn-kitchen', tableNumber: '', name: 'Kitchen Pass', kind: 'furniture', furnitureType: 'kitchen', x: 620, y: 190, width: 180, height: 80, rotation: 0, seats: 0, status: 'available' },
  { id: 'furn-pos', tableNumber: '', name: 'Cash Counter / POS', kind: 'furniture', furnitureType: 'cash_counter', x: 620, y: 320, width: 130, height: 50, rotation: 0, seats: 0, status: 'available' },
  { id: 'furn-waiting', tableNumber: '', name: 'Guest Waiting Lounge', kind: 'furniture', furnitureType: 'waiting_area', x: 620, y: 420, width: 150, height: 75, rotation: 0, seats: 0, status: 'available' },
  { id: 'furn-door', tableNumber: '', name: 'Main Entrance', kind: 'furniture', furnitureType: 'door', x: 620, y: 530, width: 80, height: 50, rotation: 0, seats: 0, status: 'available' },
  { id: 'furn-washroom', tableNumber: '', name: 'Restrooms', kind: 'furniture', furnitureType: 'washroom', x: 440, y: 490, width: 100, height: 75, rotation: 0, seats: 0, status: 'available' }
];

export default function FloorCanvas({
  restaurantId,
  restaurantName = 'The Foody Hub',
  restaurantSlug = 'thefoodyhub',
  mode,
  onModeChange,
  initialItems,
  zones: propZones,
  onViewQR,
  onDataMutated
}: FloorCanvasProps) {
  // 1. useState declarations (Strict React Hook Order)
  const [items, setItems] = useState<FloorPlanItem[]>(() => {
    return initialItems && initialItems.length > 0 ? initialItems : DEFAULT_INITIAL_ITEMS;
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [stagePos, setStagePos] = useState<{ x: number; y: number }>({ x: 40, y: 20 });
  const [snapGrid, setSnapGrid] = useState<boolean>(true);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [activeDrawerTable, setActiveDrawerTable] = useState<FloorPlanItem | null>(null);
  const [activeQuickActionTable, setActiveQuickActionTable] = useState<FloorPlanItem | null>(null);
  const [activeQRModalTable, setActiveQRModalTable] = useState<FloorPlanItem | null>(null);
  const [activeQRDataUrl, setActiveQRDataUrl] = useState<string>('');
  const [showHeatmapModal, setShowHeatmapModal] = useState<boolean>(false);
  const [showZoneModal, setShowZoneModal] = useState<boolean>(false);
  const [zones, setZones] = useState<RestaurantZone[]>(() => {
    if (propZones && propZones.length > 0) {
      if (propZones.length === 1 && propZones[0].id === 'zone_general') {
        return STANDARD_ZONES;
      }
      return propZones;
    }
    return STANDARD_ZONES;
  });
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('all');
  const [collapsedZones, setCollapsedZones] = useState<Record<string, boolean>>({});
  const [mergeCandidatePair, setMergeCandidatePair] = useState<{ tableA: FloorPlanItem; tableB: FloorPlanItem } | null>(null);
  const [collidingId, setCollidingId] = useState<string | null>(null);
  const [guideLines, setGuideLines] = useState<GuideLine[]>([]);
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({ width: 1200, height: 650 });
  const [showMiniMap, setShowMiniMap] = useState<boolean>(false);
  const [activeOpenBillTable, setActiveOpenBillTable] = useState<FloorPlanItem | null>(null);
  const [hasUnsavedDraft, setHasUnsavedDraft] = useState<boolean>(false);
  const [draftItems, setDraftItems] = useState<FloorPlanItem[] | null>(null);
  const [showExitWarningModal, setShowExitWarningModal] = useState<boolean>(false);

  // 2. useRef declarations
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const historyManagerRef = useRef<HistoryManager>(new HistoryManager(50));
  const autoSaveEngineRef = useRef<AutoSaveEngine | null>(null);
  const originalTablesMapRef = useRef<Record<string, FloorPlanItem>>({});
  const hasUserPannedRef = useRef<boolean>(false);
  const localDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 3. useMemo declarations
  const selectedItem = useMemo(() => {
    return items.find((it) => it.id === selectedId) || null;
  }, [items, selectedId]);

  const isEditable = useMemo(() => mode === 'edit', [mode]);

  // Compute tight bounding box across all placed items
  const layoutBounds = useMemo(() => {
    if (!items || items.length === 0) {
      return { minX: 40, maxX: 820, minY: 40, maxY: 580, lowestY: 580 };
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    items.forEach((it) => {
      const x = it.x || 0;
      const y = it.y || 0;
      const w = it.width || 80;
      const h = it.height || 80;
      if (x < minX) minX = x;
      if (x + w > maxX) maxX = x + w;
      if (y < minY) minY = y;
      if (y + h > maxY) maxY = y + h;
    });

    const safeMaxY = Math.max(380, maxY);
    return {
      minX: Math.max(0, minX === Infinity ? 40 : minX),
      maxX: maxX === -Infinity ? 820 : maxX,
      minY: Math.max(0, minY === Infinity ? 40 : minY),
      maxY: safeMaxY,
      lowestY: safeMaxY
    };
  }, [items]);

  // Dynamic canvas height: tightly wrapped with only 32–48px (40px) bottom padding
  const dynamicCanvasHeight = useMemo(() => {
    return layoutBounds.lowestY + 40;
  }, [layoutBounds]);

  // Dynamic container card height wrapping the toolbar (48px) + occupancy strip (38px) + dynamic stage
  const dynamicCardHeight = useMemo(() => {
    return dynamicCanvasHeight + 86;
  }, [dynamicCanvasHeight]);

  // Executive Live Occupancy Calculations
  const occupancyStats = useMemo(() => {
    const tableItems = items.filter((it) => it.kind === 'table' && !it.is_archived);
    const total = tableItems.length;
    const occupied = tableItems.filter((it) => it.status === 'occupied').length;
    const reserved = tableItems.filter((it) => it.status === 'reserved').length;
    const available = tableItems.filter((it) => it.status === 'available').length;
    const guests = tableItems
      .filter((it) => it.status === 'occupied')
      .reduce((acc, t) => acc + (t.currentGuests || t.seats || 2), 0);
    const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    return { total, occupied, reserved, available, guests, rate };
  }, [items]);

  // Filter items by selected zone
  const visibleItems = useMemo(() => {
    if (selectedZoneFilter === 'all') {
      return items.filter((it) => {
        if (it.kind !== 'table') return true;
        if (it.is_archived) return false;
        const zoneId = it.zone_id || 'zone_indoor';
        return !collapsedZones[zoneId];
      });
    }
    return items.filter((it) => {
      if (it.kind !== 'table') return true;
      if (it.is_archived) return false;
      const zoneId = it.zone_id || 'zone_indoor';
      if (collapsedZones[zoneId]) return false;
      return zoneId === selectedZoneFilter;
    });
  }, [items, selectedZoneFilter, collapsedZones]);

  // 4. useCallback declarations
  const updateItemsWithHistory = useCallback((newItems: FloorPlanItem[]) => {
    setItems(newItems);
    historyManagerRef.current.push(newItems);
    try {
      localStorage.setItem(`cleverops_floorplan_draft_${restaurantId}`, JSON.stringify({ items: newItems, timestamp: Date.now() }));
    } catch (e) {}
    
    // 300ms Debounced Local Save + 3s AutoSave
    if (localDebounceTimerRef.current) clearTimeout(localDebounceTimerRef.current);
    setAutoSaveStatus('dirty');
    localDebounceTimerRef.current = setTimeout(() => {
      if (autoSaveEngineRef.current) {
        autoSaveEngineRef.current.flushSave(newItems);
      }
    }, 300);
  }, [restaurantId]);

  const handleManualSave = useCallback(() => {
    if (autoSaveEngineRef.current) {
      autoSaveEngineRef.current.flushSave(items);
      setAutoSaveStatus('saving');
      setTimeout(() => {
        setAutoSaveStatus('saved');
        setHasUnsavedDraft(false);
      }, 300);
    }
  }, [items]);

  const handleSelectItem = useCallback((item: FloorPlanItem, e: any) => {
    e.cancelBubble = true;
    setSelectedId(item.id);
    if (mode === 'view' && item.kind === 'table') {
      setActiveQuickActionTable(item);
    }
  }, [mode]);

  const handleStageClick = useCallback((e: any) => {
    if (e.target === e.target.getStage()) {
      setSelectedId(null);
      setActiveDrawerTable(null);
      setActiveQuickActionTable(null);
    }
  }, []);

  const handleUpdateItem = useCallback((newAttrs: Partial<FloorPlanItem>) => {
    if (!selectedId) return;
    const updated = items.map((it) => {
      if (it.id === selectedId) {
        return { ...it, ...newAttrs };
      }
      return it;
    });
    updateItemsWithHistory(updated);

    // Live sync to database for persistent table fields (P0-5)
    const targetItem = items.find((x) => x.id === selectedId);
    if (targetItem && targetItem.kind === 'table') {
      const tableDbId = targetItem.dbTableId || targetItem.id;
      if (newAttrs.zone_id) {
        db.assignTableZone(restaurantId, tableDbId, newAttrs.zone_id).catch(() => {});
      }
      if (typeof newAttrs.seats === 'number') {
        db.updateTableSeats(restaurantId, tableDbId, newAttrs.seats).catch(() => {});
      }
      if (newAttrs.display_number || newAttrs.tableNumber) {
        const num = newAttrs.display_number || newAttrs.tableNumber;
        if (num) db.renameTable(restaurantId, tableDbId, num).catch(() => {});
      }
    }
  }, [selectedId, items, restaurantId, updateItemsWithHistory]);

  const handleAddItem = useCallback((template: Partial<FloorPlanItem>) => {
    const isTable = template.kind === 'table';
    const nextNum = items.filter((it) => it.kind === 'table').length + 1;
    const newItem: FloorPlanItem = {
      id: `item_${Date.now()}`,
      tableNumber: isTable ? `${nextNum}` : '',
      display_number: isTable ? `${nextNum}` : undefined,
      name: isTable ? `Table ${nextNum}` : (template.name || 'Fixture'),
      kind: template.kind || 'table',
      shape: template.shape || 'rectangle',
      furnitureType: template.furnitureType,
      x: Math.round(-stagePos.x / scale + 150),
      y: Math.round(-stagePos.y / scale + 150),
      width: template.width || 80,
      height: template.height || 80,
      rotation: 0,
      seats: template.seats || 4,
      zone_id: selectedZoneFilter !== 'all' ? selectedZoneFilter : (zones[0]?.id || 'zone_indoor'),
      status: 'available'
    };

    const updated = [...items, newItem];
    updateItemsWithHistory(updated);
    setSelectedId(newItem.id);
  }, [items, stagePos, scale, selectedZoneFilter, zones, updateItemsWithHistory]);

  const handleDuplicateItem = useCallback((item: FloorPlanItem) => {
    const isTable = item.kind === 'table';
    const nextNum = items.filter((it) => it.kind === 'table').length + 1;
    const clone: FloorPlanItem = {
      ...JSON.parse(JSON.stringify(item)),
      id: `item_${Date.now()}`,
      tableNumber: isTable ? `${nextNum}` : '',
      display_number: isTable ? `${nextNum}` : undefined,
      name: isTable ? `Table ${nextNum}` : `${item.name} (Copy)`,
      x: item.x + 30,
      y: item.y + 30,
      isMerged: false,
      mergedWithIds: undefined
    };

    const updated = [...items, clone];
    updateItemsWithHistory(updated);
    setSelectedId(clone.id);
  }, [items, updateItemsWithHistory]);

  const handleDeleteItem = useCallback((id: string) => {
    const updated = items.filter((it) => it.id !== id);
    updateItemsWithHistory(updated);
    if (selectedId === id) setSelectedId(null);
  }, [items, selectedId, updateItemsWithHistory]);

  // Table Drag with Bounding Box Collision Detection
  const handleItemDragMove = useCallback((item: FloorPlanItem, e: any) => {
    if (!isEditable) return;
    const node = e.target;
    let newX = node.x();
    let newY = node.y();

    if (snapGrid) {
      newX = Math.round(newX / 20) * 20;
      newY = Math.round(newY / 20) * 20;
      node.position({ x: newX, y: newY });
    }

    const currentItemState: FloorPlanItem = {
      ...item,
      x: newX,
      y: newY
    };

    const collider = findCollidingTable(currentItemState, items, 15);
    if (collider) {
      setCollidingId(collider.id);
    } else {
      setCollidingId(null);
    }
  }, [isEditable, snapGrid, items]);

  const handleItemDragEnd = useCallback((item: FloorPlanItem, e: any) => {
    if (!isEditable) return;
    const node = e.target;
    const newX = snapGrid ? Math.round(node.x() / 20) * 20 : Math.round(node.x());
    const newY = snapGrid ? Math.round(node.y() / 20) * 20 : Math.round(node.y());
    node.position({ x: newX, y: newY });

    const updatedItemState: FloorPlanItem = {
      ...item,
      x: newX,
      y: newY
    };

    const collider = findCollidingTable(updatedItemState, items, 20);
    if (collider && item.kind === 'table') {
      setCollidingId(null);
      setMergeCandidatePair({ tableA: updatedItemState, tableB: collider });
      return;
    }

    setCollidingId(null);
    const updated = items.map((it) => (it.id === item.id ? updatedItemState : it));
    updateItemsWithHistory(updated);
  }, [isEditable, snapGrid, items, updateItemsWithHistory]);

  // Confirm Drag-to-Merge
  const handleConfirmMerge = useCallback(() => {
    if (!mergeCandidatePair) return;
    const { tableA, tableB } = mergeCandidatePair;

    originalTablesMapRef.current[tableA.id] = tableA;
    originalTablesMapRef.current[tableB.id] = tableB;

    const merged = mergeTables(tableA, tableB);
    const remaining = items.filter((it) => it.id !== tableA.id && it.id !== tableB.id);
    const updated = [...remaining, merged];

    updateItemsWithHistory(updated);
    setSelectedId(merged.id);
    setMergeCandidatePair(null);
  }, [mergeCandidatePair, items, updateItemsWithHistory]);

  // Split Merged Table
  const handleSplitTable = useCallback((mergedItem: FloorPlanItem) => {
    const restored = splitTable(mergedItem, originalTablesMapRef.current);
    const remaining = items.filter((it) => it.id !== mergedItem.id);
    const updated = [...remaining, ...restored];

    updateItemsWithHistory(updated);
    setSelectedId(restored[0]?.id || null);
  }, [items, updateItemsWithHistory]);

  // Undo / Redo
  const handleUndo = useCallback(() => {
    const previous = historyManagerRef.current.undo(items);
    if (previous) {
      setItems(previous);
      autoSaveEngineRef.current?.markDirty(previous);
    }
  }, [items]);

  const handleRedo = useCallback(() => {
    const next = historyManagerRef.current.redo();
    if (next) {
      setItems(next);
      autoSaveEngineRef.current?.markDirty(next);
    }
  }, []);

  // Zoom controls
  const handleZoom = useCallback((factor: number) => {
    setScale((prev) => Math.min(2.5, Math.max(0.3, Number((prev * factor).toFixed(2)))));
  }, []);

  const handleResetView = useCallback(() => {
    setScale(1);
    hasUserPannedRef.current = false;
    const containerW = containerRef.current?.clientWidth || 1000;
    const centerOffsetX = Math.max(20, Math.round((containerW - (layoutBounds.minX + layoutBounds.maxX)) / 2));
    setStagePos({ x: centerOffsetX, y: 24 });
  }, [layoutBounds]);

  // Seat Guest from Bottom Sheet
  const handleSeatGuest = useCallback((table: FloorPlanItem, guestCount: number, waiter: string) => {
    const updated = items.map((it) => {
      if (it.id === table.id) {
        return {
          ...it,
          status: 'occupied' as const,
          currentGuests: guestCount,
          waiterName: waiter,
          elapsedMinutes: 1,
          occupiedAt: new Date().toISOString()
        };
      }
      return it;
    });
    updateItemsWithHistory(updated);
    setActiveDrawerTable(null);
  }, [items, updateItemsWithHistory]);

  const handleClearTable = useCallback((table: FloorPlanItem) => {
    const updated = items.map((it) => {
      if (it.id === table.id) {
        return {
          ...it,
          status: 'available' as const,
          currentGuests: undefined,
          waiterName: undefined,
          elapsedMinutes: undefined,
          occupiedAt: undefined,
          reservationPartyName: undefined
        };
      }
      return it;
    });
    updateItemsWithHistory(updated);
    setActiveDrawerTable(null);
  }, [items, updateItemsWithHistory]);

  // Table Identity Mutation Operations
  const handleRenameTable = useCallback(async (table: FloorPlanItem, newDisplayNumber: string) => {
    const tableDbId = table.dbTableId || table.id;
    await db.renameTable(restaurantId, tableDbId, newDisplayNumber);
    const updated = items.map((it) => {
      if (it.id === table.id) {
        return {
          ...it,
          display_number: newDisplayNumber,
          tableNumber: newDisplayNumber,
          name: `Table ${newDisplayNumber}`
        };
      }
      return it;
    });
    updateItemsWithHistory(updated);
    onDataMutated?.();
  }, [restaurantId, items, updateItemsWithHistory, onDataMutated]);

  const handleChangeSeats = useCallback(async (table: FloorPlanItem, newSeats: number) => {
    const tableDbId = table.dbTableId || table.id;
    await db.updateTableSeats(restaurantId, tableDbId, newSeats);
    const updated = items.map((it) => {
      if (it.id === table.id) {
        return {
          ...it,
          seats: newSeats
        };
      }
      return it;
    });
    updateItemsWithHistory(updated);
    onDataMutated?.();
  }, [restaurantId, items, updateItemsWithHistory, onDataMutated]);

  const handleAssignWaiter = useCallback(async (table: FloorPlanItem, waiterId: string | null) => {
    const tableDbId = table.dbTableId || table.id;
    await db.assignTableWaiter(restaurantId, tableDbId, waiterId);
    const updated = items.map((it) => {
      if (it.id === table.id) {
        return {
          ...it,
          assigned_waiter_id: waiterId || undefined,
          assignment_source: waiterId ? ('manual' as const) : ('zone' as const)
        };
      }
      return it;
    });
    updateItemsWithHistory(updated);
    onDataMutated?.();
  }, [restaurantId, items, updateItemsWithHistory, onDataMutated]);

  const handleArchiveTable = useCallback(async (table: FloorPlanItem) => {
    const tableDbId = table.dbTableId || table.id;
    await db.softDeleteTable(restaurantId, tableDbId);
    const updated = items.filter((it) => it.id !== table.id);
    updateItemsWithHistory(updated);
    onDataMutated?.();
  }, [restaurantId, items, updateItemsWithHistory, onDataMutated]);

  const handleOpenQRModal = useCallback(async (table: FloorPlanItem) => {
    setActiveQRModalTable(table);
    const tableUuid = table.table_uuid || table.id;
    const directUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/menu/${restaurantSlug}/tbl/${tableUuid}`
      : `https://www.cleverops.in/menu/${restaurantSlug}/tbl/${tableUuid}`;
    try {
      const dataUrl = await generateQRDataURL(directUrl);
      setActiveQRDataUrl(dataUrl);
    } catch (err) {
      console.error('Error generating QR data url:', err);
    }
  }, [restaurantSlug]);

  const handleCreateZone = useCallback(async (name: string, defaultWaiterId?: string, color?: string) => {
    const newZone = await db.createZone(restaurantId, name, defaultWaiterId, color);
    setZones((prev) => [...prev, newZone]);
  }, [restaurantId]);

  const handleUpdateZone = useCallback(async (zoneId: string, updates: Partial<RestaurantZone>) => {
    await db.updateZone(restaurantId, zoneId, updates);
    setZones((prev) => prev.map((z) => (z.id === zoneId ? { ...z, ...updates } : z)));
  }, [restaurantId]);

  const handleDeleteZone = useCallback(async (zoneId: string) => {
    await db.deleteZone(restaurantId, zoneId);
    setZones((prev) => prev.filter((z) => z.id !== zoneId));
    if (selectedZoneFilter === zoneId) setSelectedZoneFilter('all');
  }, [restaurantId, selectedZoneFilter]);

  // 5. useEffect declarations
  // Initialize AutoSave Engine and check stored blueprint
  useEffect(() => {
    autoSaveEngineRef.current = new AutoSaveEngine(restaurantId, (status) => {
      setAutoSaveStatus(status);
    });

    const storedBlueprint = autoSaveEngineRef.current.loadStoredBlueprint();
    if (storedBlueprint && storedBlueprint.items && storedBlueprint.items.length > 0) {
      const liveItemsMap = new Map<string, FloorPlanItem>();
      (initialItems || []).forEach((it) => {
        liveItemsMap.set(it.id, it);
        if (it.tableNumber) liveItemsMap.set(it.tableNumber, it);
        if (it.name) liveItemsMap.set(it.name, it);
      });

      const merged = storedBlueprint.items.map((storedIt) => {
        if (storedIt.kind !== 'table') return storedIt;
        const live = liveItemsMap.get(storedIt.id) || liveItemsMap.get(storedIt.tableNumber) || liveItemsMap.get(storedIt.name);
        if (live) {
          return {
            ...storedIt,
            table_uuid: live.table_uuid || storedIt.table_uuid || live.id,
            display_number: live.display_number || storedIt.display_number || live.tableNumber,
            seats: live.seats || storedIt.seats || 4,
            zone_id: live.zone_id || storedIt.zone_id,
            zone_name: live.zone_name || storedIt.zone_name,
            assigned_waiter_id: live.assigned_waiter_id || storedIt.assigned_waiter_id,
            assignment_source: live.assignment_source || storedIt.assignment_source,
            service_badges: live.service_badges || storedIt.service_badges,
            status: live.status,
            dbTableId: live.dbTableId || live.id,
            qrCodeUrl: live.qrCodeUrl || storedIt.qrCodeUrl,
            elapsedMinutes: live.elapsedMinutes,
            currentGuests: live.currentGuests,
            waiterName: live.waiterName,
            reservationPartyName: live.reservationPartyName,
            reservationTime: live.reservationTime,
            reservationPhone: live.reservationPhone
          };
        }
        return storedIt;
      });

      (initialItems || []).forEach((liveIt) => {
        if (liveIt.kind === 'table') {
          const exists = merged.some((m) => m.id === liveIt.id || m.tableNumber === liveIt.tableNumber);
          if (!exists) {
            merged.push(liveIt);
          }
        }
      });

      setItems(merged);
      historyManagerRef.current.push(merged);
    } else if (initialItems && initialItems.length > 0) {
      setItems(initialItems);
      historyManagerRef.current.push(initialItems);
    } else {
      setItems(DEFAULT_INITIAL_ITEMS);
      historyManagerRef.current.push(DEFAULT_INITIAL_ITEMS);
    }

    return () => {
      autoSaveEngineRef.current?.destroy();
      if (localDebounceTimerRef.current) clearTimeout(localDebounceTimerRef.current);
    };
  }, [restaurantId, initialItems]);

  // Load Zones from DB
  useEffect(() => {
    let isMounted = true;
    async function loadZones() {
      if (!restaurantId) return;
      try {
        const zList = await db.ensureRestaurantZones(restaurantId);
        if (isMounted && zList && zList.length > 0) {
          setZones(zList);
        }
      } catch (err) {
        console.error('Error loading restaurant zones:', err);
      }
    }
    loadZones();
    return () => {
      isMounted = false;
    };
  }, [restaurantId]);

  // Track container sizing and dynamic height
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setCanvasDimensions({
          width: containerRef.current.clientWidth || 1000,
          height: dynamicCanvasHeight
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [dynamicCanvasHeight]);

  // Auto-center layout horizontally on initial load or container resize if not manually panned
  useEffect(() => {
    if (!hasUserPannedRef.current && containerRef.current) {
      const containerW = containerRef.current.clientWidth || 1000;
      const centerOffsetX = Math.max(20, Math.round((containerW - (layoutBounds.minX + layoutBounds.maxX)) / 2));
      setStagePos({ x: centerOffsetX, y: 24 });
    }
  }, [canvasDimensions.width, layoutBounds.minX, layoutBounds.maxX]);

  // Check localStorage for unsaved draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`cleverops_floorplan_draft_${restaurantId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
          if (parsed.timestamp && Date.now() - parsed.timestamp < 7 * 24 * 3600 * 1000) {
            setDraftItems(parsed.items);
            setHasUnsavedDraft(true);
          }
        }
      }
    } catch (e) {}
  }, [restaurantId]);

  // Sync Zones from props or DB
  useEffect(() => {
    if (propZones && propZones.length > 0) {
      if (propZones.length === 1 && propZones[0].id === 'zone_general') {
        setZones(STANDARD_ZONES);
      } else {
        setZones(propZones);
      }
    } else if (restaurantId) {
      db.getZones(restaurantId)
        .then((z) => {
          if (z && z.length > 0) {
            if (z.length === 1 && z[0].id === 'zone_general') {
              setZones(STANDARD_ZONES);
            } else {
              setZones(z);
            }
          }
        })
        .catch(() => {});
    }
  }, [propZones, restaurantId]);

  // Keyboard Shortcuts: Ctrl+Z (Undo), Ctrl+Shift+Z / Ctrl+Y (Redo), Ctrl+S (Save Layout)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleManualSave();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const tag = (document.activeElement as HTMLElement)?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && selectedId && isEditable) {
          handleDeleteItem(selectedId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, selectedId, isEditable, handleDeleteItem, handleManualSave]);

  return (
    <div
      className="flex flex-col bg-[#F8F8F6] rounded-xl border border-[#E7E5E4] overflow-hidden shadow-xs transition-all duration-300"
      style={{ height: `${dynamicCardHeight}px`, minHeight: '520px' }}
    >
      {/* Top Toolbar */}
      <div className="h-12 bg-white border-b border-[#E7E5E4] px-4 flex items-center justify-between select-none z-10 shrink-0">
        {/* Left: Mode Switcher & Title */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-[#F5F5F4] p-0.5 rounded-lg border border-[#E7E5E4]">
            <button
              type="button"
              onClick={() => {
                if (mode === 'edit' && autoSaveStatus === 'dirty') {
                  setShowExitWarningModal(true);
                } else {
                  onModeChange('view');
                }
              }}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                mode === 'view'
                  ? 'bg-white text-[#171717] shadow-xs'
                  : 'text-[#737373] hover:text-[#171717]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Floor</span>
            </button>
            <button
              type="button"
              onClick={() => onModeChange('edit')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                mode === 'edit'
                  ? 'bg-white text-[#171717] shadow-xs'
                  : 'text-[#737373] hover:text-[#171717]'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Blueprint</span>
            </button>
          </div>

          <div className="h-4 w-px bg-[#E7E5E4]" />

          {/* AutoSave & Dirty State Badges */}
          <div className="flex items-center space-x-2 text-[10px] font-semibold">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Auto Save: On
            </span>
            {autoSaveStatus === 'dirty' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                Unsaved Changes
              </span>
            )}
          </div>
        </div>

        {/* Right: Canvas Controls */}
        <div className="flex items-center space-x-1.5">
          {isEditable && (
            <>
              {/* Save Blueprint Button */}
              <button
                type="button"
                onClick={handleManualSave}
                className="flex items-center gap-1.5 px-3 py-1 bg-stone-900 hover:bg-black text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer mr-1"
                title="Save Blueprint Layout (Ctrl+S)"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Layout</span>
              </button>

              {/* Exit Blueprint Button */}
              <button
                type="button"
                onClick={() => {
                  if (autoSaveStatus === 'dirty') {
                    setShowExitWarningModal(true);
                  } else {
                    onModeChange('view');
                  }
                }}
                className="px-2.5 py-1 text-stone-600 hover:text-stone-900 border border-stone-200 rounded-lg text-xs font-semibold hover:bg-stone-50 cursor-pointer mr-1"
              >
                Cancel
              </button>

              {/* Undo / Redo */}
              <button
                type="button"
                onClick={handleUndo}
                className="p-1.5 text-[#525252] hover:text-[#171717] hover:bg-[#F5F5F4] rounded-md transition-colors cursor-pointer"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                className="p-1.5 text-[#525252] hover:text-[#171717] hover:bg-[#F5F5F4] rounded-md transition-colors cursor-pointer"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-[#E7E5E4] mx-1" />

              {/* Snap to Grid Toggle */}
              <button
                type="button"
                onClick={() => setSnapGrid(!snapGrid)}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  snapGrid
                    ? 'bg-[#171717] text-white'
                    : 'text-[#525252] hover:text-[#171717] hover:bg-[#F5F5F4]'
                }`}
                title="Toggle Snap to Grid (20px)"
              >
                <Grid className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Zoom controls */}
          <button
            type="button"
            onClick={() => handleZoom(1.15)}
            className="p-1.5 text-[#525252] hover:text-[#171717] hover:bg-[#F5F5F4] rounded-md transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-bold text-[#171717] w-10 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => handleZoom(0.85)}
            className="p-1.5 text-[#525252] hover:text-[#171717] hover:bg-[#F5F5F4] rounded-md transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="p-1.5 text-[#525252] hover:text-[#171717] hover:bg-[#F5F5F4] rounded-md transition-colors cursor-pointer"
            title="Reset View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Draft Recovery Banner */}
      {hasUnsavedDraft && draftItems && (
        <div className="bg-stone-900 text-white px-4 py-2 flex items-center justify-between text-xs z-20 shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>Unsaved floor plan draft detected from your previous session.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setItems(draftItems);
                historyManagerRef.current.push(draftItems);
                setHasUnsavedDraft(false);
              }}
              className="px-2.5 py-1 bg-white text-stone-900 rounded font-bold hover:bg-stone-100 cursor-pointer text-xs"
            >
              Restore Last Draft
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem(`cleverops_floorplan_draft_${restaurantId}`);
                } catch (e) {}
                setHasUnsavedDraft(false);
              }}
              className="px-2 py-1 text-stone-400 hover:text-white cursor-pointer text-xs"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Live Occupancy Strip & Zone Toolbar */}
      <div className="bg-[#FAF9F6] border-b border-[#E7E5E4] px-4 py-2 flex flex-wrap items-center justify-between text-xs text-[#171717] select-none gap-2 shrink-0">
        {/* Left: OpenTable Occupancy Breakdown */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="font-bold text-[#171717]">{occupancyStats.total}</span>
            <span className="text-[#737373]">Tables</span>
          </div>
          <span className="text-[#D6D3D1]">&bull;</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="font-bold text-[#171717]">{occupancyStats.occupied}</span>
            <span className="text-[#737373]">Occupied ({occupancyStats.guests} guests)</span>
          </div>
          <span className="text-[#D6D3D1]">&bull;</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="font-bold text-[#171717]">{occupancyStats.reserved}</span>
            <span className="text-[#737373]">Reserved</span>
          </div>
          <span className="text-[#D6D3D1]">&bull;</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-bold text-[#171717]">{occupancyStats.available}</span>
            <span className="text-[#737373]">Available</span>
          </div>
          <span className="text-[#D6D3D1]">&bull;</span>
          <div className="text-[11px] text-[#737373]">
            Occupancy: <strong className="text-[#171717]">{occupancyStats.rate}%</strong>
          </div>
        </div>

        {/* Right: Zone Filter Tabs & Waiter Heatmap Trigger */}
        <div className="flex items-center space-x-2">
          {/* Zone Filter Tabs (P0-8 OpenTable Executive Styling) */}
          <div className="flex items-center bg-white p-0.5 rounded-lg border border-[#E7E5E4] text-[11px] gap-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setSelectedZoneFilter('all')}
              className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                selectedZoneFilter === 'all'
                  ? 'bg-[#171717] text-white shadow-2xs'
                  : 'text-[#525252] hover:text-[#171717] hover:bg-[#F5F5F4]'
              }`}
            >
              All
            </button>
            {zones.map((z) => {
              const isSelected = selectedZoneFilter === z.id || ((selectedZoneFilter === 'general' || selectedZoneFilter === 'zone_general') && (z.id === 'general' || z.id === 'zone_general'));
              return (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setSelectedZoneFilter(z.id)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center space-x-1.5 cursor-pointer border ${
                    isSelected
                      ? 'bg-[#171717] text-white border-[#171717] shadow-2xs'
                      : 'bg-stone-50/70 text-[#171717] border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: z.color || '#10B981' }} />
                  <span>{z.name}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowZoneModal(true)}
              className="px-2 py-1 text-stone-500 hover:text-stone-900 font-bold border-l border-stone-200 ml-0.5 cursor-pointer"
              title="Manage Restaurant Zones"
            >
              +
            </button>
          </div>

          {/* Waiter Heatmap Button */}
          <button
            type="button"
            onClick={() => setShowHeatmapModal(true)}
            className="px-2.5 py-1 bg-white hover:bg-stone-50 border border-[#E7E5E4] rounded-lg text-[11px] font-semibold text-[#171717] flex items-center space-x-1 shadow-2xs cursor-pointer transition-colors"
            title="Open Waiter Workload Heatmap"
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#171717]" />
            <span>Heatmap</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Toolbox (Edit Mode Only) */}
        {isEditable && <Toolbox onAddItem={handleAddItem} />}

        {/* Center Konva Stage Canvas */}
        <div
          ref={containerRef}
          className="flex-1 h-full overflow-hidden bg-[#F8F8F6] relative cursor-grab active:cursor-grabbing"
        >
          <Stage
            ref={stageRef}
            width={canvasDimensions.width}
            height={dynamicCanvasHeight}
            scaleX={scale}
            scaleY={scale}
            x={stagePos.x}
            y={stagePos.y}
            draggable={true}
            onDragEnd={(e) => {
              if (e.target === e.target.getStage()) {
                hasUserPannedRef.current = true;
                setStagePos({ x: e.target.x(), y: e.target.y() });
              }
            }}
            onClick={handleStageClick}
            onTap={handleStageClick}
          >
            {/* 1. Grid Background Layer */}
            <GridLayer
              width={2600}
              height={1800}
              gridSize={20}
              showGrid={isEditable}
            />

            {/* 2. Alignment Guide Layer */}
            <SnapGuide guides={guideLines} />

            {/* 3. Items Layer: Furniture & Tables */}
            <Layer>
              {/* Furniture Fixtures */}
              {visibleItems
                .filter((it) => it.kind === 'furniture')
                .map((furn) => (
                  <FurnitureNode
                    key={furn.id}
                    item={furn}
                    isSelected={selectedId === furn.id}
                    isEditable={isEditable}
                    onSelect={handleSelectItem}
                    onChange={(newAttrs) => {
                      const updated = items.map((it) =>
                        it.id === furn.id ? { ...it, ...newAttrs } : it
                      );
                      updateItemsWithHistory(updated);
                    }}
                    onDragEnd={(e) => handleItemDragEnd(furn, e)}
                  />
                ))}

              {/* Seating Tables */}
              {visibleItems
                .filter((it) => it.kind === 'table')
                .map((table) => (
                  <TableNode
                    key={table.id}
                    item={table}
                    isSelected={selectedId === table.id}
                    isColliding={collidingId === table.id}
                    isEditable={isEditable}
                    onSelect={handleSelectItem}
                    onChange={(newAttrs) => {
                      const updated = items.map((it) =>
                        it.id === table.id ? { ...it, ...newAttrs } : it
                      );
                      updateItemsWithHistory(updated);
                    }}
                    onDragMove={(e) => handleItemDragMove(table, e)}
                    onDragEnd={(e) => handleItemDragEnd(table, e)}
                  />
                ))}

              {/* 4. Konva Transformer Selection Box (Edit Mode) */}
              <SelectionBox
                selectedId={selectedId}
                isEditable={isEditable}
                onTransformEnd={(newAttrs) => handleUpdateItem(newAttrs)}
              />
            </Layer>
          </Stage>

          {/* Mini Map Navigator */}
          <div className="absolute bottom-3 right-3 z-10 flex flex-col items-end">
            {showMiniMap ? (
              <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-[#E7E5E4] dark:border-stone-800 rounded-lg shadow-md p-2 w-44 h-32 flex flex-col justify-between select-none">
                <div className="flex items-center justify-between text-[10px] font-bold text-stone-500 dark:text-stone-400 pb-1 border-b border-stone-100 dark:border-stone-800">
                  <span>Navigator</span>
                  <button
                    type="button"
                    onClick={() => setShowMiniMap(false)}
                    className="hover:text-stone-900 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="relative flex-1 bg-stone-50 dark:bg-stone-950 rounded border border-stone-200 dark:border-stone-800 my-1 overflow-hidden">
                  {items.map((it) => {
                    const scaleFactor = 140 / Math.max(900, layoutBounds.maxX + 40);
                    const miniX = (it.x || 0) * scaleFactor;
                    const miniY = (it.y || 0) * (70 / Math.max(500, layoutBounds.maxY + 40));
                    const miniW = Math.max(4, (it.width || 80) * scaleFactor);
                    const miniH = Math.max(3, (it.height || 80) * (70 / Math.max(500, layoutBounds.maxY + 40)));
                    return (
                      <div
                        key={`mini_${it.id}`}
                        className={`absolute rounded-xs ${
                          it.kind === 'table' ? (it.status === 'occupied' ? 'bg-stone-900' : 'bg-stone-400') : 'bg-stone-300'
                        }`}
                        style={{
                          left: `${miniX}px`,
                          top: `${miniY}px`,
                          width: `${miniW}px`,
                          height: `${miniH}px`
                        }}
                      />
                    );
                  })}
                </div>
                <span className="text-[9px] text-stone-400 text-center">
                  {items.filter((it) => it.kind === 'table').length} tables • 100% zoom
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowMiniMap(true)}
                className="bg-white hover:bg-stone-50 text-stone-600 hover:text-stone-900 border border-[#E7E5E4] rounded-md px-2 py-1 text-[11px] font-semibold shadow-xs flex items-center gap-1 cursor-pointer transition-all"
                title="Open Mini Map Navigator"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Map</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Property Inspector Panel (Edit Mode) */}
        {isEditable && (
          <PropertyPanel
            item={selectedItem}
            existingItems={items}
            zones={zones}
            onUpdate={handleUpdateItem}
            onDuplicate={handleDuplicateItem}
            onDelete={handleDeleteItem}
            onSplit={handleSplitTable}
            onClose={() => setSelectedId(null)}
            onViewQR={(t) => handleOpenQRModal(t)}
          />
        )}
      </div>

      {/* Proximity Drag-to-Merge Popup Modal */}
      <MergePromptModal
        tableA={mergeCandidatePair?.tableA || null}
        tableB={mergeCandidatePair?.tableB || null}
        onConfirm={handleConfirmMerge}
        onCancel={() => setMergeCandidatePair(null)}
      />

      {/* Table Quick Actions Popover (View Mode Instant Table Click) */}
      <TableQuickActionPopover
        table={activeQuickActionTable}
        isOpen={Boolean(activeQuickActionTable && mode === 'view')}
        onClose={() => setActiveQuickActionTable(null)}
        onSeatGuest={(t) => setActiveDrawerTable(t)}
        onViewQR={(t) => handleOpenQRModal(t)}
        onPrintQR={(t) => handleOpenQRModal(t)}
        onRenameTable={handleRenameTable}
        onChangeSeats={handleChangeSeats}
        onAssignWaiter={handleAssignWaiter}
        onMergeTable={(t) => {
          onModeChange('edit');
          setSelectedId(t.id);
        }}
        onArchiveTable={handleArchiveTable}
        onDuplicateTable={handleDuplicateItem}
        onOpenBill={(t) => setActiveOpenBillTable(t)}
      />

      {/* Open Bills Drawer */}
      <OpenBillsDrawer
        table={activeOpenBillTable}
        isOpen={Boolean(activeOpenBillTable && mode === 'view')}
        onClose={() => setActiveOpenBillTable(null)}
        onSettleBill={(t) => handleClearTable(t)}
      />

      {/* Exit Warning Modal */}
      {showExitWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 max-w-sm w-full space-y-4 shadow-xl text-stone-900 dark:text-stone-100">
            <h3 className="font-bold text-sm">Unsaved Blueprint Changes</h3>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              You have unsaved adjustments to your restaurant blueprint. Would you like to save before exiting?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowExitWarningModal(false);
                  onModeChange('view');
                }}
                className="px-3 py-1.5 text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white font-semibold rounded-lg cursor-pointer"
              >
                Discard &amp; Exit
              </button>
              <button
                type="button"
                onClick={() => {
                  handleManualSave();
                  setShowExitWarningModal(false);
                  onModeChange('view');
                }}
                className="px-3.5 py-1.5 text-xs bg-stone-900 hover:bg-black dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 font-bold rounded-lg cursor-pointer"
              >
                Save &amp; Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent QR Modal Popover */}
      <TableQRPopover
        table={activeQRModalTable}
        restaurantSlug={restaurantSlug}
        restaurantName={restaurantName}
        qrDataUrl={activeQRDataUrl}
        isOpen={Boolean(activeQRModalTable)}
        onClose={() => setActiveQRModalTable(null)}
      />

      {/* Waiter Workload Heatmap Modal */}
      <WaiterHeatmapModal
        isOpen={showHeatmapModal}
        onClose={() => setShowHeatmapModal(false)}
        items={items}
      />

      {/* Restaurant Zones Manager Modal */}
      <ZoneManagerModal
        isOpen={showZoneModal}
        onClose={() => setShowZoneModal(false)}
        zones={zones}
        onCreateZone={handleCreateZone}
        onUpdateZone={handleUpdateZone}
        onDeleteZone={handleDeleteZone}
      />

      {/* Operational Seat Guest Drawer (View Mode) */}
      <SeatGuestDrawer
        table={activeDrawerTable}
        isOpen={Boolean(activeDrawerTable && mode === 'view')}
        onClose={() => setActiveDrawerTable(null)}
        onSeatGuest={handleSeatGuest}
        onClearTable={handleClearTable}
        onViewQR={(t) => handleOpenQRModal(t)}
        onOpenReservation={(t) => {
          const updated = items.map((it) =>
            it.id === t.id
              ? {
                  ...it,
                  status: 'reserved' as const,
                  reservationPartyName: 'Scheduled Guest',
                  reservationTime: '20:30'
                }
              : it
          );
          updateItemsWithHistory(updated);
          setActiveDrawerTable(null);
        }}
        onOpenTakeaway={() => {
          setActiveDrawerTable(null);
          alert('Takeaway order initialized in dedicated Takeaway lane (does not occupy table).');
        }}
        onMergeRequest={(t) => {
          setActiveDrawerTable(null);
          onModeChange('edit');
          setSelectedId(t.id);
        }}
      />
    </div>
  );
}
