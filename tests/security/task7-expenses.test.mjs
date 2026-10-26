import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

test('TASK 7: Migration 20261026000004_restaurant_expenses_update_with_check.sql exists with WITH CHECK', () => {
  const migPath = path.join(rootDir, 'supabase/migrations/20261026000004_restaurant_expenses_update_with_check.sql');
  assert.ok(fs.existsSync(migPath), 'Migration file must exist');
  const sql = fs.readFileSync(migPath, 'utf8');
  assert.ok(sql.includes('WITH CHECK'), 'Policy must contain explicit WITH CHECK');
  assert.ok(sql.includes('restaurant_id IN'), 'WITH CHECK must scope restaurant_id');
});

test('TASK 7: pnlEngine.ts has zero reads or writes to settings.expenses', () => {
  const pnlContent = fs.readFileSync(path.join(rootDir, 'src/lib/pnlEngine.ts'), 'utf8');
  assert.ok(!pnlContent.includes('settings.expenses'), 'Must not read settings.expenses');
  assert.ok(!pnlContent.includes('expenses: updatedExpenses'), 'Must not write expenses to settings');
  assert.ok(!pnlContent.includes('expenses: updated'), 'Must not write expenses to settings');
  assert.ok(!pnlContent.includes('expenses: filtered'), 'Must not write expenses to settings');
});
