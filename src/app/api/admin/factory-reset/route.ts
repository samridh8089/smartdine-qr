import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SEED_SECRET = 'foody_hub_seed_2026';
const RESTAURANT_ID = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.secret !== SEED_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createClient(supabaseUrl, supabaseKey);

    // If body.action === 'count', only return row counts without deleting
    if (body.action === 'count') {
      const counts: Record<string, number | null> = {};
      const tablesToCheck = [
        'orders',
        'order_items',
        'order_batches',
        'order_discounts',
        'customer_calls',
        'activity_logs',
        'system_events',
        'audit_logs',
        'inventory_transactions',
        'inventory_reservations',
        'inventory_items',
        'ingredients',
        'recipes',
        'recipe_ingredients',
        'menu_items',
        'menu_item_variants',
        'categories',
        'idempotency_keys',
        'staff_table_assignments',
        'table_merge_sessions',
        'table_merge_session_members',
        'tables',
      ];

      for (const t of tablesToCheck) {
        try {
          const { count, error } = await (admin.from(t) as any)
            .select('*', { count: 'exact', head: true })
            .eq(t === 'audit_logs' ? 'id' : 'restaurant_id', RESTAURANT_ID);
          
          if (error) {
            // Some tables might not have restaurant_id directly (e.g. audit_logs or junction tables)
            const { count: cAll } = await (admin.from(t) as any)
              .select('*', { count: 'exact', head: true });
            counts[t] = cAll;
          } else {
            counts[t] = count;
          }
        } catch {
          counts[t] = null;
        }
      }

      return NextResponse.json({
        success: true,
        action: 'count',
        counts,
      });
    }

    // If body.action === 'deduplicate-inventory', clean up any duplicate rows in inventory_items
    if (body.action === 'deduplicate-inventory') {
      const { data: allItems } = await (admin.from('inventory_items') as any)
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .order('created_at', { ascending: true });

      const nameMap = new Map<string, any[]>();
      (allItems || []).forEach((item: any) => {
        const canonical = (item.name || '').trim().toLowerCase();
        if (!nameMap.has(canonical)) {
          nameMap.set(canonical, []);
        }
        nameMap.get(canonical)!.push(item);
      });

      const duplicatesCleaned: any[] = [];
      const idsToDelete: string[] = [];

      for (const [canonical, group] of nameMap.entries()) {
        if (group.length > 1) {
          const [primary, ...dupes] = group;
          const dupeIds = dupes.map((d: any) => d.id);
          idsToDelete.push(...dupeIds);
          duplicatesCleaned.push({
            name: primary.name,
            primaryId: primary.id,
            removedCount: dupes.length,
            removedIds: dupeIds
          });

          for (const dId of dupeIds) {
            try {
              await (admin.from('inventory_recipe_ingredients') as any)
                .update({ inventory_item_id: primary.id })
                .eq('inventory_item_id', dId);
            } catch (_) {}

            try {
              await (admin.from('inventory_transactions') as any)
                .update({ inventory_item_id: primary.id })
                .eq('inventory_item_id', dId);
            } catch (_) {}
          }
        }
      }

      if (idsToDelete.length > 0) {
        await (admin.from('inventory_items') as any)
          .delete()
          .in('id', idsToDelete);
      }

      const { data: remainingItems } = await (admin.from('inventory_items') as any)
        .select('id, name, unit, current_stock')
        .eq('restaurant_id', RESTAURANT_ID)
        .order('name', { ascending: true });

      return NextResponse.json({
        success: true,
        action: 'deduplicate-inventory',
        cleanedCount: idsToDelete.length,
        details: duplicatesCleaned,
        remainingCount: remainingItems?.length || 0,
        remainingItems
      });
    }

    // If body.action === 'get-inventory', return all current inventory items
    if (body.action === 'get-inventory') {
      const { data: items } = await (admin.from('inventory_items') as any)
        .select('id, name, unit, current_stock, cost_per_unit, category')
        .eq('restaurant_id', RESTAURANT_ID)
        .order('name', { ascending: true });

      return NextResponse.json({
        success: true,
        count: items?.length || 0,
        items
      });
    }

    // If body.action === 'create-test-order', provision 1 test item & 1 live order to verify operational pipeline
    if (body.action === 'create-test-order') {
      let { data: cat } = await (admin.from('categories') as any)
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .limit(1)
        .maybeSingle();

      if (!cat) {
        const { data: newCat } = await (admin.from('categories') as any).insert({
          restaurant_id: RESTAURANT_ID,
          name: 'Specialties',
          display_order: 1
        }).select().single();
        cat = newCat;
      }

      let { data: item } = await (admin.from('menu_items') as any)
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .limit(1)
        .maybeSingle();

      if (!item) {
        const { data: newItem } = await (admin.from('menu_items') as any).insert({
          restaurant_id: RESTAURANT_ID,
          category_id: cat?.id,
          name: 'Signature Masala Chai',
          description: 'Aromatic traditional spiced tea',
          price: 40,
          is_veg: true,
          is_available: true
        }).select().single();
        item = newItem;
      }

      const { data: newOrder, error: orderErr } = await (admin.from('orders') as any).insert({
        restaurant_id: RESTAURANT_ID,
        table_name: 'Table 1',
        order_type: 'dine_in',
        status: 'new',
        payment_status: 'pending',
        special_instructions: 'Customer: Aarav Sharma (9876543210)',
        subtotal: 80,
        total: 80,
        grand_total: 80,
        gst: 0,
        tax_total: 0
      }).select().single();

      if (newOrder) {
        await (admin.from('order_items') as any).insert({
          order_id: newOrder.id,
          menu_item_id: item?.id,
          menu_item_name: item?.name || 'Signature Masala Chai',
          quantity: 2,
          price: 40,
          notes: 'Less sugar'
        });

        await (admin.from('system_events') as any).insert({
          restaurant_id: RESTAURANT_ID,
          order_id: newOrder.id,
          correlation_id: `corr_${newOrder.id}`,
          actor_type: 'customer',
          event_type: 'order_created',
          source_node: 'checkout',
          target_node: 'order_created',
          duration_ms: 120,
          metadata: { total: 80, customer: 'Aarav Sharma' }
        });
      }

      return NextResponse.json({
        success: true,
        action: 'create-test-order',
        order: newOrder,
        menuItem: item,
        category: cat,
        error: orderErr?.message
      });
    }

    // ── COMPLETE FACTORY RESET EXECUTION ─────────────────────────────────────
    const results: Record<string, any> = {};

    // 1. system_events
    try {
      const { error, count } = await (admin.from('system_events') as any)
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      results.system_events = { count, error: error?.message };
    } catch (e: any) {
      results.system_events = { error: e.message };
    }

    // 2. activity_logs
    try {
      const { error, count } = await (admin.from('activity_logs') as any)
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      results.activity_logs = { count, error: error?.message };
    } catch (e: any) {
      results.activity_logs = { error: e.message };
    }

    // 3. audit_logs (if present)
    try {
      const { error, count } = await (admin.from('audit_logs') as any)
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      results.audit_logs = { count, error: error?.message };
    } catch (e: any) {
      results.audit_logs = { error: e.message };
    }

    // 4. customer_calls
    try {
      const { error, count } = await (admin.from('customer_calls') as any)
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      results.customer_calls = { count, error: error?.message };
    } catch (e: any) {
      results.customer_calls = { error: e.message };
    }

    // 5. inventory_reservations
    try {
      const { error, count } = await (admin.from('inventory_reservations') as any)
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      results.inventory_reservations = { count, error: error?.message };
    } catch (e: any) {
      results.inventory_reservations = { error: e.message };
    }

    // 6. inventory_transactions
    try {
      const { error, count } = await (admin.from('inventory_transactions') as any)
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      results.inventory_transactions = { count, error: error?.message };
    } catch (e: any) {
      results.inventory_transactions = { error: e.message };
    }

    // 7. order_items
    try {
      const { error, count } = await (admin.from('order_items') as any)
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      results.order_items = { count, error: error?.message };
    } catch (e: any) {
      results.order_items = { error: e.message };
    }

    // 8. order_batches
    try {
      const { error, count } = await (admin.from('order_batches') as any)
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      results.order_batches = { count, error: error?.message };
    } catch (e: any) {
      results.order_batches = { error: e.message };
    }

    // 9. order_discounts
    try {
      const { error, count } = await (admin.from('order_discounts') as any)
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      results.order_discounts = { count, error: error?.message };
    } catch (e: any) {
      results.order_discounts = { error: e.message };
    }

    // 10. orders
    try {
      const { error, count } = await (admin.from('orders') as any)
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      results.orders = { count, error: error?.message };
    } catch (e: any) {
      results.orders = { error: e.message };
    }

    // 11. table_merge_session_members & table_merge_sessions
    try {
      const { error: eMemb, count: cMemb } = await (admin.from('table_merge_session_members') as any)
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      const { error: eSess, count: cSess } = await (admin.from('table_merge_sessions') as any)
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      results.table_merges = { cMemb, cSess, error: eMemb?.message || eSess?.message };
    } catch (e: any) {
      results.table_merges = { error: e.message };
    }

    // 12. staff_table_assignments
    try {
      const { error, count } = await (admin.from('staff_table_assignments') as any)
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      results.staff_table_assignments = { count, error: error?.message };
    } catch (e: any) {
      results.staff_table_assignments = { error: e.message };
    }

    // 13. recipe_ingredients & recipes
    try {
      const { error: eRI, count: cRI } = await (admin.from('recipe_ingredients') as any)
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      const { error: eR, count: cR } = await (admin.from('recipes') as any)
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      results.recipes = { cRI, cR, error: eRI?.message || eR?.message };
    } catch (e: any) {
      results.recipes = { error: e.message };
    }

    // 14. inventory_items & ingredients
    try {
      const { error: eII, count: cII } = await (admin.from('inventory_items') as any)
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      const { error: eIng, count: cIng } = await (admin.from('ingredients') as any)
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      results.inventory = { cII, cIng, error: eII?.message || eIng?.message };
    } catch (e: any) {
      results.inventory = { error: e.message };
    }

    // 15. menu_item_variants & menu_items
    try {
      const { error: eMIV, count: cMIV } = await (admin.from('menu_item_variants') as any)
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      const { error: eMI, count: cMI } = await (admin.from('menu_items') as any)
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      results.menu_items = { cMIV, cMI, error: eMIV?.message || eMI?.message };
    } catch (e: any) {
      results.menu_items = { error: e.message };
    }

    // 16. categories
    try {
      const { error, count } = await (admin.from('categories') as any)
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      results.categories = { count, error: error?.message };
    } catch (e: any) {
      results.categories = { error: e.message };
    }

    // 17. idempotency_keys
    try {
      const { error, count } = await (admin.from('idempotency_keys') as any)
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      results.idempotency_keys = { count, error: error?.message };
    } catch (e: any) {
      results.idempotency_keys = { error: e.message };
    }

    // 18. Reset table_states and table_assignments in restaurants.settings
    try {
      const { data: rest } = await admin
        .from('restaurants')
        .select('settings')
        .eq('id', RESTAURANT_ID)
        .single();
      if (rest?.settings) {
        const updatedSettings = {
          ...rest.settings,
          table_states: {},
          table_assignments: [],
        };
        await admin
          .from('restaurants')
          .update({ settings: updatedSettings })
          .eq('id', RESTAURANT_ID);
        results.restaurant_settings = { success: true, table_states: {} };
      }
    } catch (e: any) {
      results.restaurant_settings = { error: e.message };
    }

    // 19. Reset all physical tables to available
    try {
      await admin
        .from('tables')
        .update({ status: 'available' })
        .eq('restaurant_id', RESTAURANT_ID);
      results.tables_reset = { success: true };
    } catch (e: any) {
      results.tables_reset = { error: e.message };
    }

    // Verify row counts after reset
    const finalCounts: Record<string, number | null> = {};
    const tablesToCheck = [
      'orders',
      'order_items',
      'order_batches',
      'customer_calls',
      'activity_logs',
      'system_events',
      'inventory_transactions',
      'inventory_reservations',
      'inventory_items',
      'recipes',
      'menu_items',
      'categories',
    ];

    for (const t of tablesToCheck) {
      try {
        const { count } = await (admin.from(t) as any)
          .select('*', { count: 'exact', head: true });
        finalCounts[t] = count ?? 0;
      } catch {
        finalCounts[t] = null;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Factory reset completed successfully. Restaurant is now completely fresh.',
      results,
      finalCounts,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
