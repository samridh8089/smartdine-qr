import { supabase } from './supabase';

async function deepAuditSubscription() {
  console.log('==================================================');
  console.log('DEEP PRODUCTION SUBSCRIPTION AUDIT');
  console.log('==================================================\n');

  // 1. Inspect ALL columns of restaurants table
  const { data: rests, error } = await supabase.from('restaurants').select('*');
  if (error || !rests) {
    console.error('Failed to fetch restaurants:', error);
    return;
  }

  console.log(`Total Restaurants in Production DB: ${rests.length}`);
  if (rests.length > 0) {
    console.log('Restaurant Column Keys:', Object.keys(rests[0]));
  }

  console.log('\n--- RESTAURANT SUBSCRIPTION DATA AUDIT ---');
  rests.forEach(r => {
    console.log(`\nRestaurant: "${r.name}" (ID: ${r.id})`);
    console.log(`  subscription_plan:   "${r.subscription_plan}"`);
    console.log(`  subscription_status: "${r.subscription_status}"`);
    console.log(`  trial_ends_at:       "${r.trial_ends_at}"`);
    console.log(`  billing_interval:    "${r.billing_interval}"`);
    console.log(`  created_at:          "${r.created_at}"`);
    console.log(`  updated_at:          "${r.updated_at}"`);
    if (r.settings) {
      console.log(`  settings subscription fields:`, {
        subscription_expires_at: r.settings.subscription_expires_at,
        license_expires_at: r.settings.license_expires_at,
        trial_ends_at: r.settings.trial_ends_at,
        status: r.settings.status
      });
    }
  });

  // 2. Search for any other tables in DB related to subscriptions or billing or licenses
  console.log('\n--- CHECKING OTHER TABLES ---');
  try {
    const { data: auditLogs } = await supabase.from('audit_logs').select('*').limit(5);
    console.log(`Audit Logs Sample Count: ${auditLogs?.length || 0}`);
  } catch (e) {}

  try {
    const { data: userSubs } = await supabase.from('subscriptions' as any).select('*').limit(5);
    console.log(`Subscriptions table exists? ${Boolean(userSubs)}`);
  } catch (e) {}
}

deepAuditSubscription().catch(err => console.error(err));
