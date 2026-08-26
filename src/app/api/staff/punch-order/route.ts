import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      restaurantId,
      tableId = null,
      items = [],
      specialInstructions = '',
      orderType = 'dine_in',
      paymentStatus = 'pending',
      staffName = 'Staff',
      idempotencyKey
    } = body;

    console.log(`[FORENSIC_INVENTORY_TRACE] 1. PUNCH_ORDER_API_RECEIVED - Restaurant: ${restaurantId}, Table: ${tableId}, ItemsCount: ${items.length}, Type: ${orderType}, Staff: ${staffName}`);

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    console.log(`[FORENSIC_INVENTORY_TRACE] 2. CALLING_DB_CREATE_ORDER - Restaurant: ${restaurantId}`);

    const formattedItems = items.map((i: any) => ({
      menuItemId: i.menuItemId || i.id || i.menu_item_id,
      quantity: Number(i.quantity || 1),
      notes: i.notes || '',
      variantId: i.variantId || i.variant_id || undefined,
      variantName: i.variantName || i.variant_name || undefined,
      price: i.price ? Number(i.price) : undefined
    }));

    const order = await db.createOrder(
      restaurantId,
      tableId,
      formattedItems,
      specialInstructions,
      orderType,
      undefined,
      undefined,
      paymentStatus,
      idempotencyKey
    );

    console.log(`[FORENSIC_INVENTORY_TRACE] 3. PUNCH_ORDER_API_SUCCESS - OrderID: ${order.id}, Status: ${order.status}, PaymentStatus: ${order.payment_status}`);

    return NextResponse.json({
      success: true,
      order
    });
  } catch (err: any) {
    console.error('[FORENSIC_INVENTORY_TRACE] ERROR in punch-order API:', err?.message || err);
    return NextResponse.json({ error: err.message || 'Failed to punch order' }, { status: 500 });
  }
}
