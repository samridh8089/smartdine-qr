# SmartDine Zero-Downtime Database Migration Guidelines

This document outlines the rules, expand-and-contract patterns, backward-compatibility requirements, and rollback procedures for database migrations in SmartDine.

---

## 1. Zero-Downtime Principles

1. **Never Drop or Rename Columns Directly**: Direct renames or deletions break running application code.
2. **Expand-and-Contract Pattern**:
   - **Phase 1 (Expand)**: Add the new column/table as nullable or with a safe default value.
   - **Phase 2 (Dual-Write)**: Application code writes to both old and new columns.
   - **Phase 3 (Backfill)**: Backfill historical data in background.
   - **Phase 4 (Contract)**: Update application code to read from the new column only, then safely deprecate/drop the old column.
3. **Safe Index Creation**:
   - Always create indexes using `CREATE INDEX CONCURRENTLY` in PostgreSQL to prevent table locks on active production databases.

---

## 2. Migration Safety Checklist

- [x] Column additions are nullable or specify default values.
- [x] Index creations use `CONCURRENTLY` without locking tables.
- [x] Every migration file has a corresponding rollback `.down.sql` script.
- [x] Application code is backward-compatible with pre-migration schema.

---

## 3. Migration Rollback Template

For every SQL migration `YYYYMMDDHHMMSS_feature.up.sql`, create `YYYYMMDDHHMMSS_feature.down.sql`:

```sql
-- Up Migration: YYYYMMDDHHMMSS_add_order_notes.up.sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_notes TEXT;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_notes ON orders(customer_notes);

-- Down Migration (Rollback): YYYYMMDDHHMMSS_add_order_notes.down.sql
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_customer_notes;
ALTER TABLE orders DROP COLUMN IF EXISTS customer_notes;
```
