/**
 * SmartDine Shared Core Types
 * Platform-independent, zero-React domain type definitions.
 * Shared across Web, Android, and Desktop.
 */

// --- Order & Menu Types ---
export type OrderStatus =
  | 'new'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'completed'
  | 'cancelled';

export type OrderType =
  | 'dine_in'
  | 'takeaway'
  | 'delivery'
  | 'reservation'
  | 'punch';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'partially_paid'
  | 'refunded'
  | 'failed';

export interface OrderItem {
  id?: string;
  menu_item_id?: string;
  menuItemId?: string;
  name: string;
  price: number;
  quantity: number;
  variant_id?: string | null;
  variantId?: string | null;
  variant_name?: string | null;
  variantName?: string | null;
  notes?: string;
  status?: string;
  is_cancelled?: boolean;
}

export interface OrderBatch {
  id: string;
  order_id: string;
  batch_number: number;
  status: OrderStatus;
  items: OrderItem[];
  special_instructions?: string;
  created_at: string;
}

export interface Order {
  id: string;
  restaurant_id: string;
  table_id?: string | null;
  table_name?: string | null;
  table_number?: number | null;
  order_number: number;
  order_type: OrderType;
  status: OrderStatus;
  payment_status: PaymentStatus;
  items: OrderItem[];
  batches?: OrderBatch[];
  subtotal: number;
  tax: number;
  total: number;
  discount_amount?: number;
  offer_code?: string;
  special_instructions?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_arrival_minutes?: number;
  takeaway_notes?: string;
  idempotency_key?: string;
  created_at: string;
  updated_at?: string;
}

// --- Table & Floor Layout Types ---
export type TableStatus =
  | 'available'
  | 'occupied'
  | 'billed'
  | 'cleaning'
  | 'reserved';

export interface Table {
  id: string;
  restaurant_id: string;
  name: string;
  table_number: number;
  capacity: number;
  status: TableStatus;
  zone_id?: string | null;
  assigned_waiter_id?: string | null;
  qr_code_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Zone {
  id: string;
  restaurant_id: string;
  name: string;
  assigned_waiter_id?: string | null;
}

// --- Staff & Authorization Types ---
export type StaffRole =
  | 'owner'
  | 'manager'
  | 'supervisor'
  | 'cashier'
  | 'waiter'
  | 'kitchen'
  | 'staff'
  | 'super_admin';

export interface StaffProfile {
  id: string;
  restaurant_id: string;
  email: string;
  full_name: string;
  role: StaffRole;
  phone?: string | null;
  is_active: boolean;
  is_verified: boolean;
  verification_status?: string;
  created_at?: string;
}

// --- Billing & Financial Types ---
export interface SplitBillPortion {
  guestIndex: number;
  amount: number;
  paymentMethod?: 'cash' | 'upi' | 'card';
  paid: boolean;
}

export interface SplitBillResult {
  type: 'equal' | 'custom' | 'item';
  total: number;
  portions: SplitBillPortion[];
  isConserved: boolean;
}

// --- Booking Types ---
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'seated'
  | 'completed'
  | 'cancelled';

export interface Booking {
  id: string;
  restaurant_id: string;
  customer_name: string;
  customer_phone: string;
  guest_count: number;
  booking_date: string;
  booking_time: string;
  status: BookingStatus;
  table_id?: string | null;
  notes?: string;
  created_at: string;
}

// --- Dining Session Types ---
export interface DiningSession {
  id: string;
  restaurant_id: string;
  table_id: string;
  start_time: string;
  end_time?: string | null;
  guest_count: number;
  status: 'active' | 'payment_pending' | 'settled' | 'closed';
  total_spend: number;
}

// --- Audit Log Types ---
export interface AuditEntry {
  restaurantId: string;
  userEmail?: string;
  userName?: string;
  role?: string;
  action: string;
  entity: string;
  entityId?: string;
  previousValue?: any;
  newValue?: any;
  details?: any;
  timestamp?: string;
}

// --- Offline Sync Types ---
export interface SyncQueueItem {
  id: string;
  restaurant_id: string;
  user_id: string;
  action_type: 'create_order' | 'update_order_status' | 'staff_punch' | 'settle_bill';
  payload: any;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  retry_count: number;
  timestamp: string;
  last_attempt?: string;
  error_message?: string;
}
