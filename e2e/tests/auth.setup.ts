/**
 * SmartDine — Authentication Setup Project
 * Phase 7A.1
 *
 * This file is a Playwright test that runs as the 'setup' project BEFORE
 * all other browser projects. It logs in as each role, saves the authenticated
 * browser storage state to e2e/.auth/*.json, and these states are then
 * reused by all other tests — eliminating repeated login flows.
 *
 * Spec Reference: Appendix I (TDM-002) — Seed Users
 */

import { test as setup, expect } from '@playwright/test';
import * as path from 'path';

// ── Storage state paths (mirrored from playwright.config.ts) ─────────────
const AUTH_DIR = path.join('e2e', '.auth');

const STORAGE_STATE = {
  owner:      path.join(AUTH_DIR, 'owner.json'),
  waiter:     path.join(AUTH_DIR, 'waiter.json'),
  kitchen:    path.join(AUTH_DIR, 'kitchen.json'),
  cashier:    path.join(AUTH_DIR, 'cashier.json'),
  manager:    path.join(AUTH_DIR, 'manager.json'),
  superAdmin: path.join(AUTH_DIR, 'super-admin.json'),
};

// ── Seed credentials (Spec TDM-002) ─────────────────────────────────────
const CREDENTIALS = {
  owner:      { email: 'owner@test.com',       password: 'TestOwner123!'    },
  waiter:     { email: 'waiter@test.com',      password: 'TestWaiter123!'   },
  kitchen:    { email: 'kitchen@test.com',     password: 'TestKitchen123!'  },
  cashier:    { email: 'cashier@test.com',     password: 'TestCashier123!'  },
  manager:    { email: 'manager@test.com',     password: 'TestManager123!'  },
  superAdmin: { email: 'superadmin@test.com',  password: 'SuperAdmin123!'   },
};

// ── Helper: performs login and saves storage state ────────────────────────
async function loginAndSave(
  page: import('@playwright/test').Page,
  credentials: { email: string; password: string },
  storageStatePath: string,
  roleName: string
) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill credentials
  await page.getByLabel(/email/i).fill(credentials.email);
  await page.locator('input[type="password"]').fill(credentials.password);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();

  // Wait for redirect away from /login — confirms successful auth
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 30_000,
  });

  // Save auth state
  await page.context().storageState({ path: storageStatePath });
  console.log(`✅ Auth state saved for role: ${roleName}`);
}

// ─────────────────────────────────────────────────────────────────────────
// Setup tests — one per role
// Enforce serial execution so Next.js dev server compiles routes sequentially
setup.describe.configure({ mode: 'serial' });

setup('authenticate as owner', async ({ page }) => {
  await loginAndSave(page, CREDENTIALS.owner, STORAGE_STATE.owner, 'owner');
});

setup('authenticate as waiter', async ({ page }) => {
  await loginAndSave(page, CREDENTIALS.waiter, STORAGE_STATE.waiter, 'waiter');
});

setup('authenticate as kitchen', async ({ page }) => {
  await loginAndSave(page, CREDENTIALS.kitchen, STORAGE_STATE.kitchen, 'kitchen');
});

setup('authenticate as cashier', async ({ page }) => {
  await loginAndSave(page, CREDENTIALS.cashier, STORAGE_STATE.cashier, 'cashier');
});

setup('authenticate as manager', async ({ page }) => {
  await loginAndSave(page, CREDENTIALS.manager, STORAGE_STATE.manager, 'manager');
});

setup('authenticate as super admin', async ({ page }) => {
  await loginAndSave(
    page,
    CREDENTIALS.superAdmin,
    STORAGE_STATE.superAdmin,
    'super-admin'
  );
});
