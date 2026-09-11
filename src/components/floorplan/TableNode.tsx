'use client';

import React from 'react';
import { Group, Rect, Circle, Ellipse, Text, Line, Path } from 'react-konva';
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
  const width = Math.max(24, Math.min(600, item.width));
  const height = Math.max(24, Math.min(600, item.height));
  const isLocked = Boolean(item.isLocked);

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
    strokeColor = isLocked ? '#F59E0B' : '#171717';
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

  const handleDragEndInternal = (e: any) => {
    const node = e.target;
    onChange({
      x: node.x(),
      y: node.y()
    });
    if (onDragEnd) onDragEnd(e);
  };

  const displayLabel = item.display_number || item.tableNumber || item.name?.replace(/^Table\s*/i, '') || 'T';

  // Render Chairs / Seating depending on shape
  const renderFurnitureAndTable = () => {
    const chairFill = '#F5F5F4';
    const chairStroke = '#D6D3D1';

    switch (shape) {
      // 1. TWO SEATER
      case 'two_seater': {
        const chairW = Math.min(36, width * 0.6);
        const chairH = 10;
        return (
          <Group>
            {/* Top Chair */}
            <Rect
              x={(width - chairW) / 2}
              y={-chairH - 2}
              width={chairW}
              height={chairH}
              cornerRadius={3}
              fill={chairFill}
              stroke={chairStroke}
              strokeWidth={1}
              listening={false}
            />
            {/* Bottom Chair */}
            <Rect
              x={(width - chairW) / 2}
              y={height + 2}
              width={chairW}
              height={chairH}
              cornerRadius={3}
              fill={chairFill}
              stroke={chairStroke}
              strokeWidth={1}
              listening={false}
            />
            {/* Tabletop */}
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
              shadowBlur={isSelected ? 10 : 2}
              shadowOpacity={isSelected ? 0.16 : 0.05}
            />
          </Group>
        );
      }

      // 2. CIRCLE / ROUND
      case 'circle': {
        const radius = width / 2;
        const seatRadius = Math.max(5, Math.min(9, width * 0.08));
        const seatOffset = radius + seatRadius + 3;
        const chairCount = seatCount || 4;
        const chairs = [];
        for (let i = 0; i < chairCount; i++) {
          const angle = (i * 2 * Math.PI) / chairCount;
          const cx = radius + seatOffset * Math.cos(angle);
          const cy = radius + seatOffset * Math.sin(angle);
          chairs.push(
            <Circle
              key={`r_seat_${i}`}
              x={cx}
              y={cy}
              radius={seatRadius}
              fill={chairFill}
              stroke={chairStroke}
              strokeWidth={1}
              listening={false}
            />
          );
        }
        return (
          <Group>
            {chairs}
            <Circle
              x={radius}
              y={radius}
              radius={radius}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              dash={strokeDash}
              shadowColor="#000000"
              shadowBlur={isSelected ? 12 : 2}
              shadowOpacity={isSelected ? 0.18 : 0.05}
            />
            <Circle
              x={radius}
              y={radius}
              radius={Math.max(4, radius * 0.18)}
              stroke="#E7E5E4"
              strokeWidth={1}
              listening={false}
            />
          </Group>
        );
      }

      // 3. OVAL
      case 'oval': {
        const rx = width / 2;
        const ry = height / 2;
        const seatRadius = Math.max(5, Math.min(8, height * 0.1));
        const chairs = [];
        const count = seatCount || 6;
        for (let i = 0; i < count; i++) {
          const angle = (i * 2 * Math.PI) / count;
          const cx = rx + (rx + seatRadius + 3) * Math.cos(angle);
          const cy = ry + (ry + seatRadius + 3) * Math.sin(angle);
          chairs.push(
            <Circle
              key={`oval_seat_${i}`}
              x={cx}
              y={cy}
              radius={seatRadius}
              fill={chairFill}
              stroke={chairStroke}
              strokeWidth={1}
              listening={false}
            />
          );
        }
        return (
          <Group>
            {chairs}
            <Ellipse
              x={rx}
              y={ry}
              radiusX={rx}
              radiusY={ry}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              dash={strokeDash}
              shadowColor="#000000"
              shadowBlur={isSelected ? 12 : 2}
              shadowOpacity={isSelected ? 0.18 : 0.05}
            />
          </Group>
        );
      }

      // 4. BOOTH (Classic double-banquette facing a central table)
      case 'booth': {
        const banquetteDepth = Math.max(16, height * 0.24);
        const tableY = banquetteDepth + 4;
        const tableH = height - banquetteDepth * 2 - 8;
        return (
          <Group>
            {/* Top Banquette */}
            <Rect
              x={-4}
              y={0}
              width={width + 8}
              height={banquetteDepth}
              cornerRadius={4}
              fill="#E7E5E4"
              stroke="#78716C"
              strokeWidth={1.5}
            />
            <Line points={[-4, banquetteDepth * 0.4, width + 4, banquetteDepth * 0.4]} stroke="#A8A29E" strokeWidth={1} />
            {/* Bottom Banquette */}
            <Rect
              x={-4}
              y={height - banquetteDepth}
              width={width + 8}
              height={banquetteDepth}
              cornerRadius={4}
              fill="#E7E5E4"
              stroke="#78716C"
              strokeWidth={1.5}
            />
            <Line points={[-4, height - banquetteDepth * 0.4, width + 4, height - banquetteDepth * 0.4]} stroke="#A8A29E" strokeWidth={1} />
            {/* Center Table */}
            <Rect
              x={0}
              y={tableY}
              width={width}
              height={tableH}
              cornerRadius={4}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              dash={strokeDash}
              shadowColor="#000000"
              shadowBlur={isSelected ? 10 : 2}
              shadowOpacity={isSelected ? 0.16 : 0.05}
            />
          </Group>
        );
      }

      // 5. L BOOTH (Corner Banquette)
      case 'l_booth': {
        const banquetteThickness = Math.max(18, Math.min(28, width * 0.25));
        const tableOffset = banquetteThickness + 6;
        const tableW = width - tableOffset;
        const tableH = height - tableOffset;
        return (
          <Group>
            {/* L-Shape Backrest */}
            <Line
              points={[
                0, 0,
                width, 0,
                width, banquetteThickness,
                banquetteThickness, banquetteThickness,
                banquetteThickness, height,
                0, height
              ]}
              closed={true}
              fill="#E7E5E4"
              stroke="#78716C"
              strokeWidth={1.5}
            />
            {/* Stitching lines */}
            <Line points={[banquetteThickness * 0.5, banquetteThickness, banquetteThickness * 0.5, height]} stroke="#A8A29E" strokeWidth={1} dash={[3, 3]} />
            <Line points={[banquetteThickness, banquetteThickness * 0.5, width, banquetteThickness * 0.5]} stroke="#A8A29E" strokeWidth={1} dash={[3, 3]} />
            {/* Center Table */}
            <Rect
              x={tableOffset}
              y={tableOffset}
              width={tableW}
              height={tableH}
              cornerRadius={4}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              dash={strokeDash}
              shadowColor="#000000"
              shadowBlur={isSelected ? 10 : 2}
              shadowOpacity={isSelected ? 0.16 : 0.05}
            />
          </Group>
        );
      }

      // 6. U BOOTH (Horseshoe 3-sided Banquette)
      case 'u_booth': {
        const thickness = Math.max(16, Math.min(26, width * 0.22));
        const tableX = thickness + 5;
        const tableY = thickness + 5;
        const tableW = width - (thickness + 5) * 2;
        const tableH = height - tableY;
        return (
          <Group>
            {/* U-Shaped Backrest wrapping top, left, right */}
            <Line
              points={[
                0, 0,
                width, 0,
                width, height,
                width - thickness, height,
                width - thickness, thickness,
                thickness, thickness,
                thickness, height,
                0, height
              ]}
              closed={true}
              fill="#E7E5E4"
              stroke="#78716C"
              strokeWidth={1.5}
            />
            {/* Center Table */}
            <Rect
              x={tableX}
              y={tableY}
              width={tableW}
              height={tableH}
              cornerRadius={4}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              dash={strokeDash}
              shadowColor="#000000"
              shadowBlur={isSelected ? 10 : 2}
              shadowOpacity={isSelected ? 0.16 : 0.05}
            />
          </Group>
        );
      }

      // 7. SOFA LOUNGE
      case 'sofa_lounge': {
        const sofaDepth = Math.max(18, height * 0.32);
        const cushionCount = Math.max(2, Math.floor(width / 35));
        const cushionWidth = (width - 12) / cushionCount;
        return (
          <Group>
            {/* Sofa Backrest and Arms */}
            <Rect
              x={0}
              y={0}
              width={width}
              height={height * 0.65}
              cornerRadius={6}
              fill="#E7E5E4"
              stroke="#78716C"
              strokeWidth={1.5}
            />
            {/* Cushions */}
            {Array.from({ length: cushionCount }).map((_, i) => (
              <Rect
                key={`cushion_${i}`}
                x={6 + i * cushionWidth}
                y={sofaDepth * 0.4}
                width={cushionWidth - 2}
                height={height * 0.45}
                cornerRadius={3}
                fill="#F5F5F4"
                stroke="#A8A29E"
                strokeWidth={1}
              />
            ))}
            {/* Low Cocktail Table */}
            <Rect
              x={width * 0.15}
              y={height * 0.72}
              width={width * 0.7}
              height={height * 0.28}
              cornerRadius={4}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              dash={strokeDash}
              shadowColor="#000000"
              shadowBlur={isSelected ? 8 : 2}
              shadowOpacity={isSelected ? 0.15 : 0.05}
            />
          </Group>
        );
      }

      // 8. WINDOW BENCH
      case 'window_bench': {
        const benchH = Math.max(14, height * 0.22);
        const chairCount = Math.max(2, Math.floor(seatCount / 2));
        const chairStep = width / (chairCount + 1);
        return (
          <Group>
            {/* Top Continuous Upholstered Bench */}
            <Rect
              x={0}
              y={0}
              width={width}
              height={benchH}
              cornerRadius={3}
              fill="#E7E5E4"
              stroke="#78716C"
              strokeWidth={1.5}
            />
            <Line points={[0, benchH * 0.5, width, benchH * 0.5]} stroke="#A8A29E" strokeWidth={1} />
            {/* Table */}
            <Rect
              x={0}
              y={benchH + 4}
              width={width}
              height={height - benchH - 18}
              cornerRadius={4}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              dash={strokeDash}
            />
            {/* Bottom Individual Chairs */}
            {Array.from({ length: chairCount }).map((_, i) => (
              <Rect
                key={`wb_chair_${i}`}
                x={(i + 1) * chairStep - 10}
                y={height - 10}
                width={20}
                height={10}
                cornerRadius={2.5}
                fill={chairFill}
                stroke={chairStroke}
                strokeWidth={1}
                listening={false}
              />
            ))}
          </Group>
        );
      }

      // 9. VIP LOUNGE
      case 'vip_lounge': {
        const armchairSize = Math.min(width * 0.32, height * 0.38);
        return (
          <Group>
            {/* 4 Executive Armchairs */}
            <Rect x={0} y={0} width={armchairSize} height={armchairSize} cornerRadius={6} fill="#E7E5E4" stroke="#78716C" strokeWidth={1.5} />
            <Rect x={width - armchairSize} y={0} width={armchairSize} height={armchairSize} cornerRadius={6} fill="#E7E5E4" stroke="#78716C" strokeWidth={1.5} />
            <Rect x={0} y={height - armchairSize} width={armchairSize} height={armchairSize} cornerRadius={6} fill="#E7E5E4" stroke="#78716C" strokeWidth={1.5} />
            <Rect x={width - armchairSize} y={height - armchairSize} width={armchairSize} height={armchairSize} cornerRadius={6} fill="#E7E5E4" stroke="#78716C" strokeWidth={1.5} />
            {/* Center Cocktail Table with floral accent */}
            <Circle
              x={width / 2}
              y={height / 2}
              radius={Math.min(width, height) * 0.22}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              dash={strokeDash}
            />
            <Circle x={width / 2} y={height / 2} radius={4} fill="#D97706" />
          </Group>
        );
      }

      // 10. BAR TABLE
      case 'bar_table': {
        const tableR = Math.min(width, height) * 0.32;
        const stoolR = 7;
        const dist = tableR + stoolR + 4;
        return (
          <Group>
            {/* 4 Stools */}
            <Circle x={width / 2} y={height / 2 - dist} radius={stoolR} fill={chairFill} stroke={chairStroke} strokeWidth={1} />
            <Circle x={width / 2} y={height / 2 - dist} radius={stoolR * 0.55} stroke="#A8A29E" strokeWidth={0.8} />
            <Circle x={width / 2} y={height / 2 + dist} radius={stoolR} fill={chairFill} stroke={chairStroke} strokeWidth={1} />
            <Circle x={width / 2} y={height / 2 + dist} radius={stoolR * 0.55} stroke="#A8A29E" strokeWidth={0.8} />
            <Circle x={width / 2 - dist} y={height / 2} radius={stoolR} fill={chairFill} stroke={chairStroke} strokeWidth={1} />
            <Circle x={width / 2 - dist} y={height / 2} radius={stoolR * 0.55} stroke="#A8A29E" strokeWidth={0.8} />
            <Circle x={width / 2 + dist} y={height / 2} radius={stoolR} fill={chairFill} stroke={chairStroke} strokeWidth={1} />
            <Circle x={width / 2 + dist} y={height / 2} radius={stoolR * 0.55} stroke="#A8A29E" strokeWidth={0.8} />
            {/* High-Top Table */}
            <Circle
              x={width / 2}
              y={height / 2}
              radius={tableR}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              dash={strokeDash}
            />
            <Circle x={width / 2} y={height / 2} radius={tableR * 0.3} stroke="#D6D3D1" strokeWidth={1} />
          </Group>
        );
      }

      // 11. RECTANGLE / SQUARE / 6-SEATER / 8-SEATER / 10-SEATER
      case 'square':
      case 'six_seater':
      case 'eight_seater':
      case 'ten_seater':
      case 'rectangle':
      default: {
        const isSq = shape === 'square';
        const chairsList = [];
        const chairRadius = 6;
        const chairOffset = 9;

        if (isSq) {
          // 4 Chairs: Top, Bottom, Left, Right
          chairsList.push(
            <Circle key="c_top" x={width / 2} y={-chairOffset} radius={chairRadius} fill={chairFill} stroke={chairStroke} strokeWidth={1} listening={false} />,
            <Circle key="c_bottom" x={width / 2} y={height + chairOffset} radius={chairRadius} fill={chairFill} stroke={chairStroke} strokeWidth={1} listening={false} />,
            <Circle key="c_left" x={-chairOffset} y={height / 2} radius={chairRadius} fill={chairFill} stroke={chairStroke} strokeWidth={1} listening={false} />,
            <Circle key="c_right" x={width + chairOffset} y={height / 2} radius={chairRadius} fill={chairFill} stroke={chairStroke} strokeWidth={1} listening={false} />
          );
        } else {
          // Rectangular table: distribute top, bottom, and optionally side heads
          const hasHeads = seatCount >= 8;
          const mainSeats = hasHeads ? seatCount - 2 : seatCount;
          const seatsPerSide = Math.max(1, Math.floor(mainSeats / 2));
          const topStep = width / (seatsPerSide + 1);

          for (let i = 1; i <= seatsPerSide; i++) {
            chairsList.push(
              <Circle
                key={`seat_top_${i}`}
                x={i * topStep}
                y={-chairOffset}
                radius={chairRadius}
                fill={chairFill}
                stroke={chairStroke}
                strokeWidth={1}
                listening={false}
              />
            );
          }

          const bottomSeats = mainSeats - seatsPerSide;
          const bottomStep = width / (bottomSeats + 1);
          for (let i = 1; i <= bottomSeats; i++) {
            chairsList.push(
              <Circle
                key={`seat_bottom_${i}`}
                x={i * bottomStep}
                y={height + chairOffset}
                radius={chairRadius}
                fill={chairFill}
                stroke={chairStroke}
                strokeWidth={1}
                listening={false}
              />
            );
          }

          if (hasHeads) {
            chairsList.push(
              <Circle key="head_l" x={-chairOffset} y={height / 2} radius={chairRadius} fill={chairFill} stroke={chairStroke} strokeWidth={1} listening={false} />,
              <Circle key="head_r" x={width + chairOffset} y={height / 2} radius={chairRadius} fill={chairFill} stroke={chairStroke} strokeWidth={1} listening={false} />
            );
          }
        }

        return (
          <Group>
            {chairsList}
            <Rect
              x={0}
              y={0}
              width={width}
              height={height}
              cornerRadius={isSq ? 6 : 4}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              dash={strokeDash}
              shadowColor="#000000"
              shadowBlur={isSelected ? 12 : 2}
              shadowOpacity={isSelected ? 0.18 : 0.05}
            />
          </Group>
        );
      }
    }
  };

  return (
    <Group
      id={item.id}
      x={item.x}
      y={item.y}
      width={width}
      height={height}
      rotation={item.rotation || 0}
      draggable={isEditable && !isLocked}
      onClick={(e) => onSelect(item, e)}
      onTap={(e) => onSelect(item, e)}
      onDragMove={onDragMove}
      onDragEnd={handleDragEndInternal}
    >
      {/* Furniture & Table Render */}
      {renderFurnitureAndTable()}

      {/* Table Timer Indicator for Occupied Tables (Top-Left) */}
      {status === 'occupied' && (
        <Group x={12} y={12} listening={false}>
          <Circle radius={5} fill="#FFFFFF" stroke={timerRingColor} strokeWidth={2} />
          <Circle radius={2.5} fill={timerRingColor} />
        </Group>
      )}

      {/* Lock Indicator Badge (Top-Left when locked and not occupied) */}
      {isLocked && status !== 'occupied' && (
        <Group x={10} y={10} listening={false}>
          <Circle radius={6} fill="#F59E0B" />
          <Path
            data="M -2.5 0 L 2.5 0 L 2.5 3 L -2.5 3 Z M -1.5 0 L -1.5 -1.5 C -1.5 -2.3 1.5 -2.3 1.5 -1.5 L 1.5 0"
            stroke="#FFFFFF"
            strokeWidth={1}
            fill="#FFFFFF"
          />
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
