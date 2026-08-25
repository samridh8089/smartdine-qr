import { supabase } from './supabase';

export interface FeatureCatalogItem {
  key: string;
  label: string;
  category: 'Customer Ordering' | 'Operations & KDS' | 'Inventory & ERP' | 'Analytics & Reporting' | 'Staff & Tasks' | 'Multi-Outlet & Enterprise' | 'AI Powered Features';
  description: string;
}

export const FEATURE_CATALOG: FeatureCatalogItem[] = [
  // Customer Ordering
  { key: 'qr_menu', label: 'Digital QR Menu', category: 'Customer Ordering', description: 'Interactive QR code menu for customers' },
  { key: 'ordering', label: 'Dine-in Ordering', category: 'Customer Ordering', description: 'Table-mapped customer ordering' },
  { key: 'takeaway', label: 'Takeaway Ordering', category: 'Customer Ordering', description: 'Takeaway ordering with arrival time' },
  { key: 'reservations', label: 'Table Reservations', category: 'Customer Ordering', description: 'Customer table booking and reservations' },
  { key: 'live_order_tracking', label: 'Live Order Tracking', category: 'Customer Ordering', description: 'Real-time order progress stepper for customers' },
  { key: 'call_waiter', label: 'Call Waiter & Request Bill', category: 'Customer Ordering', description: '1-tap customer assistance buttons' },

  // Operations & KDS
  { key: 'table_management', label: 'Table Management', category: 'Operations & KDS', description: 'Visual floor plan & active table status' },
  { key: 'kds', label: 'Kitchen Display System (KDS)', category: 'Operations & KDS', description: 'Live kitchen order ticket screen' },
  { key: 'kitchen_notifications', label: 'Kitchen Audio/Visual Alerts', category: 'Operations & KDS', description: 'Instant notification sound for kitchen' },
  { key: 'batch_orders', label: 'Multi-Batch Orders', category: 'Operations & KDS', description: 'Support multi-course kitchen batches' },
  { key: 'floor_plan', label: 'Interactive Floor Layout', category: 'Operations & KDS', description: 'Custom floor map arrangement' },
  { key: 'table_merge', label: 'Table Merging', category: 'Operations & KDS', description: 'Merge multiple tables into 1 bill' },
  { key: 'manual_discount', label: 'Manual Order Discounts', category: 'Operations & KDS', description: 'Staff-applied custom order discounts' },

  // Inventory & ERP
  { key: 'inventory', label: 'Inventory Management', category: 'Inventory & ERP', description: 'Raw material stock registry & tracking' },
  { key: 'stock_in', label: 'Stock-In / Purchase Invoices', category: 'Inventory & ERP', description: 'Log incoming supplier purchases' },
  { key: 'low_stock_alerts', label: 'Low Stock Alerts', category: 'Inventory & ERP', description: 'Alert notifications for stock below threshold' },
  { key: 'out_of_stock_auto_disable', label: 'Out of Stock Auto-Disabling', category: 'Inventory & ERP', description: 'Auto-disable dishes when ingredient stock is 0' },
  { key: 'auto_stock_deduction', label: 'Automatic Recipe Stock Deduction', category: 'Inventory & ERP', description: 'Deduct ingredients when order completes' },
  { key: 'csv_inventory_import', label: 'CSV Bulk Inventory Import', category: 'Inventory & ERP', description: 'Bulk upload stock items via CSV' },
  { key: 'recipes', label: 'Recipe Management', category: 'Inventory & ERP', description: 'Ingredient-to-dish mapping' },
  { key: 'recipe_costing', label: 'Dynamic Recipe Costing', category: 'Inventory & ERP', description: 'Auto-calculate dish cost from ingredient prices' },
  { key: 'gross_margin', label: 'Gross Margin & Profitability %', category: 'Inventory & ERP', description: 'Track profit margins per dish' },
  { key: 'waste_management', label: 'Waste Management', category: 'Inventory & ERP', description: 'Log spoilage/damaged stock' },
  { key: 'transaction_ledger', label: 'Inventory Audit Ledger', category: 'Inventory & ERP', description: 'Full audit history of stock movements' },

  // Analytics & Reporting
  { key: 'advanced_analytics', label: 'Advanced Sales Analytics', category: 'Analytics & Reporting', description: 'Detailed sales & revenue performance dashboard' },
  { key: 'csv_exports', label: 'Accounting CSV Exports', category: 'Analytics & Reporting', description: 'Export Orders, Items, and Combined Accounting CSV' },
  { key: 'pdf_reports', label: 'Print & PDF Reports', category: 'Analytics & Reporting', description: 'Print-ready financial summary & receipts' },
  { key: 'detailed_gst_reports', label: 'Detailed GST Tax Summaries', category: 'Analytics & Reporting', description: 'CGST, SGST, IGST tax breakdown reports' },

  // Staff & Tasks
  { key: 'staff_rbac', label: 'Staff Roles & Access Control', category: 'Staff & Tasks', description: 'Owner, Manager, Cashier, Waiter & Kitchen roles' },
  { key: 'staff_tasks', label: 'Staff Task Assignment', category: 'Staff & Tasks', description: 'Create and assign staff duties' },
  { key: 'task_proof_upload', label: 'Task Photo/Video Proof Upload', category: 'Staff & Tasks', description: 'Mandatory media upload for task completion' },
  { key: 'task_approval', label: 'Task Review & Approvals', category: 'Staff & Tasks', description: 'Manager review and revision workflow' },

  // Multi-Outlet & Enterprise
  { key: 'audit_logs', label: 'SaaS Audit Logs', category: 'Multi-Outlet & Enterprise', description: 'Track admin changes & plan overrides' },
  { key: 'multi_outlet', label: 'Multi-Outlet Management', category: 'Multi-Outlet & Enterprise', description: 'Manage multiple restaurant locations' },
  { key: 'central_dashboard', label: 'Central Enterprise Dashboard', category: 'Multi-Outlet & Enterprise', description: 'Cross-outlet consolidated metrics' },
  { key: 'outlet_reports', label: 'Outlet Performance Reports', category: 'Multi-Outlet & Enterprise', description: 'Compare revenue across locations' },
  { key: 'custom_reports', label: 'Custom Reports Generator', category: 'Multi-Outlet & Enterprise', description: 'Tailored report builder' },
  { key: 'api_access', label: 'API & Webhook Access', category: 'Multi-Outlet & Enterprise', description: 'Integrate external POS & ERPs' },
  { key: 'custom_branding', label: 'Custom Branding & Logo', category: 'Multi-Outlet & Enterprise', description: 'Remove CleverOps watermark & add custom branding' },

  // AI Features
  { key: 'ai_menu', label: 'AI Menu Analysis & OCR', category: 'AI Powered Features', description: 'Extract dishes from paper menu photos' },
  { key: 'ai_recipe', label: 'AI Recipe & Food Image Generator', category: 'AI Powered Features', description: 'Generate food photos & recipe steps using AI' }
];

