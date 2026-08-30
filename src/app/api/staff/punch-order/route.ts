import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateSchema, Validators } from '@/lib/validation';
import { handleApiError } from '@/lib/errors';


export async function POST(req: Request) {
  try {
    const body = await req.json();

    const validation = validateSchema(body, {
      restaurantId: { rules: [Validators.restaurantId()], required: true },
      tableId: { rules: [Validators.string({ max: 100 })], required: false },
      items: { rules: [Validators.array(undefined, { minLength: 1 })], required: true },
      specialInstructions: { rules: [Validators.string({ max: 500 })], required: false },
      orderType: { rules: [Validators.enum(['dine_in', 'takeaway', 'delivery', 'reservation'] as const)], required: false },
      paymentStatus: { rules: [Validators.enum(['pending', 'paid', 'failed'] as const)], required: false },
      staffName: { rules: [Validators.string({ max: 100 })], required: false },
      idempotencyKey: { rules: [Validators.string({ max: 100 })], required: false }
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

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
    return handleApiError('Staff-Punch-Order', err, 'Failed to create order. Please try again.', 500);
  }
}


