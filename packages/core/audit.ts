/**
 * SmartDine Shared Core Audit Engine
 * Pure business logic and contracts for immutable restaurant operational auditing.
 * Free of UI and framework dependencies.
 */

import { AuditEntry } from './types';

export const AUDIT_ACTIONS = [
  'order_created',
  'order_modified',
  'status_changed',
  'payment_completed',
  'bill_voided',
  'table_transferred',
  'reservation_created',
  'reservation_cancelled',
  'staff_invited',
  'staff_verified',
  'inventory_adjusted'
] as const;

export const AUDIT_ENTITIES = [
  'order',
  'table',
  'bill',
  'reservation',
  'staff',
  'inventory'
] as const;

/**
 * Builds standard structured audit log payload with timestamps and sanitization.
 */
export function buildAuditPayload(entry: AuditEntry): AuditEntry & { timestamp: string } {
  return {
    restaurantId: entry.restaurantId,
    userEmail: entry.userEmail || entry.userName || 'System',
    userName: entry.userName || entry.userEmail || 'Staff',
    role: entry.role || 'Staff',
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId || '',
    previousValue: entry.previousValue ?? null,
    newValue: entry.newValue ?? null,
    details: typeof entry.details === 'object' ? entry.details : { message: entry.details || '' },
    timestamp: entry.timestamp || new Date().toISOString()
  };
}

/**
 * Generates human-readable audit descriptions for owner telemetry.
 */
export function formatAuditDescription(action: string, entity: string, details?: any): string {
  switch (action) {
    case 'order_created':
      return `Order placed for ${details?.tableName || 'Table'} (Amount: ₹${details?.total || 0})`;
    case 'status_changed':
      return `Status changed from ${details?.previousStatus || 'N/A'} to ${details?.newStatus || 'N/A'}`;
    case 'payment_completed':
      return `Bill settled via ${details?.paymentMethod || 'cash/upi'} (Amount: ₹${details?.total || 0})`;
    case 'table_transferred':
      return `Table transferred from ${details?.oldTableName || 'Table'} to ${details?.newTableName || 'Table'}`;
    case 'reservation_created':
      return `Reservation booked for ${details?.customerName || 'Guest'} (${details?.guestCount || 1} guests)`;
    default:
      return `${action} on ${entity}`;
  }
}
