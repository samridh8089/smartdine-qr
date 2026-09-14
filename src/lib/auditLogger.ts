/**
 * Production Audit Trail Engine
 * Records all critical restaurant actions:
 * - Order Created
 * - Order Modified
 * - Status Changed
 * - Payment Completed
 * - Bill Voided
 * - Table Transferred
 * - Reservation Created
 * - Reservation Cancelled
 */

export interface AuditEntry {
  restaurantId: string;
  userEmail?: string;
  userName?: string;
  role?: string;
  action: 
    | 'order_created'
    | 'order_modified'
    | 'status_changed'
    | 'payment_completed'
    | 'bill_voided'
    | 'table_transferred'
    | 'reservation_created'
    | 'reservation_cancelled'
    | string;
  entity: 'order' | 'table' | 'bill' | 'reservation' | string;
  entityId?: string;
  previousValue?: any;
  newValue?: any;
  details?: any;
}

export async function recordAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const payload = {
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
      timestamp: new Date().toISOString()
    };

    // If client-side, post to /api/restaurant/audit-logs
    if (typeof window !== 'undefined') {
      fetch('/api/restaurant/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(err => console.warn('[Audit Log Client Error]:', err));
      return;
    }

    // If server-side, write directly using supabaseAdmin
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    if (!supabaseUrl || !supabaseKey) return;

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    await supabaseAdmin.from('audit_logs').insert({
      restaurant_id: payload.restaurantId,
      user_email: payload.userEmail,
      action: payload.action,
      details: JSON.stringify({
        userName: payload.userName,
        role: payload.role,
        entity: payload.entity,
        entityId: payload.entityId,
        previousValue: payload.previousValue,
        newValue: payload.newValue,
        ...payload.details
      }),
      created_at: payload.timestamp
    });
  } catch (err) {
    console.warn('[Audit Log Exception]:', err);
  }
}
