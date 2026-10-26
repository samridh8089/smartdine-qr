const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim() || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(url, key);
const RESTAURANT_ID = '655080e7-2b99-4dd2-b0ed-0329beaad81d'; // The Bistro Cafe

async function seedExpensesAndVerify() {
  console.log('Seeding exact expenses for 2 Lakh Net Profit in October 2026...');

  // Target Math:
  // Net Revenue: ₹5,80,201.00
  // Food Cost (Purchases): ₹1,80,000.00
  // Staff Payroll (Attendo): ₹86,000.00
  // CleverOps Pro SaaS: ₹799.00
  // Remaining needed for exactly ₹2,00,000 Profit = ₹1,13,402.00
  const standardExpenses = [
    {
      id: 'exp_rent_oct26',
      restaurant_id: RESTAURANT_ID,
      title: 'Shop Rent & Property Lease',
      category: 'rent',
      amount: 65000,
      expense_date: '2026-10-01',
      payment_mode: 'bank_transfer',
      vendor_name: 'Metro City Properties',
      is_recurring: true,
      recurring_frequency: 'monthly',
      notes: 'October commercial rental invoice #MCP-982',
      created_at: '2026-10-01T10:00:00.000Z',
      updated_at: '2026-10-01T10:00:00.000Z',
    },
    {
      id: 'exp_elec_oct26',
      restaurant_id: RESTAURANT_ID,
      title: 'Commercial Electricity Bill',
      category: 'electricity',
      amount: 24500,
      expense_date: '2026-10-05',
      payment_mode: 'upi',
      vendor_name: 'State Electricity Board',
      is_recurring: true,
      recurring_frequency: 'monthly',
      notes: 'Power bill CA #88492019 HVAC & kitchen load',
      created_at: '2026-10-05T11:30:00.000Z',
      updated_at: '2026-10-05T11:30:00.000Z',
    },
    {
      id: 'exp_gas_oct26',
      restaurant_id: RESTAURANT_ID,
      title: 'Commercial LPG Gas Cylinders',
      category: 'gas_fuel',
      amount: 9400,
      expense_date: '2026-10-10',
      payment_mode: 'cash',
      vendor_name: 'Bharat Gas Agency',
      is_recurring: true,
      recurring_frequency: 'monthly',
      notes: '4x 19kg commercial cylinders refilled',
      created_at: '2026-10-10T14:15:00.000Z',
      updated_at: '2026-10-10T14:15:00.000Z',
    },
    {
      id: 'exp_maint_oct26',
      restaurant_id: RESTAURANT_ID,
      title: 'Kitchen & HVAC AMC Servicing',
      category: 'maintenance',
      amount: 6500,
      expense_date: '2026-10-14',
      payment_mode: 'upi',
      vendor_name: 'CoolTech HVAC Solutions',
      is_recurring: true,
      recurring_frequency: 'monthly',
      notes: 'Deep cleaning, duct servicing, espresso machine tune-up',
      created_at: '2026-10-14T16:00:00.000Z',
      updated_at: '2026-10-14T16:00:00.000Z',
    },
    {
      id: 'exp_mktg_oct26',
      restaurant_id: RESTAURANT_ID,
      title: 'Social Media & Local Ads',
      category: 'marketing',
      amount: 5000,
      expense_date: '2026-10-18',
      payment_mode: 'card',
      vendor_name: 'Meta Ads Manager',
      is_recurring: true,
      recurring_frequency: 'monthly',
      notes: 'Instagram & Facebook localized cafe reels campaign',
      created_at: '2026-10-18T18:00:00.000Z',
      updated_at: '2026-10-18T18:00:00.000Z',
    },
    {
      id: 'exp_pack_oct26',
      restaurant_id: RESTAURANT_ID,
      title: 'Eco-Friendly Takeaway Packaging',
      category: 'packaging',
      amount: 3002,
      expense_date: '2026-10-22',
      payment_mode: 'upi',
      vendor_name: 'EcoPack India Ltd',
      is_recurring: true,
      recurring_frequency: 'monthly',
      notes: 'Kraft paper bags, biodegradable meal trays, tamper stickers',
      created_at: '2026-10-22T12:00:00.000Z',
      updated_at: '2026-10-22T12:00:00.000Z',
    },
  ];

  const totalExp = standardExpenses.reduce((acc, e) => acc + e.amount, 0);
  console.log(`Prepared 6 operating expenses totaling ₹${totalExp}`);

  // Fetch current restaurant
  const { data: rest, error: fetchErr } = await supabase
    .from('restaurants')
    .select('id, name, subscription_plan, settings')
    .eq('id', RESTAURANT_ID)
    .single();

  if (fetchErr) {
    console.error('Fetch restaurant error:', fetchErr.message);
    return;
  }

  const currentSettings = rest.settings || {};
  const updatedSettings = {
    ...currentSettings,
    expenses: standardExpenses,
  };

  const { error: updateErr } = await supabase
    .from('restaurants')
    .update({ settings: updatedSettings })
    .eq('id', RESTAURANT_ID);

  if (updateErr) {
    console.error('Update restaurant settings error:', updateErr.message);
    return;
  }

  console.log('Successfully saved operating expenses to restaurant settings!');

  // Verify full calculations
  const netRevenue = 580201;
  const foodCost = 180000;
  const staffPayroll = 86000;
  const cleveropsPOS = 799;
  const operatingExpenses = totalExp;
  const totalExpenses = foodCost + staffPayroll + cleveropsPOS + operatingExpenses;
  const netProfit = netRevenue - totalExpenses;
  const margin = ((netProfit / netRevenue) * 100).toFixed(2);

  console.log('--- OCTOBER 2026 P&L AUDIT ---');
  console.log(`Net Revenue:       ₹${netRevenue.toLocaleString('en-IN')}`);
  console.log(`Food Cost:        -₹${foodCost.toLocaleString('en-IN')} (31.02%)`);
  console.log(`Staff Payroll:    -₹${staffPayroll.toLocaleString('en-IN')} (14.82%)`);
  console.log(`CleverOps POS:       -₹${cleveropsPOS.toLocaleString('en-IN')} (0.14%)`);
  console.log(`Operating Exp:   -₹${operatingExpenses.toLocaleString('en-IN')} (19.55%)`);
  console.log(`Total Expenses:   ₹${totalExpenses.toLocaleString('en-IN')}`);
  console.log(`---------------------------------`);
  console.log(`NET PROFIT:        ₹${netProfit.toLocaleString('en-IN')} (${margin}% Net Margin)`);
}

seedExpensesAndVerify();
