'use client';

import React from 'react';
import { Group, Rect, Line, Text, Circle, Arc, Ellipse, Path } from 'react-konva';
import { FloorPlanItem } from './types';

interface FurnitureNodeProps {
  item: FloorPlanItem;
  isSelected: boolean;
  isEditable: boolean;
  onSelect: (item: FloorPlanItem, e: any) => void;
  onChange: (newAttrs: Partial<FloorPlanItem>) => void;
  onDragMove?: (e: any) => void;
  onDragEnd?: (e: any) => void;
}

export const FurnitureNode: React.FC<FurnitureNodeProps> = ({
  item,
  isSelected,
  isEditable,
  onSelect,
  onChange,
  onDragMove,
  onDragEnd
}) => {
  const type = (item.furnitureType || 'counter') as string;
  const width = Math.max(24, Math.min(600, item.width));
  const height = Math.max(24, Math.min(600, item.height));
  const isLocked = Boolean(item.isLocked);

  const strokeColor = isSelected && isEditable ? (isLocked ? '#F59E0B' : '#171717') : '#D6D3D1';
  const strokeWidth = isSelected ? 2 : 1.5;

  const handleDragEndInternal = (e: any) => {
    const node = e.target;
    onChange({
      x: node.x(),
      y: node.y()
    });
    if (onDragEnd) onDragEnd(e);
  };

  const renderContent = () => {
    switch (type) {
      // ----------------- KITCHEN -----------------
      case 'stove':
        return (
          <Group>
            <Rect x={0} y={0} width={width} height={height} cornerRadius={4} fill="#F5F5F4" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* 4 Burners */}
            <Circle x={width * 0.3} y={height * 0.3} radius={Math.min(width, height) * 0.16} stroke="#44403C" strokeWidth={1.5} fill="#E7E5E4" />
            <Circle x={width * 0.3} y={height * 0.3} radius={4} fill="#44403C" />
            <Circle x={width * 0.7} y={height * 0.3} radius={Math.min(width, height) * 0.16} stroke="#44403C" strokeWidth={1.5} fill="#E7E5E4" />
            <Circle x={width * 0.7} y={height * 0.3} radius={4} fill="#44403C" />
            <Circle x={width * 0.3} y={height * 0.7} radius={Math.min(width, height) * 0.16} stroke="#44403C" strokeWidth={1.5} fill="#E7E5E4" />
            <Circle x={width * 0.3} y={height * 0.7} radius={4} fill="#44403C" />
            <Circle x={width * 0.7} y={height * 0.7} radius={Math.min(width, height) * 0.16} stroke="#44403C" strokeWidth={1.5} fill="#E7E5E4" />
            <Circle x={width * 0.7} y={height * 0.7} radius={4} fill="#44403C" />
            <Text text={item.name || 'STOVE'} x={0} y={height / 2 - 5} width={width} align="center" fontSize={9} fontStyle="bold" fill="#171717" listening={false} />
          </Group>
        );

      case 'fryer':
        return (
          <Group>
            <Rect x={0} y={0} width={width} height={height} cornerRadius={4} fill="#F5F5F4" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Twin Fryer Wells */}
            <Rect x={width * 0.12} y={height * 0.12} width={width * 0.34} height={height * 0.6} cornerRadius={2} fill="#FEF3C7" stroke="#D97706" strokeWidth={1.2} />
            <Rect x={width * 0.54} y={height * 0.12} width={width * 0.34} height={height * 0.6} cornerRadius={2} fill="#FEF3C7" stroke="#D97706" strokeWidth={1.2} />
            {/* Handles */}
            <Rect x={width * 0.24} y={height * 0.72} width={width * 0.1} height={height * 0.22} cornerRadius={2} fill="#44403C" />
            <Rect x={width * 0.66} y={height * 0.72} width={width * 0.1} height={height * 0.22} cornerRadius={2} fill="#44403C" />
            <Text text={item.name || 'FRYER'} x={0} y={height * 0.35} width={width} align="center" fontSize={9} fontStyle="bold" fill="#78350F" listening={false} />
          </Group>
        );

      case 'pizza_oven':
        return (
          <Group>
            {/* Hearth base */}
            <Circle x={width / 2} y={height / 2} radius={Math.min(width, height) / 2} fill="#E7E5E4" stroke={strokeColor} strokeWidth={strokeWidth} />
            <Circle x={width / 2} y={height / 2} radius={Math.min(width, height) * 0.38} fill="#F5F5F4" stroke="#78716C" strokeWidth={1} />
            {/* Hearth mouth */}
            <Arc x={width / 2} y={height * 0.65} innerRadius={0} outerRadius={Math.min(width, height) * 0.28} angle={180} rotation={180} fill="#78350F" stroke="#171717" strokeWidth={1.5} />
            <Circle x={width / 2} y={height * 0.58} radius={4} fill="#F59E0B" />
            <Text text={item.name || 'PIZZA OVEN'} x={0} y={height * 0.18} width={width} align="center" fontSize={8} fontStyle="bold" fill="#171717" listening={false} />
          </Group>
        );

      case 'sink':
        return (
          <Group>
            <Rect x={0} y={0} width={width} height={height} cornerRadius={4} fill="#F5F5F4" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Dual Basins */}
            <Rect x={width * 0.08} y={height * 0.15} width={width * 0.38} height={height * 0.7} cornerRadius={4} fill="#E0F2FE" stroke="#0284C7" strokeWidth={1} />
            <Circle x={width * 0.27} y={height * 0.5} radius={3} fill="#0284C7" />
            <Rect x={width * 0.54} y={height * 0.15} width={width * 0.38} height={height * 0.7} cornerRadius={4} fill="#E0F2FE" stroke="#0284C7" strokeWidth={1} />
            <Circle x={width * 0.73} y={height * 0.5} radius={3} fill="#0284C7" />
            {/* Faucet */}
            <Rect x={width * 0.48} y={height * 0.08} width={width * 0.04} height={height * 0.35} fill="#44403C" cornerRadius={1} />
            <Text text={item.name || 'SINK'} x={0} y={height - 12} width={width} align="center" fontSize={8} fontStyle="bold" fill="#0369A1" listening={false} />
          </Group>
        );

      case 'refrigerator':
        return (
          <Group>
            <Rect x={0} y={0} width={width} height={height} cornerRadius={4} fill="#F5F5F4" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Dual Door Seals */}
            <Rect x={width * 0.08} y={height * 0.1} width={width * 0.4} height={height * 0.7} cornerRadius={2} fill="#FFFFFF" stroke="#78716C" strokeWidth={1} />
            <Rect x={width * 0.52} y={height * 0.1} width={width * 0.4} height={height * 0.7} cornerRadius={2} fill="#FFFFFF" stroke="#78716C" strokeWidth={1} />
            {/* Handles */}
            <Rect x={width * 0.42} y={height * 0.25} width={3} height={height * 0.35} fill="#171717" cornerRadius={1} />
            <Rect x={width * 0.55} y={height * 0.25} width={3} height={height * 0.35} fill="#171717" cornerRadius={1} />
            {/* Vent Grills */}
            <Line points={[width * 0.1, height * 0.88, width * 0.9, height * 0.88]} stroke="#78716C" strokeWidth={1} />
            <Text text={item.name || 'REFRIGERATOR'} x={0} y={height / 2 - 5} width={width} align="center" fontSize={8} fontStyle="bold" fill="#171717" listening={false} />
          </Group>
        );

      case 'prep_counter':
        return (
          <Group>
            <Rect x={0} y={0} width={width} height={height} cornerRadius={4} fill="#F5F5F4" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Large Inset Cutting Board */}
            <Rect x={width * 0.08} y={height * 0.15} width={width * 0.54} height={height * 0.7} cornerRadius={3} fill="#FEF3C7" stroke="#D97706" strokeWidth={1} />
            {/* Ingredient Wells */}
            <Rect x={width * 0.68} y={height * 0.15} width={width * 0.24} height={height * 0.3} cornerRadius={2} fill="#E7E5E4" stroke="#78716C" strokeWidth={1} />
            <Rect x={width * 0.68} y={height * 0.55} width={width * 0.24} height={height * 0.3} cornerRadius={2} fill="#E7E5E4" stroke="#78716C" strokeWidth={1} />
            <Text text={item.name || 'PREP COUNTER'} x={0} y={height / 2 - 5} width={width * 0.65} align="center" fontSize={8} fontStyle="bold" fill="#78350F" listening={false} />
          </Group>
        );

      case 'storage_rack':
        return (
          <Group>
            <Rect x={0} y={0} width={width} height={height} cornerRadius={2} fill="#F5F5F4" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Metro wire crossbars */}
            <Line points={[0, height / 2, width, height / 2]} stroke="#78716C" strokeWidth={1} />
            {Array.from({ length: 6 }).map((_, i) => (
              <Line
                key={`rack_${i}`}
                points={[(i + 1) * (width / 7), 0, (i + 1) * (width / 7), height]}
                stroke="#A8A29E"
                strokeWidth={1}
              />
            ))}
            <Text text={item.name || 'STORAGE'} x={0} y={height / 2 - 5} width={width} align="center" fontSize={8} fontStyle="bold" fill="#171717" listening={false} />
          </Group>
        );

      case 'kitchen':
      case 'kitchen_pass':
        return (
          <Group>
            <Rect x={0} y={0} width={width} height={height} cornerRadius={4} fill="#FAFAF9" stroke="#78716C" strokeWidth={2} />
            {/* Heat Lamp / Ticket Rail */}
            <Rect x={8} y={6} width={width - 16} height={Math.max(10, height * 0.22)} cornerRadius={2} fill="#E7E5E4" stroke="#A8A29E" strokeWidth={1} />
            <Circle x={width * 0.25} y={Math.max(11, height * 0.17)} radius={3} fill="#D97706" />
            <Circle x={width * 0.5} y={Math.max(11, height * 0.17)} radius={3} fill="#D97706" />
            <Circle x={width * 0.75} y={Math.max(11, height * 0.17)} radius={3} fill="#D97706" />
            <Line points={[0, height * 0.45, width, height * 0.45]} stroke="#D6D3D1" strokeWidth={1} />
            <Text text={item.name || 'KITCHEN PASS'} x={0} y={height * 0.52} width={width} align="center" fontSize={10} fontStyle="bold" fill="#171717" listening={false} />
            <Text text="Order Dispatch Lane" x={0} y={height * 0.74} width={width} align="center" fontSize={8} fill="#78716C" listening={false} />
          </Group>
        );

      case 'service_counter':
      case 'counter':
        return (
          <Group>
            <Rect x={0} y={0} width={width} height={height} cornerRadius={4} fill="#F5F5F4" stroke={strokeColor} strokeWidth={strokeWidth} />
            <Line points={[0, height * 0.4, width, height * 0.4]} stroke="#D6D3D1" strokeWidth={1.5} />
            <Line points={[12, height * 0.2, width - 12, height * 0.2]} stroke="#78716C" strokeWidth={1} dash={[3, 3]} />
            <Text text={item.name || 'SERVICE COUNTER'} x={0} y={height * 0.55} width={width} align="center" fontSize={10} fontStyle="bold" fill="#171717" listening={false} />
          </Group>
        );

      // ----------------- STRUCTURE -----------------
      case 'entrance_door':
      case 'door':
        return (
          <Group>
            {/* Wall jambs */}
            <Rect x={0} y={height - 8} width={8} height={8} fill="#171717" />
            <Rect x={width - 8} y={height - 8} width={8} height={8} fill="#171717" />
            {/* Door swing arc */}
            <Arc
              x={8}
              y={height - 4}
              innerRadius={width - 16}
              outerRadius={width - 16}
              angle={90}
              rotation={270}
              stroke="#A8A29E"
              strokeWidth={1}
              dash={[3, 3]}
            />
            {/* Door leaf */}
            <Line points={[8, height - 4, 8, 4]} stroke="#171717" strokeWidth={2.5} />
            <Circle x={12} y={height * 0.4} radius={2} fill="#171717" />
            <Text text={item.name || 'DOOR'} x={0} y={height / 2 - 5} width={width} align="center" fontSize={8} fontStyle="bold" fill="#78716C" listening={false} />
          </Group>
        );

      case 'double_door':
        return (
          <Group>
            {/* Wall jambs */}
            <Rect x={0} y={height - 8} width={8} height={8} fill="#171717" />
            <Rect x={width - 8} y={height - 8} width={8} height={8} fill="#171717" />
            {/* Left Swing */}
            <Arc x={8} y={height - 4} innerRadius={width / 2 - 10} outerRadius={width / 2 - 10} angle={90} rotation={270} stroke="#A8A29E" strokeWidth={1} dash={[3, 3]} />
            <Line points={[8, height - 4, 8, height / 2 - 10]} stroke="#171717" strokeWidth={2} />
            {/* Right Swing */}
            <Arc x={width - 8} y={height - 4} innerRadius={width / 2 - 10} outerRadius={width / 2 - 10} angle={90} rotation={180} stroke="#A8A29E" strokeWidth={1} dash={[3, 3]} />
            <Line points={[width - 8, height - 4, width - 8, height / 2 - 10]} stroke="#171717" strokeWidth={2} />
            <Text text={item.name || 'DOUBLE DOOR'} x={0} y={height / 2 - 5} width={width} align="center" fontSize={8} fontStyle="bold" fill="#78716C" listening={false} />
          </Group>
        );

      case 'sliding_door':
        return (
          <Group>
            <Line points={[0, height * 0.4, width, height * 0.4]} stroke="#78716C" strokeWidth={2} />
            <Rect x={4} y={height * 0.25} width={width * 0.45} height={8} fill="#E7E5E4" stroke="#171717" strokeWidth={1} />
            <Rect x={width * 0.5} y={height * 0.45} width={width * 0.45} height={8} fill="#FFFFFF" stroke="#171717" strokeWidth={1.5} />
            <Text text={item.name || 'SLIDING'} x={0} y={height - 12} width={width} align="center" fontSize={8} fontStyle="bold" fill="#0284C7" listening={false} />
          </Group>
        );

      case 'window':
        return (
          <Group>
            <Rect x={0} y={0} width={width} height={height} fill="#F5F5F4" stroke={strokeColor} strokeWidth={strokeWidth} />
            <Line points={[0, height * 0.35, width, height * 0.35]} stroke="#0284C7" strokeWidth={1.5} />
            <Line points={[0, height * 0.65, width, height * 0.65]} stroke="#0284C7" strokeWidth={1.5} />
            <Line points={[width / 2, 0, width / 2, height]} stroke="#78716C" strokeWidth={1.5} />
            <Text text={item.name || 'WINDOW'} x={0} y={height / 2 - 4} width={width} align="center" fontSize={7} fontStyle="bold" fill="#0369A1" listening={false} />
          </Group>
        );

      case 'divider':
      case 'divider_wall':
        return (
          <Group>
            <Rect x={0} y={0} width={width} height={height} cornerRadius={2} fill="#E7E5E4" stroke={strokeColor} strokeWidth={strokeWidth} />
            {Array.from({ length: Math.max(2, Math.floor(width / 20)) }).map((_, i) => (
              <Line key={`hatch_${i}`} points={[(i + 1) * 20 - 10, 0, (i + 1) * 20, height]} stroke="#A8A29E" strokeWidth={1} />
            ))}
            <Text text={item.name || 'PARTITION'} x={0} y={height / 2 - 4} width={width} align="center" fontSize={7} fontStyle="bold" fill="#78716C" listening={false} />
          </Group>
        );

      case 'curved_wall':
        return (
          <Group>
            <Arc x={width * 0.15} y={height * 0.85} innerRadius={Math.min(width, height) * 0.65} outerRadius={Math.min(width, height) * 0.8} angle={90} rotation={270} fill="#E7E5E4" stroke={strokeColor} strokeWidth={strokeWidth} />
            <Text text={item.name || 'CURVED WALL'} x={0} y={height / 2 - 5} width={width} align="center" fontSize={8} fontStyle="bold" fill="#171717" listening={false} />
          </Group>
        );

      case 'glass_partition':
        return (
          <Group>
            <Rect x={0} y={height * 0.25} width={width} height={height * 0.5} cornerRadius={2} fill="#E0F2FE" stroke="#0284C7" strokeWidth={1} opacity={0.7} />
            <Line points={[width * 0.3, height * 0.3, width * 0.4, height * 0.7]} stroke="#38BDF8" strokeWidth={1.5} />
            <Line points={[width * 0.7, height * 0.3, width * 0.8, height * 0.7]} stroke="#38BDF8" strokeWidth={1.5} />
            <Rect x={width * 0.15} y={height * 0.2} width={6} height={height * 0.6} fill="#44403C" />
            <Rect x={width * 0.8} y={height * 0.2} width={6} height={height * 0.6} fill="#44403C" />
            <Text text={item.name || 'GLASS'} x={0} y={height - 10} width={width} align="center" fontSize={7} fontStyle="bold" fill="#0369A1" listening={false} />
          </Group>
        );

      // ----------------- UTILITIES -----------------
      case 'bar_seats':
      case 'bar': {
        const stoolCount = Math.max(2, Math.floor(width / 35));
        const stoolStep = width / (stoolCount + 1);
        return (
          <Group>
            <Rect x={0} y={0} width={width} height={height} cornerRadius={4} fill="#F5F5F4" stroke={strokeColor} strokeWidth={strokeWidth} />
            {Array.from({ length: stoolCount }).map((_, i) => (
              <Group key={`stool_${i}`} x={(i + 1) * stoolStep} y={height + 10}>
                <Circle radius={7} fill="#E7E5E4" stroke="#A8A29E" strokeWidth={1} />
                <Circle radius={4} stroke="#D6D3D1" strokeWidth={0.8} />
              </Group>
            ))}
            <Text text={item.name || 'BAR'} x={0} y={height / 2 - 6} width={width} align="center" fontSize={10} fontStyle="bold" fill="#171717" listening={false} />
          </Group>
        );
      }

      case 'cash_counter':
      case 'cashier':
      case 'pos':
        return (
          <Group>
            <Rect x={0} y={0} width={width} height={height} cornerRadius={4} fill="#F5F5F4" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* POS Terminal */}
            <Rect x={Math.min(10, width * 0.1)} y={height / 2 - 10} width={Math.min(24, width * 0.25)} height={18} cornerRadius={2} fill="#171717" />
            <Rect x={Math.min(13, width * 0.12)} y={height / 2 - 8} width={Math.min(18, width * 0.2)} height={14} cornerRadius={1} fill="#0284C7" />
            {/* Receipt printer */}
            {width >= 70 && (
              <>
                <Rect x={width - 32} y={height / 2 - 8} width={18} height={16} cornerRadius={2} fill="#FFFFFF" stroke="#78716C" strokeWidth={1} />
                <Line points={[width - 28, height / 2 - 3, width - 18, height / 2 - 3]} stroke="#171717" strokeWidth={1.5} />
              </>
            )}
            <Text
              text={item.name || 'CASH / POS'}
              x={width >= 80 ? 36 : 0}
              y={height / 2 - 5}
              width={width >= 80 ? Math.max(20, width - 70) : width}
              align="center"
              fontSize={9}
              fontStyle="bold"
              fill="#171717"
              listening={false}
            />
          </Group>
        );

      case 'waiting_area':
      case 'waiting_lounge':
      case 'waiting':
        return (
          <Group>
            <Rect x={0} y={0} width={width} height={height} cornerRadius={6} fill="#F5F5F4" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Left Sofa */}
            <Rect x={4} y={6} width={Math.max(16, width * 0.2)} height={height - 12} cornerRadius={3} fill="#E7E5E4" stroke="#78716C" strokeWidth={1} />
            {/* Right Sofa */}
            <Rect x={width - Math.max(16, width * 0.2) - 4} y={6} width={Math.max(16, width * 0.2)} height={height - 12} cornerRadius={3} fill="#E7E5E4" stroke="#78716C" strokeWidth={1} />
            {/* Coffee Table */}
            <Rect x={width * 0.3} y={height * 0.25} width={width * 0.4} height={height * 0.5} cornerRadius={3} fill="#FFFFFF" stroke="#171717" strokeWidth={1} />
            <Text text={item.name || 'WAITING LOUNGE'} x={0} y={height / 2 - 5} width={width} align="center" fontSize={8} fontStyle="bold" fill="#57534E" listening={false} />
          </Group>
        );

      case 'washroom':
      case 'restroom':
      case 'toilet':
        return (
          <Group>
            <Rect x={0} y={0} width={width} height={height} cornerRadius={4} fill="#F5F5F4" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Toilet fixture */}
            <Rect x={8} y={8} width={14} height={8} cornerRadius={1} fill="#FFFFFF" stroke="#78716C" strokeWidth={1} />
            <Ellipse x={15} y={24} radiusX={7} radiusY={9} fill="#FFFFFF" stroke="#78716C" strokeWidth={1} />
            {/* Basin */}
            <Rect x={width - 24} y={8} width={16} height={14} cornerRadius={3} fill="#FFFFFF" stroke="#0284C7" strokeWidth={1} />
            <Text text={item.name || 'WASHROOM'} x={0} y={height - 16} width={width} align="center" fontSize={8} fontStyle="bold" fill="#78716C" listening={false} />
          </Group>
        );

      case 'accessible_washroom':
      case 'ada_washroom':
      case 'ada_restroom':
        return (
          <Group>
            <Rect x={0} y={0} width={width} height={height} cornerRadius={4} fill="#F5F5F4" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Toilet with Grab bars */}
            <Rect x={8} y={8} width={14} height={8} cornerRadius={1} fill="#FFFFFF" stroke="#78716C" strokeWidth={1} />
            <Ellipse x={15} y={24} radiusX={7} radiusY={9} fill="#FFFFFF" stroke="#78716C" strokeWidth={1} />
            <Line points={[4, 12, 28, 12]} stroke="#171717" strokeWidth={2} />
            <Line points={[28, 12, 28, 32]} stroke="#171717" strokeWidth={2} />
            {/* ADA circle */}
            <Circle x={width * 0.65} y={height * 0.55} radius={Math.min(width, height) * 0.24} stroke="#0284C7" strokeWidth={1} dash={[3, 3]} />
            <Text text={item.name || 'ADA RESTROOM'} x={0} y={height - 14} width={width} align="center" fontSize={7} fontStyle="bold" fill="#0284C7" listening={false} />
          </Group>
        );

      case 'emergency_exit':
      case 'exit':
        return (
          <Group>
            <Rect x={0} y={0} width={width} height={height} cornerRadius={4} fill="#ECFDF5" stroke="#059669" strokeWidth={strokeWidth} />
            <Circle x={width * 0.35} y={height * 0.35} radius={4} fill="#059669" />
            <Line points={[width * 0.3, height * 0.45, width * 0.45, height * 0.55, width * 0.4, height * 0.75]} stroke="#059669" strokeWidth={2.5} />
            <Rect x={width * 0.65} y={height * 0.25} width={width * 0.2} height={height * 0.5} fill="#FFFFFF" stroke="#059669" strokeWidth={1.5} />
            <Text text={item.name || 'EMERGENCY EXIT'} x={0} y={height - 12} width={width} align="center" fontSize={7} fontStyle="bold" fill="#059669" listening={false} />
          </Group>
        );

      case 'fire_extinguisher':
        return (
          <Group>
            <Rect x={width * 0.2} y={2} width={width * 0.6} height={height - 4} cornerRadius={4} fill="#FEE2E2" stroke="#DC2626" strokeWidth={1.5} />
            <Rect x={width * 0.3} y={height * 0.25} width={width * 0.4} height={height * 0.55} cornerRadius={4} fill="#DC2626" />
            <Circle x={width / 2} y={height * 0.15} radius={3} fill="#FBBF24" stroke="#171717" strokeWidth={1} />
            <Text text="FIRE" x={0} y={height * 0.4} width={width} align="center" fontSize={7} fontStyle="bold" fill="#FFFFFF" listening={false} />
          </Group>
        );

      // ----------------- DECOR -----------------
      case 'plant_small':
      case 'plant':
        return (
          <Group>
            <Circle x={width / 2} y={height / 2} radius={Math.min(width, height) * 0.35} fill="#D97706" stroke="#92400E" strokeWidth={1.5} />
            <Circle x={width / 2} y={height / 2} radius={Math.min(width, height) * 0.25} fill="#78350F" />
            <Ellipse x={width / 2} y={height * 0.25} radiusX={4} radiusY={8} fill="#10B981" stroke="#047857" strokeWidth={1} />
            <Ellipse x={width / 2} y={height * 0.75} radiusX={4} radiusY={8} fill="#10B981" stroke="#047857" strokeWidth={1} />
            <Ellipse x={width * 0.25} y={height / 2} radiusX={8} radiusY={4} fill="#10B981" stroke="#047857" strokeWidth={1} />
            <Ellipse x={width * 0.75} y={height / 2} radiusX={8} radiusY={4} fill="#10B981" stroke="#047857" strokeWidth={1} />
            <Circle x={width / 2} y={height / 2} radius={3} fill="#047857" />
          </Group>
        );

      case 'plant_large':
        return (
          <Group>
            <Circle x={width / 2} y={height / 2} radius={Math.min(width, height) * 0.38} fill="#D97706" stroke="#92400E" strokeWidth={2} />
            <Circle x={width / 2} y={height / 2} radius={Math.min(width, height) * 0.28} fill="#78350F" />
            <Ellipse x={width / 2} y={height * 0.18} radiusX={6} radiusY={14} fill="#059669" stroke="#047857" strokeWidth={1} />
            <Ellipse x={width / 2} y={height * 0.82} radiusX={6} radiusY={14} fill="#059669" stroke="#047857" strokeWidth={1} />
            <Ellipse x={width * 0.18} y={height / 2} radiusX={14} radiusY={6} fill="#059669" stroke="#047857" strokeWidth={1} />
            <Ellipse x={width * 0.82} y={height / 2} radiusX={14} radiusY={6} fill="#059669" stroke="#047857" strokeWidth={1} />
            <Circle x={width / 2} y={height / 2} radius={4} fill="#064E3B" />
          </Group>
        );

      case 'flower_pot':
        return (
          <Group>
            <Circle x={width / 2} y={height / 2} radius={Math.min(width, height) * 0.4} fill="#F5F5F4" stroke="#78716C" strokeWidth={1.5} />
            <Circle x={width / 2} y={height * 0.35} radius={5} fill="#F43F5E" />
            <Circle x={width * 0.65} y={height * 0.45} radius={5} fill="#EC4899" />
            <Circle x={width * 0.6} y={height * 0.65} radius={5} fill="#F43F5E" />
            <Circle x={width * 0.4} y={height * 0.65} radius={5} fill="#EC4899" />
            <Circle x={width * 0.35} y={height * 0.45} radius={5} fill="#F43F5E" />
            <Circle x={width / 2} y={height / 2} radius={4} fill="#FBBF24" />
          </Group>
        );

      case 'water_feature':
      case 'fountain':
        return (
          <Group>
            <Rect x={0} y={0} width={width} height={height} cornerRadius={8} fill="#E0F2FE" stroke="#0284C7" strokeWidth={strokeWidth} />
            <Circle x={width / 2} y={height / 2} radius={Math.min(width, height) * 0.35} stroke="#38BDF8" strokeWidth={1} dash={[3, 3]} />
            <Circle x={width / 2} y={height / 2} radius={Math.min(width, height) * 0.2} stroke="#0284C7" strokeWidth={1} />
            <Circle x={width / 2} y={height / 2} radius={4} fill="#0284C7" />
            <Text text={item.name || 'FOUNTAIN'} x={0} y={height - 12} width={width} align="center" fontSize={7} fontStyle="bold" fill="#0369A1" listening={false} />
          </Group>
        );

      case 'pillar':
      case 'column':
        return (
          <Group>
            <Circle x={width / 2} y={height / 2} radius={Math.min(width, height) * 0.45} fill="#E7E5E4" stroke="#171717" strokeWidth={2.5} />
            <Circle x={width / 2} y={height / 2} radius={Math.min(width, height) * 0.35} stroke="#78716C" strokeWidth={1} />
            <Line points={[width * 0.25, height * 0.25, width * 0.75, height * 0.75]} stroke="#78716C" strokeWidth={1.5} />
            <Line points={[width * 0.75, height * 0.25, width * 0.25, height * 0.75]} stroke="#78716C" strokeWidth={1.5} />
          </Group>
        );

      case 'decorative_partition':
        return (
          <Group>
            <Rect x={0} y={0} width={width} height={height} cornerRadius={3} fill="#FEF3C7" stroke="#D97706" strokeWidth={strokeWidth} />
            {Array.from({ length: Math.max(3, Math.floor(width / 12)) }).map((_, i) => (
              <Line key={`slat_${i}`} points={[(i + 1) * 12, 0, (i + 1) * 12, height]} stroke="#B45309" strokeWidth={2} />
            ))}
            <Text text={item.name || 'SCREEN'} x={0} y={height / 2 - 4} width={width} align="center" fontSize={7} fontStyle="bold" fill="#78350F" listening={false} />
          </Group>
        );

      case 'sofa':
      case 'sofa_lounge':
        return (
          <Group>
            <Rect x={0} y={0} width={width} height={height} cornerRadius={8} fill="#E7E5E4" stroke={strokeColor} strokeWidth={strokeWidth} />
            <Rect x={6} y={6} width={width - 12} height={height - 12} cornerRadius={4} fill="#FFFFFF" stroke="#D6D3D1" strokeWidth={1} />
            <Text text={item.name || 'SOFA'} x={0} y={height / 2 - 6} width={width} align="center" fontSize={10} fontStyle="bold" fill="#171717" listening={false} />
          </Group>
        );

      case 'wall_art':
        return (
          <Group>
            <Rect x={0} y={0} width={width} height={height} cornerRadius={2} fill="#FEF3C7" stroke="#92400E" strokeWidth={strokeWidth} />
            <Rect x={2} y={2} width={width - 4} height={height - 4} fill="#FDF4FF" stroke="#A855F7" strokeWidth={1} />
            <Circle x={width / 2} y={height / 2} radius={Math.min(width, height) * 0.25} fill="#16A34A" />
            <Text text={item.name || 'ART'} x={0} y={height / 2 - 4} width={width} align="center" fontSize={7} fontStyle="bold" fill="#171717" listening={false} />
          </Group>
        );

      case 'slat_wall':
        return (
          <Group>
            <Rect x={0} y={0} width={width} height={height} cornerRadius={2} fill="#78350F" stroke="#451A03" strokeWidth={strokeWidth} />
            {Array.from({ length: Math.max(3, Math.floor(height / 8)) }).map((_, i) => (
              <Line key={`wood_${i}`} points={[0, (i + 1) * 8, width, (i + 1) * 8]} stroke="#B45309" strokeWidth={1.5} />
            ))}
            <Text text={item.name || 'SLATS'} x={0} y={height / 2 - 4} width={width} align="center" fontSize={7} fontStyle="bold" fill="#FEF3C7" listening={false} />
          </Group>
        );

      case 'decorative_shelf':
        return (
          <Group>
            <Rect x={0} y={0} width={width} height={height} cornerRadius={2} fill="#F5F5F4" stroke="#78716C" strokeWidth={strokeWidth} />
            <Line points={[0, height / 2, width, height / 2]} stroke="#44403C" strokeWidth={2} />
            <Circle x={width * 0.3} y={height / 2} radius={3} fill="#D97706" />
            <Circle x={width * 0.7} y={height / 2} radius={2.5} fill="#059669" />
            <Text text={item.name || 'SHELF'} x={0} y={height - 8} width={width} align="center" fontSize={6} fontStyle="bold" fill="#171717" listening={false} />
          </Group>
        );

      case 'pendant_light':
        return (
          <Group>
            <Circle x={width / 2} y={height / 2} radius={Math.min(width, height) / 2} fill="#FEF3C7" stroke="#D97706" strokeWidth={strokeWidth} />
            <Circle x={width / 2} y={height / 2} radius={Math.min(width, height) * 0.3} fill="#F59E0B" />
            <Line points={[width / 2, 0, width / 2, height]} stroke="#B45309" strokeWidth={1} strokeDasharray={[2, 2]} />
            <Line points={[0, height / 2, width, height / 2]} stroke="#B45309" strokeWidth={1} strokeDasharray={[2, 2]} />
          </Group>
        );

      case 'spotlight':
      case 'wall_sconce':
      case 'ceiling_light':
        return (
          <Group>
            <Rect x={0} y={0} width={width} height={height} cornerRadius={3} fill="#18181B" stroke="#D97706" strokeWidth={strokeWidth} />
            <Circle x={width / 2} y={height / 2} radius={3} fill="#F59E0B" />
            <Text text={item.name || 'SPOT'} x={0} y={height / 2 - 3} width={width} align="center" fontSize={6} fontStyle="bold" fill="#FFFFFF" listening={false} />
          </Group>
        );

      case 'wall_ac':
        return (
          <Group>
            <Rect x={0} y={0} width={width} height={height} cornerRadius={3} fill="#F8FAFC" stroke="#0284C7" strokeWidth={strokeWidth} />
            <Line points={[4, height * 0.7, width - 4, height * 0.7]} stroke="#38BDF8" strokeWidth={1.5} />
            <Circle x={width - 6} y={height * 0.35} radius={2} fill="#22C55E" />
            <Text text={item.name || 'AC'} x={0} y={height * 0.15} width={width} align="center" fontSize={6} fontStyle="bold" fill="#0369A1" listening={false} />
          </Group>
        );

      case 'ceiling_ac':
        return (
          <Group>
            <Rect x={0} y={0} width={width} height={height} cornerRadius={4} fill="#F8FAFC" stroke="#0284C7" strokeWidth={strokeWidth} />
            <Rect x={width * 0.25} y={height * 0.25} width={width * 0.5} height={height * 0.5} fill="#E2E8F0" stroke="#0284C7" strokeWidth={1} />
            <Line points={[0, 0, width, height]} stroke="#94A3B8" strokeWidth={1} />
            <Line points={[width, 0, 0, height]} stroke="#94A3B8" strokeWidth={1} />
            <Text text={item.name || 'AC'} x={0} y={height / 2 - 4} width={width} align="center" fontSize={7} fontStyle="bold" fill="#0369A1" listening={false} />
          </Group>
        );

      default:
        return (
          <Group>
            <Rect x={0} y={0} width={width} height={height} cornerRadius={4} fill="#F5F5F4" stroke={strokeColor} strokeWidth={strokeWidth} />
            <Text text={item.name || 'FIXTURE'} x={0} y={height / 2 - 6} width={width} align="center" fontSize={10} fontStyle="bold" fill="#171717" listening={false} />
          </Group>
        );
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
      {renderContent()}

      {/* Lock Indicator Badge */}
      {isLocked && (
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
    </Group>
  );
};
