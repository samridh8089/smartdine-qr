/**
 * SmartDine Production Observability & Structured JSON Logger
 * Generates X-Request-ID, logs structured JSON events, and flags slow queries (>200ms).
 */

export interface LogEvent {
  requestId: string;
  level: 'info' | 'warn' | 'error';
  context: string;
  message: string;
  durationMs?: number;
  statusCode?: number;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function logEvent(event: LogEvent): void {
  const payload = {
    timestamp: event.timestamp || new Date().toISOString(),
    requestId: event.requestId,
    level: event.level,
    context: event.context,
    message: event.message,
    durationMs: event.durationMs,
    statusCode: event.statusCode,
    ...event.metadata
  };

  // Flag slow operations > 200ms
  if (event.durationMs && event.durationMs > 200) {
    console.warn(`[SLOW_QUERY_ALERT >200ms] Context: ${event.context} | Duration: ${event.durationMs}ms | RequestID: ${event.requestId}`);
  }

  if (event.level === 'error') {
    console.error(JSON.stringify(payload));
  } else if (event.level === 'warn') {
    console.warn(JSON.stringify(payload));
  } else {
    console.log(JSON.stringify(payload));
  }
}
