# SmartDine Zero-Downtime Deployment & Migration Runbook

## Overview
Guidelines and step-by-step procedures for zero-downtime application deployments and backward-compatible database schema migrations.

---

## 1. Zero-Downtime Migration Pattern: Expand → Migrate → Contract

When modifying database tables in production, **NEVER** apply breaking schema changes directly. Always follow the 3-step lifecycle:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   1. EXPAND     │ ───►  │   2. MIGRATE    │ ───►  │   3. CONTRACT   │
│ Add new columns │       │ Backfill data   │       │ Remove deprecated│
│ or nullables    │       │ in background   │       │ columns safely   │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

### Phase 1: EXPAND (Backward-Compatible Schema Change)
- Add new columns as **NULLABLE** or with **DEFAULT** values.
- Do NOT delete or rename existing columns yet.
- Deploy updated API routes that write to **BOTH** old and new columns.

### Phase 2: MIGRATE (Data Backfill & Feature Verification)
- Run background migration script (`node scripts/backfill_data.js`) to sync old data into new columns.
- Enable feature flag (`NEXT_PUBLIC_ENABLE_FEATURE_X=true`) to switch readers to new schema.
- Validate zero errors across all active client portals.

### Phase 3: CONTRACT (Deprecation & Cleanup)
- Deprecate old column readers.
- Remove old column references from codebase.
- Safely drop old column in database during low-traffic maintenance window.

---

## 2. Pre-Deployment Verification Protocol

Before pushing any code to `origin main`:

1. **TypeScript Type Safety**:
   ```bash
   npx tsc --noEmit
   ```
   *Must exit with 0 errors.*

2. **Production Bundle Compilation**:
   ```bash
   npm run build
   ```
   *Must compile all static/dynamic routes cleanly.*

3. **Readiness Probe Ping**:
   ```bash
   curl -i https://www.cleverops.in/api/ready
   ```
   *Must return HTTP 200 OK with `Server-Timing` headers.*

---

## 3. Rollback Protocol & Emergency Circuit Breakers

If errors exceed 0.1% post-deployment:
1. Trigger Vercel Instant Rollback (`npx vercel rollback`).
2. Verify DNS & edge cache invalidation (`curl -I https://www.cleverops.in`).
3. Inspect runtime error logs via `vercel logs` or Supabase dashboard.
