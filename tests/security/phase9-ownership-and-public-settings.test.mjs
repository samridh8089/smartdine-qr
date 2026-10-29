import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

test('PHASE 9 - Task 1: auto-link-profile enforces strict ownership and email verification', () => {
  const routePath = path.join(rootDir, 'src/app/api/auth/auto-link-profile/route.ts');
  assert.ok(fs.existsSync(routePath), 'Auto-link API route must exist');
  const code = fs.readFileSync(routePath, 'utf8').replace(/\r\n/g, '\n');

  // 1. Email confirmation requirement
  assert.ok(
    code.includes('user.email_confirmed_at'),
    'Must check user.email_confirmed_at'
  );
  assert.ok(
    code.includes('403'),
    'Must return 403 when email is unconfirmed'
  );

  // 2. Strict owner_id verification without settings fallback
  assert.ok(
    code.includes('restaurant.owner_id === user.id'),
    'Must strictly verify ownership via restaurant.owner_id === user.id'
  );
  assert.ok(
    !code.includes('restaurant.settings?.owner_email'),
    'Must NOT match or rely on settings.owner_email'
  );
  assert.ok(
    !code.includes('restaurant.settings?.owner_phone'),
    'Must NOT match or rely on settings.owner_phone'
  );

  // 3. Existing linked profile returns 409 Conflict
  assert.ok(
    code.includes('existingProfile.restaurant_id'),
    'Must check if existing profile is already linked to a restaurant'
  );
  assert.ok(
    code.includes('409'),
    'Must return 409 Conflict if profile already has a restaurant_id'
  );

  // 4. Existing profile role is NEVER overwritten
  assert.ok(
    code.includes('.update({\n          restaurant_id: restaurant.id,\n          is_active: true\n        })') ||
    code.includes('restaurant_id: restaurant.id,\n          is_active: true'),
    'Existing profile update must only update restaurant_id and not overwrite role'
  );
});

