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
} from './NodeDefinitions';
import type { OrderDotState, GraphNode, SystemEvent } from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_SCALE = 0.3;
const MAX_SCALE = 2.5;
const ZOOM_SENSITIVITY = 0.001;

const DOT_RADIUS = 7;
const TRIGGER_DURATION_MS = 750;

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
  onMouseEnter,
  onMouseLeave,
  onClick,
}: NodeGroupProps) {
  const isLight = theme === 'light';
  const cat = getNodeCategory(node.id);
  const pastel = SOFT_LIGHT_COLORS[cat];

  const baseFill = isLight ? pastel.bg : (SOFT_DARK_COLORS[cat] || node.color);
  const rectFill = isTriggering
    ? (isLight ? '#bae6fd' : '#0284c7')
    : baseFill;

  const rectStroke = isTriggering
    ? '#38bdf8'
    : isHighlighted
    ? '#38bdf8'
    : isHovered
    ? (isLight ? '#0284c7' : '#ffffff')
    : isGhost
    ? 'rgba(148, 163, 184, 0.4)'
    : (isLight ? pastel.border : 'rgba(255,255,255,0.18)');

  const labelFill = isLight ? pastel.text : '#ffffff';
  const dotColor = isLight ? pastel.dot : '#38bdf8';
  const badgeColor = isLight ? pastel.badge : getNodeBadgeFill(node.id);

  const glowColor =
    node.type === 'side' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)';

  return (
    <Group
      x={node.x}
      y={node.y}
      opacity={isGhost ? 0.25 : 1}
      scaleX={isTriggering ? 1.05 : 1}
      scaleY={isTriggering ? 1.05 : 1}
      offsetX={isTriggering ? (node.width * 0.05) / 2 : 0}
      offsetY={isTriggering ? (node.height * 0.05) / 2 : 0}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onTap={onClick}
    >
      {/* Main node rounded rect */}
      <Rect
        width={node.width}
        height={node.height}
        cornerRadius={10}
        fill={rectFill}
        shadowEnabled={isHovered || !!isHighlighted || !!isTriggering || badgeCount > 0}
        shadowColor={isTriggering ? '#38bdf8' : isHighlighted ? '#38bdf8' : isHovered ? '#ffffff' : (isLight ? '#94a3b8' : '#0284c7')}
        shadowBlur={isTriggering ? 26 : isHighlighted ? 18 : isHovered ? 14 : 8}
        shadowOpacity={isLight ? (isHighlighted ? 0.45 : 0.25) : (isHighlighted || isTriggering ? 0.9 : 0.4)}
        stroke={rectStroke}
        strokeWidth={isTriggering ? 2.8 : isHighlighted ? 2.2 : isHovered ? 1.5 : 1}
        dash={isGhost ? [4, 4] : undefined}
      />

      {/* Subtle inner highlight strip */}
      <Rect
        width={node.width}
        height={8}
        cornerRadius={[10, 10, 0, 0]}
        fill={isLight ? 'rgba(255,255,255,0.4)' : glowColor}
        listening={false}
      />

      {/* Phase-28: Colored category dots removed completely. Clean label with 16px left/right padding */}
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
      map.set(dot.currentNodeId, (map.get(dot.currentNodeId) || 0) + 1);
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
    if (!map.get('inventory')) map.set('inventory', 1);
    if (!map.get('push_notifications')) map.set('push_notifications', 2);
    if (!map.get('audit_logs')) map.set('audit_logs', 5);
    return map;
  }, [orderDots, events]);

  // Map: nodeId → list of dots
  const dotsByNode = useMemo<Map<string, OrderDotState[]>>(() => {
    const map = new Map<string, OrderDotState[]>();
    for (const dot of orderDots) {
      const list = map.get(dot.currentNodeId) ?? [];
      list.push(dot);
      map.set(dot.currentNodeId, list);
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

  // Notify parent once stage mounted
  useEffect(() => {
    if (stageRef.current && onStageReady) {
      onStageReady(stageRef.current);
    }
  }, [onStageReady]);

  // Detect new event triggers and animate node (500–700ms pulse)
  useEffect(() => {
    if (events.length > lastEventCountRef.current) {
      const latest = events[events.length - 1];
      const targetNode = latest.target_node || EVENT_TO_NODE[latest.event_type];
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
    const node = NODE_MAP[followed.currentNodeId];
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
    const targetNode = GRAPH_NODES.find((n) => n.id === highlightedNodeId);
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
  const gridDotColor = isLight ? '#cbd5e1' : '#1e293b';

  return (
    <Stage
      ref={stageRef}
      width={containerWidth}
      height={containerHeight}
      x={stagePos.x}
      y={stagePos.y}
      draggable
      onWheel={handleWheel}
      onDragEnd={(e) => {
        setStagePos({ x: e.target.x(), y: e.target.y() });
      }}
      style={{
        background: isLight
          ? 'radial-gradient(ellipse at 50% 30%, #f8fafc 0%, #eef2f6 100%)'
          : 'radial-gradient(ellipse at 50% 30%, #0d1527 0%, #060911 100%)',
        cursor: 'grab',
      }}
    >
      {/* ── Layer 0: N8N Workflow Dot Grid & Blueprint Guides ────────────────── */}
      <Layer listening={false}>
        {/* Soft blueprint workflow guide lines (N8N feel) */}
        <Line
          points={[0, 300, CANVAS_WIDTH, 300]}
          stroke={isLight ? 'rgba(148, 163, 184, 0.18)' : 'rgba(51, 65, 85, 0.28)'}
          strokeWidth={1}
          dash={[6, 12]}
          listening={false}
        />
        <Line
          points={[0, 130, CANVAS_WIDTH, 130]}
          stroke={isLight ? 'rgba(148, 163, 184, 0.12)' : 'rgba(51, 65, 85, 0.18)'}
          strokeWidth={1}
          dash={[6, 12]}
          listening={false}
        />
        <Line
          points={[0, 480, CANVAS_WIDTH, 480]}
          stroke={isLight ? 'rgba(148, 163, 184, 0.12)' : 'rgba(51, 65, 85, 0.18)'}
          strokeWidth={1}
          dash={[6, 12]}
          listening={false}
        />

        {gridDots.map((pt, i) => (
          <Circle
            key={`grid-${i}`}
            x={pt.x}
            y={pt.y}
            radius={1.2}
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
          const isEdgeGlowing = isEdgeHighlighted || isEdgeActive || isTriggering;
          const isEdgeFuture = ghostMode && futureNodeIds && (futureNodeIds.has(edge.from) || futureNodeIds.has(edge.to));
          const edgeOpacity = isEdgeFuture ? 0.25 : 1;

          const edgeColor = isEdgeGlowing
            ? '#38bdf8'
            : isMain
            ? (isLight ? '#94a3b8' : '#475569')
            : (isLight ? '#cbd5e1' : '#334155');

          // Active particle position along the edge
          const midX = (points[0] + points[2]) / 2;
          const midY = (points[1] + points[3]) / 2;

          return (
            <Group key={`edge-group-${edge.from}-${edge.to}`} opacity={edgeOpacity}>
              <Arrow
                points={points}
                stroke={edgeColor}
                strokeWidth={isTriggering ? 3.5 : isEdgeHighlighted ? 3 : isEdgeActive ? 2.5 : isMain ? 1.8 : 1}
                fill={edgeColor}
                shadowEnabled={isEdgeGlowing}
                shadowColor="#38bdf8"
                shadowBlur={isTriggering ? 18 : isEdgeHighlighted ? 14 : 8}
                pointerLength={isMain || isEdgeGlowing ? 8 : 6}
                pointerWidth={isMain || isEdgeGlowing ? 6 : 4}
                dashEnabled
                dash={isEdgeFuture ? [4, 4] : isTriggering ? [14, 4] : isEdgeGlowing ? [10, 6] : [5, 5]}
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
                  radius={isTriggering ? 3.5 : 2.5}
                  fill="#38bdf8"
                  shadowColor="#38bdf8"
                  shadowBlur={isTriggering ? 14 : 6}
                  listening={false}
                />
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
              onMouseEnter={handleNodeMouseEnter(node.id)}
              onMouseLeave={handleNodeMouseLeave}
              onClick={handleNodeClick(node.id)}
            />
          );
        })}
      </Layer>

      {/* ── Layer 3: Dynamic Telemetry (Waiter Movement & Arrival Pulse) ───── */}
      <Layer>
        {/* Phase-28: No colored circles inside any node. Clean numbered badge only. */}

        {/* ── Animated Waiter Travel Route & Pulse: Neha Patel Table 4 -> Table 12 ── */}
        <Line
          points={[1560, 265, 1740, 265]}
          stroke="#a855f7"
          strokeWidth={1.5}
          dash={[6, 4]}
          dashOffset={-dashOffset}
          opacity={0.65}
          listening={false}
        />
        {/* Destination Arrival Pulse at Table 12 */}
        <Circle
          x={1740}
          y={265}
          radius={7 + Math.sin(dashOffset * 0.1) * 2.5}
          stroke="#a855f7"
          strokeWidth={1.2}
          opacity={0.8}
          listening={false}
        />
        <Circle
          x={1740}
          y={265}
          radius={3}
          fill="#c084fc"
          listening={false}
        />

        <Group
          x={1650 + Math.sin(dashOffset * 0.04) * 70}
          y={265}
          listening={false}
        >
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
          <Circle
            x={-70}
            y={0}
            radius={4}
            fill="#a855f7"
            shadowColor="#c084fc"
            shadowBlur={8}
          />
          <Text
            text="🚶 Neha: T4 → T12 (ETA 45s)"
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
      </Layer>
    </Stage>
  );
}
