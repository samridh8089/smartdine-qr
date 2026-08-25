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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

const DEFAULT_PLAN_SPECS = {
  starter: {
    id: 'starter',
    name: 'STARTER',
    slug: 'starter',
    price_monthly: 499,
    price_yearly: 4990,
    billing_interval: 'monthly',
    description: 'Basic QR menu & ordering package for small cafes & food stalls',
    is_active: true,
    is_popular: false,
    sort_order: 1,
    limits: { tables: 5, menu_items: 25, staff_accounts: 5, inventory_items: 0, recipes: 0, outlets: 1, monthly_orders: null },
    features: { qr_menu: true, ordering: true, takeaway: true, reservations: false, live_order_tracking: false, call_waiter: false, request_bill: false, table_management: true, kds: true, kitchen_notifications: false, batch_orders: false, floor_plan: false, table_merge: false, manual_discount: false, inventory: false, stock_in: false, low_stock_alerts: false, out_of_stock_auto_disable: false, auto_stock_deduction: false, csv_inventory_import: false, recipes: false, recipe_costing: false, gross_margin: false, waste_management: false, transaction_ledger: false, advanced_analytics: false, csv_exports: false, pdf_reports: false, detailed_gst_reports: false, staff_rbac: true, staff_tasks: false, task_proof_upload: false, task_approval: false, audit_logs: false, multi_outlet: false, central_dashboard: false, outlet_reports: false, custom_reports: false, api_access: false, custom_branding: false, ai_menu: false, ai_recipe: false },
    ai_limits: { ai_menu_analysis: 0, ai_recipe_generation: 0, ai_review_generation: 0, max_items_per_request: 0, max_requests_per_month: 0 },
    display_features: ['Digital QR Menu & Dine-in Ordering', 'Takeaway Ordering & Table Management', 'Basic Kitchen Display (KDS)', 'GST Billing & Basic Reports', '5 Tables, 25 Menu Items & 5 Staff Accounts']
  },
  pro: {
    id: 'pro',
    name: 'PRO',
    slug: 'pro',
    price_monthly: 999,
    price_yearly: 9990,
    billing_interval: 'monthly',
    description: 'Main restaurant operations plan with live tracking, full KDS, inventory & recipe costing',
    is_active: true,
    is_popular: true,
    sort_order: 2,
    limits: { tables: 15, menu_items: 100, staff_accounts: 10, inventory_items: 100, recipes: 100, outlets: 1, monthly_orders: null },
    features: { qr_menu: true, ordering: true, takeaway: true, reservations: true, live_order_tracking: true, call_waiter: true, request_bill: true, table_management: true, kds: true, kitchen_notifications: true, batch_orders: true, floor_plan: true, table_merge: true, manual_discount: true, inventory: true, stock_in: true, low_stock_alerts: true, out_of_stock_auto_disable: true, auto_stock_deduction: true, csv_inventory_import: true, recipes: true, recipe_costing: true, gross_margin: true, waste_management: true, transaction_ledger: true, advanced_analytics: true, csv_exports: true, pdf_reports: true, detailed_gst_reports: true, staff_rbac: true, staff_tasks: true, task_proof_upload: false, task_approval: false, audit_logs: false, multi_outlet: false, central_dashboard: false, outlet_reports: false, custom_reports: false, api_access: false, custom_branding: false, ai_menu: true, ai_recipe: true },
    ai_limits: { ai_menu_analysis: 200, ai_recipe_generation: 200, ai_review_generation: 0, max_items_per_request: 100, max_requests_per_month: 2 },
    display_features: ['Everything in Starter + Live Tracking & Call Waiter', 'Table Reservations & Interactive Floor Layout', 'Full KDS, Multi-Batch Orders & Table Merging', 'Inventory (100 items) & Recipes (100 recipes)', 'Recipe Costing, Gross Margin & Waste Tracking', 'Staff Tasks & Advanced Sales Analytics', '15 Tables, 100 Menu Items & 10 Staff Accounts', '200 AI Menu Item Credits & 200 AI Recipe Credits/mo']
  },
  premium: {
    id: 'premium',
    name: 'PREMIUM',
    slug: 'premium',
    price_monthly: 1999,
    price_yearly: 19990,
    billing_interval: 'monthly',
    description: 'Complete single-outlet suite with advanced inventory, staff task proofs & custom branding',
    is_active: true,
    is_popular: false,
    sort_order: 3,
    limits: { tables: null, menu_items: null, staff_accounts: null, inventory_items: 500, recipes: 500, outlets: 1, monthly_orders: null },
    features: { qr_menu: true, ordering: true, takeaway: true, reservations: true, live_order_tracking: true, call_waiter: true, request_bill: true, table_management: true, kds: true, kitchen_notifications: true, batch_orders: true, floor_plan: true, table_merge: true, manual_discount: true, inventory: true, stock_in: true, low_stock_alerts: true, out_of_stock_auto_disable: true, auto_stock_deduction: true, csv_inventory_import: true, recipes: true, recipe_costing: true, gross_margin: true, waste_management: true, transaction_ledger: true, advanced_analytics: true, csv_exports: true, pdf_reports: true, detailed_gst_reports: true, staff_rbac: true, staff_tasks: true, task_proof_upload: true, task_approval: true, audit_logs: true, multi_outlet: false, central_dashboard: false, outlet_reports: false, custom_reports: true, api_access: false, custom_branding: true, ai_menu: true, ai_recipe: true },
    ai_limits: { ai_menu_analysis: 2000, ai_recipe_generation: 2000, ai_review_generation: 0, max_items_per_request: 100, max_requests_per_month: 20 },
    display_features: ['Everything in Pro + Task Proofs & Custom Branding', 'Advanced Inventory (500 items) & Recipes (500 recipes)', 'Photo/Video Task Proof & Manager Approvals', 'Custom Branding & Logo Upload', 'Unlimited Tables, Menu Items & Staff Accounts', '2,000 AI Menu Item Credits & 2,000 AI Recipe Credits/mo', 'Single Outlet Suite']
  },
  custom: {
    id: 'custom',
    name: 'CUSTOM',
    slug: 'custom',
    price_monthly: 0,
    price_yearly: 0,
    billing_interval: 'monthly',
    description: 'Fully customizable plan with tailored resource limits & custom feature toggles',
    is_active: true,
    is_popular: false,
    sort_order: 4,
    limits: { tables: null, menu_items: null, staff_accounts: null, inventory_items: null, recipes: null, outlets: null, monthly_orders: null },
    features: { qr_menu: true, ordering: true, takeaway: true, reservations: true, live_order_tracking: true, call_waiter: true, request_bill: true, table_management: true, kds: true, kitchen_notifications: true, batch_orders: true, floor_plan: true, table_merge: true, manual_discount: true, inventory: true, stock_in: true, low_stock_alerts: true, out_of_stock_auto_disable: true, auto_stock_deduction: true, csv_inventory_import: true, recipes: true, recipe_costing: true, gross_margin: true, waste_management: true, transaction_ledger: true, advanced_analytics: true, csv_exports: true, pdf_reports: true, detailed_gst_reports: true, staff_rbac: true, staff_tasks: true, task_proof_upload: true, task_approval: true, audit_logs: true, multi_outlet: true, central_dashboard: true, outlet_reports: true, custom_reports: true, api_access: true, custom_branding: true, ai_menu: true, ai_recipe: true },
    ai_limits: { ai_menu_analysis: 0, ai_recipe_generation: 0, ai_review_generation: 0, max_items_per_request: 0, max_requests_per_month: 0 },
    display_features: ['Custom tailoring per restaurant requirement']
  }
};

