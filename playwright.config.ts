/**
 * SmartDine SaaS — Playwright E2E Configuration
 * Phase 7A.1 — Configuration & Setup
 * Validated: Phase 7A.1 Final Validation Pass
 *
 * Specification Reference: smartdine_playwright_spec.md
 * - Appendix A:   Playwright Configuration Specification
 * - Appendix F:   Reporting & Debugging (Spec RD-001, RD-008)
 * - Appendix H:   Browser Compatibility Matrix (BC-002 to BC-006)
 * - Appendix I:   Test Data Management (TDM-004 parallel rules)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * VALIDATION CHECKLIST (Phase 7A.1 Verification)
 *
 *  ✅ Check 1  — Edge: channel 'msedge' explicitly set (not just browserName)
 *  ✅ Check 2  — WebKit 26.5 installed; Desktop Safari project defined
 *  ✅ Check 3  — All mobile/tablet presets use official devices[] names
 *  ✅ Check 4  — globalSetup: dir creation + env validation + health check only
 *  ✅ Check 5  — 6 separate storageState files, one per role
 *  ✅ Check 6  — All 4 reporters: list + html + junit + json (simultaneous)
 *  ✅ Check 7  — forbidOnly: !!process.env.CI (added in this pass)
 *  ✅ Check 8  — fullyParallel + workers both explicitly set
 *  ✅ Check 9  — expect.timeout: 10_000 explicitly set
 *  ✅ Check 10 — npx playwright test --list: 6 tests, 0 warnings, 0 errors
 * ─────────────────────────────────────────────────────────────────────────
 */

