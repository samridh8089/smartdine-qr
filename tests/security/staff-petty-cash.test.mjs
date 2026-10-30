import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

test('PETTY CASH MIGRATION: 20261031000000_staff_petty_cash_and_requisitions.sql exists with WITH CHECK', () => {
  const migPath = path.join(rootDir, 'supabase/migrations/20261031000000_staff_petty_cash_and_requisitions.sql');
  assert.ok(fs.existsSync(migPath), 'Migration file must exist');
  const sql = fs.readFileSync(migPath, 'utf8');
  assert.ok(sql.includes('WITH CHECK'), 'Policy must contain explicit WITH CHECK');
  assert.ok(sql.includes('restaurant_id IN'), 'WITH CHECK must scope restaurant_id');
  assert.ok(sql.includes('approval_status'), 'Must define approval_status column');
  assert.ok(sql.includes('cashier'), 'Must include cashier in allowed roles');
  assert.ok(sql.includes('store_inventory'), 'Must include store_inventory in payment_mode check');
});

test('PETTY CASH SERVICE: pettyCashRequisitionService.ts exports required functions', async () => {
  const servicePath = path.join(rootDir, 'src/lib/pettyCashRequisitionService.ts');
  assert.ok(fs.existsSync(servicePath), 'pettyCashRequisitionService.ts must exist');
  const content = fs.readFileSync(servicePath, 'utf8');
  assert.ok(content.includes('export async function recordPettyCashExpense'), 'Must export recordPettyCashExpense');
  assert.ok(content.includes('export async function issueStoreStockRequisition'), 'Must export issueStoreStockRequisition');
  assert.ok(content.includes('export async function approveOrRejectExpense'), 'Must export approveOrRejectExpense');
  assert.ok(content.includes('export async function fetchDayExpenses'), 'Must export fetchDayExpenses');
  assert.ok(content.includes('pending_approval'), 'Must enforce pending_approval for cashier');
});

test('INVENTORY FREEZE: inventoryEngine.ts remains unmodified', () => {
  const engineContent = fs.readFileSync(path.join(rootDir, 'src/lib/inventoryEngine.ts'), 'utf8');
  assert.ok(!engineContent.includes('issueStoreStockRequisition'), 'Frozen inventory engine must not be modified');
});