export interface ResourceLimitItem {
  key: string;
  label: string;
  description: string;
  defaultUnlimited: boolean;
}

export const RESOURCE_LIMIT_CATALOG: ResourceLimitItem[] = [
  { key: 'tables', label: 'Active Tables', description: 'Maximum physical restaurant tables', defaultUnlimited: false },
  { key: 'staff_accounts', label: 'Staff Accounts', description: 'Maximum staff login accounts', defaultUnlimited: false },
  { key: 'outlets', label: 'Restaurant Outlets', description: 'Maximum restaurant locations', defaultUnlimited: false },
  { key: 'menu_items', label: 'Menu Items', description: 'Maximum active menu dishes', defaultUnlimited: false },
  { key: 'inventory_items', label: 'Inventory Items', description: 'Maximum raw material stock items', defaultUnlimited: false },
  { key: 'recipes', label: 'Configured Recipes', description: 'Maximum dish recipes', defaultUnlimited: true },
  { key: 'monthly_orders', label: 'Monthly Orders', description: 'Maximum orders per billing cycle', defaultUnlimited: true }
];

export interface AILimitItem {
  key: string;
  label: string;
  description: string;
}

export const AI_LIMIT_CATALOG: AILimitItem[] = [
  { key: 'ai_menu_analysis', label: 'AI Menu Photo Analysis', description: 'Monthly paper menu OCR scan attempts' },
  { key: 'ai_recipe_generation', label: 'AI Recipe & Image Generator', description: 'Monthly AI food photo & recipe generation attempts' }
];

