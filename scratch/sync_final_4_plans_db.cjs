const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

function parsePlanSpec(dbRow) {
  const planId = (dbRow?.id || 'starter').toLowerCase();
  let embeddedSpec = {};
  if (Array.isArray(dbRow?.features)) {
    const specsStr = dbRow.features.find(f => typeof f === 'string' && f.startsWith('__SPECS__:'));
    if (specsStr) {
      try {
        embeddedSpec = JSON.parse(specsStr.replace('__SPECS__:', ''));
      } catch (e) {}
    }
  }
  return embeddedSpec;
}

function serializePlanSpec(specPayload) {
  const displayBullets = specPayload.display_features || [
    `${specPayload.name} Plan Entitlements Matrix`
  ];
  return {
    id: specPayload.id.toLowerCase(),
    name: specPayload.name.toUpperCase(),
    price_monthly: Number(specPayload.price_monthly),
    price_yearly: Number(specPayload.price_yearly),
    features: [
      ...displayBullets.filter(b => typeof b === 'string' && !b.startsWith('__SPECS__:')),
      `__SPECS__:${JSON.stringify(specPayload)}`
    ],
    updated_at: new Date().toISOString()
  };
}

const DEFAULT_SPECS = {
  starter: {
    id: 'starter', name: 'STARTER', price_monthly: 499, price_yearly: 4990, billing_interval: 'monthly',
    description: 'Basic QR menu & ordering package for small cafes & food stalls', is_active: true, is_popular: false, sort_order: 1,
    limits: { tables: 5, menu_items: 25, staff_accounts: 5, inventory_items: 0, recipes: 0, outlets: 1, monthly_orders: null },
    features: {
      qr_menu: true, ordering: true, takeaway: true, reservations: false, live_order_tracking: false, call_waiter: false, request_bill: false,
      table_management: true, kds: true, kitchen_notifications: false, batch_orders: false, floor_plan: false, table_merge: false, manual_discount: false,
      inventory: false, stock_in: false, low_stock_alerts: false, out_of_stock_auto_disable: false, auto_stock_deduction: false, csv_inventory_import: false,
      recipes: false, recipe_costing: false, gross_margin: false, waste_management: false, transaction_ledger: false, advanced_analytics: false,
      csv_exports: false, pdf_reports: false, detailed_gst_reports: false, staff_rbac: true, staff_tasks: false, task_proof_upload: false, task_approval: false,
      audit_logs: false, multi_outlet: false, central_dashboard: false, outlet_reports: false, custom_reports: false, api_access: false, custom_branding: false,
      ai_menu: false, ai_recipe: false
    },
    ai_limits: { ai_menu_analysis: 0, ai_recipe_generation: 0 },
    display_features: ['Digital QR Menu & Dine-in Ordering', 'Takeaway Ordering & Table Management', 'Basic Kitchen Display (KDS)', 'GST Billing & Basic Reports', '5 Tables, 25 Menu Items & 5 Staff Accounts']
  },
  pro: {
    id: 'pro', name: 'PRO', price_monthly: 999, price_yearly: 9990, billing_interval: 'monthly',
    description: 'Main restaurant operations plan with live tracking, full KDS, inventory & recipe costing', is_active: true, is_popular: true, sort_order: 2,
    limits: { tables: 15, menu_items: 100, staff_accounts: 10, inventory_items: 100, recipes: 100, outlets: 1, monthly_orders: null },
    features: {
      qr_menu: true, ordering: true, takeaway: true, reservations: true, live_order_tracking: true, call_waiter: true, request_bill: true,
      table_management: true, kds: true, kitchen_notifications: true, batch_orders: true, floor_plan: true, table_merge: true, manual_discount: true,
      inventory: true, stock_in: true, low_stock_alerts: true, out_of_stock_auto_disable: true, auto_stock_deduction: true, csv_inventory_import: true,
      recipes: true, recipe_costing: true, gross_margin: true, waste_management: true, transaction_ledger: true, advanced_analytics: true,
      csv_exports: true, pdf_reports: true, detailed_gst_reports: true, staff_rbac: true, staff_tasks: true, task_proof_upload: false, task_approval: false,
      audit_logs: false, multi_outlet: false, central_dashboard: false, outlet_reports: false, custom_reports: false, api_access: false, custom_branding: false,
      ai_menu: true, ai_recipe: true
    },
    ai_limits: { ai_menu_analysis: 2, ai_recipe_generation: 2 },
    display_features: ['Everything in Starter + Live Tracking & Call Waiter', 'Table Reservations & Interactive Floor Layout', 'Full KDS, Multi-Batch Orders & Table Merging', 'Inventory (100 items) & Recipes (100 recipes)', 'Recipe Costing, Gross Margin & Waste Tracking', 'Staff Tasks & Advanced Sales Analytics', '15 Tables, 100 Menu Items & 10 Staff Accounts', '2 AI Menu Analyses & 2 AI Recipe Generations/mo']
  },
  premium: {
    id: 'premium', name: 'PREMIUM', price_monthly: 1999, price_yearly: 19990, billing_interval: 'monthly',
    description: 'Complete single-outlet suite with advanced inventory, staff task proofs & custom branding', is_active: true, is_popular: false, sort_order: 3,
    limits: { tables: null, menu_items: null, staff_accounts: null, inventory_items: 500, recipes: 500, outlets: 1, monthly_orders: null },
    features: {
      qr_menu: true, ordering: true, takeaway: true, reservations: true, live_order_tracking: true, call_waiter: true, request_bill: true,
      table_management: true, kds: true, kitchen_notifications: true, batch_orders: true, floor_plan: true, table_merge: true, manual_discount: true,
      inventory: true, stock_in: true, low_stock_alerts: true, out_of_stock_auto_disable: true, auto_stock_deduction: true, csv_inventory_import: true,
      recipes: true, recipe_costing: true, gross_margin: true, waste_management: true, transaction_ledger: true, advanced_analytics: true,
      csv_exports: true, pdf_reports: true, detailed_gst_reports: true, staff_rbac: true, staff_tasks: true, task_proof_upload: true, task_approval: true,
      audit_logs: true, multi_outlet: false, central_dashboard: false, outlet_reports: false, custom_reports: true, api_access: false, custom_branding: true,
      ai_menu: true, ai_recipe: true
    },
    ai_limits: { ai_menu_analysis: 20, ai_recipe_generation: 20 },
    display_features: ['Everything in Pro + Task Proofs & Custom Branding', 'Advanced Inventory (500 items) & Recipes (500 recipes)', 'Photo/Video Task Proof & Manager Approvals', 'Custom Branding & Logo Upload', 'Unlimited Tables, Menu Items & Staff Accounts', '20 AI Menu Analyses & 20 AI Recipe Generations/mo', 'Single Outlet Suite']
  },
  custom: {
    id: 'custom', name: 'CUSTOM', price_monthly: 0, price_yearly: 0, billing_interval: 'monthly',
    description: 'Fully customizable plan with tailored resource limits & custom feature toggles', is_active: true, is_popular: false, sort_order: 4,
    limits: { tables: null, menu_items: null, staff_accounts: null, inventory_items: null, recipes: null, outlets: null, monthly_orders: null },
    features: {
      qr_menu: true, ordering: true, takeaway: true, reservations: true, live_order_tracking: true, call_waiter: true, request_bill: true,
      table_management: true, kds: true, kitchen_notifications: true, batch_orders: true, floor_plan: true, table_merge: true, manual_discount: true,
      inventory: true, stock_in: true, low_stock_alerts: true, out_of_stock_auto_disable: true, auto_stock_deduction: true, csv_inventory_import: true,
      recipes: true, recipe_costing: true, gross_margin: true, waste_management: true, transaction_ledger: true, advanced_analytics: true,
      csv_exports: true, pdf_reports: true, detailed_gst_reports: true, staff_rbac: true, staff_tasks: true, task_proof_upload: true, task_approval: true,
      audit_logs: true, multi_outlet: true, central_dashboard: true, outlet_reports: true, custom_reports: true, api_access: true, custom_branding: true,
      ai_menu: true, ai_recipe: true
    },
    ai_limits: { ai_menu_analysis: null, ai_recipe_generation: null },
    display_features: ['Custom Tailored Resource & Feature Specification', 'Configurable Outlets & API Access', 'Dedicated Account Manager & 24/7 VIP Phone Support']
  }
};

async function syncPlans() {
  console.log('--- SEEDING & SYNCHRONIZING FINAL 4 SAAS PLANS (STARTER, PRO, PREMIUM, CUSTOM) ---');

  for (const planId of ['starter', 'pro', 'premium', 'custom']) {
    const spec = DEFAULT_SPECS[planId];
    if (!spec) continue;

    const payload = serializePlanSpec(spec);

    const { data, error } = await supabaseAdmin
      .from('pricing_plans')
      .upsert(payload)
      .select();

    if (error) {
      console.error(`❌ Error syncing plan ${planId}:`, error.message);
    } else {
      console.log(`✓ Plan ${spec.name} synchronized successfully! Price: ₹${spec.price_monthly}`);
    }
  }

  // Update target restaurant to starter
  const { data: rest } = await supabaseAdmin.from('restaurants').select('id').eq('slug', 'bistro').maybeSingle();
  if (rest) {
    await supabaseAdmin.from('restaurants').update({ subscription_plan: 'starter' }).eq('id', rest.id);
    console.log(`✓ Restaurant "bistro" set to STARTER plan.`);
  }

  console.log('✅ DATABASE SEED COMPLETE!');
}

syncPlans();
