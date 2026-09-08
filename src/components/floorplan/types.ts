// Floor Plan Types for CleverOps Phase-18.17A
// Production-ready Blueprint Schema

export type TableShape = 'square' | 'rectangle' | 'circle' | 'oval' | 'booth';

export type FurnitureType = 
  | 'counter' 
  | 'bar_seats' 
  | 'waiting_area' 
  | 'kitchen' 
  | 'washroom' 
  | 'door' 
  | 'divider' 
  | 'cash_counter'
  | 'sofa';

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
