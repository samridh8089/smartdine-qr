import { getClientAuthHeaders } from './supabase';
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

    // If client-side, post to /api/restaurant/audit-logs with auth headers
    if (typeof window !== 'undefined') {
      getClientAuthHeaders().then(authHeaders => {
        fetch('/api/restaurant/audit-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify(payload)
        }).catch(err => console.warn('[Audit Log Client Error]:', err));
      }).catch(() => {});
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


export interface FormattedAuditLog {
  userDisplay: string;
  detailsDisplay: string;
  badgeAction: string;
}

export function formatAuditLogDisplay(log: {
  user_email?: string | null;
  action: string;
  details: any;
}): FormattedAuditLog {
  let userDisplay = (log.user_email || '').trim();
  let detailsDisplay = '';
  let parsed: any = null;

  if (typeof log.details === 'string') {
    const trimmed = log.details.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        parsed = null;
      }
    } else {
      detailsDisplay = log.details;
    }
  } else if (log.details && typeof log.details === 'object') {
    parsed = log.details;
  }

  if (parsed) {
    // 1. Resolve user display
    if (!userDisplay || userDisplay === 'system' || userDisplay.toLowerCase() === 'staff member' || userDisplay.toLowerCase() === 'staff') {
      if (parsed.userName) {
        userDisplay = parsed.role && parsed.role.toLowerCase() !== 'staff' 
          ? String(parsed.userName) + ' (' + String(parsed.role) + ')' 
          : String(parsed.userName);
      } else if (parsed.role) {
        userDisplay = String(parsed.role);
      }
    }

    // 2. Format details nicely
    if (parsed.message) {
      detailsDisplay = parsed.message;
    } else if (log.action && (log.action.includes('payment') || parsed.entity === 'order')) {
      const orderShort = parsed.orderId || parsed.entityId ? '#' + String(parsed.orderId || parsed.entityId).slice(0, 8) : '';
      const tableName = parsed.tableName ? String(parsed.tableName) : '';
      const totalVal = parsed.total !== undefined ? parsed.total : parsed.newValue?.total;
      const totalStr = totalVal !== undefined && totalVal !== null ? '₹' + String(totalVal) : '';

      const splitObj = parsed.split || parsed.newValue?.split;
      let methodText = '';
      if (splitObj && splitObj.is_split && Array.isArray(splitObj.splits)) {
        const parts = splitObj.splits.map((s: any) => (s.name || s.method) + ': ₹' + s.amount).join(' + ');
        methodText = 'Split (' + parts + ')';
      } else {
        const rawMethod = parsed.payment_method || (parsed.newValue && parsed.newValue.payment_method) || 'Online';
        methodText = rawMethod === 'cash' ? 'Cash' : rawMethod === 'upi' ? 'Online (UPI)' : String(rawMethod).toUpperCase();
      }

      const byUser = parsed.userName ? 'by ' + String(parsed.userName) : '';
      const parts = [
        ('Payment of ' + (totalStr || 'order') + ' completed ' + byUser + ' via ' + methodText).trim(),
        tableName ? 'for ' + tableName : '',
        orderShort ? '(' + orderShort + ')' : ''
      ].filter(Boolean);

      detailsDisplay = parts.join(' ');
    } else if (parsed.previousValue && parsed.newValue) {
      detailsDisplay = 'Changed from ' + JSON.stringify(parsed.previousValue) + ' to ' + JSON.stringify(parsed.newValue);
    } else {
      const readable = Object.entries(parsed)
        .filter(([k]) => !['entityId', 'orderId', 'restaurantId', 'userName', 'role', 'entity'].includes(k))
        .map(([k, v]) => k + ': ' + (typeof v === 'object' ? JSON.stringify(v) : String(v)))
        .join(', ');
      detailsDisplay = readable || JSON.stringify(parsed);
    }
  }

  // Fallback extraction from "by [Name]" in text strings if user is still empty
  if (!userDisplay || userDisplay === 'system' || userDisplay.toLowerCase() === 'staff') {
    const matchBy = detailsDisplay.match(/\bby\s+([A-Za-z0-9\s]+?)(?:\s*\(|$)/i);
    if (matchBy && matchBy[1]) {
      userDisplay = matchBy[1].trim();
    } else {
      userDisplay = 'Owner / Staff';
    }
  }

  if (!detailsDisplay) {
    detailsDisplay = typeof log.details === 'string' ? log.details : JSON.stringify(log.details);
  }

  return {
    userDisplay,
    detailsDisplay,
    badgeAction: (log.action || '').replace(/_/g, ' ')
  };
}