export interface PlanEntitlementSpec {
  id: string; // 'starter' | 'pro' | 'premium' | 'custom'
  name: string;
  slug: string;
  price_monthly: number;
  price_yearly: number;
  billing_interval: 'monthly' | 'yearly';
  description: string;
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
  limits: Record<string, number | null>; // number or null for unlimited
  features: Record<string, boolean>; // true / false
  ai_limits: Record<string, number | null>; // number or null for unlimited
  display_features: string[];
}

export const DEFAULT_PLAN_SPECS: Record<string, PlanEntitlementSpec> = {
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
    limits: {
      tables: 5,
      menu_items: 25,
      staff_accounts: 5,
      inventory_items: 0,
      recipes: 0,
      outlets: 1,
      monthly_orders: null
    },
    features: {
      qr_menu: true,
      ordering: true,
      takeaway: true,
      reservations: false,
      live_order_tracking: false,
      call_waiter: false,
      request_bill: false,
      table_management: true,
      kds: true,
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
      csv_exports: false,
      pdf_reports: false,
      detailed_gst_reports: false,
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
      ai_menu: false,
      ai_recipe: false
    },
    ai_limits: {
      ai_menu_analysis: 0,
      ai_recipe_generation: 0,
      ai_review_generation: 0,
      max_items_per_request: 0,
      max_requests_per_month: 0
    },
    display_features: [
      'Digital QR Menu & Dine-in Ordering',
      'Takeaway Ordering & Table Management',
      'Basic Kitchen Display (KDS)',
      'GST Billing & Basic Reports',
      '5 Tables, 25 Menu Items & 5 Staff Accounts'
    ]
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
    limits: {
      tables: 15,
      menu_items: 100,
      staff_accounts: 10,
      inventory_items: 100,
      recipes: 100,
      outlets: 1,
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
      ai_recipe: true
    },
    ai_limits: {
      ai_menu_analysis: 200,
      ai_recipe_generation: 200,
      ai_review_generation: 0,
      max_items_per_request: 100,
      max_requests_per_month: 2
    },
    display_features: [
      'Everything in Starter + Live Tracking & Call Waiter',
      'Table Reservations & Interactive Floor Layout',
      'Full KDS, Multi-Batch Orders & Table Merging',
      'Inventory (100 items) & Recipes (100 recipes)',
      'Recipe Costing, Gross Margin & Waste Tracking',
      'Staff Tasks & Advanced Sales Analytics',
      '15 Tables, 100 Menu Items & 10 Staff Accounts',
      '200 AI Menu Item Credits & 200 AI Recipe Credits/mo'
    ]
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
    limits: {
      tables: null,
      menu_items: null,
      staff_accounts: null,
      inventory_items: 500,
      recipes: 500,
      outlets: 1,
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
      api_access: false,
      custom_branding: true,
      ai_menu: true,
      ai_recipe: true
    },
    ai_limits: {
      ai_menu_analysis: 2000,
      ai_recipe_generation: 2000,
      ai_review_generation: 0,
      max_items_per_request: 100,
      max_requests_per_month: 20
    },
    display_features: [
      'Everything in Pro + Task Proofs & Custom Branding',
      'Advanced Inventory (500 items) & Recipes (500 recipes)',
      'Photo/Video Task Proof & Manager Approvals',
      'Custom Branding & Logo Upload',
      'Unlimited Tables, Menu Items & Staff Accounts',
      '2,000 AI Menu Item Credits & 2,000 AI Recipe Credits/mo',
      'Single Outlet Suite'
    ]
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
    limits: {
      tables: null,
      menu_items: null,
      staff_accounts: null,
      inventory_items: null,
      recipes: null,
      outlets: null,
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
      ai_recipe: true
    },
    ai_limits: {
      ai_menu_analysis: 0,
      ai_recipe_generation: 0,
      ai_review_generation: 0,
      max_items_per_request: 0,
      max_requests_per_month: 0
    },
    display_features: [
      'Custom Tailored Resource & Feature Specification',
      'Configurable Outlets & API Access',
      'Dedicated Account Manager & 24/7 VIP Phone Support'
    ]
  }
};

