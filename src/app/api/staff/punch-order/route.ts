import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calculateOrderTax } from '@/lib/tax';
import { ServerTimer } from '@/lib/serverTiming';
import { validateSchema, Validators } from '@/lib/validation';
import { handleApiError } from '@/lib/errors';

export async function POST(req: Request) {
  const totalStart = performance.now();
  const timer = new ServerTimer();

  try {
    // 1. AUTH & VALIDATION PHASE
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

    // 2. INVENTORY & MENU ITEM PARALLEL VALIDATION PHASE
    timer.start('inventory');
    const [rRes, tRes, mRes, activeOrdersRes] = await Promise.all([
      supabase.from('restaurants').select('*').eq('id', restaurantId).maybeSingle(),
      (tableId && tableId !== 'takeaway' && tableId !== 'reservation')
        ? supabase.from('tables').select('*').eq('id', tableId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase.from('menu_items').select('*').eq('restaurant_id', restaurantId),
      (orderType === 'dine_in' && tableId && tableId !== 'takeaway' && tableId !== 'reservation')
        ? supabase.from('orders').select('*').eq('table_id', tableId).in('status', ['new', 'accepted', 'preparing', 'ready', 'served']).order('created_at', { ascending: false }).limit(1)
        : Promise.resolve({ data: [], error: null })
    ]);

    const restaurant = rRes.data;
    if (!restaurant) {
      timer.end('inventory');
      return NextResponse.json({ error: `Restaurant not found for ID: ${restaurantId}` }, { status: 404 });
    }

    const table = tRes.data || {
      id: tableId || 'takeaway',
      restaurant_id: restaurantId,
      name: orderType === 'reservation' ? 'Reservation' : 'Takeaway Counter'
    };

    const allMenuItems = mRes.data || [];
    let subtotal = 0;
    const itemsPayload: any[] = [];

    for (const entry of items) {
      const itemId = entry.menuItemId || entry.id || entry.menu_item_id;
      const menuItem = allMenuItems.find(i => i.id === itemId);
      if (!menuItem || menuItem.is_available === false) {
        timer.end('inventory');
        return NextResponse.json({ error: `Item "${menuItem?.name || 'Selected'}" is out of stock.` }, { status: 400 });
      }
      const qty = Number(entry.quantity || 1);
      const price = Number(entry.price !== undefined ? entry.price : menuItem.price);
      subtotal += price * qty;

      const rawVariantId = entry.variantId || entry.variant_id || null;
      const validVariantId = (typeof rawVariantId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawVariantId.trim())) ? rawVariantId.trim() : null;

      itemsPayload.push({
        menu_item_id: menuItem.id,
        menu_item_name: entry.variantName ? `${menuItem.name} (${entry.variantName})` : menuItem.name,
        variant_id: validVariantId,
        variant_name: entry.variantName || entry.variant_name || null,
        quantity: qty,
        price,
        notes: entry.notes || null
      });
    }
    timer.end('inventory');

    // 3. TAX COMPUTATION PHASE
    timer.start('tax');
    const taxCalc = calculateOrderTax(subtotal, 0, restaurant.settings || {}, restaurant.gst_number);
    const serviceChargeEnabled = restaurant.settings?.service_charge_enabled !== false;
    const serviceChargePercentage = serviceChargeEnabled ? (restaurant.settings?.service_charge_percentage || 0) : 0;
    const serviceCharge = parseFloat(((taxCalc.taxableAmount * serviceChargePercentage) / 100).toFixed(2));
    const grandTotal = parseFloat((taxCalc.grandTotal + serviceCharge).toFixed(2));
    timer.end('tax');

    // 4. ATOMIC ORDER INSERTION PHASE
    timer.start('order_insert');
    const activeOrder = activeOrdersRes.data && activeOrdersRes.data.length > 0 ? activeOrdersRes.data[0] : null;
    let createdOrder: any = null;

    if (activeOrder) {
      const { data: existingBatches } = await supabase
        .from('order_batches')
        .select('batch_number')
        .eq('order_id', activeOrder.id);
      const newBatchIndex = (existingBatches?.length || 0) + 1;

      const { data: newBatchData, error: batchInsertErr } = await supabase
        .from('order_batches')
        .insert([{
          order_id: activeOrder.id,
          batch_number: newBatchIndex,
          status: 'new',
          special_instructions: specialInstructions || null
        }])
        .select()
        .single();

      if (batchInsertErr) {
        console.error('Failed to create punch-order batch:', batchInsertErr);
      }

      // Insert items into relational order_items table
      const addOnItemsPayload = itemsPayload.map((item: any) => ({
        order_id: activeOrder.id,
        batch_id: newBatchData?.id || null,
        menu_item_id: item.menu_item_id,
        menu_item_name: item.menu_item_name,
        quantity: item.quantity,
        price: item.price,
        variant_id: item.variant_id || null,
        variant_name: item.variant_name || null,
        notes: item.notes || null,
        created_at: new Date().toISOString()
      }));

      if (addOnItemsPayload.length > 0) {
        const { error: itemsErr } = await supabase.from('order_items').insert(addOnItemsPayload);
        if (itemsErr) {
          console.error('Failed to insert add-on order items:', itemsErr);
        }
      }

      const newSubtotal = parseFloat(((activeOrder.subtotal || 0) + subtotal).toFixed(2));
      const newGst = parseFloat(((activeOrder.gst || 0) + taxCalc.taxTotal).toFixed(2));
      const newTotal = parseFloat(((activeOrder.total || activeOrder.grand_total || 0) + grandTotal).toFixed(2));
      const newCgst = parseFloat((newGst / 2).toFixed(2));
      const newSgst = parseFloat((newGst - newCgst).toFixed(2));

      const { data: updatedOrderData } = await supabase.from('orders').update({
        subtotal: newSubtotal,
        gst: newGst,
        tax_total: newGst,
        cgst_amount: newCgst,
        sgst_amount: newSgst,
        total: newTotal,
        grand_total: newTotal,
        updated_at: new Date().toISOString()
      }).eq('id', activeOrder.id).select().single();

      createdOrder = updatedOrderData || activeOrder;
    } else {
      const orderPayload = {
        restaurant_id: restaurantId,
        table_id: (tableId === 'takeaway' || tableId === 'reservation' || !tableId) ? null : tableId,
        table_name: table.name || 'Table 1',
        status: 'new',
        order_type: orderType,
        payment_status: paymentStatus,
        special_instructions: specialInstructions || null,
        subtotal: parseFloat(subtotal.toFixed(2)),
        discount_total: taxCalc.discountTotal,
        cgst_amount: taxCalc.cgstAmount,
        sgst_amount: taxCalc.sgstAmount,
        igst_amount: taxCalc.igstAmount,
        total_tax: taxCalc.taxTotal,
        gst: taxCalc.taxTotal,
        tax_total: taxCalc.taxTotal,
        tax_type_snapshot: taxCalc.taxTypeSnapshot,
        tax_rate_snapshot: taxCalc.taxRateSnapshot,
        service_charge: serviceCharge,
        total: grandTotal,
        grand_total: grandTotal,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newOrderData, error: orderInsertErr } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select()
        .single();

      if (orderInsertErr) {
        timer.end('order_insert');
        return NextResponse.json({ error: orderInsertErr.message }, { status: 500 });
      }

      createdOrder = newOrderData;

      const { data: initialBatchData } = await supabase.from('order_batches').insert([{
        order_id: createdOrder.id,
        batch_number: 1,
        status: 'new',
        special_instructions: specialInstructions || null
      }]).select().single();

      const orderItemsPayload = itemsPayload.map((item: any) => ({
        order_id: createdOrder.id,
        batch_id: initialBatchData?.id || null,
        menu_item_id: item.menu_item_id,
        menu_item_name: item.menu_item_name,
        quantity: item.quantity,
        price: item.price,
        variant_id: item.variant_id || null,
        variant_name: item.variant_name || null,
        notes: item.notes || null,
        created_at: new Date().toISOString()
      }));

      if (orderItemsPayload.length > 0) {
        const { error: itemsErr } = await supabase.from('order_items').insert(orderItemsPayload);
        if (itemsErr) {
          console.error('Failed to insert order items:', itemsErr);
        }
      }
    }
    timer.end('order_insert');

    // 5. REALTIME BROADCAST PUSH PHASE
    timer.start('realtime');
    const realtimePayload = {
      event: 'INSERT',
      new: createdOrder,
      timestamp: Date.now()
    };

    await Promise.all([
      supabase.channel(`kds_${restaurantId}`).send({
        type: 'broadcast',
        event: 'new-order',
        payload: realtimePayload
      }).catch(() => {}),
      supabase.channel(`overview_dashboard_${restaurantId}`).send({
        type: 'broadcast',
        event: 'new-order',
        payload: realtimePayload
      }).catch(() => {})
    ]);
    timer.end('realtime');

    const response = NextResponse.json({
      success: true,
      order: createdOrder
    });

    response.headers.set('Server-Timing', timer.getHeaderString(totalStart));
    return response;
  } catch (err: any) {
    return handleApiError('Staff-Punch-Order', err, 'Failed to create order. Please try again.', 500);
  }
}
