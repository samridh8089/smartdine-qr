// SmartDine Floor Planner AI Abstraction (Phase 2 Vision+)
// Supports server-side Gemini 2.5 Flash Vision room understanding,
// camera-guided photo capture, architectural shell reconstruction, and revenue optimization.

import { FloorPlanItem, TableShape, FurnitureType } from '@/components/floorplan/types';

export type MeasurementUnit = 'ft' | 'm';

export interface RoomDimensions {
  width: number;
  length: number;
  unit: MeasurementUnit;
  areaSqFt: number;
  areaSqM: number;
}

export interface FurnitureRequirement {
  id: string;
  name: string;
  category: 'tables' | 'chairs' | 'sofas' | 'counters' | 'kitchen' | 'decor' | 'structure' | 'doors_windows' | 'plants';
  kind: 'table' | 'furniture';
  shape?: TableShape;
  furnitureType?: FurnitureType;
  defaultSeats?: number;
  quantity: number;
  width: number; // in pixels (canvas coords)
  height: number;
}

export type CaptureTarget = 'entrance' | 'left' | 'right' | 'back' | 'kitchen';
export type WallTag = 'front' | 'left' | 'right' | 'kitchen' | 'general' | 'back';

export interface RoomPhoto {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  wallTag: WallTag;
  captureTarget?: CaptureTarget;
  uploadedAt: string;
}

// Structured Room Analysis schema produced by Gemini Vision
export interface WallFeature {
  side: 'front' | 'back' | 'left' | 'right';
  features: string[];
  estimatedLength?: number;
}

export interface WindowFeature {
  wall: 'front' | 'back' | 'left' | 'right';
  positionPercent: number; // 0 to 100 along wall
  widthFt?: number;
}

export interface DoorFeature {
  wall: 'front' | 'back' | 'left' | 'right';
  positionPercent: number; // 0 to 100 along wall
  type: 'entrance' | 'double_door' | 'single_door' | 'washroom_door' | 'sliding_door';
  widthFt?: number;
}

export interface PillarFeature {
  xPercent: number; // 0 to 100
  yPercent: number; // 0 to 100
  sizeFt?: number;
}

export interface CounterFeature {
  wall: 'front' | 'back' | 'left' | 'right' | 'free';
  positionPercent: number;
  type: 'cash_counter' | 'bar_counter' | 'service_counter';
}

export interface GeminiRoomAnalysis {
  room: {
    shape: 'rectangle' | 'square' | 'l_shaped' | 'open';
    estimatedWidth: number;
    estimatedLength: number;
  };
  walls: WallFeature[];
  windows: WindowFeature[];
  doors: DoorFeature[];
  pillars: PillarFeature[];
  existingCounter: boolean;
  counterDetails?: CounterFeature;
  kitchenLocation: 'back-right' | 'back-left' | 'back-center' | 'left' | 'right';
  washroomLocation: 'back-left' | 'back-right' | 'front-left' | 'none';
  ceilingHeightFt?: number;
  lightingDirection?: 'natural_front' | 'natural_side' | 'ambient_overhead' | 'warm_perimeter';
  acUnits?: Array<{ wall: 'front' | 'back' | 'left' | 'right' | 'ceiling'; positionPercent: number; type: 'wall_ac' | 'ceiling_ac' }>;
  unusedCorners?: Array<{ corner: 'front-left' | 'front-right' | 'back-left' | 'back-right'; recommendation: string }>;
  confidenceScore?: number;
  spatialNotes?: string;
  isFallback?: boolean;
}

// Business Impact & Revenue Optimization
export interface BusinessImpactMetrics {
  currentSeats: number;
  suggestedSeats: number;
  extraSeats: number;
  peakHourCapacityIncreasePercent: number;
  revenueIncreasePercent: number;
  revenueScoreBadge: string; // e.g. "Revenue +12%"
  waiterEfficiencyBadge: string; // e.g. "Service +20%"
  walkingAisleWidthFt: number;
  shorterWaiterPathPercent: number;
  disclaimer: string;
}

export interface LayoutMetrics {
  seats: number;
  tableCount: number;
  walkingSpace: 'Excellent' | 'Good' | 'Fair';
  kitchenDistance: 'Short' | 'Moderate' | 'Direct';
  tableDensity: 'Spacious' | 'Balanced' | 'High';
  accessibilityScore: number; // 0 - 100
  estimatedCapacity: number;
}

export interface LayoutSuggestion {
  id: string;
  name: string;
  badge: string;
  theme: string;
  description: string;
  items: FloorPlanItem[];
  metrics: LayoutMetrics;
  businessImpact: BusinessImpactMetrics;
  canvasWidth: number;
  canvasHeight: number;
  associatedPhotoUrl?: string;
  roomAnalysis?: GeminiRoomAnalysis;
}

export interface GenerateLayoutInput {
  dimensions: RoomDimensions;
  requirements: FurnitureRequirement[];
  photos?: RoomPhoto[];
  roomAnalysis?: GeminiRoomAnalysis;
  restaurantName?: string;
  restaurantId?: string;
  existingZones?: string[];
  currentSeats?: number;
  layoutStyle?: 'cozy_cafe' | 'bistro' | 'spacious_hall' | 'default';
}

export interface AIImprovementSuggestion {
  id: string;
  title: string;
  description: string;
  impactTag: string;
  badge: string;
  apply: (currentItems: FloorPlanItem[], dimensions: { width: number; height: number }) => FloorPlanItem[];
}

export interface FloorPlannerAIProvider {
  name: string;
  generateLayouts(input: GenerateLayoutInput): Promise<LayoutSuggestion[]>;
  getImprovementSuggestions?(currentItems: FloorPlanItem[]): Promise<AIImprovementSuggestion[]>;
}

// Local deterministic implementation factory
let currentProvider: FloorPlannerAIProvider | null = null;

export function registerFloorPlannerProvider(provider: FloorPlannerAIProvider) {
  currentProvider = provider;
}

export function getFloorPlannerProvider(): FloorPlannerAIProvider {
  if (!currentProvider) {
    throw new Error('No FloorPlannerAIProvider registered. Register LocalDeterministicProvider first.');
  }
  return currentProvider;
}
