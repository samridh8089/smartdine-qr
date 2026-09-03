import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY missing!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const ALL_CANDIDATE_TABLES = [
  'inventory_reservations',
  'prepared_food_dispositions',
  'inventory_transactions',
  'inventory_purchase_items',
  'inventory_purchases',
  'inventory_recipe_ingredients',
  'inventory_recipes',
  'inventory_alerts',
  'inventory_waste',
  'inventory_items',
  'inventory_categories',
  'table_merge_session_members',
  'table_merge_members',
  'table_merge_sessions',
  'order_items',
  'order_batches',
  'orders',
  'table_merge_groups',
  'customer_requests',
  'audit_logs',
  'otp_sessions',
  'menu_item_variants',
  'menu_items',
  'categories',
  'tables',
  'profiles',
  'restaurants'
];

// Potential tables mentioned that might exist
const OPTIONAL_TABLES = [
  'staff',
  'menu_categories',
  'dining_tables',
  'order_discounts',
  'bills',
  'notifications',
  'table_assignments',
  'offers',
  'billing_transactions',
  'ai_usage',
  'ai_usage_logs',
  'activity_logs',
  'idempotency_keys'
];

async function getExistingTables() {
  const existing = [];
  for (const t of [...ALL_CANDIDATE_TABLES, ...OPTIONAL_TABLES]) {
    const { error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (!error) {
      if (!existing.includes(t)) existing.push(t);
    }
  }
  return existing;
}

async function getTableRowCount(table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) return null;
  return count;
}

async function getAllTableRows(table) {
  const { data, error } = await supabase.from(table).select('*');
  if (error) return [];
  return data || [];
}

