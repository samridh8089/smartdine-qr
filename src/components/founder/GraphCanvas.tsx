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
const DOT_RADIUS = 9;
/** Badge radius */
const BADGE_RADIUS = 9;

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface GraphCanvasProps {
  /** Actual container pixel width */
  containerWidth: number;
  /** Actual container pixel height */
  containerHeight: number;
  orderDots: OrderDotState[];
  events: SystemEvent[];
  followingOrderId: string | null;
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
  const col = indexInNode % DOTS_PER_ROW;
  const row = Math.floor(indexInNode / DOTS_PER_ROW);
  const totalCols = Math.min(DOTS_PER_ROW, 4);
  const startX = (nodeWidth - (totalCols - 1) * DOT_COL_GAP) / 2;
  const startY = nodeHeight / 2;
  return {
    x: startX + col * DOT_COL_GAP - nodeWidth / 2,
    y: startY + row * DOT_ROW_GAP - nodeHeight / 2,
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

interface NodeGroupProps {
  node: GraphNode;
  dotCount: number;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}

/** Renders a single graph node (rounded rect + label + optional badge) */
const NodeGroup = React.memo(function NodeGroup({
  node,
  dotCount,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: NodeGroupProps) {
  const glowColor =
    node.type === 'side' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.35)';

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
        fill={node.color}
        shadowEnabled={isHovered || dotCount > 0}
        shadowColor={isHovered ? '#ffffff' : node.color}
        shadowBlur={isHovered ? 16 : 8}
        shadowOpacity={isHovered ? 0.45 : 0.6}
        stroke={isHovered ? '#ffffff' : 'rgba(255,255,255,0.15)'}
        strokeWidth={isHovered ? 1.5 : 0.8}
      />
      {/* Subtle inner highlight strip */}
      <Rect
        width={node.width}
        height={12}
        cornerRadius={[10, 10, 0, 0]}
        fill={glowColor}
        listening={false}
      />
      {/* Label */}
      <Text
        text={node.label}
        width={node.width}
        height={node.height}
        align="center"
        verticalAlign="middle"
        fontSize={12}
        fontStyle="bold"
        fontFamily="'Inter', 'Segoe UI', sans-serif"
        fill="#ffffff"
        listening={false}
      />
      {/* Dot count badge */}
      {dotCount > 0 && (
        <Group x={node.width - BADGE_RADIUS} y={-BADGE_RADIUS}>
          <Circle
            radius={BADGE_RADIUS}
            fill="#ef4444"
            shadowColor="#ef4444"
            shadowBlur={6}
            shadowOpacity={0.8}
          />
          <Text
            text={String(dotCount > 99 ? '99+' : dotCount)}
            width={BADGE_RADIUS * 2}
            height={BADGE_RADIUS * 2}
            offsetX={BADGE_RADIUS}
            offsetY={BADGE_RADIUS}
            align="center"
            verticalAlign="middle"
            fontSize={8}
            fontStyle="bold"
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
      style={{ background: '#0f172a', cursor: 'grab' }}
    >
      {/* ── Layer 1: Edges ──────────────────────────────────────────────────── */}
      <Layer>
        {GRAPH_EDGES.map((edge, i) => {
          const points = edgePoints[i];
          if (!points) return null;

          const isMain = edge.type === 'main';

          return (
            <Arrow
              key={`edge-${edge.from}-${edge.to}`}
              points={points}
              stroke={isMain ? '#64748b' : '#374151'}
              strokeWidth={isMain ? 2 : 1}
              fill={isMain ? '#64748b' : '#374151'}
              pointerLength={isMain ? 8 : 6}
              pointerWidth={isMain ? 6 : 4}
              dashEnabled
              dash={isMain ? [10, 6] : [5, 5]}
              dashOffset={isMain ? dashOffset : 0}
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
          return (
            <NodeGroup
              key={node.id}
              node={node}
              dotCount={dots.length}
              isHovered={hoveredNodeId === node.id}
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
