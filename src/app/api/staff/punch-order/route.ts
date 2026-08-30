import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateSchema, Validators } from '@/lib/validation';
import { handleApiError } from '@/lib/errors';
import { ServerTimer } from '@/lib/serverTiming';

export async function POST(req: Request) {
  const totalStart = performance.now();
  const timer = new ServerTimer();

  try {
    timer.start('auth');
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
    timer.end('auth');

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

    const formattedItems = items.map((i: any) => ({
      menuItemId: i.menuItemId || i.id || i.menu_item_id,
      quantity: Number(i.quantity || 1),
      notes: i.notes || '',
      variantId: i.variantId || i.variant_id || undefined,
      variantName: i.variantName || i.variant_name || undefined,
      price: i.price ? Number(i.price) : undefined
    }));

    timer.start('db');
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
    timer.end('db');

    const response = NextResponse.json({
      success: true,
      order
    });

    response.headers.set('Server-Timing', timer.getHeaderString(totalStart));
    return response;
  } catch (err: any) {
    return handleApiError('Staff-Punch-Order', err, 'Failed to create order. Please try again.', 500);
  }
}



