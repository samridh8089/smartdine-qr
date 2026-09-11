# Supabase Safe Skill

A specialized AI workflow for database engineering, schema migrations, and backend query management ensuring zero data loss and strict backward compatibility across SmartDine / CleverOps PostgreSQL and Supabase infrastructure.

---

## Workflow Instructions

### 1. Pre-Change Analysis
- Thoroughly inspect the requested database task and audit dependent code:
  - Client & Admin DB Layers: `src/lib/db.ts`, `src/lib/supabase.ts`
  - API Routes: `src/app/api/*`
  - Existing Migration History: `supabase/migrations/*`
  - Realtime Channels & Subscriptions: `src/lib/realtime.ts`
- Trace all columns, foreign keys, stored procedures, or triggers affected by the task before writing any SQL or code.

### 2. Zero Destructive Edits & Non-Destructive Migrations
- **Never Drop Tables or Columns**: Under no circumstances should `DROP TABLE`, `DROP COLUMN`, or destructive alterations be executed.
- **Generate SQL Migrations**: Always create additive, non-destructive migration files in `supabase/migrations/` using timestamped prefixes (e.g. `YYYYMMDD000000_<migration_name>.sql`):
  - Use `ADD COLUMN IF NOT EXISTS`
  - Use `CREATE INDEX IF NOT EXISTS`
  - Use `CREATE TABLE IF NOT EXISTS`
  - Provide sensible defaults (`DEFAULT ...`) for newly added columns to prevent `NOT NULL` violation on existing rows.
- If a column needs deprecation, mark it deprecated in TypeScript types and retain the database column for backward compatibility.

### 3. Production Data Safety
- **Never Modify Production Data Automatically**: Do not execute raw `UPDATE`, `DELETE`, or `TRUNCATE` operations on live production records.
- Any one-off data backfills must be written into an explicit, dry-run-capable script requiring manual user execution and confirmation.

### 4. Row Level Security (RLS) Preservation
- Preserve existing RLS policies by default.
- Never weaken security postures or execute `DISABLE ROW LEVEL SECURITY` on public tables.
- If new policies are explicitly requested:
  - Ensure tenant isolation by restaurant ID (`restaurant_id = auth.uid()` or profile lookup).
  - Test role-based policies (`owner`, `manager`, `waiter`, `kitchen`, `cashier`, `super_admin`) against existing permission matrix.

### 5. Backward Compatibility & Code Sync
- Ensure all TypeScript interfaces in `src/lib/db.ts` remain backward-compatible with legacy and in-flight orders/sessions.
- Provide fallback resolution for optional schema fields (e.g. `order.order_type || 'dine_in'`).
- **Protect Frozen Inventory Engine**: Never modify inventory tables (`inventory_reservations`, `inventory_transactions`), recipes, or frozen calculations in `src/lib/inventoryEngine.ts` and `src/lib/inventoryUnits.ts`.

### 6. Verification & Build
- If TypeScript types, `src/lib/db.ts`, or any frontend/backend consumers are touched, run verification:
  ```bash
  npm run build
  ```
  Ensure 0 TypeScript errors and 0 Next.js compilation issues.
- If applicable, run database smoke and integrity checks:
  ```bash
  npx tsx scripts/test_founder_r3_smoke.ts
  ```

### 7. Git & Deployment Safety
- **Never auto commit**: Do not execute `git commit` automatically.
- **Never auto push**: Do not run `git push` or push migration code to remote repositories without explicit user instruction.
