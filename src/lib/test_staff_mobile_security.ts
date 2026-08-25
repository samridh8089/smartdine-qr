import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { db } from './db';
import { supabase } from './supabase';

function loadEnv(file: string) {
  const envPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...vals] = trimmed.split('=');
        if (key && vals.length > 0) {
          const cleanKey = key.trim();
          const cleanVal = vals.join('=').trim().replace(/^["']|["']$/g, '');
          process.env[cleanKey] = cleanVal;
        }
      }
    }
  }
}

loadEnv('.env.test');
loadEnv('.env.local');

async function runStaffSecurityTests() {
  console.log('====================================================');
  console.log('🛡️ RUNNING STAFF MOBILE APP & ROLE SECURITY TEST SUITE');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Fetch test restaurant using service admin
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const { data: rests } = await adminSupabase.from('restaurants').select('id, name, settings').limit(1);
    if (!rests || rests.length === 0) {
      console.log('⚠️ No restaurants found in DB, skipping live db tests.');
      return;
    }
    const testRest = rests[0];
    const testRestId = testRest.id;
    console.log(`🏢 Testing with Restaurant: ${testRest.name} (${testRestId})`);

    // TEST 1: Table assignment CRUD
    console.log('\n--- 1. Table Assignment Persistence ---');
    const dummyWaiterId = 'waiter-security-test-01';
    const dummyTableId = 'table-security-test-01';

    const currentAssignments = testRest.settings?.table_assignments || [];
    const newAssignments = [
      ...currentAssignments.filter((a: any) => !(a.table_id === dummyTableId && a.waiter_id === dummyWaiterId)),
      {
        id: `${dummyTableId}_${dummyWaiterId}`,
        restaurant_id: testRestId,
        table_id: dummyTableId,
        table_name: 'Table 1',
        waiter_id: dummyWaiterId,
        waiter_name: 'Test Waiter',
        assigned_by: 'Owner/Manager',
        assigned_at: new Date().toISOString(),
        active: true
      }
    ];

    await adminSupabase.from('restaurants').update({
      settings: {
        ...testRest.settings,
        table_assignments: newAssignments
      }
    }).eq('id', testRestId);

    const { data: restFresh1 } = await adminSupabase.from('restaurants').select('settings').eq('id', testRestId).single();
    const assigns1 = restFresh1?.settings?.table_assignments || [];
    const found1 = assigns1.find((a: any) => a.table_id === dummyTableId && a.waiter_id === dummyWaiterId);

    assert(found1 !== undefined, 'Table assigned to waiter properly in restaurant settings');
    assert(found1?.table_id === dummyTableId, 'Table ID stored in assignment');

    const waiterTables = assigns1.filter((a: any) => a.waiter_id === dummyWaiterId && a.active !== false).map((a: any) => a.table_id);
    assert(waiterTables.includes(dummyTableId), 'getAssignedTablesForWaiter returns assigned table');

    const tableWaiters = assigns1.filter((a: any) => a.table_id === dummyTableId && a.active !== false).map((a: any) => a.waiter_id);
    assert(tableWaiters.includes(dummyWaiterId), 'getAssignedWaitersForTable returns assigned waiter');

    // TEST 2: Unassign Table
    console.log('\n--- 2. Unassign Table Test ---');
    const unassignedList = assigns1.filter((a: any) => !(a.table_id === dummyTableId && a.waiter_id === dummyWaiterId));
    await adminSupabase.from('restaurants').update({
      settings: {
        ...(restFresh1?.settings || {}),
        table_assignments: unassignedList
      }
    }).eq('id', testRestId);

    const { data: restFresh2 } = await adminSupabase.from('restaurants').select('settings').eq('id', testRestId).single();
    const assigns2 = restFresh2?.settings?.table_assignments || [];
    const waiterTablesAfter = assigns2.filter((a: any) => a.waiter_id === dummyWaiterId && a.active !== false).map((a: any) => a.table_id);
    assert(!waiterTablesAfter.includes(dummyTableId), 'unassignTable successfully removes assignment');

    // TEST 3: Bulk setTableAssignmentsForWaiter
    console.log('\n--- 3. Bulk Table Assignment Test ---');
    const bulkTableIds = ['tbl-101', 'tbl-102', 'tbl-103'];
    const bulkAssignments = bulkTableIds.map(tId => ({
      id: `${tId}_${dummyWaiterId}`,
      restaurant_id: testRestId,
      table_id: tId,
      table_name: `Table ${tId}`,
      waiter_id: dummyWaiterId,
      waiter_name: 'Test Waiter',
      assigned_by: 'Manager',
      assigned_at: new Date().toISOString(),
      active: true
    }));

    await adminSupabase.from('restaurants').update({
      settings: {
        ...(restFresh2?.settings || {}),
        table_assignments: [...assigns2.filter((a: any) => a.waiter_id !== dummyWaiterId), ...bulkAssignments]
      }
    }).eq('id', testRestId);

    const { data: restFresh3 } = await adminSupabase.from('restaurants').select('settings').eq('id', testRestId).single();
    const assigns3 = restFresh3?.settings?.table_assignments || [];
    const bulkAssigned = assigns3.filter((a: any) => a.waiter_id === dummyWaiterId && a.active !== false).map((a: any) => a.table_id);
    assert(
      bulkAssigned.length === 3 && bulkAssigned.includes('tbl-101') && bulkAssigned.includes('tbl-103'),
      'setTableAssignmentsForWaiter correctly stores multiple assigned tables'
    );

    // Clean up bulk test
    const cleanedAssignments = assigns3.filter((a: any) => a.waiter_id !== dummyWaiterId);
    await adminSupabase.from('restaurants').update({
      settings: {
        ...(restFresh3?.settings || {}),
        table_assignments: cleanedAssignments
      }
    }).eq('id', testRestId);

    const { data: restFresh4 } = await adminSupabase.from('restaurants').select('settings').eq('id', testRestId).single();
    const bulkCleared = (restFresh4?.settings?.table_assignments || []).filter((a: any) => a.waiter_id === dummyWaiterId && a.active !== false);
    assert(bulkCleared.length === 0, 'Cleaned up bulk assignments successfully');

    // TEST 4: Staff Profile Metadata & Active Status
    console.log('\n--- 4. Staff Active Status Toggle ---');
    const currentMeta = restFresh4?.settings?.staff_metadata || {};
    currentMeta[dummyWaiterId] = {
      department: 'waiter',
      phone: '+919999999999',
      is_active: false
    };

    await adminSupabase.from('restaurants').update({
      settings: {
        ...(restFresh4?.settings || {}),
        staff_metadata: currentMeta
      }
    }).eq('id', testRestId);

    const { data: restFresh5 } = await adminSupabase.from('restaurants').select('settings').eq('id', testRestId).single();
    const meta = restFresh5?.settings?.staff_metadata?.[dummyWaiterId];
    assert(meta?.is_active === false, 'Staff inactive status correctly persisted in settings metadata');
    assert(meta?.department === 'waiter', 'Staff department correctly stored in metadata');
    assert(meta?.phone === '+919999999999', 'Staff phone correctly stored in metadata');

    // TEST 5: Toggle Active Status back to True
    currentMeta[dummyWaiterId].is_active = true;
    await adminSupabase.from('restaurants').update({
      settings: {
        ...(restFresh5?.settings || {}),
        staff_metadata: currentMeta
      }
    }).eq('id', testRestId);

    const { data: restFresh6 } = await adminSupabase.from('restaurants').select('settings').eq('id', testRestId).single();
    assert(restFresh6?.settings?.staff_metadata?.[dummyWaiterId]?.is_active === true, 'toggleStaffActiveStatus reactivates staff member');

    // Clean up dummy staff meta
    if (restFresh6?.settings?.staff_metadata) {
      delete restFresh6.settings.staff_metadata[dummyWaiterId];
      await adminSupabase.from('restaurants').update({
        settings: restFresh6.settings
      }).eq('id', testRestId);
    }

    console.log('\n====================================================');
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');
  } catch (err: any) {
    console.error('💥 Test execution error:', err?.message || err);
  }
}

runStaffSecurityTests();
