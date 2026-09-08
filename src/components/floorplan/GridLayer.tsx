'use client';

import React from 'react';
import { Layer, Rect, Line } from 'react-konva';

interface GridLayerProps {
  width: number;
  height: number;
  gridSize?: number;
  showGrid?: boolean;
}

export const GridLayer: React.FC<GridLayerProps> = ({
  width,
  height,
  gridSize = 20,
  showGrid = true
}) => {
  if (!showGrid) {
    return (
      <Layer listening={false}>
        <Rect x={0} y={0} width={width} height={height} fill="#F8F8F6" />
      </Layer>
    );
  }

  const lines = [];

  // Vertical lines
  for (let x = 0; x <= width; x += gridSize) {
    lines.push(
      <Line
        key={`v_${x}`}
        points={[x, 0, x, height]}
        stroke={x % 100 === 0 ? '#E7E5E4' : '#EFEDE8'}
        strokeWidth={x % 100 === 0 ? 1.2 : 0.8}
        listening={false}
      />
    );
  }

  // Horizontal lines
  for (let y = 0; y <= height; y += gridSize) {
    lines.push(
      <Line
        key={`h_${y}`}
        points={[0, y, width, y]}
        stroke={y % 100 === 0 ? '#E7E5E4' : '#EFEDE8'}
        strokeWidth={y % 100 === 0 ? 1.2 : 0.8}
        listening={false}
      />
    );
  }

  return (
    <Layer listening={false}>
      <Rect x={0} y={0} width={width} height={height} fill="#F8F8F6" />
      {lines}
    </Layer>
  );
};
