'use client';

/**
 * Phase-19: Founder Control Center — GraphCanvas
 *
 * Renders the live execution graph as an n8n-style Konva canvas:
 *  • 19 pipeline nodes as rounded, coloured rectangles
 *  • Animated directional arrows between nodes
 *  • Glowing order-dot circles that move between nodes
 *  • Pan / zoom (wheel) with drag support
 *  • Follow-mode: stage smoothly tracks a chosen order dot
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
} from './NodeDefinitions';
import type { OrderDotState, GraphNode, SystemEvent } from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_SCALE = 0.3;
const MAX_SCALE = 2.5;
const ZOOM_SENSITIVITY = 0.001;

/** How many dot columns before wrapping to next row inside a node */
const DOTS_PER_ROW = 4;
/** Horizontal spacing between dots inside a node */
const DOT_COL_GAP = 22;
/** Vertical spacing between dot rows inside a node */
const DOT_ROW_GAP = 22;
/** Dot radius */
const DOT_RADIUS = 7;
/** Badge radius (11px radius = 22px diameter badge) */
const BADGE_RADIUS = 11;

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface GraphCanvasProps {
  /** Actual container pixel width */
  containerWidth: number;
  /** Actual container pixel height */
  containerHeight: number;
  orderDots: OrderDotState[];
  events: SystemEvent[];
  followingOrderId: string | null;
  highlightedNodeId?: string | null;
  theme?: 'dark' | 'light';
  onNodeClick: (nodeId: string) => void;
  onDotClick: (dot: OrderDotState) => void;
  onStageReady?: (stage: Konva.Stage) => void;
}

// ─── Helper: get dot canvas position within its node ─────────────────────────

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

