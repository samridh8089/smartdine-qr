import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 3: Razorpay Webhook Security & Idempotency Tests', () => {
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20261026000003_webhook_events_idempotency.sql');
  const routePath = path.join(process.cwd(), 'src', 'app', 'api', 'webhooks', 'razorpay', 'route.ts');

  it('Migration file exists and defines processed_webhook_events table', () => {
    assert.equal(fs.existsSync(migrationPath), true, 'Migration 20261026000003 must exist');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.processed_webhook_events/);
    assert.match(sql, /CONSTRAINT uq_processed_webhook_event UNIQUE \(source, event_id\)/);
    assert.match(sql, /ALTER TABLE public\.processed_webhook_events ENABLE ROW LEVEL SECURITY;/);
    assert.match(sql, /CREATE POLICY "service_role_processed_webhook_events"/);
  });

  it('Route enforces dedicated secret, timing-safe compare, table idempotency, and random password', () => {
    const code = fs.readFileSync(routePath, 'utf8');

    // 1. No fallback to RAZORPAY_KEY_SECRET
    assert.doesNotMatch(code, /RAZORPAY_WEBHOOK_SECRET \|\| RAZORPAY_KEY_SECRET/, 'Must not fall back to RAZORPAY_KEY_SECRET');
    assert.match(code, /process\.env\.RAZORPAY_WEBHOOK_SECRET/, 'Must require RAZORPAY_WEBHOOK_SECRET');

    // 2. Uses crypto.timingSafeEqual
    assert.match(code, /crypto\.timingSafeEqual/, 'Must use crypto.timingSafeEqual');

    // 3. Table idempotency check
    assert.match(code, /processed_webhook_events/, 'Must query processed_webhook_events for duplicates');

    // 4. No fixed password
    assert.doesNotMatch(code, /TempPass/i, 'Must not use fixed password');
    assert.match(code, /crypto\.randomBytes/, 'Must generate cryptographically random password');
    assert.match(code, /generateLink\(\{\s*type:\s*'recovery'/, 'Must dispatch password recovery/invite link');
  });
});
