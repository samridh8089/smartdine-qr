import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { toCanonicalNodeId, EVENT_TO_NODE } from '@/components/founder/NodeDefinitions';

let _adminClient: SupabaseClient | null = null;
function getAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!_adminClient) _adminClient = createClient(url, key);
  return _adminClient;
}

const COLOR_PALETTE = ['#0EA5E9', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

function getOrderColor(orderId: string): string {
  let hash = 0;
  for (let i = 0; i < orderId.length; i++) {
    hash = (hash << 5) - hash + orderId.charCodeAt(i);
    hash |= 0;
  }
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
}

/**
 * GET /api/admin/live-sync?restaurantId=...
 * Single Source of Truth for Super Admin Command Center and Founder Control Center.
 * Returns active orders, live floor tables, system events, and unified order dots.
 */
export async function GET(req: Request) {
  try {
    const supabaseAdmin = getAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database service configuration error' }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');
    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    // Parallel fetch of real active orders, tables, system events, and staff
    const [ordersRes, tablesRes, eventsRes, staffRes] = await Promise.all([
      // 1. Real active orders with items and batches (non-completed, non-cancelled)
      supabaseAdmin
        .from('orders')
        .select(`
          id,
          table_id,
          table_name,
          status,
          total,
          subtotal,
          special_instructions,
          created_at,
          updated_at,
          order_type,
          payment_status,
          order_items (
            id,
            menu_item_id,
            menu_item_name,
            quantity,
            price,
            notes,
            is_cancelled
          ),
          order_batches (
            id,
            batch_number,
            status,
            special_instructions,
            preparing_by,
            served_by,
            updated_at
          )
        `)
        .eq('restaurant_id', restaurantId)
        .not('status', 'in', '("completed","cancelled")')
        .order('created_at', { ascending: false }),

      // 2. Real tables
      supabaseAdmin
        .from('tables')
        .select('id, name')
        .eq('restaurant_id', restaurantId)
        .order('name', { ascending: true }),

      // 3. Real system events
      supabaseAdmin
        .from('system_events')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(100),

      // 4. Staff profiles
      supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('restaurant_id', restaurantId)
    ]);

    if (ordersRes.error) {
      console.error('[live-sync] orders error:', ordersRes.error.message);
    }
    if (tablesRes.error) {
      console.error('[live-sync] tables error:', tablesRes.error.message);
    }

    const activeOrders = (ordersRes.data || []).map((ord: any) => {
      let customerName = 'Guest';
      let customerPhone = '';
      if (ord.special_instructions) {
        try {
          const parsed = JSON.parse(ord.special_instructions);
          if (parsed.name) customerName = parsed.name;
          if (parsed.phone) customerPhone = parsed.phone;
        } catch (_) {
          if (typeof ord.special_instructions === 'string' && ord.special_instructions.trim()) {
            customerName = ord.special_instructions.slice(0, 20);
          }
        }
      }
      return {
        ...ord,
        order_number: `#${ord.id.slice(-4).toUpperCase()}`,
        customer_name: customerName,
        customer_phone: customerPhone,
      };
    });
    const rawTables = tablesRes.data || [];
    const events = eventsRes.data || [];
    const staff = staffRes.data || [];

    // Map active orders by table
    const ordersByTableId = new Map<string, any>();
    const ordersByTableName = new Map<string, any>();
    for (const ord of activeOrders) {
      if (ord.table_id) ordersByTableId.set(ord.table_id, ord);
      if (ord.table_name) ordersByTableName.set(ord.table_name.toLowerCase().trim(), ord);
    }

    // Default tables if restaurant has no tables created yet
    const baseTables = rawTables.length > 0 ? rawTables : [
      { id: 't_1', name: 'Table 1', capacity: 4 },
      { id: 't_2', name: 'Table 2', capacity: 4 },
      { id: 't_3', name: 'Table 3', capacity: 4 },
      { id: 't_4', name: 'Table 4', capacity: 6 },
      { id: 't_5', name: 'Table 5', capacity: 4 },
      { id: 't_6', name: 'Table 6', capacity: 6 },
    ];

    let occupiedCount = 0;
    const now = Date.now();

    const tables = baseTables.map((t) => {
      const cleanName = t.name.toLowerCase().trim();
      const ord = ordersByTableId.get(t.id) || ordersByTableName.get(cleanName);

      let status: 'available' | 'waiting' | 'preparing' | 'ready' | 'occupied' = 'available';
      let items: any[] = [];
      let totalBill = 0;
      let waiterName: string | undefined = undefined;
      let elapsedMin: number | undefined = undefined;
      let orderId: string | undefined = undefined;

      if (ord) {
        occupiedCount++;
        orderId = ord.id;
        const ordStatus = (ord.status || '').toLowerCase();
        if (ordStatus === 'preparing' || ordStatus === 'in_kitchen') status = 'preparing';
        else if (ordStatus === 'ready' || ordStatus === 'food_ready') status = 'ready';
        else if (ordStatus === 'new' || ordStatus === 'placed') status = 'waiting';
        else status = 'occupied';

        totalBill = Number(ord.total || 0);
        items = (ord.order_items || []).filter((oi: any) => !oi.is_cancelled).map((oi: any) => ({
          id: oi.id,
          name: oi.menu_item_name || 'Item',
          quantity: oi.quantity || 1,
          price: Number(oi.price || 0)
        }));

        waiterName = ord.order_batches?.[0]?.served_by || undefined;
        elapsedMin = ord.created_at
          ? Math.max(1, Math.round((now - new Date(ord.created_at).getTime()) / 60000))
          : undefined;
      }

      return {
        id: t.id,
        name: t.name,
        status,
        currentOrderId: orderId,
        correlationId: orderId ? `corr_${orderId}` : undefined,
        sessionId: orderId ? `sess_${t.name.replace(/\s+/g, '').toLowerCase()}` : undefined,
        waiterName,
        orderDurationMin: elapsedMin,
        items,
        totalBill,
        customerCount: status === 'available' ? 0 : 4,
      };
    });

    // Map active orders to Graph OrderDotState
    // Latest event per order_id / correlation_id
    const latestEventByOrder = new Map<string, any>();
    for (const ev of events) {
      const key = ev.order_id || ev.correlation_id;
      if (key && (!latestEventByOrder.has(key) || ev.created_at > latestEventByOrder.get(key).created_at)) {
        latestEventByOrder.set(key, ev);
      }
    }

    const orderDots = activeOrders.map((ord) => {
      const latestEv = latestEventByOrder.get(ord.id) || latestEventByOrder.get(`corr_${ord.id}`);
      
      let canonNode = 'live_orders';
      if (latestEv && latestEv.target_node) {
        canonNode = toCanonicalNodeId(latestEv.target_node);
      } else if (latestEv && latestEv.event_type && EVENT_TO_NODE[latestEv.event_type]) {
        canonNode = toCanonicalNodeId(EVENT_TO_NODE[latestEv.event_type]);
      } else {
        // Fallback to order status
        const s = (ord.status || '').toLowerCase();
        if (s === 'new' || s === 'placed') canonNode = 'order_created';
        else if (s === 'accepted') canonNode = 'live_orders';
        else if (s === 'preparing' || s === 'in_kitchen') canonNode = 'preparing';
        else if (s === 'ready' || s === 'food_ready') canonNode = 'ready';
        else if (s === 'served') canonNode = 'served';
        else if (s === 'billing' || s === 'payment_pending') canonNode = 'billing';
        else canonNode = 'live_orders';
      }

      const assignedWaiter = ord.order_batches?.[0]?.served_by || staff.find((s: any) => s.role === 'waiter')?.full_name || 'Staff';

      return {
        orderId: ord.id,
        correlationId: latestEv?.correlation_id || `corr_${ord.id}`,
        shortId: ord.order_number || ord.id.slice(-6),
        currentNodeId: canonNode,
        prevNodeId: latestEv?.source_node || 'order_created',
        color: getOrderColor(ord.id),
        lastEventAt: latestEv?.created_at || ord.updated_at || ord.created_at,
        metadata: {
          table: ord.table_name,
          total: ord.total,
          status: ord.status,
          waiter: assignedWaiter,
          itemsCount: (ord.order_items || []).length
        }
      };
    });

    const stats = {
      activeOrdersCount: activeOrders.length,
      occupiedTablesCount: occupiedCount,
      availableTablesCount: Math.max(0, tables.length - occupiedCount),
      totalTablesCount: tables.length
    };

    return NextResponse.json({
      success: true,
      restaurantId,
      activeOrders,
      tables,
      events,
      orderDots,
      stats,
      staff
    });
  } catch (err: any) {
    console.error('[live-sync] fatal exception:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