/**
 * Parses a pricing_plan DB row into a full PlanEntitlementSpec object
 */
export function parsePlanSpec(dbRow: any): PlanEntitlementSpec {
  const planId = (dbRow?.id || 'starter').toLowerCase();
  const defaultSpec = DEFAULT_PLAN_SPECS[planId] || DEFAULT_PLAN_SPECS.starter;

  let embeddedSpec: Partial<PlanEntitlementSpec> = {};
  if (Array.isArray(dbRow?.features)) {
    const specsStr = dbRow.features.find((f: string) => typeof f === 'string' && f.startsWith('__SPECS__:'));
    if (specsStr) {
      try {
        embeddedSpec = JSON.parse(specsStr.replace('__SPECS__:', ''));
      } catch (e) {}
    }
  }

  // Backward compatibility legacy specs check
  let legacyMaxTables = dbRow?.max_tables !== undefined ? Number(dbRow.max_tables) : undefined;
  let legacyMaxItems = dbRow?.max_items !== undefined ? Number(dbRow.max_items) : undefined;

  return {
    id: dbRow?.id || defaultSpec.id,
    name: dbRow?.name || defaultSpec.name,
    slug: (dbRow?.id || defaultSpec.id).toLowerCase(),
    price_monthly: dbRow?.price_monthly !== undefined ? Number(dbRow.price_monthly) : defaultSpec.price_monthly,
    price_yearly: dbRow?.price_yearly !== undefined ? Number(dbRow.price_yearly) : defaultSpec.price_yearly,
    billing_interval: embeddedSpec.billing_interval || defaultSpec.billing_interval,
    description: embeddedSpec.description || defaultSpec.description,
    is_active: embeddedSpec.is_active !== undefined ? embeddedSpec.is_active : true,
    is_popular: embeddedSpec.is_popular !== undefined ? embeddedSpec.is_popular : defaultSpec.is_popular,
    sort_order: embeddedSpec.sort_order !== undefined ? embeddedSpec.sort_order : defaultSpec.sort_order,
    limits: {
      ...defaultSpec.limits,
      ...(embeddedSpec.limits || {}),
      ...(legacyMaxTables !== undefined && legacyMaxTables < 9999 ? { tables: legacyMaxTables } : {}),
      ...(legacyMaxItems !== undefined && legacyMaxItems < 9999 ? { menu_items: legacyMaxItems } : {})
    },
    features: {
      ...defaultSpec.features,
      ...(embeddedSpec.features || {}),
      ...(dbRow?.allow_waiter !== undefined ? { call_waiter: Boolean(dbRow.allow_waiter) } : {}),
      ...(dbRow?.allow_analytics !== undefined ? { advanced_analytics: Boolean(dbRow.allow_analytics) } : {}),
      ...(dbRow?.allow_branding !== undefined ? { custom_branding: Boolean(dbRow.allow_branding) } : {})
    },
    ai_limits: {
      ...defaultSpec.ai_limits,
      ...(embeddedSpec.ai_limits || {})
    },
    display_features: (dbRow?.features && Array.isArray(dbRow.features)) 
      ? dbRow.features.filter((f: string) => typeof f === 'string' && !f.startsWith('__SPECS__:'))
      : defaultSpec.display_features
  };
}

/**
 * Encodes a PlanEntitlementSpec object into DB-compatible pricing_plans row payload
 */
