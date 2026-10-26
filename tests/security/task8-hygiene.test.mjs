import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

test('TASK 8: README.md is comprehensive with required sections', () => {
  const readme = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf8');
  assert.ok(readme.includes('Architecture Overview'), 'README must have Architecture section');
  assert.ok(readme.includes('packages/core'), 'README must mention packages/core');
  assert.ok(readme.includes('smartdine-mobile'), 'README must mention mobile');
  assert.ok(readme.includes('electron'), 'README must mention electron');
  assert.ok(readme.includes('Setup Steps'), 'README must have Setup Steps');
  assert.ok(readme.includes('NEXT_PUBLIC_SUPABASE_URL'), 'README must list required env vars');
  assert.ok(readme.includes('Running Verification & Tests'), 'README must have test execution instructions');
});

test('TASK 8: GitHub Actions CI workflow exists and runs required quality gates', () => {
  const ciPath = path.join(rootDir, '.github/workflows/ci.yml');
  assert.ok(fs.existsSync(ciPath), 'ci.yml must exist');
  const ci = fs.readFileSync(ciPath, 'utf8');
  assert.ok(ci.includes('npm run lint'), 'CI must run lint');
  assert.ok(ci.includes('tsc --noEmit'), 'CI must run typecheck');
  assert.ok(ci.includes('playwright test'), 'CI must run e2e tests');
  assert.ok(ci.includes('npm audit --omit=dev'), 'CI must run npm audit');
  assert.ok(ci.includes('gitleaks'), 'CI must run gitleaks');
});

test('TASK 8: src/lib/ has no loose test or migration scripts', () => {
  const libFiles = fs.readdirSync(path.join(rootDir, 'src/lib'));
  const rogueFiles = libFiles.filter(f => f.startsWith('test_') || f.startsWith('apply_'));
  assert.deepStrictEqual(rogueFiles, [], 'src/lib must have no test_*.ts or apply_*_migration.ts files');
});
