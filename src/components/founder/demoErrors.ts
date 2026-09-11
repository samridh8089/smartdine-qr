/**
 * Phase-30: Founder Control Center — Zero-State Error System
 * Clean initial zero-error state for fresh restaurant installation.
 * Supports manual user runtime error simulation for verification testing.
 */

import type { SystemErrorItem, ErrorAnalytics } from './types';

// Zero-state initial error collections (0 active, 0 resolved)
export const INITIAL_DEMO_ERROR: SystemErrorItem | null = null;
export const RESOLVED_ERRORS_SEED: SystemErrorItem[] = [];
export const INITIAL_SYSTEM_ERRORS: SystemErrorItem[] = [];

export const ZERO_ERROR_ANALYTICS: ErrorAnalytics = {
  totalErrorsToday: 0,
  resolvedCount: 0,
  avgRecoveryTimeSec: 0,
  criticalCount: 0,
  recoveryRatePercent: 0,
};

export const DEMO_ERROR_ANALYTICS = ZERO_ERROR_ANALYTICS;

/**
 * Creates an on-demand runtime simulated error for user verification testing.
 * Only instantiated when user explicitly triggers "Simulate Error".
 */
export function createSimulatedRuntimeError(orderId = 'ORD-SIM-001', tableName = 'Table 1'): SystemErrorItem {
  return {
    id: `ERR-${Date.now().toString().slice(-4)}`,
    orderId,
    tableName,
    time: 'Just now',
    createdAt: new Date().toISOString(),
    severity: 'critical',
    status: 'active',
    title: 'Kitchen Sync Handshake Interrupted',
    cause: 'Socket connection dropped during kitchen queue dispatch.',
    impact: [
      'Order delayed in kitchen prep queue',
      'Assigned staff pending sync acknowledgement',
    ],
    suggestedFix: 'Retry kitchen synchronization.',
    correlationId: `corr_sim_${Date.now()}`,
    apiEndpoint: '/api/staff/update-order-status',
    httpStatus: '504 Gateway Timeout',
    retryCount: 0,
    durationMs: 8200,
    failedNodeId: 'kitchen_queue',
    targetNodeId: 'preparing',
  };
}
