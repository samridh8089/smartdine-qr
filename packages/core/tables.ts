/**
 * SmartDine Shared Core Tables Engine
 * Pure business logic for table status state machines, waiter assignment hierarchy,
 * table transfers, and occupancy sync.
 * Free of UI and framework dependencies.
 */

import { Table, TableStatus, Zone } from './types';

export const VALID_TABLE_TRANSITIONS: Record<TableStatus, TableStatus[]> = {
  available: ['occupied', 'reserved'],
  occupied: ['billed', 'available'],
  billed: ['cleaning', 'available'],
  cleaning: ['available'],
  reserved: ['occupied', 'available']
};

/**
 * 3-Tier Waiter Assignment Hierarchy:
 * 1. Explicit table-level manual assignment (Highest priority)
 * 2. Zone-level default assignment (Secondary priority)
 * 3. Fallback to 'Unassigned'
 */
export function resolveTableWaiter(
  table: Partial<Table>,
  zones: Zone[] = [],
  staffList: Array<{ id: string; name?: string; full_name?: string }> = []
): string {
  // 1. Explicit manual table assignment
  if (table.assigned_waiter_id) {
    const staff = staffList.find(s => s.id === table.assigned_waiter_id);
    if (staff) return staff.full_name || staff.name || 'Waiter';
  }

  // 2. Zone-level default assignment
  if (table.zone_id) {
    const zone = zones.find(z => z.id === table.zone_id);
    if (zone && zone.assigned_waiter_id) {
      const staff = staffList.find(s => s.id === zone.assigned_waiter_id);
      if (staff) return staff.full_name || staff.name || 'Waiter';
    }
  }

  // 3. Fallback to Unassigned
  return 'Unassigned';
}

/**
 * Validates whether a table transfer is permitted.
 */
export function validateTableTransfer(
  sourceTable: Table,
  targetTable: Table
): { valid: boolean; reason?: string } {
  if (sourceTable.id === targetTable.id) {
    return { valid: false, reason: 'Source and target tables cannot be the same' };
  }

  if (targetTable.status === 'occupied') {
    return { valid: false, reason: `Target table '${targetTable.name}' is already occupied` };
  }

  return { valid: true };
}

/**
 * Computes updated restaurant table_states map after transferring occupancy.
 */
export function computeTransferredTableStates(
  oldTableId: string,
  newTableId: string,
  existingStates: Record<string, any> = {},
  fallbackGuestCount: number = 4
): Record<string, any> {
  const updatedStates = { ...existingStates };
  const oldState = updatedStates[oldTableId] || {};

  updatedStates[newTableId] = {
    ...oldState,
    occupancy_status: 'occupied',
    manual_occupied: true,
    occupied_at: oldState.occupied_at || new Date().toISOString(),
    guest_count: oldState.guest_count || fallbackGuestCount
  };

  updatedStates[oldTableId] = {
    occupancy_status: 'available',
    manual_occupied: false,
    occupied_at: null,
    guest_count: null,
    reservation_party_name: null,
    reservation_time: null
  };

  return updatedStates;
}

/**
 * Evaluates whether a table should be considered occupied based on live orders.
 */
export function isTableOccupiedByActiveOrders(
  tableId: string,
  activeOrders: Array<{ table_id?: string | null; status?: string }>
): boolean {
  const ACTIVE_ORDER_STATUSES = ['new', 'accepted', 'preparing', 'ready', 'served'];
  return activeOrders.some(
    o => o.table_id === tableId && ACTIVE_ORDER_STATUSES.includes(o.status || '')
  );
}