import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// Auto-load .env.test into process.env
const envTestPath = path.resolve(process.cwd(), '.env.test');
if (fs.existsSync(envTestPath)) {
  const envContent = fs.readFileSync(envTestPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...vals] = trimmed.split('=');
      if (key && vals.length > 0) {
        const k = key.trim();
        if (!process.env[k]) {
          process.env[k] = vals.join('=').trim();
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Environment resolution
// ---------------------------------------------------------------------------
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Auth state storage paths
// Written by:  e2e/tests/auth.setup.ts  (runs as 'setup' project)
// Consumed by: all other browser projects (via storageState in each test)
//
// One file per role — NO shared auth state (Spec TDM-004)
// ---------------------------------------------------------------------------
export const STORAGE_STATE = {
  owner:      path.join('e2e', '.auth', 'owner.json'),       // role: owner
  waiter:     path.join('e2e', '.auth', 'waiter.json'),      // role: waiter
  kitchen:    path.join('e2e', '.auth', 'kitchen.json'),     // role: kitchen
  cashier:    path.join('e2e', '.auth', 'cashier.json'),     // role: cashier
  manager:    path.join('e2e', '.auth', 'manager.json'),     // role: manager
  superAdmin: path.join('e2e', '.auth', 'super-admin.json'), // role: super_admin
} as const;

// ---------------------------------------------------------------------------
// Playwright configuration
// ---------------------------------------------------------------------------
export default defineConfig({

  // ── Test discovery ─────────────────────────────────────────────────────────
  testDir:   './e2e/tests',
  testMatch: '**/*.spec.ts',

  // ── Parallel execution (Check 8) ──────────────────────────────────────────
  //
  // fullyParallel: true  → every individual test runs in its own worker, even
  //   within the same spec file. This maximises throughput for independent tests.
  //   Tests that MUST be serial are grouped in test.describe.serial() (Spec TDM-008).
  //
  // workers:
  //   CI=2   — conservative; avoids flakiness on resource-constrained runners.
  //   Local=4 — matches a typical 8-core dev machine (2 tests/core).
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,

  // ── Timeouts ──────────────────────────────────────────────────────────────
  timeout: 30_000,           // Maximum duration for a single test (ms)

  // Check 9 — expect timeout explicitly configured
  expect: {
    timeout: 10_000,         // Maximum wait per assertion / locator auto-wait (ms)
  },

  // ── CI safety (Check 7) ───────────────────────────────────────────────────
  //
  // forbidOnly: true in CI prevents accidentally committed test.only() calls
  // from silently skipping the rest of the suite in CI pipelines.
  forbidOnly: !!process.env.CI,

  // ── Retries (Spec RD-008) ─────────────────────────────────────────────────
  // CI=2 retries → up to 3 attempts total; trace captured on first retry.
  // Local=0      → fail fast during development.
  retries: process.env.CI ? 2 : 0,

  // ── Global lifecycle ──────────────────────────────────────────────────────
  //
  // Check 4 — globalSetup performs ONLY:
  //   1. Output directory creation (playwright-report/, e2e/.auth/, etc.)
  //   2. Environment variable validation (warns if Supabase keys missing)
  //   3. Dev server health check (HTTP GET → BASE_URL)
  //   4. Run metadata file initialisation
  //
  // It does NOT modify database data, create users, seed records, or delete records.
  // Database seeding is handled separately via: npm run db:seed:test
  globalSetup:    './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  // ── Reporters (Spec RD-001 — Check 6) ────────────────────────────────────
  //
  // All four reporters run simultaneously on every execution:
  //
  //   list                              → stdout (real-time per-test lines)
  //   html → playwright-report/         → interactive HTML with traces/screenshots
  //   junit → playwright-report/junit.xml  → CI/CD (GitHub Actions, Jenkins, Azure)
  //   json  → playwright-report/results.json → dashboards, programmatic parsing
  reporter: [
    ['list'],
    ['html',  { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile:   'playwright-report/junit.xml'      }],
    ['json',  { outputFile:   'playwright-report/results.json'   }],
  ],

  // ── Shared browser context defaults ───────────────────────────────────────
  use: {
    baseURL: BASE_URL,

    // ── Artifact capture (Spec RD-001) ──────────────────────────────────────
    // Screenshots and videos are captured automatically on failure.
    // Playwright Trace is captured on the first retry (not first run — avoids
    // storing traces for tests that pass first time, saving disk space).
    screenshot: 'only-on-failure',   // PNG saved to test-results/ on failure
    video:      'retain-on-failure', // WebM retained in test-results/ on failure
    trace:      'on-first-retry',    // .zip trace captured on retry #1

    // ── Spec AX-001: force light mode so VR snapshots are stable ─────────────
    colorScheme: 'light',

    // ── Action / navigation timeouts ────────────────────────────────────────
    actionTimeout:     15_000, // click, fill, hover, etc.
    navigationTimeout: 30_000, // page.goto, waitForURL, etc.
  },

  // ── Artifact output directory ──────────────────────────────────────────────
  //
  // NOTE: This MUST NOT be a subdirectory of the HTML reporter's outputFolder
  // ('playwright-report/') because the HTML reporter clears its folder before
  // each run, which would delete in-flight artifacts.
  //
  // Screenshots, videos, and traces land in test-results/{test-name}/ automatically.
  outputDir: 'test-results',

  // ── Browser projects ─────────────────────────────────────────────────────
  projects: [

    // ── SETUP PROJECT ────────────────────────────────────────────────────────
    //
    // Runs auth.setup.ts BEFORE all other projects.
    // Logs in as each of the 6 roles and saves storageState JSON files to
    // e2e/.auth/*.json (Check 5 — 6 separate files, no shared state).
    //
    // Uses Desktop Chrome (fastest, most stable for auth setup).
    {
      name:      'setup',
      testMatch: '**/auth.setup.ts',
      use:       { ...devices['Desktop Chrome'] },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // PRIMARY BROWSERS — Full P0 + P1
    // (Spec BC-006: Merge-to-main: Chrome + Firefox + Edge | PR: Chrome only)
    // ─────────────────────────────────────────────────────────────────────────

    // ── CHROMIUM (PRIMARY — all tests, all VR baselines, all a11y) ─────────
    //
    // Spec BC-002: Reference browser. All baselines established on Chromium.
    // Overrides viewport to 1920×1080 (wider than devices['Desktop Chrome'] default
    // of 1280×720) to match Spec Appendix D desktop target.
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      dependencies: ['setup'],
      // No grep filter — runs ALL tests (P0 + P1 + VR + a11y)
    },

    // ── FIREFOX (PRIMARY — P0 only during standard runs) ─────────────────
    //
    // Spec BC-004: acceptDownloads prevents the native file-save dialog
    // from blocking tests that trigger file downloads.
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport:        { width: 1920, height: 1080 },
        acceptDownloads: true, // BC-004: prevent file-dialog blocking
      },
      dependencies: ['setup'],
      grep: /@p0/, // Restrict to P0 on Firefox (full suite runs nightly)
    },

    // ── MICROSOFT EDGE (PRIMARY — P0 only) ────────────────────────────────
    //
    // Check 1 — Edge is identified by channel: 'msedge', NOT just browserName.
    //
    // devices['Desktop Edge'] sets the correct Chromium-family user-agent for
    // Edge, and channel: 'msedge' instructs Playwright to launch the real
    // installed Microsoft Edge binary (not Playwright's bundled Chromium).
    //
    // Spec BC-003 launch flags:
    //   --disable-translate             → prevents Edge translation banner overlaying UI
    //   --disable-features=msEdgePwdMgr → prevents Edge password-save banner on login
    {
      name: 'edge',
      use: {
        ...devices['Desktop Edge'],   // Edge-flavoured UA + defaults
        channel:  'msedge',           // ← REAL Edge binary (Check 1)
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          args: [
            '--disable-translate',
            '--disable-features=msEdgePasswordSaveManager',
          ],
        },
      },
      dependencies: ['setup'],
      grep: /@p0/,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // LAPTOP VIEWPORT — Chromium, responsive tests only
    // ─────────────────────────────────────────────────────────────────────────

    {
      name: 'chromium-laptop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 }, // Spec RM: Laptop viewport
      },
      dependencies: ['setup'],
      grep: /@responsive/,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // MOBILE DEVICES — Official Playwright device presets (Check 3)
    // All verified against devices[] catalogue (validate-devices.mjs output)
    // ─────────────────────────────────────────────────────────────────────────

    // Pixel 7: viewport=412×839, touch=yes, Android Chrome UA (Spec RM-001)
    {
      name: 'mobile-chrome-pixel7',
      use:  { ...devices['Pixel 7'] },
      dependencies: ['setup'],
      grep: /@mobile/,
    },

    // iPhone 15: viewport=393×659, touch=yes, iOS 17 Safari UA (Spec RM-001)
    {
      name: 'mobile-safari-iphone15',
      use:  { ...devices['iPhone 15'] },
      dependencies: ['setup'],
      grep: /@mobile/,
    },

    // iPhone SE: viewport=320×568, touch=yes — smallest supported (Spec RM-001)
    {
      name: 'mobile-iphone-se',
      use:  { ...devices['iPhone SE'] },
      dependencies: ['setup'],
      grep: /@mobile/,
    },

    // iPad gen 7: viewport=810×1080, touch=yes (Spec RM — KDS primary device)
    {
      name: 'tablet-ipad',
      use:  { ...devices['iPad (gen 7)'] },
      dependencies: ['setup'],
      grep: /@tablet/,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // WEBKIT — Validation tier (Check 2)
    //
    // WebKit 26.5 installed at:
    //   C:\Users\DELL\AppData\Local\ms-playwright\webkit-2336
    //
    // Spec BC-005: VALIDATION priority — failures are warnings in Phase 7,
    // escalated to release-blockers in Phase 8.
    // Restricted to @webkit-tagged tests (subset of P0 defined in Spec BC-005).
    // ─────────────────────────────────────────────────────────────────────────
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'], // WebKit engine + Safari UA
        viewport: { width: 1920, height: 1080 },
      },
      dependencies: ['setup'],
      grep: /@webkit/,
    },
  ],

  // ── Web server ────────────────────────────────────────────────────────────
  //
  // Playwright auto-starts `npm run dev` if the server is not already running.
  // In CI (reuseExistingServer: false), a fresh server is always started.
  // Locally (reuseExistingServer: true), an already-running dev server is reused.
  webServer: {
    command:             'npm run dev',
    url:                 BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout:             120_000,
    stdout:              'pipe',
    stderr:              'pipe',
  },
});
