# SmartDine Disaster Recovery & Data Protection Runbook

## Overview
This runbook establishes strict recovery point and recovery time objectives (RPO/RTO) and emergency procedures for SmartDine in production.

---

## 1. Objectives & SLAs

* **Recovery Time Objective (RTO)**: `< 15 Minutes`
* **Recovery Point Objective (RPO)**: `< 5 Minutes`
* **Target Availability SLA**: `99.9% Uptime`

---

## 2. Backup Strategy & Database Protection

### A. Point-In-Time Recovery (PITR)
- **Engine**: Supabase Managed PostgreSQL PITR.
- **Retention**: 7 days continuous transaction logging (wal2json).
- **Resolution**: Precision restore down to the millisecond.

### B. Daily Automated Database Dumps
- **Frequency**: Every 24 hours at 02:00 UTC.
- **Storage**: AES-256 encrypted offsite S3 backup bucket (`smartdine-backups-prod`).
- **Retention**: 30 rolling daily snapshots, 12 monthly archives.

---

## 3. Emergency Restoration Procedure

### Scenario A: Accidental Data Corruption / Deletion (PITR Restore)
1. **Access Supabase Dashboard**: Navigate to Project Settings → Backups → Point in Time Recovery.
2. **Select Timestamp**: Choose the exact timestamp (UTC) preceding the incident.
3. **Trigger Restore**: Initiate restore to a new staging database instance.
4. **Verify Integrity**: Run `./scripts/verify_database_integrity.js` against the restored instance.
5. **DNS/Connection Swap**: Update `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel Environment Variables.
6. **Redeploy**: Trigger instant Vercel redeployment (`vercel --prod`).

### Scenario B: Storage & Asset Failure
1. **Access Storage Bucket**: Restore asset object storage from AWS S3 cross-region replica.
2. **CDN Invalidation**: Flush Vercel Edge Cache via `vercel cache invalidate`.

---

## 4. Emergency Vercel Rollback Procedure

If a deployed build exhibits critical failures:

### Option 1: Vercel Web Dashboard (Instant <30 seconds)
1. Open [Vercel Project Dashboard](https://vercel.com).
2. Go to **Deployments**.
3. Locate the last stable deployment hash (e.g., `58c3780`).
4. Click **...** → **Promote to Production**.
5. Confirm immediate traffic shift.

### Option 2: Vercel CLI (<60 seconds)
```bash
npx vercel rollback
```
Select the previous stable deployment from the interactive CLI menu.

---

## 5. Incident Communication Matrix

| Role | Contact | SLA |
|---|---|---|
| **Incident Commander** | Lead Engineer | Immediate |
| **Database Reliability** | Supabase Support Tier 1 | `< 15 min` |
| **Infrastructure / CDN** | Vercel Enterprise Support | `< 15 min` |
