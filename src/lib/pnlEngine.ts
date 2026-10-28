import { supabase } from '@/lib/supabase';
import { Restaurant, DEFAULT_PRICING_PLANS } from '@/lib/db';

export type ExpenseCategory =
  | 'rent'
  | 'electricity'
  | 'gas_fuel'
  | 'maintenance'
  | 'marketing'
  | 'packaging'
  | 'water_municipal'
  | 'internet_tech'
  | 'software_pos'
  | 'staff_welfare'
  | 'tax_license'
  | 'other';

export interface ExpenseCategoryMeta {
  key: ExpenseCategory;
  label: string;
  defaultRecurring: boolean;
}

export const EXPENSE_CATEGORIES: ExpenseCategoryMeta[] = [
  { key: 'electricity', label: 'Electricity', defaultRecurring: true },
  { key: 'rent', label: 'Rent', defaultRecurring: true },
  { key: 'gas_fuel', label: 'Gas & Fuel', defaultRecurring: false },
  { key: 'maintenance', label: 'Maintenance & Repairs', defaultRecurring: false },
  { key: 'packaging', label: 'Packaging', defaultRecurring: false },
  { key: 'marketing', label: 'Marketing', defaultRecurring: false },
  { key: 'water_municipal', label: 'Water & Utilities', defaultRecurring: true },
  { key: 'internet_tech', label: 'WiFi & Internet', defaultRecurring: true },
  { key: 'software_pos', label: 'CleverOps Software', defaultRecurring: true },
  { key: 'staff_welfare', label: 'Staff Welfare', defaultRecurring: false },
  { key: 'tax_license', label: 'Licenses & Fees', defaultRecurring: false },
  { key: 'other', label: 'Other Expenses', defaultRecurring: false },
];

export interface RestaurantExpense {
  id: string;
  restaurant_id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  expense_date: string; // YYYY-MM-DD
  payment_mode: 'cash' | 'upi' | 'bank_transfer' | 'card' | 'cheque';
  vendor_name?: string | null;
  is_recurring?: boolean;
  recurring_frequency?: 'monthly' | 'quarterly' | 'yearly' | null;
  receipt_url?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseCardItem {
  id: string;
  title: string;
  category: string;
  amount: number;
  percentage: number;
  perHundred: number;
  vendorName?: string | null;
  isRecurring?: boolean;
}

export interface PnLSummary {
  periodLabel: string;
  daysCount: number;

  // Revenue (Base Taxable Sales)
  grossSales: number;
  discounts: number;
  refunds: number;
  netRevenue: number; // Taxable sales (Exclusive of GST)

  // GST Liability (Pass-Through)
  cgstCollected: number;
  sgstCollected: number;
  totalGstCollected: number;
  cashCollectedWithGst: number; // In-hand cash collection

  // Cost of Goods Sold (Food & Kitchen)
  foodCost: number;
  foodCostPercentage: number;
  foodWastageCost: number;
  foodPurchasesCost: number;

  // Labor (Staff Payroll)
  staffLaborCost: number;
  staffLaborPercentage: number;
  activeStaffCount: number;

  // CleverOps Platform Cost
  cleveropsCost: number;
  cleveropsCostPercentage: number;
  cleveropsPlanName: string;

  // Operating Overheads (Individual Expense Cards)
  operatingExpenses: number;
  operatingExpensesPercentage: number;
  expensesByCategory: Record<string, number>;
  expensesList: RestaurantExpense[];
  expenseCards: ExpenseCardItem[]; // Individual card for every expense added by owner!

  // Out of ₹100 Unit Economics Brief ("100 me se kitne pese kaha gae")
  perHundredBreakdown: {
    foodCost: number;
    staffLabor: number;
    cleverops: number;
    operatingExpenses: number;
    totalExpenses: number;
    netProfit: number;
    items: { label: string; amount: number; perHundred: number; percentage: number }[];
  };

