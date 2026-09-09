/**
 * eventLogger.ts
 * Phase-19: Founder Control Center — Client-Side Event Logger
 *
 * Used by customer-facing pages to log anonymous events (QR scan, menu open, etc.)
 * Fire-and-forget: never awaited, never blocks the customer experience.
 */

export type ClientEventType =
  | 'qr_scanned'
  | 'menu_opened'
  | 'cart_updated'
  | 'checkout_started';

/**
 * Generate or retrieve a correlation ID from sessionStorage.
 * One correlation ID per customer session/scan.
 */
export function getOrCreateCorrelationId(tableId?: string): string {
  if (typeof window === 'undefined') return `corr_${Date.now()}`;

  const key = tableId ? `corr_${tableId}` : 'corr_session';
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'corr_';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  sessionStorage.setItem(key, id);
  return id;
}

export function isRecorderEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('founder_recorder_enabled') !== 'false';
}

export function getRecorderMode(): 'production' | 'test' {
  if (typeof window === 'undefined') return 'production';
  return (localStorage.getItem('founder_recorder_mode') as 'production' | 'test') || 'production';
}

export function setRecorderConfig(enabled: boolean, mode: 'production' | 'test'): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('founder_recorder_enabled', enabled ? 'true' : 'false');
  localStorage.setItem('founder_recorder_mode', mode);
}

/**
 * Fire-and-forget client event logger.
 * Posts to /api/system-events. Never awaited.
 *
 * @example
 * logClientEvent(restaurantId, 'qr_scanned', tableId, { table_name: 'Table 5' });
 */
export function logClientEvent(
  restaurantId: string,
  eventType: ClientEventType,
  tableId?: string,
  metadata?: Record<string, unknown>
): void {
  if (!restaurantId || restaurantId === 'demo-rest') return;
  if (typeof window === 'undefined') return;

  // Event Recorder check
  if (!isRecorderEnabled()) return;

  const mode = getRecorderMode();
  // Production mode: Essential events only (skip noisy customer browse events)
  // Test mode: Verbose (logs qr_scanned, menu_opened, cart_updated, etc.)
  const verboseClientEvents: ClientEventType[] = ['qr_scanned', 'menu_opened', 'cart_updated'];
  if (mode === 'production' && verboseClientEvents.includes(eventType)) {
    return;
  }

  const correlationId = getOrCreateCorrelationId(tableId);

  // Fire-and-forget: intentionally not awaited
  fetch('/api/system-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurant_id: restaurantId,
      correlation_id: correlationId,
      table_uuid: tableId ?? null,
      event_type: eventType,
      actor_type: 'customer',
      metadata: metadata ?? {},
    }),
  }).catch(() => {
    // Intentionally silent
  });
}
