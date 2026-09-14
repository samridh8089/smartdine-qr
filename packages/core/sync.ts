/**
 * SmartDine Shared Core Offline Sync Engine
 * Pure business logic for offline queuing, idempotency key generation,
 * and conflict resolution.
 * Free of UI and framework dependencies.
 */

import { SyncQueueItem } from './types';

// Re-export production offline sync engine and storage manager
export {
  OfflineStorageManager,
  OfflineSyncEngine,
  type SQLiteDriver,
  type PendingOrder
} from '../../src/lib/offlineSyncEngine';

/**
 * Generates an idempotent transaction key for offline-first submissions.
 */
export function generateIdempotencyKey(prefix: string = 'tx', identifier: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  const idPart = identifier ? `-${identifier}` : '';
  return `${prefix}-${timestamp}-${random}${idPart}`;
}

/**
 * Determines whether a sync failure is transient and eligible for automatic retry.
 */
export function isRetryableSyncError(errorMessage?: string, retryCount: number = 0): boolean {
  if (retryCount >= 5) return false;
  if (!errorMessage) return true;

  const nonRetryableKeywords = [
    'duplicate key',
    'violates foreign key',
    'permission denied',
    'unauthorized',
    'invalid credentials',
    'resource_limit_exceeded'
  ];

  const lowerErr = errorMessage.toLowerCase();
  return !nonRetryableKeywords.some(keyword => lowerErr.includes(keyword));
}

/**
 * Conflict resolution strategy between offline local changes and server state.
 */
export function resolveSyncConflict(
  localAction: SyncQueueItem,
  serverState: any
): { strategy: 'local_wins' | 'server_wins' | 'merge'; reason: string } {
  // 1. If server order is already completed/paid, server wins (immutable final state)
  if (serverState && (serverState.status === 'completed' || serverState.payment_status === 'paid')) {
    return {
      strategy: 'server_wins',
      reason: 'Server state is already settled/completed. Discarding conflicting local updates.'
    };
  }

  // 2. Default: Client action wins for newly punched items
  return {
    strategy: 'local_wins',
    reason: 'Local punch action takes priority over intermediate server state.'
  };
}
