# SmartDine QR & CleverOps POS Platform

SmartDine is a multi-tenant restaurant management SaaS platform that unifies customer QR ordering, kitchen display systems (KDS), waiter/cashier POS, inventory management, staff role-based access control (RBAC), and automated profit & loss (PnL) analytics.

---

## Architecture Overview

The system is structured across four primary surfaces sharing a single source of truth:

```
smartdine/
├── src/                  # Next.js App Router (Customer QR menu, Staff POS, Owner Dashboard, Admin Control Tower)
├── packages/core/        # Shared core business logic, validations, tax computations, and data types
├── smartdine-mobile/     # React Native / Expo mobile app for waiter terminals and handheld POS
├── electron/             # Electron desktop client for offline-first resilience & thermal kitchen printing
├── supabase/migrations/  # PostgreSQL schemas, functions, triggers, and Row Level Security (RLS) policies
└── tests/                # Security suites, API verification, and Playwright end-to-end tests
```

### Key Subsystems

- **Customer QR Ordering (`src/app/(customer)`)**: High-performance digital ordering surface with geofencing, multi-batch table orders, tracking tokens, and real-time status updates.
- **Staff Operations & KDS (`src/app/(dashboard)/kds`, `src/app/api/staff`)**: Real-time kitchen display, order acceptance, atomic inventory deduction, and waiter call orchestration.
- **Inventory Engine (`src/lib/inventoryEngine.ts`)**: Production-tested engine with strict idempotency, unit scaling, batch deduction, and recipe margin calculations.
- **Security & RBAC (`src/middleware.ts`, `src/lib/staffAuthGuard.ts`)**: Distributed rate limiting via Upstash Redis, cryptographic token verification, tenant-scoped RLS policies, and SSRF-hardened external asset ingestion.

---

## Prerequisites

- **Node.js**: v20.x or v22.x LTS
- **npm**: v10.x or higher
- **Supabase**: Active PostgreSQL instance with PG15+
- **Redis (Optional for local dev, required for distributed production)**: Upstash Redis or Vercel KV

---

## Setup Steps

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-org/smartdine-qr.git
cd smartdine-qr
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Fill in the required credentials in `.env.local`:

| Variable | Description | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous / public API key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) | Yes |
| `NEXT_PUBLIC_SITE_URL` | Canonical public URL (e.g. `https://www.cleverops.in`) | Yes |
| `RAZORPAY_KEY_ID` | Razorpay public key ID | Yes |
| `RAZORPAY_KEY_SECRET` | Razorpay secret key | Yes |
| `RAZORPAY_WEBHOOK_SECRET` | Dedicated secret for Razorpay webhook verification | Yes |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint for distributed rate limiting | Recommended |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token | Recommended |
| `GEMINI_API_KEY` | Google Gemini API key for AI menu extraction | Optional |
| `RESEND_API_KEY` | Resend API key for transactional emails | Optional |

### 3. Apply Database Migrations

Apply migrations located in `supabase/migrations/` using Supabase CLI:

```bash
npx supabase db push
```

Or execute them sequentially through your PostgreSQL connection:
1. `20261026000000_restaurant_expenses.sql`
2. `20261026000001_security_hardening.sql`
3. `20261026000002_close_public_rls.sql`
4. `20261026000003_webhook_events_idempotency.sql`
5. `20261026000004_restaurant_expenses_update_with_check.sql`

### 4. Run the Development Server

```bash
npm run dev
```

Navigate to `http://localhost:3000` in your browser.

---

## Running Verification & Tests

### Pre-Commit React Hook Safety Audit
Enforces rule that React hooks must execute unconditionally before early returns:

```bash
npm run audit:hooks
```

### TypeScript Compilation Check
Verifies types across all modules:

```bash
npx tsc --noEmit
```

### Security Test Suites
Runs fast Node.js native test runner suites validating security hardening:

```bash
node --test tests/security/*.test.mjs
```

### End-to-End Tests
Runs Playwright automated browser test suite:

```bash
npx playwright test
```

---

## License

Proprietary — All rights reserved. CleverOps Technologies.
