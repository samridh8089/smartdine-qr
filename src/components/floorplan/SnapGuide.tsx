'use client';

import React from 'react';
import { Layer, Line } from 'react-konva';

export interface GuideLine {
  id: string;
  points: [number, number, number, number];
  orientation: 'horizontal' | 'vertical';
}

interface SnapGuideProps {
  guides: GuideLine[];
}

export const SnapGuide: React.FC<SnapGuideProps> = ({ guides }) => {
  if (!guides || guides.length === 0) return null;

  return (
    <Layer listening={false}>
      {guides.map((g) => (
        <Line
          key={g.id}
          points={g.points}
          stroke="#10B981" // subtle emerald alignment line
          strokeWidth={1}
          dash={[4, 4]}
          listening={false}
        />
      ))}
    </Layer>
  );
};
