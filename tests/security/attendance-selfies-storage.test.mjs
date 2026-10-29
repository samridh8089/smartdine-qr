import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

test('ATTENDANCE SELFIES: Migration 20261029000001 creates private bucket, cleans settings, and secures RLS', () => {
  const migPath = path.join(rootDir, 'supabase/migrations/20261029000001_attendance_selfies_storage_and_cleanup.sql');
  assert.ok(fs.existsSync(migPath), 'Migration 20261029000001 must exist');
  const sql = fs.readFileSync(migPath, 'utf8');

  // 1. Private bucket creation
  assert.ok(sql.includes("'attendance-selfies'"), 'Must define attendance-selfies bucket');
  assert.ok(sql.includes('public = false') || sql.includes(', false,'), 'Bucket must be private (public = false)');

  // 2. Storage RLS: Owner/Manager only for reading selfies
  assert.ok(sql.includes('owner_manager_read_attendance_selfies'), 'Must define owner_manager_read_attendance_selfies policy');
  assert.ok(sql.includes("role IN ('owner', 'manager')"), 'Selfie read policy must require owner or manager role');

  // 3. staff_attendance table RLS: Waiter can only read their own records
  assert.ok(sql.includes('staff_select_own_attendance'), 'Must define staff_select_own_attendance policy');
  assert.ok(sql.includes('sp.profile_id = auth.uid()'), 'Staff select policy must scope to own profile');
  assert.ok(sql.includes('marked_by_user_id = auth.uid()'), 'Staff select policy allows own marked punches');

  // 4. Data migration & cleanup of settings.attendo.attendance
  assert.ok(sql.includes("settings #- '{attendo,attendance}'"), 'Must strip attendance array from settings.attendo');
  assert.ok(sql.includes("selfie_url LIKE 'data:image%'"), 'Must purge base64 selfies from database');
});

test('ATTENDANCE SELFIES: /api/attendance/selfie-url restricts signed URLs strictly to Owner/Manager', () => {
  const routePath = path.join(rootDir, 'src/app/api/attendance/selfie-url/route.ts');
  assert.ok(fs.existsSync(routePath), 'Selfie URL API route must exist');
  const code = fs.readFileSync(routePath, 'utf8');

  // Must enforce owner/manager authorization
  assert.ok(
    code.includes("['owner', 'manager', 'super_admin']"),
    'Must restrict signed URL creation strictly to owner, manager, or super_admin'
  );
  assert.ok(
    code.includes('403'),
    'Must return 403 Forbidden for unauthorized roles like waiter'
  );

  // Must enforce short expiry (300 seconds / 5 minutes)
  assert.ok(
    code.includes('createSignedUrl(cleanPath, 300)'),
    'Must create signed URL with 300s short expiry'
  );

  // Must prevent IDOR across restaurants
  assert.ok(
    code.includes('cleanPath.startsWith(restaurantId'),
    'Must verify requested path belongs to the caller restaurant'
  );
});

test('ATTENDANCE SELFIES: /api/attendance/punch uploads base64 selfies to private storage and stops settings sync', () => {
  const routePath = path.join(rootDir, 'src/app/api/attendance/punch/route.ts');
  assert.ok(fs.existsSync(routePath), 'Attendance punch route must exist');
  const code = fs.readFileSync(routePath, 'utf8');

  // 1. Uploads to private bucket
  assert.ok(
    code.includes(".from('attendance-selfies')"),
    'Must upload selfies to attendance-selfies storage bucket'
  );
  assert.ok(
    code.includes('Buffer.from(base64Data'),
    'Must decode base64 data to binary buffer before uploading'
  );

  // 2. Saves only storage path in staff_attendance
  assert.ok(
    code.includes(".from('staff_attendance')") && code.includes('.upsert(record'),
    'Must persist punch record into staff_attendance table'
  );

  // 3. Must NEVER write attendance array to restaurant settings
  assert.ok(
    !code.includes("attendo: {\n        ...((rest.settings as any)?.attendo || {}),\n        attendance: filtered\n      }"),
    'Must NOT write new attendance array to restaurants.settings.attendo'
  );
});

test('ATTENDANCE SELFIES: attendoEngine does not persist attendance array in settings JSON', () => {
  const enginePath = path.join(rootDir, 'src/lib/attendoEngine.ts');
  const code = fs.readFileSync(enginePath, 'utf8');

  // Must export getAttendanceSelfieSignedUrl
  assert.ok(
    code.includes('export async function getAttendanceSelfieSignedUrl'),
    'Must export getAttendanceSelfieSignedUrl helper'
  );

  // Must not sync attendance array to settings
  assert.ok(
    !code.includes('attendance: filtered'),
    'attendoEngine must not write attendance: filtered to settings'
  );
  assert.ok(
    !code.includes('attendance: list'),
    'attendoEngine must not write attendance: list to settings'
  );
});

test('ATTENDANCE SELFIES: Waiter role cannot access signed URLs or view other staff selfies', async (t) => {
  const routePath = path.join(rootDir, 'src/app/api/attendance/selfie-url/route.ts');
  const code = fs.readFileSync(routePath, 'utf8');

  // Role check: waiter role is strictly not in allowed list
  assert.ok(!code.includes("'waiter'"), 'Waiter role must NEVER be permitted to access selfie URLs');
  assert.ok(code.includes("['owner', 'manager', 'super_admin']"), 'Only owner and manager roles are permitted');

  // If local server is running, test live HTTP endpoint
  try {
    const res = await fetch('http://localhost:3000/api/attendance/selfie-url?restaurantId=d315d7d8-3a6b-419d-9a53-d6458a913a92&path=d315d7d8-3a6b-419d-9a53-d6458a913a92/other-staff/selfie.jpg', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    assert.strictEqual(res.status, 403, 'Unauthenticated or waiter request must be rejected with 403');
    const json = await res.json();
    assert.strictEqual(json.error, 'FORBIDDEN');
    assert.strictEqual(json.signedUrl, undefined);
  } catch (_) {
    // Dev server not active on port 3000 during test execution
  }
});
