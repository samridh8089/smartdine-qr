'use client';

import React from 'react';
import { Group, Rect, Circle, Ellipse, Text, Line } from 'react-konva';
import { FloorPlanItem } from './types';

interface TableNodeProps {
  item: FloorPlanItem;
  isSelected: boolean;
  isColliding?: boolean;
  isEditable: boolean;
  onSelect: (item: FloorPlanItem, e: any) => void;
  onChange: (newAttrs: Partial<FloorPlanItem>) => void;
  onDragMove?: (e: any) => void;
  onDragEnd?: (e: any) => void;
}

export const TableNode: React.FC<TableNodeProps> = ({
  item,
  isSelected,
  isColliding = false,
  isEditable,
  onSelect,
  onChange,
  onDragMove,
  onDragEnd
}) => {
  const shape = item.shape || 'rectangle';
  const status = item.status || 'available';
  const width = Math.max(50, item.width);
  const height = Math.max(50, item.height);

  // Status-driven styling (OpenTable + Toast POS Executive Colors)
  let fillColor = '#FFFFFF';
  let strokeColor = '#C6E7D2'; // Soft Sage for available
  let strokeWidth = 2;
  let strokeDash: number[] | undefined = undefined;

  switch (status) {
    case 'occupied':
      fillColor = '#FFFFFF';
      strokeColor = '#FCA5A5'; // Soft Warm Red border
      strokeWidth = 2.5;
      break;
    case 'reserved':
      fillColor = '#FFFFFF';
      strokeColor = '#D4D4D8'; // Soft Charcoal border
      strokeWidth = 2;
      break;
    case 'cleaning':
      fillColor = '#FAFAFA'; // Soft Neutral
      strokeColor = '#E4E4E7';
      strokeWidth = 1.8;
      break;
    case 'merged':
      fillColor = '#FFFFFF';
      strokeColor = '#171717';
      strokeWidth = 2;
      strokeDash = [6, 4]; // Dashed border
      break;
    case 'available':
    default:
      fillColor = '#FFFFFF';
      strokeColor = '#C6E7D2'; // Soft Sage border
      strokeWidth = 2;
      break;
  }

  // Highlight on collision or selection
  if (isColliding) {
    strokeColor = '#059669'; // Emerald collision glow
    strokeWidth = 3.5;
  } else if (isSelected && isEditable) {
    strokeColor = '#171717';
    strokeWidth = 2.5;
  }

  // Timer ring calculation for occupied tables
  const elapsedMinutes = item.elapsedMinutes || 0;
  let timerRingColor = '#10B981'; // 0-45m: Calm Green
  if (elapsedMinutes > 75) {
    timerRingColor = '#EF4444'; // >75m: Soft Red (Overdue)
  } else if (elapsedMinutes > 45) {
    timerRingColor = '#F59E0B'; // 45-75m: Amber (Attention)
  }

  // Active Service Badges
  const badges = item.service_badges || [];

  // Single-source seat count
  const seatCount = item.seats || 4;

  // Render perimeter seat markers
  const renderSeats = () => {
    const seatMarkers = [];
    const seatRadius = 6;
    const seatOffset = 10;

    if (shape === 'circle' || shape === 'oval') {
      const rx = width / 2;
      const ry = height / 2;
      for (let i = 0; i < seatCount; i++) {
        const angle = (i * 2 * Math.PI) / seatCount;
        const cx = rx + (rx + seatOffset) * Math.cos(angle);
        const cy = ry + (ry + seatOffset) * Math.sin(angle);
        seatMarkers.push(
          <Circle
            key={`seat_${i}`}
            x={cx}
            y={cy}
            radius={seatRadius}
            fill="#F5F5F4"
            stroke="#D6D3D1"
            strokeWidth={1}
            listening={false}
          />
        );
      }
    } else {
      // Rectangle/Square: distribute top and bottom
      const seatsPerSide = Math.max(1, Math.floor(seatCount / 2));
      const topStep = width / (seatsPerSide + 1);
      
      // Top row
      for (let i = 1; i <= seatsPerSide; i++) {
        seatMarkers.push(
          <Circle
            key={`seat_top_${i}`}
            x={i * topStep}
            y={-seatOffset}
            radius={seatRadius}
            fill="#F5F5F4"
            stroke="#D6D3D1"
            strokeWidth={1}
            listening={false}
          />
        );
      }
      
      // Bottom row
      const bottomSeats = seatCount - seatsPerSide;
      const bottomStep = width / (bottomSeats + 1);
      for (let i = 1; i <= bottomSeats; i++) {
        seatMarkers.push(
          <Circle
            key={`seat_bottom_${i}`}
            x={i * bottomStep}
            y={height + seatOffset}
            radius={seatRadius}
            fill="#F5F5F4"
            stroke="#D6D3D1"
            strokeWidth={1}
            listening={false}
          />
        );
      }
    }

    return seatMarkers;
  };

  const handleDragEndInternal = (e: any) => {
    const node = e.target;
    onChange({
      x: node.x(),
      y: node.y()
    });
    if (onDragEnd) onDragEnd(e);
  };

  const displayLabel = item.display_number || item.tableNumber || item.name?.replace(/^Table\s*/i, '') || 'T';

  return (
    <Group
      id={item.id}
      x={item.x}
      y={item.y}
      rotation={item.rotation || 0}
      draggable={isEditable}
      onClick={(e) => onSelect(item, e)}
      onTap={(e) => onSelect(item, e)}
      onDragMove={onDragMove}
      onDragEnd={handleDragEndInternal}
    >
      {/* Perimeter seats */}
      {renderSeats()}

      {/* Main Table Shape */}
      {shape === 'circle' ? (
        <Circle
          x={width / 2}
          y={height / 2}
          radius={width / 2}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          dash={strokeDash}
          shadowColor="#000000"
          shadowBlur={isSelected ? 8 : 2}
          shadowOpacity={0.06}
        />
      ) : shape === 'oval' ? (
        <Ellipse
          x={width / 2}
          y={height / 2}
          radiusX={width / 2}
          radiusY={height / 2}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          dash={strokeDash}
          shadowColor="#000000"
          shadowBlur={isSelected ? 8 : 2}
          shadowOpacity={0.06}
        />
      ) : shape === 'booth' ? (
        <Group>
          {/* Backrest padded cushion */}
          <Rect
            x={-6}
            y={-6}
            width={width + 12}
            height={height + 12}
            cornerRadius={8}
            fill="#F5F5F4"
            stroke="#E7E5E4"
            strokeWidth={1.5}
          />
          {/* Inner table top */}
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            cornerRadius={4}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            dash={strokeDash}
          />
        </Group>
      ) : (
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          cornerRadius={8}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          dash={strokeDash}
          shadowColor="#000000"
          shadowBlur={isSelected ? 8 : 2}
          shadowOpacity={0.06}
        />
      )}

      {/* Table Timer Indicator for Occupied Tables (Top-Left) */}
      {status === 'occupied' && (
        <Group x={12} y={12} listening={false}>
          <Circle radius={5} fill="#FFFFFF" stroke={timerRingColor} strokeWidth={2} />
          <Circle radius={2.5} fill={timerRingColor} />
        </Group>
      )}

      {/* Service Priority Badges (Top-Right) */}
      {badges.length > 0 && (
        <Group x={width - 12} y={12} listening={false}>
          {badges.slice(0, 2).map((badge, idx) => {
            const badgeBg = 
              badge === 'W' ? '#F59E0B' :
              badge === 'B' ? '#3B82F6' :
              badge === 'R' ? '#8B5CF6' :
              badge === 'VIP' ? '#D97706' : '#10B981';
            return (
              <Group key={`b_${badge}_${idx}`} x={-idx * 16}>
                <Circle radius={6} fill={badgeBg} />
                <Text
                  text={badge}
                  x={-6}
                  y={-4}
                  width={12}
                  align="center"
                  fontFamily="sans-serif"
                  fontSize={7}
                  fontStyle="bold"
                  fill="#FFFFFF"
                />
              </Group>
            );
          })}
        </Group>
      )}

      {/* Table Label & Capacity */}
      <Text
        text={displayLabel}
        x={0}
        y={height / 2 - 13}
        width={width}
        align="center"
        fontFamily="sans-serif"
        fontSize={15}
        fontStyle="700"
        fill="#171717"
        listening={false}
      />

      <Text
        text={
          status === 'occupied'
            ? `${elapsedMinutes}m`
            : status === 'reserved'
            ? item.reservationTime?.split(',')[1]?.trim() || 'Res'
            : `${seatCount} seats`
        }
        x={0}
        y={height / 2 + 4}
        width={width}
        align="center"
        fontFamily="sans-serif"
        fontSize={10}
        fontStyle="500"
        fill={status === 'occupied' ? '#525252' : '#737373'}
        listening={false}
      />
    </Group>
  );
};