  // Totals & True Owner Margin
  totalExpenses: number;
  totalExpensesPercentage: number;
  netProfit: number; // Pure Owner Pocket Take-Home
  netMarginPercentage: number;
  healthStatus: 'excellent' | 'good' | 'warning' | 'critical';
  healthMessage: string;
  dailyBreakEvenSales: number;
}

// ==========================================
// 1. EXPENSES CRUD (DATABASE + FALLBACK)
// ==========================================

export const DEFAULT_STANDARD_BISTRO_EXPENSES: RestaurantExpense[] = [
  {
    id: 'exp_rent_oct26',
    restaurant_id: '655080e7-2b99-4dd2-b0ed-0329beaad81d',
    title: 'Shop Rent & Property Lease',
    category: 'rent',
    amount: 65000,
    expense_date: '2026-10-01',
    payment_mode: 'bank_transfer',
    vendor_name: 'Metro Properties',
    is_recurring: true,
    recurring_frequency: 'monthly',
    notes: 'Commercial shop lease',
  },
  {
    id: 'exp_elec_oct26',
    restaurant_id: '655080e7-2b99-4dd2-b0ed-0329beaad81d',
    title: 'Commercial Electricity Bill',
    category: 'electricity',
    amount: 24500,
    expense_date: '2026-10-05',
    payment_mode: 'upi',
    vendor_name: 'State Electricity Board',
    is_recurring: true,
    recurring_frequency: 'monthly',
    notes: 'Power & HVAC supply',
  },
  {
    id: 'exp_gas_oct26',
    restaurant_id: '655080e7-2b99-4dd2-b0ed-0329beaad81d',
    title: 'Commercial LPG Gas Cylinders',
    category: 'gas_fuel',
    amount: 9400,
    expense_date: '2026-10-10',
    payment_mode: 'cash',
    vendor_name: 'Bharat Gas',
    is_recurring: true,
    recurring_frequency: 'monthly',
    notes: 'Commercial kitchen cylinders',
  },
  {
    id: 'exp_maint_oct26',
    restaurant_id: '655080e7-2b99-4dd2-b0ed-0329beaad81d',
    title: 'Kitchen & HVAC AMC Servicing',
    category: 'maintenance',
    amount: 6500,
    expense_date: '2026-10-14',
    payment_mode: 'upi',
    vendor_name: 'CoolTech Services',
    is_recurring: true,
    recurring_frequency: 'monthly',
    notes: 'Kitchen maintenance & servicing',
  },
  {
    id: 'exp_mktg_oct26',
    restaurant_id: '655080e7-2b99-4dd2-b0ed-0329beaad81d',
    title: 'Marketing & Local Promotions',
    category: 'marketing',
    amount: 5000,
    expense_date: '2026-10-18',
    payment_mode: 'card',
    vendor_name: 'Online Ads',
    is_recurring: true,
    recurring_frequency: 'monthly',
    notes: 'Local customer marketing',
  },
  {
    id: 'exp_pack_oct26',
    restaurant_id: '655080e7-2b99-4dd2-b0ed-0329beaad81d',
    title: 'Takeaway Packaging Supplies',
    category: 'packaging',
    amount: 3002,
    expense_date: '2026-10-22',
    payment_mode: 'upi',
    vendor_name: 'EcoPack India',
    is_recurring: true,
    recurring_frequency: 'monthly',
    notes: 'Meal boxes & takeaway bags',
  },
];

export async function fetchRestaurantExpenses(
  restaurantId: string,
  startDate?: string,
  endDate?: string
): Promise<RestaurantExpense[]> {
  const { data, error } = await supabase
    .from('restaurant_expenses')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('expense_date', { ascending: false });

  if (error) {
    console.error('[PnL] fetchRestaurantExpenses error:', error);
    throw new Error(`Failed to fetch expenses: ${error.message}`);
  }

  return ((data as RestaurantExpense[]) || []).filter(e => {
    if (e.is_recurring) return true;
    if (startDate && e.expense_date < startDate) return false;
    if (endDate && e.expense_date > endDate) return false;
    return true;
  });
}

export async function saveRestaurantExpense(
  restaurantId: string,
  expense: Omit<RestaurantExpense, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>,
  userId?: string
): Promise<{ success: boolean; data?: RestaurantExpense; error?: string }> {
  try {
    const payload = {
      restaurant_id: restaurantId,
      title: expense.title,
      category: expense.category,
      amount: Number(expense.amount) || 0,
      expense_date: expense.expense_date,
      payment_mode: expense.payment_mode || 'cash',
      vendor_name: expense.vendor_name || null,
      is_recurring: Boolean(expense.is_recurring),
      recurring_frequency: expense.recurring_frequency || null,
      receipt_url: expense.receipt_url || null,
      notes: expense.notes || null,
      created_by: userId || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('restaurant_expenses')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('[PnL] saveRestaurantExpense error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as RestaurantExpense };
  } catch (err: any) {
    console.error('[PnL] saveRestaurantExpense err:', err);
    return { success: false, error: err?.message || 'Failed to save expense' };
  }
}

export async function updateRestaurantExpense(
  restaurantId: string,
  expenseId: string,
  updates: Partial<RestaurantExpense>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('restaurant_expenses')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', expenseId)
      .eq('restaurant_id', restaurantId);

    if (error) {
      console.error('[PnL] updateRestaurantExpense error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update expense' };
  }
}

export async function deleteRestaurantExpense(
  restaurantId: string,
  expenseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('restaurant_expenses')
      .delete()
      .eq('id', expenseId)
      .eq('restaurant_id', restaurantId);

    if (error) {
      console.error('[PnL] deleteRestaurantExpense error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete expense' };
  }
}

// ==========================================
// 2. CLEVEROPS SOFTWARE COST PRORATION
// ==========================================

export function computeCleverOpsCost(
  restaurant: Restaurant | null,
  daysCount: number,
  timeRange?: string
): { cost: number; planName: string; monthlyRate: number } {
  const planKey = (restaurant?.subscription_plan || 'starter').toLowerCase();
  const matchedPlan = DEFAULT_PRICING_PLANS.find(p => p.id === planKey) || DEFAULT_PRICING_PLANS[0];

  // Custom fee override if owner has custom enterprise deal in settings
  const customMonthly = (restaurant?.settings as any)?.cleverops_monthly_fee;
  const monthlyRate = customMonthly !== undefined ? Number(customMonthly) : (matchedPlan.price_monthly || 799);

  // If viewing monthly (or >= 28 calendar days), use exact monthly flat fee
  if (timeRange === 'monthly' || daysCount >= 28) {
    return {
      cost: monthlyRate,
      planName: matchedPlan.name || 'Pro',
      monthlyRate,
    };
  }

  // Daily rate prorated on 30-day standard billing cycle
  const dailyRate = monthlyRate / 30;
  const totalCost = Math.round(dailyRate * Math.max(1, daysCount) * 100) / 100;

  return {
    cost: totalCost,
    planName: matchedPlan.name || 'Pro',
    monthlyRate,
  };
}

// ==========================================
// 3. COMPLETE P&L & NET MARGIN ENGINE
// ==========================================

export interface ComputePnLParams {
  salesSummary: {
    grossSales: number;
    totalDiscount: number;
    totalRefunds: number;
    taxableSales: number;
    cgstCollected: number;
    sgstCollected: number;
    totalGstCollected: number;
    netRevenue: number;
    periodLabel: string;
  };
  timeRange: 'today' | 'yesterday' | 'weekly' | 'monthly' | 'custom' | 'single_day';
  daysCount: number;
  startDate?: string;
  endDate?: string;
  purchasesList?: any[];
  dispositionsList?: any[];
  salaryRecords?: any[];
  staffProfiles?: any[];
  expensesList: RestaurantExpense[];
  restaurant: Restaurant | null;
}

export function computeOwnerPnL(params: ComputePnLParams): PnLSummary {
  const {
    salesSummary,
    timeRange,
    daysCount = 1,
    startDate,
    endDate,
    purchasesList = [],
    dispositionsList = [],
    salaryRecords = [],
    staffProfiles = [],
    expensesList = [],
    restaurant,
  } = params;

  // 1. BASE REVENUE (EXCLUSIVE OF GST)
  // Standard restaurant accounting: Net Revenue is Taxable Sales (Food/Beverages sold minus promo & refunds)
  const grossSales = Math.max(0, Number(salesSummary.grossSales || 0));
  const discounts = Math.max(0, Number(salesSummary.totalDiscount || 0));
  const refunds = Math.max(0, Number(salesSummary.totalRefunds || 0));
  const netRevenue = Math.max(0, Number(salesSummary.taxableSales || (grossSales - discounts - refunds)));

  // GST Liability (Pass-Through)
  const cgstCollected = Number(salesSummary.cgstCollected || 0);
  const sgstCollected = Number(salesSummary.sgstCollected || 0);
  const totalGstCollected = Number(salesSummary.totalGstCollected || (cgstCollected + sgstCollected));
  const cashCollectedWithGst = netRevenue + totalGstCollected;

  // 2. FOOD COST (COGS)
  // Standard restaurant accounting:
  // - For monthly period (or >= 20 days), sum verified inventory stock purchases + wastage for that window.
  // - For daily / weekly periods, bulk purchases happen intermittently. Deducting a 45k bulk purchase invoice on a single day
  //   distorts daily operations. We use matching principle (COGS % based on sales) plus any logged wastage.
  let filteredPurchases = purchasesList;
  if (startDate || endDate) {
    filteredPurchases = purchasesList.filter(p => {
      const pDate = p.purchase_date || (p.created_at ? p.created_at.split('T')[0] : '');
      if (startDate && pDate && pDate < startDate) return false;
      if (endDate && pDate && pDate > endDate) return false;
      return true;
    });
  }

  let filteredDispositions = dispositionsList;
  if (startDate || endDate) {
    filteredDispositions = dispositionsList.filter(d => {
      const dDate = d.disposition_date || (d.created_at ? d.created_at.split('T')[0] : '');
      if (startDate && dDate && dDate < startDate) return false;
      if (endDate && dDate && dDate > endDate) return false;
      return true;
    });
  }

  const purchasesTotal = filteredPurchases.reduce((acc, p) => acc + Number(p.total_amount || 0), 0);
  const wastageTotal = filteredDispositions.reduce((acc, d) => acc + Number(d.raw_materials_wasted_cost || d.wasted_cost || 0), 0);

  // Baseline food cost ratio: 31% (matches ₹1,80,000 on ₹5,80,201 revenue)
  const baselineFoodCostRatio = 0.31;

  let foodCost = 0;
  if (timeRange === 'monthly' || daysCount >= 20) {
    foodCost = purchasesTotal + wastageTotal;
    if (foodCost <= 0 && netRevenue > 0) {
      foodCost = Math.round(netRevenue * baselineFoodCostRatio);
    }
  } else {
    // Daily / weekly view
    if (netRevenue > 0) {
      foodCost = Math.round(netRevenue * baselineFoodCostRatio) + wastageTotal;
    } else {
      foodCost = 0;
    }
  }
  const foodCostPercentage = netRevenue > 0 ? Math.round((foodCost / netRevenue) * 1000) / 10 : 0;

  // 3. STAFF PAYROLL (LABOR)
  // Check monthly salary records or active staff base salaries
  let totalMonthlyLabor = 0;
  const settingsStaff = (restaurant?.settings as any)?.attendo?.staff_profiles || [];
  if (salaryRecords.length > 0) {
    totalMonthlyLabor = salaryRecords.reduce((acc, r) => acc + Number(r.net_salary || r.gross_earned || 0), 0);
  } else if (staffProfiles.length > 0) {
    totalMonthlyLabor = staffProfiles
      .filter(s => s.is_active !== false)
      .reduce((acc, s) => acc + Number(s.base_salary || 0), 0);
  } else if (settingsStaff.length > 0) {
    totalMonthlyLabor = settingsStaff
      .filter((s: any) => s.is_active !== false)
      .reduce((acc: number, s: any) => acc + Number(s.base_salary || 0), 0);
  }

  // Prorate staff labor based on period days
  const effectiveDays = Math.max(1, daysCount);
  let staffLaborCost = 0;
  if (timeRange === 'monthly') {
    staffLaborCost = totalMonthlyLabor;
  } else {
    staffLaborCost = Math.round((totalMonthlyLabor / 30) * effectiveDays);
  }
  const staffLaborPercentage = netRevenue > 0 ? Math.round((staffLaborCost / netRevenue) * 1000) / 10 : 0;

  // 4. CLEVEROPS SOFTWARE PLATFORM FEE
  const cleverops = computeCleverOpsCost(restaurant, effectiveDays, timeRange);
  const cleveropsCost = cleverops.cost;
  const cleveropsCostPercentage = netRevenue > 0 ? Math.round((cleveropsCost / netRevenue) * 1000) / 10 : 0;

  // 5. OPERATING EXPENSES (OVERHEADS: Har Kharcha Ka Alag Card)
  const expensesByCategory: Record<string, number> = {};
  const expenseCards: ExpenseCardItem[] = [];
  let totalDirectExpenses = 0;

  expensesList.forEach(exp => {
    const amt = Number(exp.amount || 0);
    if (amt <= 0) return;

    // If marked as recurring monthly and viewing daily/weekly, prorate accordingly
    let effectiveAmount = amt;
    if (exp.is_recurring && exp.recurring_frequency === 'monthly' && timeRange !== 'monthly') {
      effectiveAmount = Math.round((amt / 30) * effectiveDays);
    }

    const catKey = exp.category || 'other';
    expensesByCategory[catKey] = (expensesByCategory[catKey] || 0) + effectiveAmount;
    totalDirectExpenses += effectiveAmount;

    const expPct = netRevenue > 0 ? Math.round((effectiveAmount / netRevenue) * 1000) / 10 : 0;
    const expPerHundred = netRevenue > 0 ? Math.round((effectiveAmount / netRevenue) * 1000) / 10 : 0;

    expenseCards.push({
      id: exp.id,
      title: exp.title,
      category: exp.category,
      amount: effectiveAmount,
      percentage: expPct,
      perHundred: expPerHundred,
      vendorName: exp.vendor_name || null,
      isRecurring: Boolean(exp.is_recurring),
    });
  });

  const operatingExpenses = totalDirectExpenses;
  const operatingExpensesPercentage = netRevenue > 0 ? Math.round((operatingExpenses / netRevenue) * 1000) / 10 : 0;

  // 6. TOTAL EXPENSES & PURE OWNER NET PROFIT
  let totalExpenses = foodCost + staffLaborCost + cleveropsCost + operatingExpenses;
  let netProfit = Math.round((netRevenue - totalExpenses) * 100) / 100;



  const totalExpensesPercentage = netRevenue > 0 ? Math.round((totalExpenses / netRevenue) * 1000) / 10 : 0;
  const netMarginPercentage = netRevenue > 0 ? Math.round((netProfit / netRevenue) * 1000) / 10 : 0;

  // 7. OUT OF ₹100 UNIT ECONOMICS BREAKDOWN ("100 me se kitne pese kaha gae")
  const perHundredFood = netRevenue > 0 ? Math.round((foodCost / netRevenue) * 1000) / 10 : 0;
  const perHundredStaff = netRevenue > 0 ? Math.round((staffLaborCost / netRevenue) * 1000) / 10 : 0;
  const perHundredCleverops = netRevenue > 0 ? Math.round((cleveropsCost / netRevenue) * 1000) / 10 : 0;
  const perHundredOperating = netRevenue > 0 ? Math.round((operatingExpenses / netRevenue) * 1000) / 10 : 0;
  const perHundredTotalExpenses = netRevenue > 0 ? Math.round((totalExpenses / netRevenue) * 1000) / 10 : 0;
  const perHundredProfit = netRevenue > 0 ? Math.round((netProfit / netRevenue) * 1000) / 10 : 0;

  const perHundredItems: { label: string; amount: number; perHundred: number; percentage: number }[] = [
    { label: 'Food Raw Material', amount: foodCost, perHundred: perHundredFood, percentage: foodCostPercentage },
    { label: 'Staff Payroll', amount: staffLaborCost, perHundred: perHundredStaff, percentage: staffLaborPercentage },
  ];

  expenseCards.forEach(ec => {
    perHundredItems.push({
      label: ec.title,
      amount: ec.amount,
      perHundred: ec.perHundred,
      percentage: ec.percentage,
    });
  });

  perHundredItems.push({
    label: 'CleverOps POS',
    amount: cleveropsCost,
    perHundred: perHundredCleverops,
    percentage: cleveropsCostPercentage,
  });

  const perHundredBreakdown = {
    foodCost: perHundredFood,
    staffLabor: perHundredStaff,
    cleverops: perHundredCleverops,
    operatingExpenses: perHundredOperating,
    totalExpenses: perHundredTotalExpenses,
    netProfit: perHundredProfit,
    items: perHundredItems,
  };

  // 8. HEALTH STATUS & BENCHMARKS
  let healthStatus: 'excellent' | 'good' | 'warning' | 'critical' = 'good';
  let healthMessage = 'Healthy margin above industry average.';

  if (netMarginPercentage >= 22) {
    healthStatus = 'excellent';
    healthMessage = 'Outstanding performance! High net profit margin.';
  } else if (netMarginPercentage >= 12) {
    healthStatus = 'good';
    healthMessage = 'Solid profitability. Costs are well managed.';
  } else if (netMarginPercentage >= 0) {
    healthStatus = 'warning';
    healthMessage = 'Slim margins. Look into high raw material or electricity/fuel costs.';
  } else {
    healthStatus = 'critical';
    healthMessage = 'Operating at a loss for this period. Total expenses exceed revenue.';
  }

  // Daily Break-Even Sales Estimation
  const fixedOverheads = (totalMonthlyLabor + (expensesByCategory.rent || 0) + (expensesByCategory.electricity || 0) + cleverops.monthlyRate) / 30;
  const foodCostRatio = netRevenue > 0 ? foodCost / netRevenue : 0.32;
  const dailyBreakEvenSales = Math.round(fixedOverheads / Math.max(0.2, (1 - foodCostRatio)));

  return {
    periodLabel: salesSummary.periodLabel || 'Selected Period',
    daysCount: effectiveDays,
    grossSales,
    discounts,
    refunds,
    netRevenue,
    cgstCollected,
    sgstCollected,
    totalGstCollected,
    cashCollectedWithGst,
    foodCost,
    foodCostPercentage,
    foodWastageCost: wastageTotal,
    foodPurchasesCost: purchasesTotal,
    staffLaborCost,
    staffLaborPercentage,
    activeStaffCount: staffProfiles.filter(s => s.is_active !== false).length,
    cleveropsCost,
    cleveropsCostPercentage,
    cleveropsPlanName: cleverops.planName,
    operatingExpenses,
    operatingExpensesPercentage,
    expensesByCategory,
    expensesList,
    expenseCards,
    perHundredBreakdown,
    totalExpenses,
    totalExpensesPercentage,
    netProfit,
    netMarginPercentage,
    healthStatus,
    healthMessage,
    dailyBreakEvenSales,
  };
}
