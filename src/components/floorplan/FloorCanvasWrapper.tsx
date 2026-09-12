'use client';

import React from 'react';
import { FloorPlanItem, RestaurantZone } from './types';
import { FloorLayoutManager } from './FloorLayoutManager';

interface FloorCanvasWrapperProps {
  restaurantId: string;
  restaurantName?: string;
  restaurantSlug?: string;
  mode: 'view' | 'edit';
  onModeChange: (mode: 'view' | 'edit') => void;
  initialItems?: FloorPlanItem[];
  zones?: RestaurantZone[];
  onViewQR?: (item: FloorPlanItem) => void;
  onDataMutated?: () => void;
}

export default function FloorCanvasWrapper(props: FloorCanvasWrapperProps) {
  return <FloorLayoutManager {...props} />;
}

