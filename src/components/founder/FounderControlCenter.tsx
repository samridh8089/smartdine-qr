'use client';

/**
 * Phase-19: Founder Control Center — Main Shell
 * Routes between Live | Replay | System | Debug modes.
 * Session-persistent mode state.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  RotateCcw,
  PauseCircle,
  Network,
  Bug,
  Wifi,
  WifiOff,
  Zap,
  LogOut,
  HelpCircle,
  BookOpen,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Command,
  CheckCircle2,
  Sun,
  Moon,
} from 'lucide-react';
import { useFounderLiveSync } from '@/hooks/useFounderLiveSync';
import LiveMode from './LiveMode';
import ReplayMode from './ReplayMode';
import FreezeMode from './FreezeMode';
import SystemMode from './SystemMode';
import DebugMode from './DebugMode';
import OrderInvestigationBar, { InvestigatedOrder } from './OrderInvestigationBar';
import CommandPalette from './CommandPalette';
import LiveErrorToast from './LiveErrorToast';
import ErrorCenterPanel from './ErrorCenterPanel';
import { INITIAL_DEMO_ERROR, RESOLVED_ERRORS_SEED, createSimulatedRuntimeError } from './demoErrors';
import type { FounderMode, SystemErrorItem, SystemEvent } from './types';

interface FounderControlCenterProps {
  restaurantId: string;
  profile: { role?: string; full_name?: string; email?: string } | null;
}

const WALKTHROUGH_STEPS = [
  {
    step: 1,
    id: 'live',
    title: 'Live Mode & Workflow Graph',
    subtitle: 'N8N-style workflow graph with real-time reactive order pulses',
    icon: Activity,
    iconColor: 'text-sky-400',
    description: 'Visualizes active orders moving from QR scan through Kitchen prep to Billing. Nodes pulse with cyan electric waves, carry bouncing event badges, and display live ETA tickers.',
    shortcut: 'L',
    actionLabel: 'Switch to Live Mode',
    targetMode: 'live' as FounderMode,
  },
  {
    step: 2,
    id: 'twin',
    title: 'Floor Digital Twin',
    subtitle: 'CCTV-style restaurant floor cards with zero clutter',
    icon: Sparkles,
    iconColor: 'text-emerald-400',
    description: 'Occupied cards highlight table number, live status pill, item count, bill amount, kitchen ETA, and assigned waiter. Available tables show seats and clean 3-dot menus for QR & History.',
    shortcut: 'Esc / Click',
    actionLabel: 'Inspect Digital Twin',
    targetMode: 'live' as FounderMode,
  },
  {
    step: 3,
    id: 'replay',
    title: 'CCTV Replay Mode',
    subtitle: 'Historical event scrubber with instant 1-click playback',
    icon: RotateCcw,
    iconColor: 'text-indigo-400',
    description: 'Auto-loads historical events with dynamic event counts. Features 1x, 2x, 5x playback speeds, stage banners, and smooth camera following for complete historical forensics.',
    shortcut: 'R / Space',
    actionLabel: 'Switch to Replay Mode',
    targetMode: 'replay' as FounderMode,
  },
  {
    step: 4,
    id: 'freeze',
    title: 'Freeze Frame & Ghost Mode',
    subtitle: 'Zero-latency pause state with ghost stage comparison',
    icon: PauseCircle,
    iconColor: 'text-cyan-400',
    description: 'Freezes incoming telemetry to inspect past timestamps. Renders future stages as 25% opacity ghost nodes and computes instant deltas between frozen state and live floor.',
    shortcut: 'F',
    actionLabel: 'Switch to Freeze Mode',
    targetMode: 'freeze' as FounderMode,
  },
  {
    step: 5,
    id: 'investigation',
    title: 'Global Order Investigation',
    subtitle: 'One-click full lifecycle reconstruction across all subsystems',
    icon: Zap,
    iconColor: 'text-amber-400',
    description: 'Search any order by ID, Table, Waiter, or Date. Instantly reconstructs an 11-step audit trail and highlights the exact order synchronously across Floor, Timeline, Inspector, and Flight Recorder.',
    shortcut: 'Type in Search bar',
    actionLabel: 'Open Live View to Search',
    targetMode: 'live' as FounderMode,
  },
  {
    step: 6,
    id: 'reports',
    title: 'Executive Operations Reports & Telemetry',
    subtitle: 'Live KPIs, staff leaderboards, and instant customer call resolution',
    icon: Network,
    iconColor: 'text-purple-400',
    description: 'Always-populated executive operational summary featuring Real-time Revenue, Orders, Prep Times, and Staff Performance. Includes actionable dispatch and resolve triggers for customer calls.',
    shortcut: 'Click Reports node',
    actionLabel: 'Open Inspector Telemetry',
    targetMode: 'live' as FounderMode,
  },
];

const MODE_CONFIG: Array<{ id: FounderMode; label: string; icon: typeof Activity }> = [
  { id: 'live',   label: 'Live',   icon: Activity },
  { id: 'replay', label: 'Replay', icon: RotateCcw },
  { id: 'freeze', label: 'Freeze', icon: PauseCircle },
  { id: 'system', label: 'System', icon: Network },
  { id: 'debug',  label: 'Debug',  icon: Bug },
];

function readSavedMode(): FounderMode {
  if (typeof window === 'undefined') return 'live';
  const tab = sessionStorage.getItem('founder_active_tab');
  if (tab && ['live', 'replay', 'freeze', 'system', 'debug'].includes(tab)) {
    return tab as FounderMode;
  }
  return 'live';
}

export default function FounderControlCenter({ restaurantId, profile }: FounderControlCenterProps) {
  // ─── All hooks FIRST (React Hook Safety Rule) ────────────────────────────
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<FounderMode>(readSavedMode);
  const [followingOrderId, setFollowingOrderId] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const [helpStep, setHelpStep] = useState<number>(0);
  const [recorderEnabled, setRecorderEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('founder_recorder_enabled') !== 'false';
  });
  const [recorderMode, setRecorderMode] = useState<'production' | 'test'>(() => {
    if (typeof window === 'undefined') return 'production';
    return (localStorage.getItem('founder_recorder_mode') as 'production' | 'test') || 'production';
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem('founder_theme') as 'dark' | 'light') || 'dark';
  });
  const [confirmExitOpen, setConfirmExitOpen] = useState<boolean>(false);
  const [investigatedOrder, setInvestigatedOrder] = useState<InvestigatedOrder | null>(null);
  const [replayTargetOrder, setReplayTargetOrder] = useState<InvestigatedOrder | null>(null);
  const [freezeTargetTimestamp, setFreezeTargetTimestamp] = useState<number | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [systemErrors, setSystemErrors] = useState<SystemErrorItem[]>([]);
  const [activeError, setActiveError] = useState<SystemErrorItem | null>(null);
  const [selectedErrorId, setSelectedErrorId] = useState<string | null>(null);
  const [errorCenterOpen, setErrorCenterOpen] = useState<boolean>(false);
  const [isRetryingError, setIsRetryingError] = useState<boolean>(false);
  const [isResolvedError, setIsResolvedError] = useState<boolean>(false);
  const [errorEvents, setErrorEvents] = useState<SystemEvent[]>([]);
  const [investorDemoRunning, setInvestorDemoRunning] = useState<boolean>(false);
  const [investorDemoStep, setInvestorDemoStep] = useState<string>('');

  // ─── 2. useRef ───────────────────────────────────────────────────────────
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const {
    activeOrders,
    tables,
    events,
    orderDots,
    stats,
    isConnected,
    connectionStatus,
    totalEventCount,
    refresh,
  } = useFounderLiveSync({
    restaurantId,
    enabled: true,
  });

  // ─── 3. useMemo ──────────────────────────────────────────────────────────
  const activeErrorCount = useMemo(() => {
    return systemErrors.filter((e) => e.status === 'active' || e.status === 'retrying').length;
  }, [systemErrors]);

  const combinedEvents = useMemo(() => {
    return [...errorEvents, ...events];
  }, [errorEvents, events]);

  const statusColor = useMemo(() => {
    if (connectionStatus === 'connected') return 'text-emerald-400';
    if (connectionStatus === 'connecting') return 'text-amber-400';
    return 'text-rose-400';
  }, [connectionStatus]);

  const statusLabel = useMemo(() => {
    if (connectionStatus === 'connected') return 'Live';
    if (connectionStatus === 'connecting') return 'Connecting';
    if (connectionStatus === 'error') return 'Error';
    return 'Offline';
  }, [connectionStatus]);

  const handleModeChange = useCallback((mode: FounderMode) => {
    setActiveMode(mode);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('founder_active_tab', mode);
    }
  }, []);

  const handleFollowOrder = useCallback((id: string | null) => {
    setFollowingOrderId(id);
  }, []);

  const handleToggleRecorder = useCallback(() => {
    setRecorderEnabled(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('founder_recorder_enabled', next ? 'true' : 'false');
      }
      return next;
    });
  }, []);

  const handleSetRecorderMode = useCallback((mode: 'production' | 'test') => {
    setRecorderMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('founder_recorder_mode', mode);
    }
  }, []);

  const handleToggleHelp = useCallback(() => {
    setHelpOpen((prev) => !prev);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem('founder_theme', next);
      }
      return next;
    });
  }, []);

  const handleSetTheme = useCallback((newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('founder_theme', newTheme);
    }
  }, []);

  const handleExitFounderMode = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('founder_mode');
      sessionStorage.removeItem('founder_active_tab');
    }
    router.push('/dashboard');
  }, [router]);

  const handleSelectInvestigationOrder = useCallback((order: InvestigatedOrder) => {
    setInvestigatedOrder(order);
    setFollowingOrderId(order.id);
  }, []);

  const handleCloseInvestigationDrawer = useCallback(() => {
    setInvestigatedOrder(null);
  }, []);

  const handleReplayOrder = useCallback((order: InvestigatedOrder) => {
    setReplayTargetOrder(order);
    handleModeChange('replay');
  }, [handleModeChange]);

  const handleFreezeMoment = useCallback((timestampMs: number, order: InvestigatedOrder) => {
    setFreezeTargetTimestamp(timestampMs);
    handleModeChange('freeze');
  }, [handleModeChange]);

  const handleOpenTimeline = useCallback((orderId: string, correlationId: string) => {
    setFollowingOrderId(orderId);
    handleModeChange('live');
  }, [handleModeChange]);

  const handleOpenLiveOrder = useCallback((order: InvestigatedOrder) => {
    setFollowingOrderId(order.id);
    handleModeChange('live');
  }, [handleModeChange]);

  const handleSelectTableFromPalette = useCallback((tableName: string) => {
    handleModeChange('live');
  }, [handleModeChange]);

  const handleRetrySync = useCallback((errItem?: SystemErrorItem) => {
    setIsRetryingError(true);
    setSystemErrors((prev) =>
      prev.map((e) => (e.id === (errItem?.id || 'ERR-0007') ? { ...e, status: 'retrying' as const } : e))
    );

    const retryEvent: SystemEvent = {
      id: `ev_retry_${Date.now()}`,
      restaurant_id: restaurantId,
      correlation_id: errItem?.correlationId || 'corr_A7K-26D00002_err',
      order_id: errItem?.orderId || 'A7K-26D00002',
      actor_type: 'system',
      event_type: 'retry_started',
      source_node: 'kitchen_queue',
      target_node: 'preparing',
      duration_ms: 800,
      metadata: { attempt: '1/3', action: 'retry_kitchen_sync', table: 'Table 12' },
      created_at: new Date().toISOString(),
    };
    setErrorEvents((prev) => [retryEvent, ...prev]);

    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => {
      setIsRetryingError(false);
      setIsResolvedError(true);

      const restoredEvent: SystemEvent = {
        id: `ev_restored_${Date.now()}`,
        restaurant_id: restaurantId,
        correlation_id: errItem?.correlationId || 'corr_A7K-26D00002_err',
        order_id: errItem?.orderId || 'A7K-26D00002',
        actor_type: 'system',
        event_type: 'sync_restored',
        source_node: 'kitchen_queue',
        target_node: 'preparing',
        duration_ms: 120,
        metadata: { http_status: '200 OK', connection: 'restored', table: 'Table 12' },
        created_at: new Date().toISOString(),
      };

      const resumedEvent: SystemEvent = {
        id: `ev_resumed_${Date.now() + 1}`,
        restaurant_id: restaurantId,
        correlation_id: errItem?.correlationId || 'corr_A7K-26D00002_err',
        order_id: errItem?.orderId || 'A7K-26D00002',
        actor_type: 'kitchen',
        event_type: 'order_preparing_resumed',
        source_node: 'kitchen_queue',
        target_node: 'preparing',
        duration_ms: 450,
        metadata: { status: 'preparing_active', table: 'Table 12' },
        created_at: new Date().toISOString(),
      };

      setErrorEvents((prev) => [resumedEvent, restoredEvent, ...prev]);
      setSystemErrors((prev) =>
        prev.map((e) =>
          e.id === (errItem?.id || 'ERR-0007')
            ? { ...e, status: 'resolved' as const, httpStatus: '200 OK (Recovered)' }
            : e
        )
      );

      // Auto-resolve activeError state after green feedback
      setTimeout(() => {
        setActiveError(null);
        setIsResolvedError(false);
      }, 3500);
    }, 800);
  }, [restaurantId]);

  const handleRequeueKitchen = useCallback((errItem: SystemErrorItem) => {
    setIsRetryingError(true);
    const requeueEv: SystemEvent = {
      id: `ev_requeue_${Date.now()}`,
      restaurant_id: restaurantId,
      correlation_id: errItem.correlationId,
      order_id: errItem.orderId,
      actor_type: 'kitchen',
      event_type: 'order_accepted',
      source_node: 'kitchen_queue',
      target_node: 'preparing',
      duration_ms: 320,
      metadata: { action: 'requeued_kds_station_1', order_id: errItem.orderId, table: errItem.tableName },
      created_at: new Date().toISOString(),
    };
    setErrorEvents((prev) => [requeueEv, ...prev]);
    setTimeout(() => {
      setIsRetryingError(false);
    }, 600);
  }, [restaurantId]);

  const handleNotifyWaiter = useCallback((errItem: SystemErrorItem) => {
    const waiterEv: SystemEvent = {
      id: `ev_waiter_alert_${Date.now()}`,
      restaurant_id: restaurantId,
      correlation_id: errItem.correlationId,
      order_id: errItem.orderId,
      actor_type: 'staff',
      event_type: 'waiter_assigned',
      source_node: 'customer_calls',
      target_node: 'waiter_assigned',
      duration_ms: 140,
      metadata: { alert: `Priority service check for ${errItem.tableName}`, waiter_name: 'Neha Patel' },
      created_at: new Date().toISOString(),
    };
    setErrorEvents((prev) => [waiterEv, ...prev]);
  }, [restaurantId]);

  const handleNotifyOwner = useCallback((errItem: SystemErrorItem) => {
    const ownerEv: SystemEvent = {
      id: `ev_owner_push_${Date.now()}`,
      restaurant_id: restaurantId,
      correlation_id: errItem.correlationId,
      order_id: errItem.orderId,
      actor_type: 'system',
      event_type: 'push_sent',
      source_node: 'push_notifications',
      target_node: 'reports',
      duration_ms: 210,
      metadata: { priority: 'URGENT', title: `Outage Escalation: ${errItem.title}`, table: errItem.tableName },
      created_at: new Date().toISOString(),
    };
    setErrorEvents((prev) => [ownerEv, ...prev]);
  }, [restaurantId]);

  const handleViewLogs = useCallback((errItem: SystemErrorItem) => {
    const auditEv: SystemEvent = {
      id: `ev_audit_${Date.now()}`,
      restaurant_id: restaurantId,
      correlation_id: errItem.correlationId,
      order_id: errItem.orderId,
      actor_type: 'system',
      event_type: 'audit_written',
      source_node: 'audit_logs',
      target_node: 'reports',
      duration_ms: 45,
      metadata: { audit_trail: `Forensic audit trail inspected for ${errItem.correlationId}` },
      created_at: new Date().toISOString(),
    };
    setErrorEvents((prev) => [auditEv, ...prev]);
    setErrorCenterOpen(false);
    setFollowingOrderId(errItem.orderId);
    handleModeChange('live');
  }, [restaurantId, handleModeChange]);

  const handleSimulateError = useCallback(() => {
    const simErr = createSimulatedRuntimeError();
    setActiveError(simErr);
    setSelectedErrorId(simErr.id);
    setIsRetryingError(false);
    setIsResolvedError(false);
    setSystemErrors([simErr]);

    const simEvent: SystemEvent = {
      id: `ev_sim_${Date.now()}`,
      restaurant_id: restaurantId,
      correlation_id: simErr.correlationId,
      order_id: simErr.orderId,
      actor_type: 'kitchen',
      event_type: 'kitchen_timeout',
      source_node: 'kitchen_queue',
      target_node: 'preparing',
      duration_ms: 12450,
      metadata: { error: '504 Gateway Timeout', table: simErr.tableName },
      created_at: new Date().toISOString(),
    };
    setErrorEvents((prev) => [simEvent, ...prev]);
  }, [restaurantId]);

  // 60-Second Investor Demo Automated Walkthrough (P3)
  const startInvestorDemo = useCallback(() => {
    demoTimersRef.current.forEach(clearTimeout);
    demoTimersRef.current = [];

    setInvestorDemoRunning(true);
    setInvestorDemoStep('Initiating 60s Investor Walkthrough...');
    handleModeChange('live');

    const scheduleStep = (delay: number, fn: () => void) => {
      const t = setTimeout(fn, delay);
      demoTimersRef.current.push(t);
    };

    // 0s: Reset & Auto-fit camera
    scheduleStep(100, () => {
      window.dispatchEvent(new CustomEvent('reset-graph-camera'));
    });

    // 2s: QR Scan
    scheduleStep(2000, () => {
      setInvestorDemoStep('1. QR Scan: Table 12 guest scans digital code');
      const ev: SystemEvent = {
        id: `demo_qr_${Date.now()}`,
        restaurant_id: restaurantId,
        correlation_id: 'corr_A7K-26D00002_err',
        order_id: 'A7K-26D00002',
        actor_type: 'customer',
        event_type: 'qr_scanned',
        source_node: 'qr_scan',
        target_node: 'customer_menu',
        duration_ms: 45,
        metadata: { table: 'Table 12', session: 'sess_12_active' },
        created_at: new Date().toISOString(),
      };
      setErrorEvents((prev) => [ev, ...prev]);
    });

    // 5s: Menu & Cart
    scheduleStep(5000, () => {
      setInvestorDemoStep('2. Cart: Farmhouse Pizza + Masala Lemonade added');
      const ev: SystemEvent = {
        id: `demo_cart_${Date.now()}`,
        restaurant_id: restaurantId,
        correlation_id: 'corr_A7K-26D00002_err',
        order_id: 'A7K-26D00002',
        actor_type: 'customer',
        event_type: 'cart_updated',
        source_node: 'customer_menu',
        target_node: 'cart',
        duration_ms: 80,
        metadata: { items_count: 2, total: 689 },
        created_at: new Date().toISOString(),
      };
      setErrorEvents((prev) => [ev, ...prev]);
    });

    // 8s: Checkout & Order Created
    scheduleStep(8000, () => {
      setInvestorDemoStep('3. Order Created: Order #A7K-26D00002 dispatched to KDS');
      const ev: SystemEvent = {
        id: `demo_ord_${Date.now()}`,
        restaurant_id: restaurantId,
        correlation_id: 'corr_A7K-26D00002_err',
        order_id: 'A7K-26D00002',
        actor_type: 'customer',
        event_type: 'order_created',
        source_node: 'checkout',
        target_node: 'order_created',
        duration_ms: 110,
        metadata: { order_id: 'A7K-26D00002', table: 'Table 12', amount: 689 },
        created_at: new Date().toISOString(),
      };
      setErrorEvents((prev) => [ev, ...prev]);
    });

    // 12s: Inventory Reservation
    scheduleStep(12000, () => {
      setInvestorDemoStep('4. Inventory Reserve: Cheese 150g & Dough 200g reserved');
      const ev: SystemEvent = {
        id: `demo_inv_${Date.now()}`,
        restaurant_id: restaurantId,
        correlation_id: 'corr_A7K-26D00002_err',
        order_id: 'A7K-26D00002',
        actor_type: 'system',
        event_type: 'inventory_reserved',
        source_node: 'order_created',
        target_node: 'inventory',
        duration_ms: 65,
        metadata: { item_name: 'Farmhouse Pizza', reserved_items: 2 },
        created_at: new Date().toISOString(),
      };
      setErrorEvents((prev) => [ev, ...prev]);
    });

    // 16s: Kitchen Queue -> Error simulation
    scheduleStep(16000, () => {
      setInvestorDemoStep('5. Outage Alert: ERR-0007 504 Timeout at Kitchen Queue');
      handleSimulateError();
    });

    // 22s: Error Remediation (Retry Sync)
    scheduleStep(22000, () => {
      setInvestorDemoStep('6. Auto-Remediation: Retry Sync restores socket channel (200 OK)');
      handleRetrySync();
    });

    // 29s: Waiter Assigned & Push Sent
    scheduleStep(29000, () => {
      setInvestorDemoStep('7. Dispatch: Waiter Neha Patel assigned & push dispatched');
      const ev: SystemEvent = {
        id: `demo_waiter_${Date.now()}`,
        restaurant_id: restaurantId,
        correlation_id: 'corr_A7K-26D00002_err',
        order_id: 'A7K-26D00002',
        actor_type: 'staff',
        event_type: 'waiter_assigned',
        source_node: 'ready',
        target_node: 'waiter_assigned',
        duration_ms: 120,
        metadata: { waiter_name: 'Neha Patel', table: 'Table 12' },
        created_at: new Date().toISOString(),
      };
      setErrorEvents((prev) => [ev, ...prev]);
    });

    // 35s: Order Served & Billed
    scheduleStep(35000, () => {
      setInvestorDemoStep('8. Fulfillment: Order served, bill ₹689 generated');
      const ev: SystemEvent = {
        id: `demo_served_${Date.now()}`,
        restaurant_id: restaurantId,
        correlation_id: 'corr_A7K-26D00002_err',
        order_id: 'A7K-26D00002',
        actor_type: 'staff',
        event_type: 'order_served',
        source_node: 'waiter_assigned',
        target_node: 'served',
        duration_ms: 90,
        metadata: { table: 'Table 12', bill: 689 },
        created_at: new Date().toISOString(),
      };
      setErrorEvents((prev) => [ev, ...prev]);
    });

    // 41s: Payment Success
    scheduleStep(41000, () => {
      setInvestorDemoStep('9. Settlement: UPI QR payment verified successfully');
      const ev: SystemEvent = {
        id: `demo_pay_${Date.now()}`,
        restaurant_id: restaurantId,
        correlation_id: 'corr_A7K-26D00002_err',
        order_id: 'A7K-26D00002',
        actor_type: 'system',
        event_type: 'payment_success',
        source_node: 'billing',
        target_node: 'payment',
        duration_ms: 280,
        metadata: { amount: 689, method: 'UPI QR' },
        created_at: new Date().toISOString(),
      };
      setErrorEvents((prev) => [ev, ...prev]);
    });

    // 47s: Switch to Replay Mode
    scheduleStep(47000, () => {
      setInvestorDemoStep('10. CCTV Replay: Forensic playback of 167 operational events');
      handleModeChange('replay');
    });

    // 53s: Switch to Freeze Mode
    scheduleStep(53000, () => {
      setInvestorDemoStep('11. Freeze Frame: Time-travel comparison with ghost node overlays');
      handleModeChange('freeze');
    });

    // 59s: Return to Live Mode & complete
    scheduleStep(59000, () => {
      setInvestorDemoStep('12. Showcase Complete: All 19 subsystems verified production green');
      handleModeChange('live');
      setTimeout(() => {
        setInvestorDemoRunning(false);
        setInvestorDemoStep('');
      }, 3500);
    });
  }, [restaurantId, handleModeChange, handleSimulateError, handleRetrySync]);

  // Timer cleanup
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      demoTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  // Global keyboard shortcuts (Ctrl+K Command Palette, Ctrl+Shift+D Investor Demo, Space Pause/Play, L Live, R Replay, F Freeze, T Theme, Esc Close Drawer/Help/Palette)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();


      // Ctrl+K or Cmd+K opens/toggles Command Palette
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('toggle-replay-playback'));
      } else if (e.key === 'l' || e.key === 'L') {
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        handleModeChange('live');
      } else if (e.key === 'r' || e.key === 'R') {
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        handleModeChange('replay');
      } else if (e.key === 'f' || e.key === 'F') {
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        handleModeChange('freeze');
      } else if (e.key === 't' || e.key === 'T') {
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        handleToggleTheme();
      } else if (e.key === 'Escape') {
        setFollowingOrderId(null);
        setHelpOpen(false);
        setInvestigatedOrder(null);
        setConfirmExitOpen(false);
        setCommandPaletteOpen(false);
      } else if (e.key === '?') {
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        setHelpOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleModeChange, handleToggleTheme, startInvestorDemo]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col w-full h-full overflow-hidden transition-colors ${
      theme === 'light' ? 'bg-[#F6F8FC] text-[#1E293B]' : 'bg-slate-950 text-slate-100'
    }`}>

      {/* ── Top Bar (Strict Order: Live → Replay → Freeze → System → Debug → Search → Theme → Help → Exit) ── */}
      <div
        data-testid="founder-top-bar"
        className={`h-14 shrink-0 flex items-center gap-3 px-4 border-b transition-colors overflow-x-auto lg:overflow-visible ${
        theme === 'light' ? 'bg-white border-[#D7E1EC] shadow-xs text-[#1E293B]' : 'bg-slate-900 border-slate-800 text-slate-100'
      }`}>
        {/* Title */}
        <div className="flex items-center gap-2 shrink-0 mr-1">
          <div className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span className={`text-xs font-bold tracking-wide hidden sm:block ${theme === 'light' ? 'text-[#1E293B]' : 'text-slate-100'}`}>
            Founder Control Center
          </span>
          <span className={`text-xs font-bold tracking-wide sm:hidden ${theme === 'light' ? 'text-[#1E293B]' : 'text-slate-100'}`}>
            FCC
          </span>
        </div>

        {/* 1. Mode tabs: Live → Replay → Freeze → System → Debug */}
        <div className={`flex items-center gap-0.5 rounded-lg p-0.5 shrink-0 border ${
          theme === 'light' ? 'bg-[#F6F8FC] border-[#D7E1EC]' : 'bg-slate-800 border-slate-700/60'
        }`}>
          {MODE_CONFIG.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleModeChange(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                ${activeMode === id
                  ? theme === 'light' ? 'bg-white text-[#2563EB] shadow-xs font-bold border border-[#D7E1EC]' : 'bg-slate-700 text-white shadow-sm font-bold'
                  : theme === 'light' ? 'text-[#64748B] hover:text-[#1E293B] hover:bg-white/60' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:block">{label}</span>
            </button>
          ))}
        </div>

        {/* Top Badges: Active Orders, Events, Errors */}
        <div className="hidden xl:flex items-center gap-1.5 font-mono text-[11px] shrink-0 ml-1">
          <span data-testid="badge-top-active-orders" className={`px-2 py-1 rounded-lg border flex items-center gap-1.5 ${
            theme === 'light' ? 'bg-white border-[#D7E1EC] text-[#1E293B]' : 'bg-slate-800/90 border-slate-700/80 text-slate-300'
          }`}>
            <span className="text-slate-400 font-semibold">Active Orders:</span>
            <span className="font-bold text-sky-400">{orderDots.length}</span>
          </span>
          <span data-testid="badge-top-events" className={`px-2 py-1 rounded-lg border flex items-center gap-1.5 ${
            theme === 'light' ? 'bg-white border-[#D7E1EC] text-[#1E293B]' : 'bg-slate-800/90 border-slate-700/80 text-slate-300'
          }`}>
            <span className="text-slate-400 font-semibold">Events:</span>
            <span className="font-bold text-emerald-400">{totalEventCount}</span>
          </span>
          <span data-testid="badge-top-errors" className={`px-2 py-1 rounded-lg border flex items-center gap-1.5 ${
            theme === 'light' ? 'bg-white border-[#D7E1EC] text-[#1E293B]' : 'bg-slate-800/90 border-slate-700/80 text-slate-300'
          }`}>
            <span className="text-slate-400 font-semibold">Errors:</span>
            <span className={`font-bold ${activeErrorCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>{activeErrorCount}</span>
          </span>
        </div>

        {/* P0 — Errors Button in Top Bar (alongside Live, Replay, Freeze) */}
        <button
          data-testid="btn-errors-panel-toggle"
          onClick={() => setErrorCenterOpen((prev) => !prev)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border shadow-sm shrink-0 ${
            errorCenterOpen
              ? 'bg-rose-600 text-white border-rose-500 shadow-rose-900/50 shadow-md font-bold'
              : activeError
              ? 'bg-rose-950/70 border-rose-600 text-rose-300 hover:bg-rose-900/80 animate-pulse'
              : theme === 'light'
              ? 'bg-white border-[#D7E1EC] text-[#1E293B] hover:bg-slate-50'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
          }`}
          title="Open Error Investigation Center"
        >
          <span>🚨</span>
          <span>Errors</span>
          {activeErrorCount > 0 && (
            <span
              data-testid="badge-error-count"
              className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-mono font-extrabold animate-bounce"
            >
              {activeErrorCount}
            </span>
          )}
        </button>


        {/* 2. Search: Global Order Investigation Bar */}
        <div className="flex items-center ml-1 shrink-0">
          <OrderInvestigationBar
            restaurantId={restaurantId}
            theme={theme}
            selectedOrder={investigatedOrder}
            onSelectOrder={handleSelectInvestigationOrder}
            onCloseDrawer={handleCloseInvestigationDrawer}
            onReplayOrder={handleReplayOrder}
            onFreezeMoment={handleFreezeMoment}
            onOpenTimeline={handleOpenTimeline}
            onOpenLiveOrder={handleOpenLiveOrder}
          />
        </div>

        {/* Command Palette Trigger Button (Ctrl+K / Cmd+K) */}
        <button
          data-testid="btn-command-palette-trigger"
          onClick={() => setCommandPaletteOpen(true)}
          className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs border rounded-lg transition-all shadow-sm cursor-pointer ml-1 shrink-0 ${
            theme === 'light'
              ? 'bg-white hover:bg-slate-50 border-[#C9D7E6] text-[#1E293B]'
              : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700/80 text-slate-300 hover:text-white'
          }`}
          title="Command Palette (Ctrl+K or Cmd+K)"
        >
          <Command className="h-3.5 w-3.5 text-sky-400" />
          <span className={`font-mono text-[10px] ${theme === 'light' ? 'text-[#64748B]' : 'text-slate-400'}`}>Ctrl+K</span>
        </button>

        {/* Right side controls */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {/* Realtime connection status */}
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-mono border shrink-0 ${
            theme === 'light' ? 'bg-white border-[#C9D7E6] text-[#1E293B]' : 'bg-slate-800 border-slate-700'
          } ${statusColor}`}>
            {isConnected
              ? <Wifi className="h-3.5 w-3.5 text-emerald-500" />
              : <WifiOff className="h-3.5 w-3.5" />
            }
            <span className="text-[10px] font-medium hidden md:block">{statusLabel}</span>
            {isConnected && (
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </div>

          {/* 3. Theme Toggle Button */}
          <button
            data-testid="btn-theme-toggle"
            onClick={handleToggleTheme}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-sm shrink-0 ${
              theme === 'light'
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-100'
            }`}
            title="Toggle theme: Dark / Light (Shortcut: T)"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[10px] font-mono hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-indigo-500" />
                <span className="text-[10px] font-mono hidden sm:inline">Dark</span>
              </>
            )}
          </button>

          {/* 4. Help: Help & Guide button */}
          <button
            data-testid="btn-help-guide"
            onClick={handleToggleHelp}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shadow-sm cursor-pointer border ${
              theme === 'light'
                ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 hover:border-sky-300'
                : 'text-sky-300 hover:text-white bg-sky-950/60 hover:bg-sky-600 border-sky-800/60 hover:border-sky-500'
            }`}
            title="Open Interactive Demo & Walkthrough Guide (Shortcut: ?)"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Help & Guide</span>
            <span className="sm:hidden">Help</span>
          </button>

          {/* 5. Exit: Separate visual group (≥24px spacing from Help) */}
          <div className={`ml-6 pl-6 border-l flex items-center ${
            theme === 'light' ? 'border-[#D7E3EF]' : 'border-slate-800'
          }`}>
            <button
              data-testid="btn-exit-founder-mode"
              onClick={() => setConfirmExitOpen(true)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 shadow-sm cursor-pointer border ${
                theme === 'light'
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-600 hover:text-white hover:border-rose-600 hover:shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                  : 'text-rose-300 hover:text-white bg-rose-950/50 hover:bg-rose-600 border-rose-600/70 hover:border-rose-400 hover:shadow-[0_0_15px_rgba(244,63,94,0.4)]'
              }`}
              title="Exit Founder Control Center (Shortcut: Esc)"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Exit Founder Mode</span>
              <span className="sm:hidden">Exit</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Mode Content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {activeMode === 'live' && (
          <LiveMode
            restaurantId={restaurantId}
            followingOrderId={followingOrderId}
            onFollowOrder={handleFollowOrder}
            events={combinedEvents}
            orderDots={orderDots}
            tables={tables}
            activeOrders={activeOrders}
            theme={theme}
            activeError={activeError}
            isRetryingError={isRetryingError}
            isResolvedError={isResolvedError}
            onRetryError={() => handleRetrySync(activeError || undefined)}
          />
        )}
        {activeMode === 'replay' && (
          <ReplayMode
            restaurantId={restaurantId}
            initialEvents={combinedEvents}
            theme={theme}
            targetOrder={replayTargetOrder}
            targetTimestamp={freezeTargetTimestamp}
          />
        )}
        {activeMode === 'freeze' && (
          <FreezeMode
            restaurantId={restaurantId}
            events={combinedEvents}
            theme={theme}
            targetTimestamp={freezeTargetTimestamp}
          />
        )}
        {activeMode === 'system' && (
          <SystemMode restaurantId={restaurantId} />
        )}
        {activeMode === 'debug' && (
          <DebugMode restaurantId={restaurantId} events={events} />
        )}
      </div>

      {/* ── First Run Onboarding Card ────────────────────────────────────── */}
      {activeMode === 'live' && orderDots.length === 0 && events.length === 0 && (
        <div
          data-testid="first-run-onboarding-card"
          className={`absolute bottom-6 right-6 z-30 w-84 p-4 rounded-xl border shadow-2xl backdrop-blur-md font-mono space-y-3 ${
            theme === 'light'
              ? 'bg-white/95 border-emerald-300 text-slate-900 shadow-emerald-900/10'
              : 'bg-slate-900/95 border-emerald-600/50 text-slate-100 shadow-slate-950/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold font-mono">Welcome to CleverOps</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold">
              Fresh Setup
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Your restaurant is freshly initialized with zero historical data. Complete the quickstart checklist:
          </p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="h-3.5 w-3.5 rounded-full border border-emerald-400 flex items-center justify-center text-[9px] text-emerald-400 font-bold shrink-0">1</span>
              <span>Add Menu</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="h-3.5 w-3.5 rounded-full border border-sky-400 flex items-center justify-center text-[9px] text-sky-400 font-bold shrink-0">2</span>
              <span>Add Inventory</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="h-3.5 w-3.5 rounded-full border border-purple-400 flex items-center justify-center text-[9px] text-purple-400 font-bold shrink-0">3</span>
              <span>Create Recipe</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="h-3.5 w-3.5 rounded-full border border-amber-400 flex items-center justify-center text-[9px] text-amber-400 font-bold shrink-0">4</span>
              <span>Generate QR</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="h-3.5 w-3.5 rounded-full border border-slate-600 flex items-center justify-center text-[9px] text-slate-400 font-bold shrink-0">5</span>
              <span>Take First Order</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Part 10: Demo Walkthrough Mode Modal ─────────────────────────── */}
      {helpOpen && (
        <div
          data-testid="help-guide-modal"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-950/80 border border-sky-600/50 text-sky-400">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    Founder Control Center — Interactive Guide
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-950/80 border border-sky-700/60 text-sky-400 font-semibold">
                      Step {helpStep + 1} of {WALKTHROUGH_STEPS.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Mission control flight deck for smart restaurant operations
                  </p>
                </div>
              </div>
              <button
                data-testid="btn-close-help-guide"
                onClick={() => setHelpOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Interactive Step Navigation Tabs */}
            <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/90 flex items-center gap-1.5 overflow-x-auto">
              {WALKTHROUGH_STEPS.map((s, idx) => {
                const StepIcon = s.icon;
                const isActive = helpStep === idx;
                return (
                  <button
                    key={s.id}
                    data-testid={`walkthrough-step-tab-${idx}`}
                    onClick={() => setHelpStep(idx)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-sky-950 border border-sky-600 text-sky-300 font-bold shadow-sm'
                        : 'bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <StepIcon className="h-3 w-3" />
                    <span>{idx + 1}. {s.title.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Step Feature Showcase */}
            {(() => {
              const currentStep = WALKTHROUGH_STEPS[helpStep] || WALKTHROUGH_STEPS[0];
              const StepIcon = currentStep.icon;
              return (
                <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-mono">
                  <div className="p-4 rounded-xl bg-slate-850/90 border border-slate-700/90 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl bg-slate-800 border border-slate-700 ${currentStep.iconColor}`}>
                          <StepIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                              Feature {helpStep + 1} of {WALKTHROUGH_STEPS.length}
                            </span>
                            <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-amber-800/60 font-mono">
                              Key: {currentStep.shortcut}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-100 mt-0.5">
                            {currentStep.title}
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            {currentStep.subtitle}
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="text-slate-300 text-xs leading-relaxed bg-slate-900/70 p-3 rounded-lg border border-slate-800/80">
                      {currentStep.description}
                    </p>

                    <div className="flex items-center justify-end pt-1">
                      <button
                        type="button"
                        data-testid="btn-walkthrough-jump-mode"
                        onClick={() => {
                          handleModeChange(currentStep.targetMode);
                          setHelpOpen(false);
                        }}
                        className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-md shadow-sky-950"
                      >
                        <span>{currentStep.actionLabel}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Cheatsheet Bar */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Global Keyboard Shortcuts
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Press key anywhere to activate
                      </span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-7 gap-1.5 text-center">
                      {[
                        { k: 'Space', desc: 'Play / Pause' },
                        { k: 'L', desc: 'Live Mode' },
                        { k: 'R', desc: 'Replay' },
                        { k: 'F', desc: 'Freeze' },
                        { k: 'T', desc: 'Theme' },
                        { k: 'Esc', desc: 'Close / Deselect' },
                        { k: '?', desc: 'Help Guide' },
                      ].map((sc) => (
                        <div key={sc.k} className="p-1.5 rounded bg-slate-900/90 border border-slate-800">
                          <kbd className="block text-[11px] font-bold text-amber-300 font-mono">{sc.k}</kbd>
                          <span className="text-[9px] text-slate-400 block truncate">{sc.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Modal Footer with Stepper Controls */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-850 flex items-center justify-between">
              <button
                type="button"
                data-testid="btn-walkthrough-prev"
                disabled={helpStep === 0}
                onClick={() => setHelpStep((prev) => Math.max(0, prev - 1))}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-colors ${
                  helpStep === 0
                    ? 'opacity-40 cursor-not-allowed text-slate-500 bg-slate-800'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer'
                }`}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Previous</span>
              </button>

              {/* Step indicator dots */}
              <div className="flex items-center gap-1.5">
                {WALKTHROUGH_STEPS.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setHelpStep(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      helpStep === idx ? 'w-5 bg-sky-500' : 'w-2 bg-slate-700 hover:bg-slate-600'
                    }`}
                    title={`Step ${idx + 1}`}
                  />
                ))}
              </div>

              {helpStep < WALKTHROUGH_STEPS.length - 1 ? (
                <button
                  type="button"
                  data-testid="btn-walkthrough-next"
                  onClick={() => setHelpStep((prev) => Math.min(WALKTHROUGH_STEPS.length - 1, prev + 1))}
                  className="flex items-center gap-1 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold font-mono cursor-pointer transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="btn-walkthrough-finish"
                  onClick={() => setHelpOpen(false)}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold font-mono cursor-pointer transition-colors"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Danger Exit Confirmation Modal ────────────────────────────── */}
      {confirmExitOpen && (
        <div
          data-testid="confirm-exit-modal"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-slate-900 border border-rose-800/80 rounded-2xl max-w-md w-full shadow-2xl shadow-rose-950/50 overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-700/60 text-rose-400">
                <LogOut className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Exit Founder Mode?</h3>
                <p className="text-xs text-slate-400">Return to standard dashboard</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              Are you sure you want to exit the Founder Control Center flight deck? You will be redirected to the normal restaurant operational dashboard.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                data-testid="btn-cancel-exit"
                onClick={() => setConfirmExitOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold font-mono cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                data-testid="btn-confirm-exit"
                onClick={handleExitFounderMode}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold font-mono cursor-pointer transition-colors shadow-md shadow-rose-900/50"
              >
                Confirm Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Phase-28: Global Command Palette (Ctrl+K / Cmd+K) ─────────────── */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectMode={handleModeChange}
        onSelectOrder={handleSelectInvestigationOrder}
        onSelectTable={handleSelectTableFromPalette}
        onToggleTheme={handleToggleTheme}
        theme={theme}
      />

      {/* ── P1: Live Error Toast (Top-Right Alert) ────────────────────────── */}
      <LiveErrorToast
        error={activeError}
        isRetrying={isRetryingError}
        isResolved={isResolvedError}
        theme={theme}
        onInvestigate={(err) => {
          setSelectedErrorId(err.id);
          setErrorCenterOpen(true);
        }}
        onRetry={handleRetrySync}
        onDismiss={() => {}}
      />

      {/* ── P0: Error Center Dashboard & Inspector Drawer ─────────────────── */}
      {errorCenterOpen && (
        <ErrorCenterPanel
          errors={systemErrors}
          selectedErrorId={selectedErrorId}
          isRetrying={isRetryingError}
          isResolved={isResolvedError}
          theme={theme}
          onSelectError={(err) => setSelectedErrorId(err.id)}
          onRetrySync={handleRetrySync}
          onRequeueKitchen={handleRequeueKitchen}
          onNotifyWaiter={handleNotifyWaiter}
          onNotifyOwner={handleNotifyOwner}
          onViewLogs={handleViewLogs}
          onSimulateError={handleSimulateError}
          onClose={() => setErrorCenterOpen(false)}
          onJumpToOrder={(orderId) => {
            setErrorCenterOpen(false);
            setFollowingOrderId(orderId);
            handleModeChange('live');
          }}
        />
      )}
    </div>
  );
}