/** Returns the absolute canvas centre of a node */
function nodeCentre(node: GraphNode): { x: number; y: number } {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

/** Right-centre of a node (arrow source) */
function nodeRightCentre(node: GraphNode): [number, number] {
  return [node.x + node.width, node.y + node.height / 2];
}

/** Left-centre of a node (arrow target) */
function nodeLeftCentre(node: GraphNode): [number, number] {
  return [node.x, node.y + node.height / 2];
}

/** Top-centre of a node */
function nodeTopCentre(node: GraphNode): [number, number] {
  return [node.x + node.width / 2, node.y];
}

/** Bottom-centre of a node */
function nodeBottomCentre(node: GraphNode): [number, number] {
  return [node.x + node.width / 2, node.y + node.height];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const LIGHT_PASTEL_COLORS: Record<string, { bg: string; border: string; text: string; dot: string; badge: string }> = {
  customer: { bg: '#e0f2fe', border: '#38bdf8', text: '#0369a1', dot: '#0284c7', badge: '#0284c7' },
  kitchen:  { bg: '#ffedd5', border: '#fb923c', text: '#9a3412', dot: '#ea580c', badge: '#ea580c' },
  ready:    { bg: '#dcfce7', border: '#4ade80', text: '#15803d', dot: '#16a34a', badge: '#16a34a' },
  billing:  { bg: '#f3e8ff', border: '#c084fc', text: '#7e22ce', dot: '#9333ea', badge: '#9333ea' },
  side:     { bg: '#f1f5f9', border: '#94a3b8', text: '#334155', dot: '#64748b', badge: '#475569' },
};

function getNodeCategory(nodeId: string): 'customer' | 'kitchen' | 'ready' | 'billing' | 'side' {
  if (['qr_scan', 'customer_menu', 'cart', 'checkout'].includes(nodeId)) return 'customer';
  if (['live_orders', 'kitchen_queue', 'preparing'].includes(nodeId)) return 'kitchen';
  if (['ready', 'waiter_assigned', 'served'].includes(nodeId)) return 'ready';
  if (['bill_closed', 'payment_processing', 'session_closed'].includes(nodeId)) return 'billing';
  return 'side';
}

function getNodeBadgeFill(nodeId: string): string {
  if (nodeId === 'inventory') return '#0d9488';
  if (nodeId === 'push_notifications') return '#6366f1';
  if (nodeId === 'audit_logs') return '#475569';
  if (nodeId === 'customer_calls') return '#e11d48';
  if (nodeId === 'reports') return '#8b5cf6';
  if (['qr_scan', 'customer_menu', 'cart', 'checkout'].includes(nodeId)) return '#2563eb';
  if (['live_orders', 'kitchen_queue', 'preparing'].includes(nodeId)) return '#f97316';
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
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}

/** Renders a single graph node (rounded rect + label + numbered badge) */
const NodeGroup = React.memo(function NodeGroup({
  node,
  dotCount,
  badgeCount,
  theme = 'dark',
  isHovered,
  isHighlighted,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: NodeGroupProps) {
  const isLight = theme === 'light';
  const cat = getNodeCategory(node.id);
  const pastel = LIGHT_PASTEL_COLORS[cat];

  const rectFill = isLight ? pastel.bg : node.color;
  const rectStroke = isHighlighted
    ? '#38bdf8'
    : isHovered
    ? (isLight ? '#0284c7' : '#ffffff')
    : (isLight ? pastel.border : 'rgba(255,255,255,0.18)');
  const labelFill = isLight ? pastel.text : '#ffffff';
  const dotColor = isLight ? pastel.dot : '#38bdf8';
  const badgeColor = isLight ? pastel.badge : getNodeBadgeFill(node.id);

  const glowColor =
    node.type === 'side' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.3)';

  return (
    <Group
      x={node.x}
      y={node.y}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onTap={onClick}
    >
      {/* Main rect */}
      <Rect
        width={node.width}
        height={node.height}
        cornerRadius={10}
        fill={rectFill}
        shadowEnabled={isHovered || !!isHighlighted || badgeCount > 0}
        shadowColor={isHighlighted ? '#38bdf8' : isHovered ? '#ffffff' : (isLight ? '#94a3b8' : node.color)}
        shadowBlur={isLight ? (isHighlighted ? 12 : 6) : (isHighlighted ? 22 : isHovered ? 16 : 8)}
        shadowOpacity={isLight ? (isHighlighted ? 0.5 : 0.25) : (isHighlighted ? 0.9 : isHovered ? 0.45 : 0.6)}
        stroke={rectStroke}
        strokeWidth={isHighlighted ? 2.5 : isHovered ? 1.5 : 1}
      />
      {/* Subtle inner highlight strip */}
      <Rect
        width={node.width}
        height={9}
        cornerRadius={[10, 10, 0, 0]}
        fill={isLight ? 'rgba(255,255,255,0.5)' : glowColor}
        listening={false}
      />
      {/* Category Indicator Dot: Shifted to x=6, y=11 with 32px clearance to text for zero overlap at all zooms */}
      <Circle
        x={6}
        y={11}
        radius={3}
        fill={dotColor}
        stroke="rgba(255,255,255,0.8)"
        strokeWidth={0.8}
        shadowColor={dotColor}
        shadowBlur={3}
        shadowOpacity={0.7}
        listening={false}
      />
      {/* Label: Generous 38px left margin guarantees 29px distance between dot and text */}
      <Text
        text={node.label}
        x={38}
        y={0}
        width={node.width - 70}
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
      {/* Numbered Badge (Replaces generic red dot with circular numbered badge) */}
      {badgeCount > 0 && (
        <Group x={node.width - 6} y={-4}>
          <Circle
            radius={badgeCount > 9 ? 11.5 : 10}
            fill={badgeColor}
            shadowColor={badgeColor}
            shadowBlur={isLight ? 5 : 9}
            shadowOpacity={isLight ? 0.45 : 0.9}
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

// ─── Animated dash offset hook ────────────────────────────────────────────────

/** Produces an ever-decreasing dashOffset value via rAF to animate marching-ants. */
function useAnimatedDashOffset(enabled: boolean): number {
  const [dashOffset, setDashOffset] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let offset = 0;
    const animate = () => {
      offset -= 1.2; // move right-to-left
      setDashOffset(offset);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled]);

  return dashOffset;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GraphCanvas({
  containerWidth,
  containerHeight,
  orderDots,
  events,
  followingOrderId,
  highlightedNodeId,
  theme = 'dark',
  onNodeClick,
  onDotClick,
  onStageReady,
}: GraphCanvasProps) {
  // ── ALL hooks MUST be declared before any conditional returns ───────────────

  const stageRef = useRef<Konva.Stage | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  /** Animated dash offset drives the marching-ants effect on main edges */
  const dashOffset = useAnimatedDashOffset(true);

  /**
   * Build a map: nodeId → badge count (dots for pipeline nodes, events for side nodes)
   */
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

  /**
   * Build a map: nodeId → list of OrderDotState for fast lookup.
   * Recalculates only when orderDots reference changes.
   */
  const dotsByNode = useMemo<Map<string, OrderDotState[]>>(() => {
    const map = new Map<string, OrderDotState[]>();
    for (const dot of orderDots) {
      const list = map.get(dot.currentNodeId) ?? [];
      list.push(dot);
      map.set(dot.currentNodeId, list);
    }
    return map;
  }, [orderDots]);

  /** Stable handler factory: node hover enter */
  const handleNodeMouseEnter = useCallback(
    (nodeId: string) => () => setHoveredNodeId(nodeId),
    []
  );

  /** Stable handler: node hover leave */
  const handleNodeMouseLeave = useCallback(() => setHoveredNodeId(null), []);

  /** Stable handler factory: node click */
  const handleNodeClick = useCallback(
    (nodeId: string) => () => onNodeClick(nodeId),
    [onNodeClick]
  );

  /** Stable handler factory: dot click */
  const handleDotClick = useCallback(
    (dot: OrderDotState) => () => onDotClick(dot),
    [onDotClick]
  );

  /** Wheel zoom — anchors scale to the cursor position */
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

  /** Notify parent once the Stage DOM node is mounted */
  useEffect(() => {
    if (stageRef.current && onStageReady) {
      onStageReady(stageRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onStageReady]);

  /**
   * Follow mode: whenever followingOrderId changes or the tracked dot moves
   * to a new node, smoothly pan the stage so that dot is centred in the
   * viewport. Uses Konva's built-in tween (.to) for a polished animation.
   */
  useEffect(() => {
    if (!followingOrderId || !stageRef.current) return;

    const dot = orderDots.find((d) => d.orderId === followingOrderId);
    if (!dot) return;

    const node = NODE_MAP[dot.currentNodeId];
    if (!node) return;

    const centre = nodeCentre(node);
    const currentScale = stageRef.current.scaleX();

    // Target stage position: put the node centre at the viewport centre
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

  /** Smooth camera pan to highlighted node when selected */
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

  /**
   * Pre-compute edge anchor points once (nodes never move).
   * Side edges use top/bottom anchors; main edges use right→left.
   */
  const edgePoints = useMemo<(number[] | null)[]>(() => {
    return GRAPH_EDGES.map((edge) => {
      const src = NODE_MAP[edge.from];
      const tgt = NODE_MAP[edge.to];
      if (!src || !tgt) return null;

      if (edge.type === 'side') {
        if (tgt.y < src.y) {
          // Target is above source
          return [...nodeTopCentre(src), ...nodeBottomCentre(tgt)];
        } else {
          // Target is below or same row
          return [...nodeBottomCentre(src), ...nodeTopCentre(tgt)];
        }
      }

      // Main pipeline: right → left
      return [...nodeRightCentre(src), ...nodeLeftCentre(tgt)];
    });
  }, []); // GRAPH_EDGES and NODE_MAP are module-level constants

  // ── Render guard: wait until container has real dimensions ──────────────────
  if (containerWidth === 0 || containerHeight === 0) return null;

  // ── JSX ─────────────────────────────────────────────────────────────────────
  return (
    <Stage
      ref={stageRef}
      width={containerWidth}
      height={containerHeight}
      draggable
      onWheel={handleWheel}
      onDragEnd={(e) => {
        setStagePos({ x: e.target.x(), y: e.target.y() });
      }}
      style={{ background: theme === 'light' ? '#f8fafc' : '#0f172a', cursor: 'grab' }}
    >
      {/* ── Layer 1: Edges ──────────────────────────────────────────────────── */}
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
          const isEdgeGlowing = isEdgeHighlighted || isEdgeActive;

          const edgeColor = isEdgeGlowing
            ? '#38bdf8'
            : isMain
            ? (theme === 'light' ? '#94a3b8' : '#64748b')
            : (theme === 'light' ? '#cbd5e1' : '#374151');

          return (
            <Arrow
              key={`edge-${edge.from}-${edge.to}`}
              points={points}
              stroke={edgeColor}
              strokeWidth={isEdgeHighlighted ? 3.5 : isEdgeActive ? 2.5 : isMain ? 2 : 1}
              fill={edgeColor}
              shadowEnabled={isEdgeGlowing}
              shadowColor="#38bdf8"
              shadowBlur={isEdgeHighlighted ? 16 : 10}
              pointerLength={isMain || isEdgeGlowing ? 8 : 6}
              pointerWidth={isMain || isEdgeGlowing ? 6 : 4}
              dashEnabled
              dash={isEdgeGlowing ? [10, 6] : [5, 5]}
              dashOffset={isEdgeGlowing ? dashOffset : 0}
              lineCap="round"
              lineJoin="round"
              tension={edge.type === 'side' ? 0.4 : 0}
              listening={false}
            />
          );
        })}
      </Layer>

      {/* ── Layer 2: Nodes ──────────────────────────────────────────────────── */}
      <Layer>
        {GRAPH_NODES.map((node) => {
          const dots = dotsByNode.get(node.id) ?? [];
          const count = badgeCountMap.get(node.id) || dots.length;
          return (
            <NodeGroup
              key={node.id}
              node={node}
              dotCount={dots.length}
              badgeCount={count}
              theme={theme}
              isHovered={hoveredNodeId === node.id}
              isHighlighted={highlightedNodeId === node.id}
              onMouseEnter={handleNodeMouseEnter(node.id)}
              onMouseLeave={handleNodeMouseLeave}
              onClick={handleNodeClick(node.id)}
            />
          );
        })}
      </Layer>

      {/* ── Layer 3: Order Dots ─────────────────────────────────────────────── */}
      <Layer>
        {GRAPH_NODES.map((node) => {
          const dots = dotsByNode.get(node.id) ?? [];
          const cx = nodeCentre(node).x;
          const cy = nodeCentre(node).y;

          return dots.map((dot, idx) => {
            const offset = getDotOffset(idx, node.width, node.height);
            const dx = cx + offset.x;
            const dy = cy + offset.y;
            const isFollowed = dot.orderId === followingOrderId;

            return (
              <Group
                key={dot.orderId}
                x={dx}
                y={dy}
                onClick={handleDotClick(dot)}
                onTap={handleDotClick(dot)}
              >
                {/* Outer glow ring: only shown for the followed dot */}
                {isFollowed && (
                  <Circle
                    radius={DOT_RADIUS + 5}
                    fill="transparent"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    opacity={0.6}
                    listening={false}
                  />
                )}
                {/* Dot body */}
                <Circle
                  radius={DOT_RADIUS}
                  fill={dot.color}
                  shadowColor={dot.color}
                  shadowBlur={15}
                  shadowOpacity={0.8}
                  shadowEnabled
                  stroke={isFollowed ? '#ffffff' : 'rgba(255,255,255,0.3)'}
                  strokeWidth={isFollowed ? 1.5 : 0.5}
                />
                {/* Short ID label below the dot */}
                <Text
                  text={dot.shortId}
                  fontSize={9}
                  fontFamily="'JetBrains Mono', 'Fira Code', monospace"
                  fill="#e2e8f0"
                  align="center"
                  width={40}
                  offsetX={20}
                  y={DOT_RADIUS + 2}
                  listening={false}
                />
              </Group>
            );
          });
        })}
      </Layer>
    </Stage>
  );
}
