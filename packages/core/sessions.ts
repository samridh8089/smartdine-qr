/**
 * SmartDine Shared Core Dining Sessions Engine
 * Pure business logic for customer dining session lifecycles, duration metrics,
 * and closure invariants.
 * Free of UI and framework dependencies.
 */

import { DiningSession } from './types';

/**
 * Computes elapsed dining duration in integer minutes.
 */
export function calculateDiningDurationMinutes(
  sessionStart: string | number,
  sessionEnd: string | number = Date.now()
): number {
  const startMs = typeof sessionStart === 'number' ? sessionStart : new Date(sessionStart).getTime();
  const endMs = typeof sessionEnd === 'number' ? sessionEnd : new Date(sessionEnd).getTime();

  if (isNaN(startMs) || isNaN(endMs) || startMs > endMs) return 0;
  return Math.floor((endMs - startMs) / (60 * 1000));
}

/**
 * Formats duration in minutes into a human-readable string (e.g. "1h 15m" or "45m").
 */
export function formatDiningDuration(durationMinutes: number): string {
  if (durationMinutes <= 0) return '0m';
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Evaluates whether a dining session can be closed cleanly.
 */
export function isSessionEligibleForClosure(unpaidOrderCount: number): { canClose: boolean; reason?: string } {
  if (unpaidOrderCount > 0) {
    return {
      canClose: false,
      reason: `Cannot close session with ${unpaidOrderCount} unpaid order(s). Settle all orders first.`
    };
  }
  return { canClose: true };
}

/**
 * Builds metadata for initializing a new dining session.
 */
export function createDiningSessionMetadata(
  tableId: string,
  tableName: string,
  guestCount: number,
  waiterId?: string
): any {
  return {
    table_id: tableId,
    table_name: tableName,
    guest_count: guestCount,
    assigned_waiter_id: waiterId || null,
    start_time: new Date().toISOString(),
    status: 'active'
  };
}
