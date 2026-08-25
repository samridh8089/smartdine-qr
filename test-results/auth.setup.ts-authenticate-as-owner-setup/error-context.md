# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.setup.ts >> authenticate as owner
- Location: e2e\tests\auth.setup.ts:68:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[type="password"]')
    - waiting for "http://localhost:3000/login" navigation to finish...
    - navigated to "http://localhost:3000/login"

```

# Page snapshot

```yaml
- generic [ref=f14e3]:
  - generic [ref=f14e4]:
    - heading "Sign in to SmartDine QR" [level=2] [ref=f14e12]
    - paragraph [ref=f14e13]:
      - text: Or
      - link "create a new restaurant account" [ref=f14e14] [cursor=pointer]:
        - /url: /signup
  - generic [ref=f14e17]:
    - generic [ref=f14e18]:
      - generic [ref=f14e19]: Email address
      - textbox "Email address" [ref=f14e20]:
        - /placeholder: you@example.com
    - generic [ref=f14e21]:
      - generic [ref=f14e22]:
        - generic [ref=f14e23]: Password
        - link "Forgot password?" [ref=f14e24] [cursor=pointer]:
          - /url: /forgot-password
      - textbox "••••••••" [ref=f14e26]
    - button "Sign In" [ref=f14e27]
```

# Test source

```ts
  1  | /**
  2  |  * SmartDine — Authentication Setup Project
  3  |  * Phase 7A.1
  4  |  *
  5  |  * This file is a Playwright test that runs as the 'setup' project BEFORE
  6  |  * all other browser projects. It logs in as each role, saves the authenticated
  7  |  * browser storage state to e2e/.auth/*.json, and these states are then
  8  |  * reused by all other tests — eliminating repeated login flows.
  9  |  *
  10 |  * Spec Reference: Appendix I (TDM-002) — Seed Users
  11 |  */
  12 | 
  13 | import { test as setup, expect } from '@playwright/test';
  14 | import * as path from 'path';
  15 | 
  16 | // ── Storage state paths (mirrored from playwright.config.ts) ─────────────
  17 | const AUTH_DIR = path.join('e2e', '.auth');
  18 | 
  19 | const STORAGE_STATE = {
  20 |   owner:      path.join(AUTH_DIR, 'owner.json'),
  21 |   waiter:     path.join(AUTH_DIR, 'waiter.json'),
  22 |   kitchen:    path.join(AUTH_DIR, 'kitchen.json'),
  23 |   cashier:    path.join(AUTH_DIR, 'cashier.json'),
  24 |   manager:    path.join(AUTH_DIR, 'manager.json'),
  25 |   superAdmin: path.join(AUTH_DIR, 'super-admin.json'),
  26 | };
  27 | 
  28 | // ── Seed credentials (Spec TDM-002) ─────────────────────────────────────
  29 | const CREDENTIALS = {
  30 |   owner:      { email: 'owner@test.com',       password: 'TestOwner123!'    },
  31 |   waiter:     { email: 'waiter@test.com',      password: 'TestWaiter123!'   },
  32 |   kitchen:    { email: 'kitchen@test.com',     password: 'TestKitchen123!'  },
  33 |   cashier:    { email: 'cashier@test.com',     password: 'TestCashier123!'  },
  34 |   manager:    { email: 'manager@test.com',     password: 'TestManager123!'  },
  35 |   superAdmin: { email: 'superadmin@test.com',  password: 'SuperAdmin123!'   },
  36 | };
  37 | 
  38 | // ── Helper: performs login and saves storage state ────────────────────────
  39 | async function loginAndSave(
  40 |   page: import('@playwright/test').Page,
  41 |   credentials: { email: string; password: string },
  42 |   storageStatePath: string,
  43 |   roleName: string
  44 | ) {
  45 |   await page.goto('/login');
  46 |   await page.waitForLoadState('networkidle');
  47 | 
  48 |   // Fill credentials
  49 |   await page.getByLabel(/email/i).fill(credentials.email);
> 50 |   await page.locator('input[type="password"]').fill(credentials.password);
     |                                                ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  51 |   await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  52 | 
  53 |   // Wait for redirect away from /login — confirms successful auth
  54 |   await page.waitForURL((url) => !url.pathname.includes('/login'), {
  55 |     timeout: 30_000,
  56 |   });
  57 | 
  58 |   // Save auth state
  59 |   await page.context().storageState({ path: storageStatePath });
  60 |   console.log(`✅ Auth state saved for role: ${roleName}`);
  61 | }
  62 | 
  63 | // ─────────────────────────────────────────────────────────────────────────
  64 | // Setup tests — one per role
  65 | // Enforce serial execution so Next.js dev server compiles routes sequentially
  66 | setup.describe.configure({ mode: 'serial' });
  67 | 
  68 | setup('authenticate as owner', async ({ page }) => {
  69 |   await loginAndSave(page, CREDENTIALS.owner, STORAGE_STATE.owner, 'owner');
  70 | });
  71 | 
  72 | setup('authenticate as waiter', async ({ page }) => {
  73 |   await loginAndSave(page, CREDENTIALS.waiter, STORAGE_STATE.waiter, 'waiter');
  74 | });
  75 | 
  76 | setup('authenticate as kitchen', async ({ page }) => {
  77 |   await loginAndSave(page, CREDENTIALS.kitchen, STORAGE_STATE.kitchen, 'kitchen');
  78 | });
  79 | 
  80 | setup('authenticate as cashier', async ({ page }) => {
  81 |   await loginAndSave(page, CREDENTIALS.cashier, STORAGE_STATE.cashier, 'cashier');
  82 | });
  83 | 
  84 | setup('authenticate as manager', async ({ page }) => {
  85 |   await loginAndSave(page, CREDENTIALS.manager, STORAGE_STATE.manager, 'manager');
  86 | });
  87 | 
  88 | setup('authenticate as super admin', async ({ page }) => {
  89 |   await loginAndSave(
  90 |     page,
  91 |     CREDENTIALS.superAdmin,
  92 |     STORAGE_STATE.superAdmin,
  93 |     'super-admin'
  94 |   );
  95 | });
  96 | 
```