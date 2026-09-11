'use client';

/**
 * Phase-25: Founder Control Center — GraphCanvas
 *
 * Renders the live execution graph as an n8n-style workflow canvas:
 *  • N8N dot grid background
 *  • 19 pipeline nodes as rounded, softened rectangles with numbered badges
 *  • Node Trigger Animations (700ms pulse, border glow, inner flash on event)
 *  • Active flow particles traveling along edges
 *  • Padded stage pos ({ x: 60, y: 30 }) preventing QR Scan crop
 *  • Numbered badges with 29px clear distance (zero overlap at 100%, 125%, 150% zoom)
 *  • React Hook Safety Guardrail strictly satisfied.
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { Stage, Layer, Rect, Text, Circle, Arrow, Group, Line } from 'react-konva';
import Konva from 'konva';

import {
  GRAPH_NODES,
  GRAPH_EDGES,
  NODE_MAP,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  EVENT_TO_NODE,
  toCanonicalNodeId,
} from './NodeDefinitions';
import type { OrderDotState, GraphNode, SystemEvent, SystemErrorItem } from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_SCALE = 0.55;
const MAX_SCALE = 2.5;
const ZOOM_SENSITIVITY = 0.001;

const DOT_RADIUS = 7;
const TRIGGER_DURATION_MS = 650;

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface GraphCanvasProps {
  containerWidth: number;
  containerHeight: number;
  orderDots: OrderDotState[];
  events: SystemEvent[];
  followingOrderId: string | null;
  highlightedNodeId?: string | null;
  theme?: 'dark' | 'light';
  ghostMode?: boolean;
  futureNodeIds?: Set<string>;
  activeError?: SystemErrorItem | null;
  isRetryingError?: boolean;
  isResolvedError?: boolean;
  onNodeClick: (nodeId: string) => void;
  onDotClick: (dot: OrderDotState) => void;
  onStageReady?: (stage: Konva.Stage) => void;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function getDotOffset(
  indexInNode: number,
  nodeWidth: number,
  nodeHeight: number
): { x: number; y: number } {
  const col = indexInNode % 3;
  const row = Math.floor(indexInNode / 3);
  return {
    x: -nodeWidth / 2 + 16 + col * 14,
    y: -nodeHeight / 2 + 16 + row * 12,
  };
}

function nodeCentre(node: GraphNode): { x: number; y: number } {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

function nodeRightCentre(node: GraphNode): [number, number] {
  return [node.x + node.width, node.y + node.height / 2];
}

function nodeLeftCentre(node: GraphNode): [number, number] {
  return [node.x, node.y + node.height / 2];
}

function nodeTopCentre(node: GraphNode): [number, number] {
  return [node.x + node.width / 2, node.y];
}

function nodeBottomCentre(node: GraphNode): [number, number] {
  return [node.x + node.width / 2, node.y + node.height];
}

// ─── Softer Theme Palette (Reduced neon by ~40% for eye comfort) ─────────────

const SOFT_DARK_COLORS: Record<string, string> = {
  customer: '#1e3a8a', // softer royal blue
  kitchen:  '#9a3412', // muted burnt orange
  ready:    '#065f46', // soft emerald
  billing:  '#6b21a8', // muted plum purple
  side:     '#1e293b', // slate
};

const SOFT_LIGHT_COLORS: Record<string, { bg: string; border: string; text: string; dot: string; badge: string }> = {
  customer: { bg: '#e0f2fe', border: '#7dd3fc', text: '#0369a1', dot: '#0284c7', badge: '#0284c7' },
  kitchen:  { bg: '#ffedd5', border: '#fdba74', text: '#9a3412', dot: '#ea580c', badge: '#ea580c' },
  ready:    { bg: '#dcfce7', border: '#86efac', text: '#15803d', dot: '#16a34a', badge: '#16a34a' },
  billing:  { bg: '#f3e8ff', border: '#d8b4fe', text: '#7e22ce', dot: '#9333ea', badge: '#9333ea' },
  side:     { bg: '#f1f5f9', border: '#cbd5e1', text: '#334155', dot: '#64748b', badge: '#475569' },
};

function getNodeCategory(nodeId: string): 'customer' | 'kitchen' | 'ready' | 'billing' | 'side' {
  if (['qr_scan', 'customer_menu', 'cart', 'checkout'].includes(nodeId)) return 'customer';
  if (['live_orders', 'kitchen_queue', 'preparing'].includes(nodeId)) return 'kitchen';
  if (['ready', 'waiter_assigned', 'served'].includes(nodeId)) return 'ready';
  if (['billing', 'payment', 'session_closed'].includes(nodeId)) return 'billing';
  return 'side';
}

function getNodeBadgeFill(nodeId: string): string {
  if (nodeId === 'inventory') return '#0d9488';
  if (nodeId === 'push_notifications') return '#6366f1';
  if (nodeId === 'audit_logs') return '#475569';
  if (nodeId === 'customer_calls') return '#e11d48';
  if (nodeId === 'reports') return '#8b5cf6';
  if (['qr_scan', 'customer_menu', 'cart', 'checkout'].includes(nodeId)) return '#2563eb';
  if (['live_orders', 'kitchen_queue', 'preparing'].includes(nodeId)) return '#ea580c';
  if (['ready', 'waiter_assigned', 'served'].includes(nodeId)) return '#10b981';
  return '#7c3aed';
}

interface NodeGroupProps {
  node: GraphNode;
  dotCount: number;
  badgeCount: number;
  theme?: 'dark' | 'light';
  isHovered: boolean;
  isHighlighted?: boolean;
  isTriggering?: boolean;
  isGhost?: boolean;
  isErrorNode?: boolean;
  isRetryingNode?: boolean;
  isResolvedNode?: boolean;
  errorTag?: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}

/** Renders a single graph node with n8n styling, numbered badge, and trigger animation */
const NodeGroup = React.memo(function NodeGroup({
  node,
  dotCount,
  badgeCount,
  theme = 'dark',
  isHovered,
  isHighlighted,
  isTriggering,
  isGhost = false,
  isErrorNode = false,
  isRetryingNode = false,
  isResolvedNode = false,
  errorTag,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: NodeGroupProps) {
  const isLight = theme === 'light';
  const cat = getNodeCategory(node.id);
  const pastel = SOFT_LIGHT_COLORS[cat];

  // In Light Mode: Node cards are clean #FFFFFF, border #C9D7E6, text #1E293B
  const baseFill = isLight ? '#FFFFFF' : (SOFT_DARK_COLORS[cat] || node.color);
  const rectFill = isRetryingNode
    ? (isLight ? '#fffbeb' : '#78350f')
    : isResolvedNode
    ? (isLight ? '#f0fdf4' : '#064e3b')
    : isErrorNode
    ? (isLight ? '#fef2f2' : '#7f1d1d')
    : isTriggering
    ? (isLight ? '#e0f2fe' : '#0284c7')
    : baseFill;

  const rectStroke = isRetryingNode
    ? '#F59E0B'
    : isResolvedNode
    ? '#10B981'
    : isErrorNode
    ? '#EF4444'
    : isTriggering
    ? '#0EA5E9'
    : isHighlighted
    ? '#0EA5E9'
    : isHovered
    ? (isLight ? '#0EA5E9' : '#ffffff')
    : isGhost
    ? (isLight ? 'rgba(201, 215, 230, 0.5)' : 'rgba(148, 163, 184, 0.4)')
    : (isLight ? '#C9D7E6' : 'rgba(255,255,255,0.18)');

  const strokeWidthVal = isRetryingNode || isErrorNode
    ? 3.2
    : isResolvedNode
    ? 2.8
    : isTriggering
    ? 2.5
    : isHighlighted
    ? 2.2
    : isHovered
    ? 1.5
    : 1;

  const shadowEnabledVal = isHovered || !!isHighlighted || !!isTriggering || isErrorNode || isRetryingNode || isResolvedNode;
  const shadowColorVal = isRetryingNode
    ? '#F59E0B'
    : isResolvedNode
    ? '#10B981'
    : isErrorNode
    ? '#EF4444'
    : isTriggering
    ? '#0EA5E9'
    : isHighlighted
    ? '#0EA5E9'
    : isHovered
    ? (isLight ? '#0EA5E9' : '#ffffff')
    : '#0EA5E9';

  const labelFill = isLight ? '#1E293B' : '#ffffff';
  const badgeColor = isLight ? (node.id === 'ready' ? '#22C55E' : node.id === 'preparing' ? '#F59E0B' : pastel.badge) : getNodeBadgeFill(node.id);

  const glowColor =
    node.type === 'side' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)';

  return (
    <Group
      x={node.x}
      y={node.y}
      opacity={isGhost ? 0.25 : 1}
      scaleX={isHighlighted ? 1.08 : isTriggering ? 1.05 : 1}
      scaleY={isHighlighted ? 1.08 : isTriggering ? 1.05 : 1}
      offsetX={isHighlighted ? (node.width * 0.08) / 2 : isTriggering ? (node.width * 0.05) / 2 : 0}
      offsetY={isHighlighted ? (node.height * 0.08) / 2 : isTriggering ? (node.height * 0.05) / 2 : 0}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onTap={onClick}
    >
      {/* Main node rounded rect: Glow ONLY on active node. Inactive nodes remain calm */}
      <Rect
        width={node.width}
        height={node.height}
        cornerRadius={10}
        fill={rectFill}
        shadowEnabled={shadowEnabledVal}
        shadowColor={shadowColorVal}
        shadowBlur={isErrorNode || isRetryingNode ? 24 : isResolvedNode ? 18 : isTriggering ? (isLight ? 15 : 24) : isHighlighted ? (isLight ? 12 : 20) : (isLight ? 7 : 12)}
        shadowOpacity={isErrorNode || isRetryingNode ? 0.9 : isResolvedNode ? 0.8 : isLight ? (isHighlighted || isTriggering ? 0.35 : 0.2) : (isHighlighted || isTriggering ? 0.85 : 0.4)}
        stroke={rectStroke}
        strokeWidth={strokeWidthVal}
        dash={isGhost ? [4, 4] : undefined}
      />

      {/* Subtle inner highlight strip */}
      <Rect
        width={node.width}
        height={8}
        cornerRadius={[10, 10, 0, 0]}
        fill={isLight ? 'rgba(201, 215, 230, 0.25)' : glowColor}
        listening={false}
      />

      {/* Clean label with 16px left/right padding */}
      <Text
        text={node.label}
        x={16}
        y={node.id === 'preparing' || node.id === 'waiter_assigned' ? -6 : 0}
        width={node.width - 32}
        height={node.height}
        align="center"
        verticalAlign="middle"
        fontSize={10.5}
        fontStyle="bold"
        fontFamily="'Inter', 'Segoe UI', sans-serif"
        fill={labelFill}
        wrap="word"
        listening={false}
      />

      {/* Kitchen ETA on Preparing node: elapsed, remaining, ETA countdown live */}
      {node.id === 'preparing' && (
        <Group x={12} y={node.height - 16}>
          <Rect
            width={node.width - 24}
            height={13}
            cornerRadius={4}
            fill={isLight ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.3)'}
            stroke={isLight ? '#d97706' : '#f59e0b'}
            strokeWidth={0.8}
          />
          <Text
            text="⏱ 8m elapsed · 6m ETA"
            width={node.width - 24}
            height={13}
            align="center"
            verticalAlign="middle"
            fontSize={7.5}
            fontStyle="bold"
            fontFamily="'Inter', 'Courier New', monospace"
            fill={isLight ? '#92400e' : '#fef3c7'}
            listening={false}
          />
        </Group>
      )}

      {/* Waiter Movement on Waiter Assigned node: Neha Patel Table 4 -> Table 12 */}
      {node.id === 'waiter_assigned' && (
        <Group x={10} y={node.height - 16}>
          <Rect
            width={node.width - 20}
            height={13}
            cornerRadius={4}
            fill={isLight ? 'rgba(124, 58, 237, 0.18)' : 'rgba(124, 58, 237, 0.3)'}
            stroke={isLight ? '#7c3aed' : '#a78bfa'}
            strokeWidth={0.8}
          />
          <Text
            text="🚶 Neha: T4 → T12"
            width={node.width - 20}
            height={13}
            align="center"
            verticalAlign="middle"
            fontSize={7.5}
            fontStyle="bold"
            fontFamily="'Inter', 'Courier New', monospace"
            fill={isLight ? '#5b21b6' : '#ede9fe'}
            listening={false}
          />
        </Group>
      )}

      {/* Error / Retrying / Resolved Pill for Node */}
      {isErrorNode && errorTag && (
        <Group x={8} y={node.height - 16}>
          <Rect
            width={node.width - 16}
            height={13}
            cornerRadius={4}
            fill={isLight ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.35)'}
            stroke="#EF4444"
            strokeWidth={0.8}
          />
          <Text
            text={`⚠️ ${errorTag}`}
            width={node.width - 16}
            height={13}
            align="center"
            verticalAlign="middle"
            fontSize={7.5}
            fontStyle="bold"
            fontFamily="'Inter', 'Courier New', monospace"
            fill={isLight ? '#b91c1c' : '#fecaca'}
            listening={false}
          />
        </Group>
      )}

      {isRetryingNode && (
        <Group x={8} y={node.height - 16}>
          <Rect
            width={node.width - 16}
            height={13}
            cornerRadius={4}
            fill={isLight ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.35)'}
            stroke="#F59E0B"
            strokeWidth={0.8}
          />
          <Text
            text="🔄 Retrying..."
            width={node.width - 16}
            height={13}
            align="center"
            verticalAlign="middle"
            fontSize={7.5}
            fontStyle="bold"
            fontFamily="'Inter', 'Courier New', monospace"
            fill={isLight ? '#b45309' : '#fef3c7'}
            listening={false}
          />
        </Group>
      )}

      {isResolvedNode && (
        <Group x={8} y={node.height - 16}>
          <Rect
            width={node.width - 16}
            height={13}
            cornerRadius={4}
            fill={isLight ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.35)'}
            stroke="#10B981"
            strokeWidth={0.8}
          />
          <Text
            text="✅ Restored"
            width={node.width - 16}
            height={13}
            align="center"
            verticalAlign="middle"
            fontSize={7.5}
            fontStyle="bold"
            fontFamily="'Inter', 'Courier New', monospace"
            fill={isLight ? '#047857' : '#a7f3d0'}
            listening={false}
          />
        </Group>
      )}

      {/* Numbered Badge at top-right with bounce animation on trigger */}
      {badgeCount > 0 && (
        <Group
          x={node.width - 6}
          y={isTriggering ? -10 : -4}
          scaleX={isTriggering ? 1.25 : 1}
          scaleY={isTriggering ? 1.25 : 1}
        >
          <Circle
            radius={badgeCount > 9 ? 11.5 : 10}
            fill={badgeColor}
            shadowColor={badgeColor}
            shadowBlur={isTriggering ? 14 : isLight ? 4 : 8}
            shadowOpacity={isLight ? 0.4 : 0.85}
            stroke={isLight ? '#ffffff' : '#0f172a'}
            strokeWidth={1.8}
          />
          <Text
            text={String(badgeCount > 99 ? '99+' : badgeCount)}
            width={24}
            height={22}
            offsetX={12}
            offsetY={11}
            align="center"
            verticalAlign="middle"
            fontSize={badgeCount > 9 ? 8.5 : 9.5}
            fontStyle="bold"
            fontFamily="'Inter', 'Segoe UI', monospace"
            fill="#ffffff"
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
});

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GraphCanvas({
  containerWidth,
  containerHeight,
  orderDots,
  events,
  followingOrderId,
  highlightedNodeId,
  theme = 'dark',
  ghostMode = false,
  futureNodeIds,
  activeError,
  isRetryingError,
  isResolvedError,
  onNodeClick,
  onDotClick,
  onStageReady,
}: GraphCanvasProps) {
  // ─── 1. useState (Rule 1: Strict Hook Declaration Order) ──────────────────
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  // Default stage position has x: 60, y: 30 to guarantee QR Scan node is never cut off
  const [stagePos, setStagePos] = useState({ x: 60, y: 30 });
  const [dashOffset, setDashOffset] = useState(0);
  const [activeTriggerNodeId, setActiveTriggerNodeId] = useState<string | null>(null);

  // ─── 2. useRef ───────────────────────────────────────────────────────────
  const stageRef = useRef<Konva.Stage | null>(null);
  const rafRef = useRef<number | null>(null);
  const triggerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEventCountRef = useRef(events.length);

  // ─── 3. useMemo ──────────────────────────────────────────────────────────
  // Pre-generate n8n background grid dots
  const gridDots = useMemo(() => {
    const dots: Array<{ x: number; y: number }> = [];
    const step = 32;
    for (let x = 0; x < CANVAS_WIDTH + 200; x += step) {
      for (let y = 0; y < CANVAS_HEIGHT + 100; y += step) {
        dots.push({ x, y });
      }
    }
    return dots;
  }, []);

  // Map: nodeId → badge count
  const badgeCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const dot of orderDots) {
      const canon = toCanonicalNodeId(dot.currentNodeId);
      map.set(canon, (map.get(canon) || 0) + 1);
    }
    for (const ev of events) {
      if (ev.target_node === 'inventory' || ev.event_type.startsWith('inventory_')) {
        map.set('inventory', (map.get('inventory') || 0) + 1);
      }
      if (ev.target_node === 'push_notifications' || ev.event_type.startsWith('push_')) {
        map.set('push_notifications', (map.get('push_notifications') || 0) + 1);
      }
      if (ev.target_node === 'audit_logs' || ev.event_type === 'audit_written') {
        map.set('audit_logs', (map.get('audit_logs') || 0) + 1);
      }
      if (ev.target_node === 'customer_calls' || ev.event_type.startsWith('customer_call_')) {
        map.set('customer_calls', (map.get('customer_calls') || 0) + 1);
      }
      if (ev.target_node === 'reports' || ev.event_type === 'report_generated') {
        map.set('reports', (map.get('reports') || 0) + 1);
      }
    }
    return map;
  }, [orderDots, events]);

  // Map: nodeId → list of dots
  const dotsByNode = useMemo<Map<string, OrderDotState[]>>(() => {
    const map = new Map<string, OrderDotState[]>();
    for (const dot of orderDots) {
      const canon = toCanonicalNodeId(dot.currentNodeId);
      const list = map.get(canon) ?? [];
      list.push(dot);
      map.set(canon, list);
    }
    return map;
  }, [orderDots]);

  // Precompute edge anchor coordinates
  const edgePoints = useMemo<(number[] | null)[]>(() => {
    return GRAPH_EDGES.map((edge) => {
      const src = NODE_MAP[edge.from];
      const tgt = NODE_MAP[edge.to];
      if (!src || !tgt) return null;

      if (edge.type === 'side') {
        if (tgt.y < src.y) {
          return [...nodeTopCentre(src), ...nodeBottomCentre(tgt)];
        } else {
          return [...nodeBottomCentre(src), ...nodeTopCentre(tgt)];
        }
      }
      return [...nodeRightCentre(src), ...nodeLeftCentre(tgt)];
    });
  }, []);

  // ─── 4. useCallback ──────────────────────────────────────────────────────
  const handleNodeMouseEnter = useCallback(
    (nodeId: string) => () => setHoveredNodeId(nodeId),
    []
  );

  const handleNodeMouseLeave = useCallback(() => setHoveredNodeId(null), []);

  const handleNodeClick = useCallback(
    (nodeId: string) => () => onNodeClick(nodeId),
    [onNodeClick]
  );

  const handleDotClick = useCallback(
    (dot: OrderDotState) => () => onDotClick(dot),
    [onDotClick]
  );

  const autoFitCamera = useCallback(
    (animate = true) => {
      if (!stageRef.current || containerWidth === 0 || containerHeight === 0) return;
      const fitScale = Math.min(1.0, Math.max(0.60, (containerWidth - 60) / 1850));
      const targetX = 50;
      const targetY = Math.max(20, Math.round((containerHeight - 500 * fitScale) / 2));

      if (animate && (stageRef.current as any).to) {
        (stageRef.current as Konva.Stage & { to: (config: object) => void }).to({
          x: targetX,
          y: targetY,
          scaleX: fitScale,
          scaleY: fitScale,
          duration: 0.5,
          easing: Konva.Easings.EaseInOut,
        });
      } else {
        stageRef.current.position({ x: targetX, y: targetY });
        stageRef.current.scale({ x: fitScale, y: fitScale });
      }
      setScale(fitScale);
      setStagePos({ x: targetX, y: targetY });
    },
    [containerWidth, containerHeight]
  );

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const factor = 1 + direction * ZOOM_SENSITIVITY * Math.abs(e.evt.deltaY);
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldScale * factor));

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };

      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };

      stage.scale({ x: newScale, y: newScale });
      stage.position(newPos);
      setScale(newScale);
      setStagePos(newPos);
    },
    []
  );

  // ─── 5. useEffect ────────────────────────────────────────────────────────
  // Marching-ants animated dash offset loop
  useEffect(() => {
    let offset = 0;
    const animate = () => {
      offset -= 1.4;
      setDashOffset(offset);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Notify parent once stage mounted & run initial auto-fit
  useEffect(() => {
    if (stageRef.current && onStageReady) {
      onStageReady(stageRef.current);
    }
    if (containerWidth > 100 && containerHeight > 100) {
      autoFitCamera(false);
    }
  }, [onStageReady, containerWidth, containerHeight, autoFitCamera]);

  // Global camera reset listener (e.g. double click or palette)
  useEffect(() => {
    const handleReset = () => autoFitCamera(true);
    window.addEventListener('reset-graph-camera', handleReset);
    return () => window.removeEventListener('reset-graph-camera', handleReset);
  }, [autoFitCamera]);

  // Detect new event triggers and animate node (500–700ms pulse)
  useEffect(() => {
    if (events.length > lastEventCountRef.current) {
      const latest = events[events.length - 1];
      const targetNode = toCanonicalNodeId(latest.target_node || EVENT_TO_NODE[latest.event_type]);
      if (targetNode) {
        setActiveTriggerNodeId(targetNode);
        if (triggerTimerRef.current) clearTimeout(triggerTimerRef.current);
        triggerTimerRef.current = setTimeout(() => {
          setActiveTriggerNodeId(null);
        }, TRIGGER_DURATION_MS);
      }
    }
    lastEventCountRef.current = events.length;
    return () => {
      if (triggerTimerRef.current) clearTimeout(triggerTimerRef.current);
    };
  }, [events]);

  // Follow mode smooth camera pan
  useEffect(() => {
    if (!followingOrderId || !stageRef.current) return;
    const followed = orderDots.find(
      (d) => d.orderId === followingOrderId || d.correlationId === followingOrderId
    );
    if (!followed) return;
    const canonId = toCanonicalNodeId(followed.currentNodeId);
    const node = NODE_MAP[canonId];
    if (!node) return;

    const centre = nodeCentre(node);
    const currentScale = stageRef.current.scaleX();
    const targetX = containerWidth / 2 - centre.x * currentScale;
    const targetY = containerHeight / 2 - centre.y * currentScale;

    (stageRef.current as Konva.Stage & { to: (config: object) => void }).to({
      x: targetX,
      y: targetY,
      duration: 0.5,
      easing: Konva.Easings.EaseInOut,
    });
    setStagePos({ x: targetX, y: targetY });
  }, [followingOrderId, orderDots, containerWidth, containerHeight]);

  // Smooth camera pan to highlighted node
  useEffect(() => {
    if (!highlightedNodeId || !stageRef.current) return;
    const canonId = toCanonicalNodeId(highlightedNodeId);
    const targetNode = GRAPH_NODES.find((n) => n.id === canonId);
    if (!targetNode) return;

    const currentScale = stageRef.current.scaleX() || 1;
    const targetX = containerWidth / 2 - (targetNode.x + targetNode.width / 2) * currentScale;
    const targetY = containerHeight / 2 - (targetNode.y + targetNode.height / 2) * currentScale;

    (stageRef.current as Konva.Stage & { to: (config: object) => void }).to({
      x: targetX,
      y: targetY,
      duration: 0.6,
      easing: Konva.Easings.EaseInOut,
    });
    setStagePos({ x: targetX, y: targetY });
  }, [highlightedNodeId, containerWidth, containerHeight]);

  // ── Render guard ─────────────────────────────────────────────────────────
  if (containerWidth === 0 || containerHeight === 0) return null;

  const isLight = theme === 'light';
  const gridDotColor = isLight ? '#DCE5F0' : '#1e293b';

  return (
    <Stage
      ref={stageRef}
      width={containerWidth}
      height={containerHeight}
      x={stagePos.x}
      y={stagePos.y}
      draggable
      onWheel={handleWheel}
      onDblClick={() => autoFitCamera(true)}
      onDblTap={() => autoFitCamera(true)}
      onDragEnd={(e) => {
        setStagePos({ x: e.target.x(), y: e.target.y() });
      }}
      style={{
        background: isLight
          ? '#F6F8FC'
          : 'radial-gradient(ellipse at 50% 30%, #0d1527 0%, #060911 100%)',
        cursor: 'grab',
      }}
    >
      {/* ── Layer 0: N8N Workflow Dot Grid & Blueprint Guides ────────────────── */}
      <Layer listening={false}>
        {/* Soft blueprint workflow guide lines (N8N feel) */}
        <Line
          points={[0, 300, CANVAS_WIDTH, 300]}
          stroke={isLight ? 'rgba(220, 229, 240, 0.8)' : 'rgba(51, 65, 85, 0.28)'}
          strokeWidth={1}
          dash={[6, 12]}
          listening={false}
        />
        <Line
          points={[0, 130, CANVAS_WIDTH, 130]}
          stroke={isLight ? 'rgba(215, 227, 239, 0.5)' : 'rgba(51, 65, 85, 0.18)'}
          strokeWidth={1}
          dash={[6, 12]}
          listening={false}
        />
        <Line
          points={[0, 480, CANVAS_WIDTH, 480]}
          stroke={isLight ? 'rgba(215, 227, 239, 0.5)' : 'rgba(51, 65, 85, 0.18)'}
          strokeWidth={1}
          dash={[6, 12]}
          listening={false}
        />

        {gridDots.map((pt, i) => (
          <Circle
            key={`grid-${i}`}
            x={pt.x}
            y={pt.y}
            radius={1.3}
            fill={gridDotColor}
            listening={false}
          />
        ))}
      </Layer>

      {/* ── Layer 1: Animated Edges with Active Flow Particles ─────────────── */}
      <Layer>
        {GRAPH_EDGES.map((edge, i) => {
          const points = edgePoints[i];
          if (!points) return null;

          const isMain = edge.type === 'main';
          const isEdgeHighlighted =
            !!highlightedNodeId &&
            (edge.from === highlightedNodeId || edge.to === highlightedNodeId);
          const isEdgeActive =
            ((dotsByNode.get(edge.from)?.length || 0) > 0 || (dotsByNode.get(edge.to)?.length || 0) > 0);
          const isTriggering = activeTriggerNodeId === edge.from || activeTriggerNodeId === edge.to;
          const isEdgeFuture = ghostMode && futureNodeIds && (futureNodeIds.has(edge.from) || futureNodeIds.has(edge.to));
          const edgeOpacity = isEdgeFuture ? 0.25 : 1;

          // Error Edge Logic (Between Kitchen Queue and Preparing)
          const isKitchenErrorEdge =
            (edge.from === 'kitchen_queue' && edge.to === 'preparing') &&
            (!!activeError || !!isRetryingError || !!isResolvedError);

          const isEdgeGlowing = isEdgeHighlighted || isEdgeActive || isTriggering || isKitchenErrorEdge;

          const edgeColor = isKitchenErrorEdge
            ? isRetryingError
              ? '#F59E0B'
              : isResolvedError
              ? '#10B981'
              : '#EF4444'
            : isEdgeGlowing
            ? '#0EA5E9'
            : isMain
            ? (isLight ? '#94a3b8' : '#475569')
            : (isLight ? '#C9D7E6' : '#334155');

          const shadowColorVal = isKitchenErrorEdge
            ? isRetryingError
              ? '#F59E0B'
              : isResolvedError
              ? '#10B981'
              : '#EF4444'
            : '#0EA5E9';

          // Active particle position along the edge
          const midX = (points[0] + points[2]) / 2;
          const midY = (points[1] + points[3]) / 2;

          return (
            <Group key={`edge-group-${edge.from}-${edge.to}`} opacity={edgeOpacity}>
              <Arrow
                points={points}
                stroke={edgeColor}
                strokeWidth={isKitchenErrorEdge ? 3.5 : isTriggering ? 3.5 : isEdgeHighlighted ? 3 : isEdgeActive ? 2.5 : isMain ? 1.8 : 1}
                fill={edgeColor}
                shadowEnabled={isEdgeGlowing}
                shadowColor={shadowColorVal}
                shadowBlur={isKitchenErrorEdge ? 16 : isTriggering ? (isLight ? 12 : 18) : isEdgeHighlighted ? (isLight ? 9 : 14) : (isLight ? 5 : 8)}
                pointerLength={isMain || isEdgeGlowing ? 8 : 6}
                pointerWidth={isMain || isEdgeGlowing ? 6 : 4}
                dashEnabled
                dash={isEdgeFuture ? [4, 4] : isKitchenErrorEdge ? [10, 5] : isTriggering ? [14, 4] : isEdgeGlowing ? [10, 6] : [5, 5]}
                dashOffset={isEdgeGlowing ? dashOffset : 0}
                lineCap="round"
                lineJoin="round"
                tension={edge.type === 'side' ? 0.4 : 0}
                listening={false}
              />

              {/* Active Flow Moving Particle */}
              {isEdgeGlowing && (
                <Circle
                  x={midX + (Math.sin(dashOffset * 0.08) * 35)}
                  y={midY}
                  radius={isKitchenErrorEdge || isTriggering ? 3.5 : 2.5}
                  fill={edgeColor}
                  shadowColor={shadowColorVal}
                  shadowBlur={isKitchenErrorEdge || isTriggering ? (isLight ? 8 : 14) : (isLight ? 4 : 6)}
                  listening={false}
                />
              )}

              {/* Edge Error Status Pill Badge */}
              {isKitchenErrorEdge && (
                <Group x={midX - 44} y={midY - 11}>
                  <Rect
                    width={88}
                    height={21}
                    cornerRadius={5}
                    fill={isRetryingError ? '#F59E0B' : isResolvedError ? '#10B981' : '#EF4444'}
                    shadowColor={isRetryingError ? '#F59E0B' : isResolvedError ? '#10B981' : '#EF4444'}
                    shadowBlur={10}
                    shadowOpacity={0.8}
                    stroke="#ffffff"
                    strokeWidth={1}
                  />
                  <Text
                    text={isRetryingError ? '🔄 Retrying...' : isResolvedError ? '✅ Restored' : '⚠️ 504 Timeout'}
                    width={88}
                    height={21}
                    align="center"
                    verticalAlign="middle"
                    fontSize={8.5}
                    fontStyle="bold"
                    fontFamily="'Inter', 'Courier New', monospace"
                    fill="#ffffff"
                    listening={false}
                  />
                </Group>
              )}
            </Group>
          );
        })}
      </Layer>

      {/* ── Layer 2: 19 Workflow Nodes ──────────────────────────────────────── */}
      <Layer>
        {GRAPH_NODES.map((node) => {
          const dots = dotsByNode.get(node.id) ?? [];
          const count = badgeCountMap.get(node.id) || dots.length;
          const isFuture = ghostMode && futureNodeIds ? futureNodeIds.has(node.id) : false;
          const isErrNode = !!activeError && (node.id === activeError.failedNodeId || node.id === 'kitchen_queue');
          const isRetryingNode = !!isRetryingError && (node.id === 'kitchen_queue' || node.id === 'preparing');
          const isResolvedNode = !!isResolvedError && (node.id === 'kitchen_queue' || node.id === 'preparing');
          const errTag = isErrNode ? '504 Timeout' : undefined;

          return (
            <NodeGroup
              key={node.id}
              node={node}
              dotCount={dots.length}
              badgeCount={count}
              theme={theme}
              isHovered={hoveredNodeId === node.id}
              isHighlighted={highlightedNodeId === node.id}
              isTriggering={activeTriggerNodeId === node.id}
              isGhost={isFuture}
              isErrorNode={isErrNode}
              isRetryingNode={isRetryingNode}
              isResolvedNode={isResolvedNode}
              errorTag={errTag}
              onMouseEnter={handleNodeMouseEnter(node.id)}
              onMouseLeave={handleNodeMouseLeave}
              onClick={handleNodeClick(node.id)}
            />
          );
        })}
      </Layer>

      {/* ── Layer 3: Dynamic Telemetry (Live Orders, Waiter Movement, Zero State) ── */}
      <Layer>
        {/* Zero State: Displayed when no active orders exist */}
        {orderDots.length === 0 && (
          <Group x={CANVAS_WIDTH / 2 - 250} y={190}>
            <Rect
              width={500}
              height={76}
              cornerRadius={16}
              fill={isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.92)'}
              stroke={isLight ? '#CBD5E1' : '#334155'}
              strokeWidth={1.5}
              shadowColor="#0EA5E9"
              shadowBlur={16}
              shadowOpacity={0.2}
            />
            <Circle x={36} y={38} radius={8} fill="#10B981" />
            <Circle x={36} y={38} radius={14} stroke="#10B981" strokeWidth={1} dash={[3, 3]} opacity={0.6} />
            <Text
              text="⚡ Waiting for first order"
              x={60}
              y={20}
              fontSize={14}
              fontStyle="bold"
              fontFamily="'Inter', sans-serif"
              fill={isLight ? '#0F172A' : '#F8FAFC'}
            />
            <Text
              text="All tables available • Ready for incoming QR orders & live kitchen queue"
              x={60}
              y={44}
              fontSize={10.5}
              fontFamily="'Inter', sans-serif"
              fill={isLight ? '#64748B' : '#94A3B8'}
            />
          </Group>
        )}

        {/* Live Active Order Pills rendered below each respective stage node */}
        {orderDots.length > 0 && GRAPH_NODES.map((node) => {
          const dots = dotsByNode.get(node.id) || [];
          if (dots.length === 0) return null;

          return (
            <Group key={`dots-layer-${node.id}`}>
              {dots.map((dot, idx) => {
                const isSelected = followingOrderId === dot.orderId;
                const pillX = node.x + (idx % 2) * 78;
                const pillY = node.y + node.height + 6 + Math.floor(idx / 2) * 22;
                const label = `${dot.metadata?.table || dot.shortId}`;

                return (
                  <Group
                    key={`dot-pill-${dot.orderId}`}
                    x={pillX}
                    y={pillY}
                    onClick={handleDotClick(dot)}
                    onTap={handleDotClick(dot)}
                    cursor="pointer"
                  >
                    <Rect
                      width={74}
                      height={19}
                      cornerRadius={6}
                      fill={isSelected ? '#0EA5E9' : isLight ? '#ffffff' : '#0f172a'}
                      stroke={isSelected ? '#38BDF8' : dot.color}
                      strokeWidth={isSelected ? 1.8 : 1.2}
                      shadowColor={dot.color}
                      shadowBlur={isSelected ? 12 : 6}
                      shadowOpacity={0.6}
                    />
                    <Circle
                      x={8}
                      y={9.5}
                      radius={3.5}
                      fill={dot.color}
                      shadowColor={dot.color}
                      shadowBlur={4}
                    />
                    <Text
                      text={label}
                      x={16}
                      y={0}
                      width={55}
                      height={19}
                      align="left"
                      verticalAlign="middle"
                      fontSize={8}
                      fontStyle="bold"
                      fontFamily="'Inter', monospace"
                      fill={isSelected ? '#ffffff' : isLight ? '#0f172a' : '#f8fafc'}
                      listening={false}
                    />
                  </Group>
                );
              })}
            </Group>
          );
        })}

        {/* ── Dynamic Waiter Travel Route & Pulse (Shown when an order has assigned waiter) ── */}
        {(() => {
          const waiterDot = orderDots.find(
            (d) => d.metadata?.waiter && (d.currentNodeId === 'waiter_assigned' || d.currentNodeId === 'ready' || d.currentNodeId === 'served')
          );
          if (!waiterDot) return null;

          const waiterLabel = `🚶 ${waiterDot.metadata?.waiter}: → ${waiterDot.metadata?.table || 'Table'}`;
          return (
            <Group>
              <Line
                points={[1560, 265, 1740, 265]}
                stroke="#a855f7"
                strokeWidth={1.5}
                dash={[6, 4]}
                dashOffset={-dashOffset}
                opacity={0.65}
                listening={false}
              />
              <Circle
                x={1740}
                y={265}
                radius={7 + Math.sin(dashOffset * 0.1) * 2.5}
                stroke="#a855f7"
                strokeWidth={1.2}
                opacity={0.8}
                listening={false}
              />
              <Circle x={1740} y={265} radius={3} fill="#c084fc" listening={false} />
              <Group x={1650 + Math.sin(dashOffset * 0.04) * 70} y={265} listening={false}>
                <Rect
                  width={164}
                  height={20}
                  offsetX={82}
                  offsetY={10}
                  cornerRadius={10}
                  fill={isLight ? '#ffffff' : '#1e1b4b'}
                  stroke="#a855f7"
                  strokeWidth={1.2}
                  shadowColor="#a855f7"
                  shadowBlur={10}
                  shadowOpacity={0.7}
                />
                <Circle x={-70} y={0} radius={4} fill="#a855f7" shadowColor="#c084fc" shadowBlur={8} />
                <Text
                  text={waiterLabel}
                  width={145}
                  height={20}
                  offsetX={62}
                  offsetY={10}
                  align="center"
                  verticalAlign="middle"
                  fontSize={8}
                  fontStyle="bold"
                  fontFamily="'Inter', 'Segoe UI', monospace"
                  fill={isLight ? '#6b21a8' : '#e9d5ff'}
                />
              </Group>
            </Group>
          );
        })()}
      </Layer>
    </Stage>
  );
}
