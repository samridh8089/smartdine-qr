import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { batchId, orderId, newStatus, staffName = 'Staff' } = body;

    if (!batchId && !orderId) {
      return NextResponse.json({ error: 'batchId or orderId is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    let updatedBatch: any = null;
    let updatedOrder: any = null;

    if (batchId) {
      const bUpdates: any = { status: newStatus, updated_at: now };
      if (newStatus === 'accepted') { bUpdates.accepted_by = staffName; bUpdates.accepted_at = now; }
      if (newStatus === 'preparing') { bUpdates.preparing_by = staffName; bUpdates.preparing_at = now; }
      if (newStatus === 'ready') { bUpdates.ready_by = staffName; bUpdates.ready_at = now; }
      if (newStatus === 'served' || newStatus === 'completed') { bUpdates.served_by = staffName; bUpdates.served_at = now; }

      const { data: bRes, error: bErr } = await supabaseAdmin
        .from('order_batches')
        .update(bUpdates)
        .eq('id', batchId)
        .select();

      if (bErr) throw new Error(bErr.message);
      updatedBatch = bRes && bRes[0];
    }

    const targetOrderId = orderId || updatedBatch?.order_id;
    if (targetOrderId) {
      const oUpdates: any = { status: newStatus, updated_at: now };
      if (newStatus === 'completed') oUpdates.payment_status = 'paid';

      const { data: oRes, error: oErr } = await supabaseAdmin
        .from('orders')
        .update(oUpdates)
        .eq('id', targetOrderId)
        .select();

      if (oErr) throw new Error(oErr.message);
      updatedOrder = oRes && oRes[0];
    }

    return NextResponse.json({
      success: true,
      batch: updatedBatch,
      order: updatedOrder
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update order status' }, { status: 500 });
  }
}