export function serializePlanSpec(spec: PlanEntitlementSpec) {
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

/**
 * Centralized Feature Check for a Restaurant
 */
export async function isFeatureEnabledForRestaurant(restaurantId: string, featureKey: string): Promise<boolean> {
  if (!restaurantId) return false;
  try {
    const { data: rest } = await supabase.from('restaurants').select('subscription_plan').eq('id', restaurantId).maybeSingle();
    const planId = (rest?.subscription_plan || 'starter').toLowerCase();
    
    const { data: planRow } = await supabase.from('pricing_plans').select('*').eq('id', planId).maybeSingle();
    const spec = parsePlanSpec(planRow || { id: planId });
    return spec.features[featureKey] !== false;
  } catch (e) {
    return true; // Fail-open safety fallback to avoid breaking working code on connection glitches
  }
}

/**
 * Centralized Resource Limit Check for a Restaurant
 */
export async function checkResourceLimitForRestaurant(
  restaurantId: string, 
  resourceKey: string, 
  currentCount: number
): Promise<{ allowed: boolean; limit: number | null; count: number; message?: string }> {
  if (!restaurantId) return { allowed: true, limit: null, count: currentCount };

  try {
    const { data: rest } = await supabase.from('restaurants').select('subscription_plan').eq('id', restaurantId).maybeSingle();
    const planId = (rest?.subscription_plan || 'starter').toLowerCase();
    
    const { data: planRow } = await supabase.from('pricing_plans').select('*').eq('id', planId).maybeSingle();
    const spec = parsePlanSpec(planRow || { id: planId });
    
    const limit = spec.limits[resourceKey];
    if (limit === null || limit === undefined) {
      return { allowed: true, limit: null, count: currentCount };
    }

    if (currentCount >= limit) {
      return {
        allowed: false,
        limit,
        count: currentCount,
        message: `Your ${spec.name} plan limits you to ${limit} ${resourceKey.replace('_', ' ')}. Upgrade your plan to manage additional resources.`
      };
    }

    return { allowed: true, limit, count: currentCount };
  } catch (e) {
    return { allowed: true, limit: null, count: currentCount };
  }
}

/**
 * Monthly AI Credit Usage Check & Consumption Tracking
 */
/**
 * Get AI Usage Summary for a Restaurant
 */
export async function getAIUsageForRestaurant(
  restaurantId: string, 
  featureKey: string
): Promise<{ used: number; limit: number | null; remaining: number | null; maxItemsPerRequest: number; maxRequestsPerMonth: number }> {
  if (!restaurantId) return { used: 0, limit: 0, remaining: 0, maxItemsPerRequest: 0, maxRequestsPerMonth: 0 };

  const currentMonth = new Date().toISOString().slice(0, 7);
  try {
    const { data: rest } = await supabase.from('restaurants').select('subscription_plan, settings').eq('id', restaurantId).maybeSingle();
    const planId = (rest?.subscription_plan || 'starter').toLowerCase();

    const { data: planRow } = await supabase.from('pricing_plans').select('*').eq('id', planId).maybeSingle();
    const spec = parsePlanSpec(planRow || { id: planId });

    // Check if feature is enabled on plan
    const featureToggleKey = featureKey === 'ai_menu_analysis' ? 'ai_menu' : featureKey === 'ai_recipe_generation' ? 'ai_recipe' : featureKey;
    const isFeatureEnabled = spec.features[featureToggleKey] !== false;

    let rawLimit = spec.ai_limits[featureKey];
    let limit: number | null = rawLimit !== undefined && rawLimit !== null ? Number(rawLimit) : 0;
    if (!isFeatureEnabled) {
      limit = 0;
    }

    const maxItemsPerRequest = Number(spec.ai_limits.max_items_per_request || spec.ai_limits[`${featureKey}_max_items`] || (isFeatureEnabled ? 100 : 0));
    const maxRequestsPerMonth = Number(spec.ai_limits.max_requests_per_month || spec.ai_limits[`${featureKey}_max_requests`] || (isFeatureEnabled ? (planId === 'premium' ? 20 : 2) : 0));

    const monthUsage = rest?.settings?.ai_usage?.[currentMonth] || {};
    const currentUsed = Number(monthUsage[featureKey] || 0);
    const remaining = limit !== null ? Math.max(0, limit - currentUsed) : null;

    return { used: currentUsed, limit, remaining, maxItemsPerRequest, maxRequestsPerMonth };
  } catch (e) {
    return { used: 0, limit: 0, remaining: 0, maxItemsPerRequest: 0, maxRequestsPerMonth: 0 };
  }
}

/**
 * Monthly AI Credit Usage Check & Item-Based Credit Consumption Tracking
 */
export async function consumeAICreditForRestaurant(
  restaurantId: string, 
  featureKey: string,
  itemCount: number = 1,
  requestId?: string
): Promise<{ allowed: boolean; used: number; limit: number | null; remaining: number | null; message?: string }> {
  if (!restaurantId) return { allowed: false, used: 0, limit: 0, remaining: 0, message: 'Restaurant ID required.' };

  const currentMonth = new Date().toISOString().slice(0, 7);

  try {
    const { data: rest } = await supabase.from('restaurants').select('subscription_plan, settings').eq('id', restaurantId).maybeSingle();
    const planId = (rest?.subscription_plan || 'starter').toLowerCase();

    const { data: planRow } = await supabase.from('pricing_plans').select('*').eq('id', planId).maybeSingle();
    const spec = parsePlanSpec(planRow || { id: planId });

    // Check if feature toggle is enabled on plan
    const featureToggleKey = featureKey === 'ai_menu_analysis' ? 'ai_menu' : featureKey === 'ai_recipe_generation' ? 'ai_recipe' : featureKey;
    const isFeatureEnabled = spec.features[featureToggleKey] !== false;

    let rawLimit = spec.ai_limits[featureKey];
    let limit: number | null = rawLimit !== undefined && rawLimit !== null ? Number(rawLimit) : 0;
    if (!isFeatureEnabled) {
      limit = 0;
    }

    const settings = rest?.settings || {};
    const aiUsage = settings.ai_usage || {};
    const monthUsage = aiUsage[currentMonth] || {};
    const currentUsed = Number(monthUsage[featureKey] || 0);
    const processedRequests = aiUsage.processed_requests || {};

    // Feature locked or 0 credits limit
    if (!isFeatureEnabled || limit === 0) {
      return {
        allowed: false,
        used: currentUsed,
        limit: 0,
        remaining: 0,
        message: 'AI features are not included in your current subscription plan. Upgrade your plan to access AI features.'
      };
    }

    // Idempotency check: if requestId already recorded, return current usage without charging again
    if (requestId && processedRequests[requestId]) {
      const remaining = limit !== null ? Math.max(0, limit - currentUsed) : null;
      return { allowed: true, used: currentUsed, limit, remaining };
    }

    // If itemCount === 0, perform check only without consuming
    if (itemCount === 0) {
      const remaining = limit !== null ? Math.max(0, limit - currentUsed) : null;
      const allowed = limit === null || currentUsed < limit;
      return {
        allowed,
        used: currentUsed,
        limit,
        remaining,
        message: allowed ? undefined : `Monthly AI credit limit reached (${currentUsed}/${limit} credits used). Upgrade your plan to continue using AI features.`
      };
    }

    if (limit !== null && currentUsed + itemCount > limit) {
      const remaining = Math.max(0, limit - currentUsed);
      return {
        allowed: false,
        used: currentUsed,
        limit,
        remaining,
        message: remaining > 0 
          ? `Insufficient AI credits remaining (${remaining} credits left, but requested ${itemCount}).`
          : `Monthly AI credit limit reached (${currentUsed}/${limit} credits used). Upgrade your plan for additional AI credits.`
      };
    }

    const newUsed = currentUsed + itemCount;
    const newMonthUsage = { ...monthUsage, [featureKey]: newUsed };
    const newProcessedRequests = requestId 
      ? { ...processedRequests, [requestId]: { timestamp: new Date().toISOString(), feature: featureKey, items: itemCount } } 
      : processedRequests;

    const newSettings = {
      ...settings,
      ai_usage: {
        ...aiUsage,
        [currentMonth]: newMonthUsage,
        processed_requests: newProcessedRequests
      }
    };

    await supabase.from('restaurants').update({ settings: newSettings }).eq('id', restaurantId);

    // Log to audit logs for usage history and auditability
    try {
      await supabase.from('audit_logs').insert({
        restaurant_id: restaurantId,
        user_email: 'system@cleverops.in',
        action: 'ai_credit_consumed',
        details: JSON.stringify({
          feature: featureKey,
          items_processed: itemCount,
          credits_consumed: itemCount,
          billing_period: currentMonth,
          request_id: requestId || `req_${Date.now()}`,
          total_used: newUsed,
          limit
        })
      });
    } catch (aErr) {}

    const remaining = limit !== null ? Math.max(0, limit - newUsed) : null;
    return { allowed: true, used: newUsed, limit, remaining };
  } catch (e: any) {
    return { allowed: false, used: 0, limit: 0, remaining: 0, message: e?.message || 'Failed to process AI entitlement.' };
  }
}
