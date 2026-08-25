/**
 * SmartDine — Global Teardown
 * Phase 7A.1
 *
 * Runs ONCE after the entire test suite completes.
 * Responsibilities:
 *   1. Log suite completion summary.
 *   2. Run orphaned ephemeral data cleanup (failsafe).
 *   3. Write final timing metadata.
 */

import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalTeardown(_config: FullConfig) {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║      SmartDine E2E — Global Teardown Starting        ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ── 1. Write teardown timestamp to run metadata ───────────────────────
  const metaPath = path.join(process.cwd(), 'playwright-report', 'run-meta.json');
  if (fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    meta.completedAt = new Date().toISOString();
    meta.durationMs  = Date.now() - new Date(meta.runAt).getTime();
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    console.log(`✅ Run metadata updated: ${metaPath}`);
  }

  // ── 2. Orphaned ephemeral data cleanup (failsafe) ─────────────────────
  // If Supabase env vars are available, attempt to purge any QA-EPHEMERAL-
  // records older than 1 hour that were not cleaned up by afterEach hooks.
  // This is a belt-and-suspenders safeguard — individual tests are responsible
  // for their own cleanup via afterEach.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    console.log('🧹 Running orphaned ephemeral data cleanup...');
    try {
      // Dynamic import to avoid crashing if package not available
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1_000).toISOString();

      // Cleanup in dependency order (children before parents)
      const cleanupSteps = [
        { table: 'order_items',        matchCol: 'special_instructions', matchVal: 'QA-EPHEMERAL-%' },
        { table: 'orders',             matchCol: 'notes',                matchVal: 'QA-EPHEMERAL-%' },
        { table: 'customer_requests',  matchCol: 'notes',                matchVal: 'QA-EPHEMERAL-%' },
        { table: 'menu_items',         matchCol: 'name',                 matchVal: 'QA-EPHEMERAL-%' },
        { table: 'tables',             matchCol: 'name',                 matchVal: 'QA-EPHEMERAL-%' },
      ];

      for (const step of cleanupSteps) {
        const { error, count } = await supabase
          .from(step.table)
          .delete({ count: 'exact' })
          .like(step.matchCol, step.matchVal)
          .lt('created_at', oneHourAgo);

        if (error) {
          console.warn(`  ⚠️  Cleanup failed for ${step.table}: ${error.message}`);
        } else if (count && count > 0) {
          console.log(`  🗑️  Cleaned ${count} orphaned records from ${step.table}`);
        }
      }

      console.log('✅ Orphaned cleanup complete');
    } catch (err) {
      // Cleanup failure must never mask test results
      console.warn(`  ⚠️  Teardown cleanup error (non-blocking): ${err}`);
    }
  } else {
    console.log(
      'ℹ️  Skipping orphaned cleanup: SUPABASE_SERVICE_ROLE_KEY not set'
    );
  }

  console.log('\n✅ Global teardown complete\n');
}

export default globalTeardown;