function serializePlanSpec(spec) {
  const specsPayload = {
    description: spec.description,
    billing_interval: spec.billing_interval,
    is_active: spec.is_active,
    is_popular: spec.is_popular,
    sort_order: spec.sort_order,
    limits: spec.limits,
    features: spec.features,
    ai_limits: spec.ai_limits
  };

  const displayBullets = spec.display_features || [];
  const featuresArray = [
    ...displayBullets.filter(b => typeof b === 'string' && !b.startsWith('__SPECS__:')),
    `__SPECS__:${JSON.stringify(specsPayload)}`
  ];

  return {
    id: spec.id.toLowerCase(),
    name: spec.name.toUpperCase(),
    price_monthly: Number(spec.price_monthly),
    price_yearly: Number(spec.price_yearly),
    features: featuresArray,
    updated_at: new Date().toISOString()
  };
}

async function syncPlans() {
  console.log('Syncing pricing_plans table with updated default specs...');
  for (const [id, spec] of Object.entries(DEFAULT_PLAN_SPECS)) {
    const payload = serializePlanSpec(spec);
    const { error } = await supabaseAdmin.from('pricing_plans').update(payload).eq('id', id);
    if (error) console.error(`Error updating plan ${id}:`, error.message);
    else console.log(`✓ Updated plan "${id}" successfully`);
  }
  console.log('Done!');
}

syncPlans();
