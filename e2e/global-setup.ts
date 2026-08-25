/**
 * SmartDine — Global Setup
 * Phase 7A.1
 *
 * Runs ONCE before the entire test suite.
 * Responsibilities:
 *   1. Verify the dev server is reachable.
 *   2. Verify Supabase env vars are present.
 *   3. Log the test environment summary.
 *
 * NOTE: Authentication state (auth.setup.ts) runs as a dedicated Playwright
 * project and is handled separately so Playwright can parallelize it
 * efficiently per browser project.
 */

import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000';

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║       SmartDine E2E — Global Setup Starting          ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ── 1. Ensure auth output directory exists ─────────────────────────────
  const authDir = path.join(process.cwd(), 'e2e', '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // ── 2. Ensure report directories exist ────────────────────────────────
  const reportDirs = [
    'playwright-report',
    'playwright-report/screenshots',
    'playwright-report/videos',
    'playwright-report/traces',
    'playwright-report/logs',
    'playwright-report/accessibility',
    'playwright-report/artifacts',
  ];
  for (const dir of reportDirs) {
    fs.mkdirSync(path.join(process.cwd(), dir), { recursive: true });
  }

  // ── 3. Verify environment variables ────────────────────────────────────
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  if (missingVars.length > 0) {
    console.warn('\n⚠️  WARNING: Missing Supabase environment variables:');
    missingVars.forEach((v) => console.warn(`   • ${v}`));
    console.warn(
      '   Tests requiring Supabase will fail. Add these to .env.test\n'
    );
  } else {
    console.log('✅ Supabase environment variables: OK');
  }

  // ── 4. Smoke-check the dev server ────────────────────────────────────
  console.log(`🔗 Verifying dev server at: ${baseURL}`);
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    const response = await page.goto(baseURL, { timeout: 30_000 });
    if (!response || !response.ok()) {
      throw new Error(
        `Dev server responded with HTTP ${response?.status() ?? 'no response'}`
      );
    }
    console.log(`✅ Dev server reachable: ${baseURL} (HTTP ${response.status()})`);
  } catch (err) {
    console.error(`\n❌ Dev server unreachable at ${baseURL}`);
    console.error('   Start the server with: npm run dev');
    throw err;
  } finally {
    await browser.close();
  }

  // ── 5. Write run metadata ────────────────────────────────────────────
  const meta = {
    runAt:   new Date().toISOString(),
    baseURL,
    nodeVersion: process.version,
    ci:      !!process.env.CI,
  };
  fs.writeFileSync(
    path.join(process.cwd(), 'playwright-report', 'run-meta.json'),
    JSON.stringify(meta, null, 2)
  );

  console.log('\n✅ Global setup complete\n');
}

export default globalSetup;
