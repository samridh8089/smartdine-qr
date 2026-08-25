const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_PLANS = [
  {
    id: 'starter',
    name: 'STARTER',
    price_monthly: 499,
    price_yearly: 4990,
    max_tables: 25,
    max_items: 15,
    allow_waiter: false,
    allow_analytics: false,
    allow_branding: false,
    kds_type: 'standard',
    features: [
      'Digital QR Menu & Ordering',
      'Dine-in, Takeaway & Table Reservations',
      'Live Order Tracking & Waiter Call Bell',
      'Up to 25 Tables & 5 Staff Accounts',
      'Up to 15 Menu Items & 500 Inventory Items',
      '5 AI Menu Analyses & 5 AI Recipe Generations/mo',
      '25 AI Review Replies/mo',
      `__SPECS__:${JSON.stringify({
        description: 'Ideal for small cafes & food stalls starting with digital QR ordering',
        billing_interval: 'monthly',
        is_active: true,
        is_popular: false,
        sort_order: 1,
        limits: {
          tables: 25,
          staff_accounts: 5,
          outlets: 1,
          menu_items: 15,
          inventory_items: 500,
          recipes: null,
          monthly_orders: null
        },
        features: {
          qr_menu: true,
          ordering: true,
          takeaway: true,
          reservations: true,
          live_order_tracking: true,
          call_waiter: true,
          request_bill: true,
          table_management: true,
          kds: false,
          kitchen_notifications: false,
          batch_orders: false,
          floor_plan: false,
          table_merge: false,
          manual_discount: false,
          inventory: false,
          stock_in: false,
          low_stock_alerts: false,
          out_of_stock_auto_disable: false,
          auto_stock_deduction: false,
          csv_inventory_import: false,
          recipes: false,
          recipe_costing: false,
          gross_margin: false,
          waste_management: false,
          transaction_ledger: false,
          advanced_analytics: false,
          csv_exports: true,
          pdf_reports: true,
          detailed_gst_reports: true,
          staff_rbac: true,
          staff_tasks: false,
          task_proof_upload: false,
          task_approval: false,
          audit_logs: false,
          multi_outlet: false,
          central_dashboard: false,
          outlet_reports: false,
          custom_reports: false,
          api_access: false,
          custom_branding: false,
          ai_menu: true,
          ai_recipe: true,
          ai_review: true
        },
        ai_limits: {
          ai_menu_analysis: 5,
          ai_recipe_generation: 5,
          ai_review_generation: 25
        }
      })}`
    ]
  },
  {
    id: 'growth',
    name: 'GROWTH',
    price_monthly: 999,
    price_yearly: 9990,
    max_tables: 9999,
    max_items: 50,
    allow_waiter: true,
    allow_analytics: false,
    allow_branding: false,
    kds_type: 'standard',
    features: [
      'Everything in Starter + KDS & Inventory',
      'Kitchen Display System (KDS) & Batch Orders',
      'Inventory Stock Tracking & Stock-In',
      'Recipe Engineering & Profit Margin Math',
      '15 Staff Accounts & Unlimited Tables',
      'Up to 50 Menu Items & Unlimited Inventory',
      '20 AI Menu Analyses & 20 AI Recipe Generations/mo',
      '100 AI Review Replies/mo',
      `__SPECS__:${JSON.stringify({
        description: 'Perfect for growing restaurants needing kitchen automation & stock control',
        billing_interval: 'monthly',
        is_active: true,
        is_popular: true,
        sort_order: 2,
        limits: {
          tables: null,
          staff_accounts: 15,
          outlets: 1,
          menu_items: 50,
          inventory_items: null,
          recipes: null,
          monthly_orders: null
        },
        features: {
          qr_menu: true,
          ordering: true,
          takeaway: true,
          reservations: true,
          live_order_tracking: true,
          call_waiter: true,
          request_bill: true,
          table_management: true,
          kds: true,
          kitchen_notifications: true,
          batch_orders: true,
          floor_plan: true,
          table_merge: true,
          manual_discount: true,
          inventory: true,
          stock_in: true,
          low_stock_alerts: true,
          out_of_stock_auto_disable: true,
          auto_stock_deduction: true,
          csv_inventory_import: true,
          recipes: true,
          recipe_costing: true,
          gross_margin: true,
          waste_management: false,
          transaction_ledger: true,
          advanced_analytics: false,
          csv_exports: true,
          pdf_reports: true,
          detailed_gst_reports: true,
          staff_rbac: true,
          staff_tasks: false,
          task_proof_upload: false,
          task_approval: false,
          audit_logs: false,
          multi_outlet: false,
          central_dashboard: false,
          outlet_reports: false,
          custom_reports: false,
          api_access: false,
          custom_branding: false,
          ai_menu: true,
          ai_recipe: true,
          ai_review: true
        },
        ai_limits: {
          ai_menu_analysis: 20,
          ai_recipe_generation: 20,
          ai_review_generation: 100
        }
      })}`
    ]
  },
  {
    id: 'pro',
    name: 'PRO',
    price_monthly: 1999,
    price_yearly: 19990,
    max_tables: 9999,
    max_items: 9999,
    allow_waiter: true,
    allow_analytics: true,
    allow_branding: false,
    kds_type: 'premium',
    features: [
      'Everything in Growth + Waste & Staff Tasks',
      'Waste Management & Spoilage Auditing',
      'Staff Tasks & Photo/Video Proof Workflow',
      'Advanced Sales Analytics & Performance Reports',
      'Unlimited Staff & Unlimited Tables',
      '100 AI Menu Analyses & 100 AI Recipe Generations/mo',
      '500 AI Review Replies/mo',
      `__SPECS__:${JSON.stringify({
        description: 'Complete ERP suite for busy multi-staff restaurants',
        billing_interval: 'monthly',
        is_active: true,
        is_popular: false,
        sort_order: 3,
        limits: {
          tables: null,
          staff_accounts: null,
          outlets: 1,
          menu_items: null,
          inventory_items: null,
          recipes: null,
          monthly_orders: null
        },
        features: {
          qr_menu: true,
          ordering: true,
          takeaway: true,
          reservations: true,
          live_order_tracking: true,
          call_waiter: true,
          request_bill: true,
          table_management: true,
          kds: true,
          kitchen_notifications: true,
          batch_orders: true,
          floor_plan: true,
          table_merge: true,
          manual_discount: true,
          inventory: true,
          stock_in: true,
          low_stock_alerts: true,
          out_of_stock_auto_disable: true,
          auto_stock_deduction: true,
          csv_inventory_import: true,
          recipes: true,
          recipe_costing: true,
          gross_margin: true,
          waste_management: true,
          transaction_ledger: true,
          advanced_analytics: true,
          csv_exports: true,
          pdf_reports: true,
          detailed_gst_reports: true,
          staff_rbac: true,
          staff_tasks: true,
          task_proof_upload: true,
          task_approval: true,
          audit_logs: true,
          multi_outlet: false,
          central_dashboard: false,
          outlet_reports: false,
          custom_reports: true,
          api_access: true,
          custom_branding: false,
          ai_menu: true,
          ai_recipe: true,
          ai_review: true
        },
        ai_limits: {
          ai_menu_analysis: 100,
          ai_recipe_generation: 100,
          ai_review_generation: 500
        }
      })}`
    ]
  },
  {
    id: 'business',
    name: 'BUSINESS',
    price_monthly: 3999,
    price_yearly: 39990,
    max_tables: 9999,
    max_items: 9999,
    allow_waiter: true,
    allow_analytics: true,
    allow_branding: true,
    kds_type: 'premium',
    features: [
      'Everything in Pro + Multi-Outlet & Custom AI',
      'Multi-Outlet Management (2 Outlets)',
      'Custom Branding & Logo Upload',
      'Custom Unlimited AI Limits',
      'Priority 24/7 VIP Phone Support',
      `__SPECS__:${JSON.stringify({
        description: 'Enterprise solution for multi-outlet restaurant chains',
        billing_interval: 'monthly',
        is_active: true,
        is_popular: false,
        sort_order: 4,
        limits: {
          tables: null,
          staff_accounts: null,
          outlets: 2,
          menu_items: null,
          inventory_items: null,
          recipes: null,
          monthly_orders: null
        },
        features: {
          qr_menu: true,
          ordering: true,
          takeaway: true,
          reservations: true,
          live_order_tracking: true,
          call_waiter: true,
          request_bill: true,
          table_management: true,
          kds: true,
          kitchen_notifications: true,
          batch_orders: true,
          floor_plan: true,
          table_merge: true,
          manual_discount: true,
          inventory: true,
          stock_in: true,
          low_stock_alerts: true,
          out_of_stock_auto_disable: true,
          auto_stock_deduction: true,
          csv_inventory_import: true,
          recipes: true,
          recipe_costing: true,
          gross_margin: true,
          waste_management: true,
          transaction_ledger: true,
          advanced_analytics: true,
          csv_exports: true,
          pdf_reports: true,
          detailed_gst_reports: true,
          staff_rbac: true,
          staff_tasks: true,
          task_proof_upload: true,
          task_approval: true,
          audit_logs: true,
          multi_outlet: true,
          central_dashboard: true,
          outlet_reports: true,
          custom_reports: true,
          api_access: true,
          custom_branding: true,
          ai_menu: true,
          ai_recipe: true,
          ai_review: true
        },
        ai_limits: {
          ai_menu_analysis: null,
          ai_recipe_generation: null,
          ai_review_generation: null
        }
      })}`
    ]
  }
];

async function seedPlansDirect() {
  console.log('=== SEEDING 4 DEFAULT SaaS PLANS VIA REST API / SUPABASE ===\n');

  for (const p of DEFAULT_PLANS) {
    try {
      const { data, error } = await supabase.from('pricing_plans').upsert(p).select();
      if (error) {
        // Try update-plan-specs route payload
        console.log(`Failed standard upsert for ${p.name}: ${error.message}`);
      } else {
        console.log(`✅ Upserted ${p.name}`);
      }
    } catch (e) {
      console.error(`Error processing ${p.name}:`, e.message);
    }
  }
}

seedPlansDirect().catch(console.error);
