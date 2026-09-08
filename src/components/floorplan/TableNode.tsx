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

  // Status-driven styling
  let fillColor = '#FFFFFF';
  let strokeColor = '#D6D3D1';
  let strokeWidth = 1.5;
  let strokeDash: number[] | undefined = undefined;

  switch (status) {
    case 'occupied':
      fillColor = '#FFFFFF';
      strokeColor = '#262626'; // Soft charcoal
      strokeWidth = 2.5;
      break;
    case 'reserved':
      fillColor = '#F5F0E6'; // Warm sand tint
      strokeColor = '#C8BCAB';
      strokeWidth = 1.8;
      break;
    case 'cleaning':
      fillColor = '#F3F4F6'; // Light gray
      strokeColor = '#9CA3AF';
      strokeWidth = 1.5;
      break;
    case 'merged':
      fillColor = '#FFFFFF';
      strokeColor = '#262626';
      strokeWidth = 2;
      strokeDash = [6, 4]; // Dashed border
      break;
    case 'available':
    default:
      fillColor = '#FFFFFF';
      strokeColor = isSelected ? '#171717' : '#D6D3D1';
      strokeWidth = isSelected ? 2 : 1.5;
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

  // Render perimeter seat markers
  const renderSeats = () => {
    const seatMarkers = [];
    const seatCount = item.seats || 4;
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
            fill="#E7E5E4"
            stroke="#D6D3D1"
            strokeWidth={1}
            listening={false}
          />
        );
      }
    } else {
      // Rectangle/Square: distribute top, bottom, left, right
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
            fill="#E7E5E4"
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
            fill="#E7E5E4"
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
          strokeWidth={2.5}
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
            fill="#E7E5E4"
            stroke="#D6D3D1"
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
          cornerRadius={6}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          dash={strokeDash}
          shadowColor="#000000"
          shadowBlur={isSelected ? 8 : 2}
          shadowOpacity={0.06}
        />
      )}

      {/* Table Label & Capacity */}
      <Text
        text={item.tableNumber || 'T'}
        x={0}
        y={height / 2 - 12}
        width={width}
        align="center"
        fontFamily="sans-serif"
        fontSize={14}
        fontStyle="600"
        fill="#09090b"
        listening={false}
      />

      <Text
        text={
          status === 'occupied'
            ? `${item.elapsedMinutes || 24}m`
            : status === 'reserved'
            ? item.reservationTime?.split(',')[1]?.trim() || 'Res'
            : `${item.seats || 2} seats`
        }
        x={0}
        y={height / 2 + 3}
        width={width}
        align="center"
        fontFamily="sans-serif"
        fontSize={10}
        fontStyle="500"
        fill={status === 'occupied' ? '#3f3f46' : '#a1a1aa'}
        listening={false}
      />
    </Group>
  );
};
