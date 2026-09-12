// SmartDine AI Floor Planner — Layout Preview Thumbnail
// Crisp, high-performance SVG preview thumbnail visualizing dining zones,
// tables, chairs, booths, and architectural fixtures.

import React from 'react';
import { FloorPlanItem } from '@/components/floorplan/types';

interface LayoutPreviewThumbnailProps {
  items: FloorPlanItem[];
  canvasWidth: number;
  canvasHeight: number;
  className?: string;
}

export const LayoutPreviewThumbnail: React.FC<LayoutPreviewThumbnailProps> = ({
  items,
  canvasWidth,
  canvasHeight,
  className = ''
}) => {
  const viewBox = `0 0 ${canvasWidth} ${canvasHeight}`;

  return (
    <div className={`relative w-full aspect-16/10 bg-stone-950 rounded-xl overflow-hidden border border-stone-800/80 shadow-inner select-none ${className}`}>
      {/* Background Architectural Grid */}
      <svg
        viewBox={viewBox}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="thumb-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#292524" strokeWidth="0.8" opacity="0.4" />
          </pattern>
          <linearGradient id="woodGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#92400e" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>
          <linearGradient id="marbleGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient id="leatherGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#166534" />
          </linearGradient>
          <linearGradient id="steelGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
        </defs>

        <rect width={canvasWidth} height={canvasHeight} fill="#0c0a09" />
        <rect width={canvasWidth} height={canvasHeight} fill="url(#thumb-grid)" />

        {/* Outer Boundary Wall */}
        <rect
          x="12"
          y="12"
          width={canvasWidth - 24}
          height={canvasHeight - 24}
          fill="none"
          stroke="#44403c"
          strokeWidth="3"
          strokeDasharray="6 4"
          rx="8"
        />

        {/* Central Walking Artery Indicator */}
        <rect
          x={canvasWidth / 2 - 50}
          y="40"
          width="100"
          height={canvasHeight - 80}
          fill="#1c1917"
          opacity="0.35"
          rx="6"
        />

        {/* Render Items */}
        {items.map((item) => {
          const isTable = item.kind === 'table';
          const { x, y, width, height, shape, furnitureType, material } = item;

          // Color fills based on material / fixture
          let fill = '#78350f'; // default walnut
          let stroke = '#b45309';

          if (material === 'marble') {
            fill = 'url(#marbleGrad)';
            stroke = '#94a3b8';
          } else if (material === 'olive_leather' || shape === 'booth' || shape === 'l_booth' || shape === 'vip_lounge') {
            fill = 'url(#leatherGrad)';
            stroke = '#22c55e';
          } else if (furnitureType === 'kitchen_pass' || furnitureType === 'kitchen') {
            fill = 'url(#steelGrad)';
            stroke = '#64748b';
          } else if (furnitureType === 'cash_counter' || furnitureType === 'pos') {
            fill = '#b45309';
            stroke = '#f59e0b';
          } else if (furnitureType === 'double_door' || furnitureType === 'entrance_door') {
            fill = '#38bdf8';
            stroke = '#0284c7';
          } else if (furnitureType === 'accessible_washroom' || furnitureType === 'washroom') {
            fill = '#6366f1';
            stroke = '#818cf8';
          } else if (furnitureType?.includes('plant')) {
            fill = '#10b981';
            stroke = '#34d399';
          }

          if (isTable) {
            if (shape === 'circle') {
              const radius = Math.min(width, height) / 2;
              return (
                <g key={item.id}>
                  <circle
                    cx={x + width / 2}
                    cy={y + height / 2}
                    r={radius}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth="2"
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
                  />
                  <text
                    x={x + width / 2}
                    y={y + height / 2 + 4}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    {item.display_number || item.tableNumber?.replace('T-', '') || ''}
                  </text>
                </g>
              );
            }

            // Square, Rectangle, Booth
            return (
              <g key={item.id}>
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth="2"
                  rx={shape === 'booth' || shape === 'vip_lounge' ? 6 : 4}
                  filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
                />
                <text
                  x={x + width / 2}
                  y={y + height / 2 + 4}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {item.display_number || item.tableNumber?.replace('T-', '') || ''}
                </text>
              </g>
            );
          }

          // Fixture / Furniture item
          return (
            <g key={item.id}>
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={fill}
                stroke={stroke}
                strokeWidth="1.5"
                rx="4"
                opacity="0.85"
              />
              <text
                x={x + width / 2}
                y={y + height / 2 + 3}
                textAnchor="middle"
                fill="#ffffff"
                fontSize="8"
                fontWeight="bold"
                letterSpacing="0.5"
              >
                {item.name?.slice(0, 10)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
