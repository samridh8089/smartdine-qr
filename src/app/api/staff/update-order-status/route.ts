import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';
import { healUnconsumedActiveReservations } from '@/lib/inventoryEngine';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { batchId, orderId, newStatus, staffName = 'Staff', cancellationReason } = body;

    if (!batchId && !orderId) {
      return NextResponse.json({ error: 'batchId or orderId is required' }, { status: 400 });
    }

    let updatedOrder: any = null;
    let updatedBatch: any = null;

    if (batchId) {
      updatedOrder = await db.updateBatchStatus(batchId, newStatus, staffName, cancellationReason);
      const { data: bRes } = await supabaseAdmin.from('order_batches').select('*').eq('id', batchId).single();
      updatedBatch = bRes;
    } else if (orderId) {
      updatedOrder = await db.updateOrderStatus(orderId, newStatus, staffName, cancellationReason);
    }

    const restId = updatedOrder?.restaurant_id || updatedBatch?.restaurant_id;
    if (restId) {
      await healUnconsumedActiveReservations(restId).catch(() => {});
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