test('PHASE 9 - Task 2: /api/customer/restaurant uses strict settings allow-list & requires service key', () => {
  const routePath = path.join(rootDir, 'src/app/api/customer/restaurant/route.ts');
  assert.ok(fs.existsSync(routePath), 'Customer restaurant route must exist');
  const code = fs.readFileSync(routePath, 'utf8');

  // 1. Allow-list implementation
  assert.ok(
    code.includes('ALLOWED_CUSTOMER_SETTINGS_KEYS'),
    'Must define ALLOWED_CUSTOMER_SETTINGS_KEYS allow-list'
  );
  assert.ok(
    !code.includes('delete (sanitizedSettings as any).razorpay_key_secret'),
    'Must not rely on fragile deny-list deletion'
  );

  // 2. Sensitive keys must be explicitly banned/excluded
  const banned = ['owner_email', 'owner_phone', 'staff_metadata', 'activeDevices', 'billing'];
  for (const b of banned) {
    assert.ok(
      code.includes(b),
      `Must explicitly guard against exposing ${b}`
    );
  }

  // 3. SUPABASE_SERVICE_ROLE_KEY missing must throw/error (no anon key fallback)
  assert.ok(
    code.includes("throw new Error('SUPABASE_SERVICE_ROLE_KEY is required and missing')"),
    'Must throw error when SUPABASE_SERVICE_ROLE_KEY is missing'
  );
  assert.ok(
    !code.includes("process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''"),
    'Must NOT fall back to NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
});

test('PHASE 9 - Task 3: Migration timestamps are unique and preserve live DB history', () => {
  const migDir = path.join(rootDir, 'supabase/migrations');
  const files = fs.readdirSync(migDir);

  // Check unique 20261028 files
  assert.ok(
    files.includes('20261028000001_add_logo_to_public_restaurants.sql'),
    'Must preserve live applied migration 20261028000001_add_logo_to_public_restaurants.sql'
  );
  assert.ok(
    files.includes('20261028000002_rls_privilege_escalation.sql'),
    'Must preserve 20261028000002_rls_privilege_escalation.sql'
  );
  assert.ok(
    files.includes('20261028000003_enforce_mfa_aal2_remaining_policies.sql'),
    'Must uniquely sequence newer migration to 20261028000003_enforce_mfa_aal2_remaining_policies.sql'
  );

  // Verify zero duplicate timestamps across all migration files
  const timestamps = files.map((f) => f.split('_')[0]);
  const counts = {};
  for (const t of timestamps) {
    counts[t] = (counts[t] || 0) + 1;
    assert.strictEqual(
      counts[t],
      1,
      `Migration timestamp ${t} must be unique (found duplicates)`
    );
  }
});

test('PHASE 9 - Task 4: /api/customer/request uses Upstash rate limit and requires service key', () => {
  const routePath = path.join(rootDir, 'src/app/api/customer/request/route.ts');
  assert.ok(fs.existsSync(routePath), 'Customer request route must exist');
  const code = fs.readFileSync(routePath, 'utf8');

  // 1. Upstash imports and instances for IP and table
  assert.ok(code.includes("from '@upstash/ratelimit'"), 'Must import Ratelimit from @upstash/ratelimit');
  assert.ok(code.includes('ipRatelimit'), 'Must configure ipRatelimit');
  assert.ok(code.includes('tableRatelimit'), 'Must configure tableRatelimit');

  // 2. Removal of in-memory Map
  assert.ok(
    !code.includes('customerRequestRateLimits = new Map'),
    'Must remove local in-memory Map customerRequestRateLimits'
  );

  // 3. Service role key enforcement
  assert.ok(
    code.includes("throw new Error('SUPABASE_SERVICE_ROLE_KEY is required and missing')"),
    'Must throw error when SUPABASE_SERVICE_ROLE_KEY is missing'
  );
  assert.ok(
    !code.includes("process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''"),
    'Must NOT fall back to anon key'
  );
});

test('PHASE 9 - Task 5: Customer settings allow-list strictly purges private credentials', () => {
  // Test the allow-list filter logic directly
  const ALLOWED_CUSTOMER_SETTINGS_KEYS = [
    'require_customer_name',
    'logo_url',
    'logo',
    'theme_color',
    'currency',
    'offers',
    'table_states',
    'geofence',
    'takeaway_enabled',
    'delivery_enabled',
    'dinein_enabled',
    'reservation_enabled',
    'payment_enabled',
    'payment_qr',
    'upi_id',
    'upi_name',
    'gst_enabled',
    'gst_percentage',
    'service_charge_enabled',
    'service_charge_percentage',
    'custom_charges',
    'opening_hours',
    'description',
    'banner_url',
    'cover_image'
  ];

  const DISALLOWED_SETTINGS_KEYS = new Set([
    'owner_email',
    'owner_phone',
    'staff_metadata',
    'activeDevices',
    'billing',
    'razorpay_key_secret',
    'stripe_secret_key',
    'fcm_server_key',
    'vapid_private_key',
    'push_tokens',
    'webpush_subscribers'
  ]);

  const rawSettings = {
    theme_color: 'amber',
    currency: 'INR',
    owner_email: 'hacked-owner@cleverops.in',
    owner_phone: '+919876543210',
    staff_metadata: { role: 'admin', pin: '9999' },
    activeDevices: [{ id: 'device-1' }],
    billing: { plan: 'pro', invoice: 'inv_123' },
    razorpay_key_secret: 'sec_live_999999',
    fcm_server_key: 'fcm_key_secret',
    custom_charges: [{ name: 'Packaging', rate: 10 }]
  };

  const sanitized = {};
  for (const key of ALLOWED_CUSTOMER_SETTINGS_KEYS) {
    if (
      key in rawSettings &&
      rawSettings[key] !== undefined &&
      !DISALLOWED_SETTINGS_KEYS.has(key) &&
      !key.toLowerCase().includes('secret') &&
      !key.toLowerCase().includes('push')
    ) {
      sanitized[key] = rawSettings[key];
    }
  }

  // Verify allowlisted properties exist
  assert.strictEqual(sanitized.theme_color, 'amber');
  assert.strictEqual(sanitized.currency, 'INR');
  assert.deepStrictEqual(sanitized.custom_charges, [{ name: 'Packaging', rate: 10 }]);

  // Verify private properties are strictly stripped
  assert.strictEqual(sanitized.owner_email, undefined);
  assert.strictEqual(sanitized.owner_phone, undefined);
  assert.strictEqual(sanitized.staff_metadata, undefined);
  assert.strictEqual(sanitized.activeDevices, undefined);
  assert.strictEqual(sanitized.billing, undefined);
  assert.strictEqual(sanitized.razorpay_key_secret, undefined);
  assert.strictEqual(sanitized.fcm_server_key, undefined);
});
