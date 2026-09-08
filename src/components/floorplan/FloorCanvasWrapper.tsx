'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { FloorPlanItem } from './types';

interface FloorCanvasWrapperProps {
  restaurantId: string;
  restaurantName?: string;
  restaurantSlug?: string;
  mode: 'view' | 'edit';
  onModeChange: (mode: 'view' | 'edit') => void;
  initialItems?: FloorPlanItem[];
  onViewQR?: (item: FloorPlanItem) => void;
  onDataMutated?: () => void;
}

const DynamicFloorCanvas = dynamic(
  () => import('./FloorCanvas'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[calc(100vh-145px)] w-full bg-[#F8F8F6] rounded-xl border border-[#E7E5E4] flex flex-col items-center justify-center text-xs font-semibold text-[#737373] space-y-2">
        <div className="w-6 h-6 border-2 border-[#171717] border-t-transparent rounded-full animate-spin" />
        <span>Initializing OpenTable Floor Plan Canvas...</span>
      </div>
    )
  }
);

export default function FloorCanvasWrapper(props: FloorCanvasWrapperProps) {
  return <DynamicFloorCanvas {...props} />;
}