async function runReset() {
  console.log('=====================================================');
  console.log('STARTING PRODUCTION RESET PIPELINE');
  console.log('=====================================================\n');

  // ─────────────────────────────────────────────────────────────
  // STEP 1: AUDIT & BACKUP
  // ─────────────────────────────────────────────────────────────
  console.log('>>> STEP 1: AUDITING BEFORE COUNTS & CREATING BACKUP...');
  const existingTables = await getExistingTables();
  console.log(`Detected ${existingTables.length} accessible tables in public schema.`);

  const backupData = {
    timestamp: new Date().toISOString(),
    authUsers: [],
    tables: {}
  };

  const beforeCounts = {};

  // 1.1 List Auth Users
  const { data: authData, error: authListErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authListErr) {
    console.error('Error fetching auth users:', authListErr);
    process.exit(1);
  }
  const usersBefore = authData.users || [];
  backupData.authUsers = usersBefore;
  console.log(`Auth users count before reset: ${usersBefore.length}`);
  usersBefore.forEach(u => console.log(`  - ${u.email} (${u.id})`));

  // 1.2 Export data and record row counts
  for (const table of existingTables) {
    const count = await getTableRowCount(table);
    beforeCounts[table] = count;
    console.log(`  Table '${table}': ${count} rows`);
    const rows = await getAllTableRows(table);
    backupData.tables[table] = rows;
  }

  // Write backup file to scratch
  const backupDir = path.resolve(process.cwd(), 'scratch');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, 'production_backup_pre_reset.json');
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`\n[SUCCESS] Pre-reset backup saved to: ${backupPath} (${(fs.statSync(backupPath).size / 1024).toFixed(1)} KB)\n`);

  // ─────────────────────────────────────────────────────────────
  // STEP 2: DELETE SUPABASE AUTH USERS
  // ─────────────────────────────────────────────────────────────
  console.log('>>> STEP 2: PERMANENTLY DELETING SUPABASE AUTH USERS...');
  let usersDeleted = 0;
  for (const user of usersBefore) {
    console.log(`Deleting auth user: ${user.email} (ID: ${user.id})...`);
    const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
    if (delErr) {
      console.error(`  Failed to delete auth user ${user.email}:`, delErr.message);
    } else {
      console.log(`  Deleted auth user ${user.email} successfully.`);
      usersDeleted++;
    }
  }

  // Verify auth users count is now 0
  const { data: authCheckData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const usersAfter = authCheckData?.users?.length || 0;
  console.log(`\nAuth Users after deletion: ${usersAfter} (Deleted ${usersDeleted}/${usersBefore.length})\n`);

  // ─────────────────────────────────────────────────────────────
  // STEP 3: DELETE RESTAURANT DATA IN DEPENDENCY-SAFE ORDER
  // ─────────────────────────────────────────────────────────────
  console.log('>>> STEP 3: PERMANENTLY DELETING RESTAURANT DATA (DEPENDENCY-SAFE ORDER)...');

  // Pre-step: Break circular FK references if present
  console.log('3.0 Breaking any circular FK references...');
  try {
    if (existingTables.includes('orders')) {
      await supabase.from('orders').update({ merge_group_id: null, merge_session_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
    }
    if (existingTables.includes('table_merge_groups')) {
      await supabase.from('table_merge_groups').update({ active_session_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
    }
    if (existingTables.includes('profiles')) {
      await supabase.from('profiles').update({ restaurant_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
    }
    if (existingTables.includes('restaurants')) {
      await supabase.from('restaurants').update({ owner_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
    }
  } catch (e) {
    console.warn('Circular reference unlinking note:', e.message);
  }

  // Deletion sequence
  const DELETION_ORDER = [
    // Inventory
    'inventory_reservations',
    'prepared_food_dispositions',
    'inventory_transactions',
    'inventory_purchase_items',
    'inventory_purchases',
    'inventory_recipe_ingredients',
    'inventory_recipes',
    'inventory_alerts',
    'inventory_waste',
    'inventory_items',
    'inventory_categories',
    // Table merges
    'table_merge_session_members',
    'table_merge_members',
    'table_merge_sessions',
    // Orders
    'order_items',
    'order_batches',
    'order_discounts',
    'orders',
    'table_merge_groups',
    // Operations & Logs
    'customer_requests',
    'audit_logs',
    'activity_logs',
    'otp_sessions',
    'table_assignments',
    'bills',
    'notifications',
    'offers',
    'billing_transactions',
    'ai_usage_logs',
    'ai_usage',
    // Menu & Dining
    'menu_item_variants',
    'menu_items',
    'categories',
    'menu_categories',
    'dining_tables',
    'tables',
    // Profiles & Staff
    'staff',
    'profiles',
    // Restaurants
    'restaurants'
  ];

  for (const table of DELETION_ORDER) {
    if (!existingTables.includes(table)) continue;
    console.log(`Clearing table '${table}'...`);

    // In PostgREST / Supabase JS, delete requires a filter
    // We filter by id is not null or id != empty or created_at > 1970
    // Try id neq dummy uuid first, fallback to neq on primary key
    let delRes = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delRes.error) {
      // Table might not have UUID 'id' (e.g. otp_sessions has TEXT id)
      delRes = await supabase.from(table).delete().gte('created_at', '1970-01-01');
    }
    if (delRes.error) {
      // Try with gt empty string on id
      delRes = await supabase.from(table).delete().gt('id', '');
    }
    if (delRes.error) {
      console.error(`  Error deleting rows from '${table}':`, delRes.error.message);
    } else {
      console.log(`  Table '${table}' cleared.`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // STEP 4: STORAGE CLEANUP
  // ─────────────────────────────────────────────────────────────
  console.log('\n>>> STEP 4: STORAGE CLEANUP (smartdine-images)...');
  let storageCleaned = false;
  try {
    const { data: rootItems, error: listErr } = await supabase.storage.from('smartdine-images').list();
    if (listErr) {
      console.error('Error listing storage items:', listErr.message);
    } else if (rootItems && rootItems.length > 0) {
      console.log(`Found ${rootItems.length} items/folders in 'smartdine-images' bucket:`);
      for (const item of rootItems) {
        console.log(`  Processing item: ${item.name}`);
        // List subitems if it is a directory
        const { data: subFiles } = await supabase.storage.from('smartdine-images').list(item.name);
        if (subFiles && subFiles.length > 0) {
          const filePaths = subFiles.map(f => `${item.name}/${f.name}`);
          console.log(`    Deleting ${filePaths.length} files inside ${item.name}...`);
          const { error: remErr } = await supabase.storage.from('smartdine-images').remove(filePaths);
          if (remErr) console.error('    Error removing subfiles:', remErr.message);
        }
        // Remove folder / file itself
        await supabase.storage.from('smartdine-images').remove([item.name]);
      }
      storageCleaned = true;
      console.log('Storage cleanup completed successfully.');
    } else {
      console.log('Bucket smartdine-images is already empty.');
      storageCleaned = true;
    }
  } catch (stErr) {
    console.error('Storage cleanup notice:', stErr.message);
  }

  // ─────────────────────────────────────────────────────────────
  // STEP 5: VERIFICATION OF FRESH STATE
  // ─────────────────────────────────────────────────────────────
  console.log('\n>>> STEP 5: VERIFICATION OF FRESH STATE...');
  const afterCounts = {};
  let allCleanedToZero = true;

  for (const table of existingTables) {
    const count = await getTableRowCount(table);
    afterCounts[table] = count;
    console.log(`  Table '${table}': Before=${beforeCounts[table]} -> After=${count}`);
    if (count !== 0) {
      allCleanedToZero = false;
    }
  }

  // Verify pricing_plans is preserved
  const { data: plansData, count: plansCount } = await supabase.from('pricing_plans').select('*', { count: 'exact' });
  const pricingPlansPreserved = plansCount === 4;
  console.log(`\npricing_plans status: Count=${plansCount} (${plansData?.map(p => p.id).join(', ')}) - Preserved: ${pricingPlansPreserved}`);

  // Summary object
  const report = {
    backupCreated: true,
    backupFilePath: backupPath,
    authUsersDeleted: `${usersDeleted}/${usersBefore.length}`,
    authUsersAfter: usersAfter,
    tablesCleaned: `${Object.values(afterCounts).filter(c => c === 0).length}/${existingTables.length}`,
    allTablesZero: allCleanedToZero,
    storageCleaned,
    pricingPlansPreserved,
    beforeCounts,
    afterCounts
  };

  const reportPath = path.join(backupDir, 'reset_execution_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Execution report saved to: ${reportPath}`);

  return report;
}

runReset()
  .then(report => {
    console.log('\n=====================================================');
    console.log('RESET PIPELINE FINISHED SUCCESSFULLY');
    console.log('=====================================================');
  })
  .catch(err => {
    console.error('FATAL RESET PIPELINE ERROR:', err);
    process.exit(1);
  });
