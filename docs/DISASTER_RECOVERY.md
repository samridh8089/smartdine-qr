# SmartDine Production Disaster Recovery & Backup Plan

This document details the backup schedules, Recovery Time Objective (RTO), Recovery Point Objective (RPO), database export/restore procedures, and point-in-time recovery (PITR) verification protocols for SmartDine.

---

## 1. Recovery Objectives & Targets

| Parameter | Target Metric | Description |
| :--- | :--- | :--- |
| **Recovery Point Objective (RPO)** | **< 5 Minutes** | Maximum acceptable data loss window during catastrophic database failure. Supported via WAL replication & PITR. |
| **Recovery Time Objective (RTO)** | **< 15 Minutes** | Maximum acceptable downtime duration required to restore database and resume full application traffic. |

---

## 2. Backup Schedule & Architecture

1. **Automated Daily Backups**: Managed automatically by Supabase Postgres infrastructure (scheduled daily at 00:00 UTC).
2. **Point-in-Time Recovery (PITR)**: Continuous Write-Ahead Logging (WAL) archiving enabled on Supabase Pro/Enterprise tier. Allows restoring database state to any exact second within the last 7 to 30 days.
3. **Manual Table Dump Procedure**: Regular CLI logical backup using `pg_dump`.

---

## 3. Manual Database Export Procedure

To export logical backups of critical production tables (`restaurants`, `profiles`, `orders`, `order_items`, `menu_items`, `inventory_items`):

```bash
# Export full PostgreSQL schema and data dump
pg_dump "postgres://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  --table=restaurants \
  --table=profiles \
  --table=orders \
  --table=order_items \
  --table=menu_items \
  --table=inventory_items \
  --file=smartdine_backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 4. Disaster Restore Procedure

### Option A: Supabase Point-in-Time Recovery (PITR Dashboard - Recommended)

1. Open **Supabase Dashboard** -> **Project Settings** -> **Database** -> **Backups**.
2. Select **Point in Time Recovery (PITR)**.
3. Specify the target restore timestamp (e.g. `2026-08-30T15:45:00Z` - 1 minute prior to incident).
4. Click **Restore to Timestamp**. Supabase provisions a restored database instance within ~10–12 minutes.

### Option B: Logical SQL Dump Restore

```bash
# Restore logical backup SQL dump into target environment
psql "postgres://postgres:[YOUR-PASSWORD]@db.[RESTORED-PROJECT-REF].supabase.co:5432/postgres" \
  -f smartdine_backup_20260830.sql
```

---

## 5. Verification & Test Restore Checklist

- [x] Verify backup `.sql` file size is non-zero and formatted properly.
- [x] Test restoring dump onto staging database instance.
- [x] Verify table row counts match pre-incident metrics.
- [x] Validate foreign key constraints and index integrity after restore.
