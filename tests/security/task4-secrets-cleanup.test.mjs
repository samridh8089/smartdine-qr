import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

test('TASK 4: Deleted FCM scripts do not exist', () => {
  const deletedFiles = [
    'test_s23_ultra_native_fcm.mjs',
    'run_6_point_proofs.mjs',
    'test_direct_native_fcm.mjs'
  ];
  for (const f of deletedFiles) {
    const full = path.join(rootDir, f);
    assert.strictEqual(fs.existsSync(full), false, `File ${f} must be deleted`);
  }
});

test('TASK 4: No sb_publishable hardcoded key exists in src/', () => {
  function scan(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        scan(full);
      } else if (/\.(ts|tsx|js|jsx)$/.test(item.name)) {
        const content = fs.readFileSync(full, 'utf8');
        assert.ok(
          !content.includes('sb_publishable_'),
          `Found sb_publishable in ${path.relative(rootDir, full)}`
        );
      }
    }
  }
  scan(path.join(rootDir, 'src'));
});

test('TASK 4: No ***REMOVED*** or Password123! in e2e/test-data/index.ts', () => {
  const content = fs.readFileSync(path.join(rootDir, 'e2e/test-data/index.ts'), 'utf8');
  assert.ok(!content.includes('***REMOVED***'), 'e2e/test-data/index.ts must not have ***REMOVED***');
  assert.ok(!content.includes('Password123!'), 'e2e/test-data/index.ts must not have Password123!');
  assert.ok(!content.includes('TestOwner123!'), 'e2e/test-data/index.ts must not have TestOwner123!');
});

test('TASK 4: .env.test.example has no hardcoded passwords', () => {
  const content = fs.readFileSync(path.join(rootDir, '.env.test.example'), 'utf8');
  assert.ok(!content.includes('***REMOVED***'), '.env.test.example must not have ***REMOVED***');
  assert.ok(!content.includes('TestOwner123!'), '.env.test.example must not have TestOwner123!');
});
