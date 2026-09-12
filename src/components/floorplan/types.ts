// Floor Plan Types for CleverOps Phase-18.17A
// Production-ready Blueprint Schema

export type { RestaurantZone } from '@/lib/db';

export type TableShape = 
  | 'square' 
  | 'rectangle' 
  | 'circle' 
  | 'oval' 
  | 'booth'
  | 'two_seater'
  | 'six_seater'
  | 'eight_seater'
  | 'ten_seater'
  | 'l_booth'
  | 'u_booth'
  | 'sofa_lounge'
  | 'window_bench'
  | 'vip_lounge'
  | 'bar_table';

export type FurnitureType = 
  | 'counter' 
  | 'bar_seats' 
  | 'waiting_area' 
  | 'kitchen' 
  | 'washroom' 
  | 'door' 
  | 'divider' 
  | 'cash_counter'
  | 'sofa'
  // Kitchen additions
  | 'service_counter'
  | 'kitchen_pass'
  | 'stove'
  | 'fryer'
  | 'pizza_oven'
  | 'sink'
  | 'refrigerator'
  | 'prep_counter'
  | 'storage_rack'
  // Structure additions
  | 'entrance_door'
  | 'double_door'
  | 'sliding_door'
  | 'window'
  | 'divider_wall'
  | 'curved_wall'
  | 'glass_partition'
  // Utilities additions
  | 'pos'
  | 'accessible_washroom'
  | 'emergency_exit'
  | 'fire_extinguisher'
  // Decor additions
  | 'plant_small'
  | 'plant_large'
  | 'flower_pot'
  | 'water_feature'
  | 'pillar'
  | 'decorative_partition'
  | 'wall_art'
  | 'decorative_shelf'
  | 'slat_wall'
  // Lighting additions
  | 'pendant_light'
  | 'spotlight'
  | 'wall_sconce'
  | 'ceiling_light'
  // Climate & Ventilation
  | 'wall_ac'
  | 'ceiling_ac'
  // Windows
  | 'window_large';

export type TableOperationalStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'merged';

export interface FloorPlanItem {
  id: string;
  tableNumber: string; // e.g. "T-1", "1", "5 + 6"
  name: string;
  kind: 'table' | 'furniture';
  shape?: TableShape;
  furnitureType?: FurnitureType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  seats: number;
  status: TableOperationalStatus;
  isLocked?: boolean;
  zIndex?: number;
  material?: 'walnut' | 'marble' | 'black_steel' | 'olive_leather' | 'concrete' | 'warm_fabric' | 'brass' | string;
  
  // Real restaurant mapping
  dbTableId?: string;
  qrCodeUrl?: string;

  // Live operational details (View Mode)
  activeOrderId?: string;
  occupiedAt?: string;
  elapsedMinutes?: number;
  currentGuests?: number;
  waiterName?: string;
  
  // Reservation details
  reservationPartyName?: string;
  reservationPhone?: string;
  reservationTime?: string;
  reservationCountdownMinutes?: number;

  // Merge state
  isMerged?: boolean;
  mergedWithIds?: string[]; // IDs of the constituent tables
  originalSeats?: number;

  // Phase-18.17A-R2 Table Identity & Sections
  table_uuid?: string;
  display_number?: string;
  zone_id?: string;
  zone_name?: string;
  assigned_waiter_id?: string | null;
  assigned_waiter_name?: string | null;
  assignment_source?: 'manual' | 'zone' | 'unassigned';
  distance_from_kitchen?: number;
  is_archived?: boolean;
  service_badges?: Array<'W' | 'B' | 'R' | 'T' | 'VIP'>;
  payment_pending?: boolean;
}

export interface FloorPlanBlueprint {
  version: number;
  restaurantId: string;
  updatedAt: string;
  canvasWidth: number;
  canvasHeight: number;
  gridSize: number;
  items: FloorPlanItem[];
}
