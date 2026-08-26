# CleverOps Disaster Recovery Specification (v1.0.0-launch-candidate)

> **CRITICAL OPERATIONAL POLICY**: This document defines the disaster recovery protocol, daily backup operations, RLS security verification, and recovery drills for CleverOps (SmartDine QR SaaS).

---

## 1. Daily Supabase Database Backup Procedure

- **Automated Physical Backups**: Managed daily via Supabase Automated PITR (Point-in-Time Recovery) with 7-day retention.
- **Manual Schema & Data Dump**:
  ```bash
  # Export database schema dump
  supabase db dump --linked --file supabase/backups/schema_$(date +%Y%m%m).sql

  # Export database data dump
  supabase db dump --linked --data-only --file supabase/backups/data_$(date +%Y%m%m).sql
  ```

---

## 2. Row-Level Security (RLS) & Tenant Isolation Verification Checklist

Before any major migration or emergency patch, execute the RLS Audit Suite:
1. Verify `restaurants` table has RLS enabled (`ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;`).
2. Verify `orders` table RLS policy isolates by `restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())`.
3. Verify `menu_items` public SELECT policy allows customer QR access while restricting UPDATE/DELETE to restaurant owners/staff.
4. Verify `profiles` table prevents cross-tenant profile impersonation.

---

## 3. Environment Variable Backup Checklist

Ensure all production environment variables are stored in encrypted vaults (Vercel Production Env & Supabase Vault):

| Key Name | Purpose | Production Vault Status |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API Endpoint | **BACKED UP** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Public Anonymous Key | **BACKED UP** |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Server Admin Key | **BACKED UP** |
| `RAZORPAY_KEY_ID` | Razorpay Merchant Public Key | **BACKED UP** |
| `RAZORPAY_KEY_SECRET` | Razorpay Merchant Private Secret | **BACKED UP** |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Webhook HMAC Secret | **BACKED UP** |

---

## 4. Disaster Recovery Drill (RTO < 15 Mins, RPO < 5 Mins)

1. **Detection**: Automated uptime monitor or Vercel alert triggers notification.
2. **Failover**: Trigger Vercel Instant Rollback to last known healthy deployment commit.
3. **Database Restore**: Restore Supabase PITR to the exact minute prior to incident.
4. **Verification**: Run Playwright `npm run test:e2e:p0` to verify system integrity.
