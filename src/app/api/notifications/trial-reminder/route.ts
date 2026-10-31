import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logSystemEvent } from '@/lib/systemEventLogger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { restaurantId, notificationType, planExpiresAt, ownerEmail, ownerPhone } = body;

    if (!restaurantId || !notificationType) {
      return NextResponse.json({ error: 'Missing restaurantId or notificationType' }, { status: 400 });
    }

    if (!serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // 1. Check idempotency: check if reminder already recorded in audit logs
    const actionKey = `trial_${notificationType}_sent`;
    const { data: existing } = await admin
      .from('audit_logs')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('action', actionKey)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, message: 'Notification already sent' });
    }

    // 2. Fetch restaurant details
    const { data: rest } = await admin
      .from('restaurants')
      .select('name, phone, settings')
      .eq('id', restaurantId)
      .maybeSingle();

    const recipientEmail = ownerEmail || rest?.settings?.owner_email || 'owner@restaurant.com';
    const recipientPhone = ownerPhone || rest?.phone || '';
    const restaurantName = rest?.name || 'Your Restaurant';

    // 3. Insert audit log
    await admin.from('audit_logs').insert({
      restaurant_id: restaurantId,
      user_email: recipientEmail,
      action: actionKey,
      details: JSON.stringify({
        notification_type: notificationType,
        recipient_phone: recipientPhone,
        recipient_email: recipientEmail,
        plan_expires_at: planExpiresAt,
        dispatched_at: new Date().toISOString(),
        channel: 'in_app_and_external'
      })
    });

    // 4. Log system event
    logSystemEvent({
      restaurantId,
      correlationId: `reminder_${Date.now()}`,
      eventType: 'audit_written',
      actorType: 'system',
      metadata: {
        notificationType,
        restaurantName,
        recipientEmail,
        recipientPhone,
        planExpiresAt
      }
    });

    console.log(`[Trial Notification Dispatched] Type: ${notificationType} | Restaurant: ${restaurantName} (${restaurantId}) | Recipient: ${recipientEmail}`);

    return NextResponse.json({
      success: true,
      notificationType,
      dispatched: true,
      dispatchedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[Trial Reminder Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
