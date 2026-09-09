'use client';

import React from 'react';
import { Group, Rect, Line, Text, Circle, Arc } from 'react-konva';
import { FloorPlanItem } from './types';

interface FurnitureNodeProps {
  item: FloorPlanItem;
  isSelected: boolean;
  isEditable: boolean;
  onSelect: (item: FloorPlanItem, e: any) => void;
  onChange: (newAttrs: Partial<FloorPlanItem>) => void;
  onDragEnd?: (e: any) => void;
}

export const FurnitureNode: React.FC<FurnitureNodeProps> = ({
  item,
  isSelected,
  isEditable,
  onSelect,
  onChange,
  onDragEnd
}) => {
  const type = item.furnitureType || 'counter';
  const width = Math.max(24, Math.min(600, item.width));
  const height = Math.max(24, Math.min(600, item.height));

  const strokeColor = isSelected && isEditable ? '#171717' : '#D6D3D1';
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
      case 'door':
        return (
          <Group>
            {/* Wall jamb */}
            <Rect x={0} y={0} width={6} height={height} fill="#171717" />
            <Rect x={width - 6} y={0} width={6} height={height} fill="#171717" />
            {/* Door swing arc */}
            <Arc
              x={6}
              y={height}
              innerRadius={width - 12}
              outerRadius={width - 12}
              angle={90}
              rotation={270}
              stroke="#A8A29E"
              strokeWidth={1}
              dash={[3, 3]}
            />
            {/* Door leaf */}
            <Line points={[6, height, 6, 0]} stroke="#171717" strokeWidth={2.5} />
            <Text
              text={item.name || 'DOOR'}
              x={0}
              y={height / 2 - 5}
              width={width}
              align="center"
              fontSize={9}
              fontStyle="bold"
              fill="#78716C"
            />
          </Group>
        );

      case 'divider':
        return (
          <Group>
            <Rect
              x={0}
              y={0}
              width={width}
              height={height}
              fill="#E7E5E4"
              stroke="#A8A29E"
              strokeWidth={1}
              dash={[4, 4]}
            />
            <Text
              text={item.name || 'PARTITION'}
              x={0}
              y={height / 2 - 5}
              width={width}
              align="center"
              fontSize={8}
              fontStyle="bold"
              fill="#78716C"
            />
          </Group>
        );

      case 'bar_seats':
        const stoolCount = Math.max(2, Math.floor(width / 35));
        const stoolStep = width / (stoolCount + 1);
        return (
          <Group>
            {/* Bar Top */}
            <Rect
              x={0}
              y={0}
              width={width}
              height={height}
              cornerRadius={4}
              fill="#F5F5F4"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            {/* Bar Stools */}
            {Array.from({ length: stoolCount }).map((_, i) => (
              <Circle
                key={`stool_${i}`}
                x={(i + 1) * stoolStep}
                y={height + 10}
                radius={7}
                fill="#E7E5E4"
                stroke="#A8A29E"
                strokeWidth={1}
              />
            ))}
            <Text
              text={item.name || 'BAR'}
              x={0}
              y={height / 2 - 6}
              width={width}
              align="center"
              fontSize={10}
              fontStyle="bold"
              fill="#171717"
            />
          </Group>
        );

      case 'kitchen':
        return (
          <Group>
            <Rect
              x={0}
              y={0}
              width={width}
              height={height}
              cornerRadius={4}
              fill="#FAFAF9"
              stroke="#78716C"
              strokeWidth={2}
            />
            <Line points={[0, height * 0.4, width, height * 0.4]} stroke="#D6D3D1" strokeWidth={1} />
            <Text
              text={item.name || 'KITCHEN PASS'}
              x={0}
              y={height * 0.12}
              width={width}
              align="center"
              fontSize={10}
              fontStyle="bold"
              fill="#171717"
            />
            <Text
              text="Order Dispatch Lane"
              x={0}
              y={height * 0.55}
              width={width}
              align="center"
              fontSize={8}
              fill="#78716C"
            />
          </Group>
        );

      case 'cash_counter':
        return (
          <Group>
            <Rect
              x={0}
              y={0}
              width={width}
              height={height}
              cornerRadius={4}
              fill="#F5F5F4"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            <Rect x={10} y={height / 2 - 8} width={20} height={16} fill="#E7E5E4" stroke="#A8A29E" strokeWidth={1} />
            <Text
              text={item.name || 'CASH / POS'}
              x={35}
              y={height / 2 - 5}
              fontSize={10}
              fontStyle="bold"
              fill="#171717"
            />
          </Group>
        );

      case 'washroom':
        return (
          <Group>
            <Rect
              x={0}
              y={0}
              width={width}
              height={height}
              cornerRadius={4}
              fill="#F5F5F4"
              stroke="#A8A29E"
              strokeWidth={1.5}
            />
            <Text
              text={item.name || 'WASHROOM'}
              x={0}
              y={height / 2 - 6}
              width={width}
              align="center"
              fontSize={10}
              fontStyle="bold"
              fill="#78716C"
            />
          </Group>
        );

      case 'waiting_area':
        return (
          <Group>
            <Rect
              x={0}
              y={0}
              width={width}
              height={height}
              cornerRadius={6}
              fill="#F5F5F4"
              stroke="#D6D3D1"
              strokeWidth={1.5}
            />
            <Text
              text={item.name || 'WAITING LOUNGE'}
              x={0}
              y={height / 2 - 6}
              width={width}
              align="center"
              fontSize={10}
              fontStyle="bold"
              fill="#57534E"
            />
          </Group>
        );

      case 'sofa':
        return (
          <Group>
            <Rect
              x={0}
              y={0}
              width={width}
              height={height}
              cornerRadius={8}
              fill="#E7E5E4"
              stroke="#A8A29E"
              strokeWidth={1.5}
            />
            <Rect
              x={6}
              y={6}
              width={width - 12}
              height={height - 12}
              cornerRadius={4}
              fill="#FFFFFF"
              stroke="#D6D3D1"
              strokeWidth={1}
            />
            <Text
              text={item.name || 'SOFA'}
              x={0}
              y={height / 2 - 6}
              width={width}
              align="center"
              fontSize={10}
              fontStyle="bold"
              fill="#171717"
            />
          </Group>
        );

      case 'counter':
      default:
        return (
          <Group>
            <Rect
              x={0}
              y={0}
              width={width}
              height={height}
              cornerRadius={4}
              fill="#F5F5F4"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            <Text
              text={item.name || 'SERVICE COUNTER'}
              x={0}
              y={height / 2 - 6}
              width={width}
              align="center"
              fontSize={10}
              fontStyle="bold"
              fill="#171717"
            />
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
      draggable={isEditable}
      onClick={(e) => onSelect(item, e)}
      onTap={(e) => onSelect(item, e)}
      onDragEnd={handleDragEndInternal}
    >
      {renderContent()}
    </Group>
  );
};
