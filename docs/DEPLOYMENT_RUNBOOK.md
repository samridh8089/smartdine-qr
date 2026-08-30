# SmartDine Production Deployment & Instant Rollback Runbook

This document details Vercel deployment verification, preview workflow, environment variable validation, and incident rollback procedures.

---

## 1. Instant Vercel Rollback Procedure

If a production deployment causes unexpected errors or high latency:

### Option A: Vercel Dashboard Instant Rollback (Recommended - 10 Seconds)
1. Open **Vercel Dashboard** -> **SmartDine Project** -> **Deployments**.
2. Locate the last known healthy deployment (e.g. `smartdine-v1.4.2`).
3. Click the three dots `...` next to the deployment -> Select **Instant Rollback**.
4. Vercel instantly routes 100% of production traffic back to the previous build without rebuilding.

### Option B: Vercel CLI Rollback
```bash
# Rollback production deployment to specific target build ID
vercel rollback [DEPLOYMENT-ID] --prod
```

---

## 2. Pre-Deployment Verification Protocol

Before merging PRs to `main`:
1. **TypeScript Build**: `.\node_modules\.bin\tsc.cmd --noEmit` must pass with 0 errors.
2. **Production Build**: `npm run build` must complete with 0 errors.
3. **Environment Checks**: `/api/ready` endpoint must return `200 OK`.
4. **k6 Smoke Test**: Automated GitHub Actions smoke test must pass.

---

## 3. Incident Decision Tree

```text
[Incident Detected]
       │
       ├─► HTTP 5xx Error Rate > 2.0%? ────────► Trigger Vercel Instant Rollback
       ├─► DB Connectivity Fail? ──────────────► Check Supabase Status / Restart Pooler
       └─► High P95 Latency (> 800ms)? ────────► Inspect Server-Timing & Slow Queries
```
