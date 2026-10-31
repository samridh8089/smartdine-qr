import { supabase } from '@/lib/supabase';
import { ExpenseCategory, RestaurantExpense } from '@/lib/pnlEngine';

export interface PettyCashExpenseInput {
  restaurantId: string;
  title: string;
  category?: ExpenseCategory;
  amount: number;
  expenseDate?: string;
  paymentMode?: 'cash' | 'upi' | 'store_inventory';
  staffProfile: {
    id: string;
    name?: string;
    role: string;
  };
  vendorName?: string;
  notes?: string;
  receiptUrl?: string;
}

export interface StoreRequisitionInput {
  restaurantId: string;
  inventoryItemId: string;
  quantity: number;
  issuedToName: string;
  purposeNote?: string;
  staffProfile: {
    id: string;
    name?: string;
    role: string;
  };
}

export interface ExpenseApprovalInput {
  expenseId: string;
  action: 'approved' | 'rejected';
  approverProfile: {
    id: string;
    name?: string;
    role: string;
  };
  rejectionReason?: string;
}

/**
 * 1. Record a Petty Cash / Counter Expense (e.g. Cashier / Manager buys Phenyl, Broom, Milk)
 *    Cashier entries default to 'pending_approval' for Owner/Manager approval.
 */
export async function recordPettyCashExpense(input: PettyCashExpenseInput): Promise<{
  success: boolean;
  data?: RestaurantExpense;
  error?: string;
}> {
  const {
    restaurantId,
    title,
    category = 'maintenance',
    amount,
    expenseDate = new Date().toISOString().split('T')[0],
    paymentMode = 'cash',
    staffProfile,
    vendorName,
    notes,
    receiptUrl,
  } = input;

  if (!restaurantId || !title || amount <= 0) {
    return { success: false, error: 'Title and a valid positive amount are required.' };
  }

  const actorRole = staffProfile.role?.toLowerCase() || 'cashier';
  const isManagerOrOwner = ['owner', 'manager', 'super_admin'].includes(actorRole);

  // Cashier requires approval; Manager and Owner are auto-approved
  const approvalStatus = isManagerOrOwner ? 'approved' : 'pending_approval';
  const approvedBy = isManagerOrOwner ? staffProfile.id : null;
  const metaNote = `[Staff: ${staffProfile.name || staffProfile.role || 'Staff'} | Source: cash_counter${approvedBy ? ` | Approved by: ${approvedBy}` : ''}]`;
  const combinedNotes = notes?.trim() ? `${notes.trim()} ${metaNote}` : metaNote;

  try {
    const insertPayload: Record<string, any> = {
      restaurant_id: restaurantId,
      title: title.trim(),
      category,
      amount: Math.round(Number(amount) * 100) / 100,
      expense_date: expenseDate,
      payment_mode: paymentMode,
      vendor_name: vendorName?.trim() || null,
      receipt_url: receiptUrl || null,
      notes: combinedNotes,
      created_by: staffProfile.id,
      approval_status: approvalStatus,
    };

    let { data, error } = await supabase
      .from('restaurant_expenses')
      .insert(insertPayload)
      .select()
      .single();

    if (error && (error.code === 'PGRST204' || error.message?.includes('approval_status') || error.message?.includes('schema cache'))) {
      console.warn('[PettyCashService] approval_status column missing in restaurant_expenses, retrying without approval columns...');
      delete insertPayload.approval_status;
      const fallbackRes = await supabase
        .from('restaurant_expenses')
        .insert(insertPayload)
        .select()
        .single();
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) {
      console.error('[PettyCashService] Insert error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to record petty cash expense.' };
  }
}

/**
 * 2. Issue Store Room Inventory Stock (Requisition)
 *    Deducts stock from inventory_items, logs in inventory_transactions,
 *    and maps item cost to restaurant_expenses (payment_mode: 'store_inventory').
 *    NOTE: Does NOT touch the frozen inventoryEngine.ts!
 */
export async function issueStoreStockRequisition(input: StoreRequisitionInput): Promise<{
  success: boolean;
  item?: any;
  afterStock?: number;
  expenseAmount?: number;
  error?: string;
}> {
  const {
    restaurantId,
    inventoryItemId,
    quantity,
    issuedToName,
    purposeNote,
    staffProfile,
  } = input;

  const qty = Number(quantity);
  if (!restaurantId || !inventoryItemId || isNaN(qty) || qty <= 0) {
    return { success: false, error: 'Please specify a valid item and quantity.' };
  }

  try {
    // 1. Fetch current item details
    const { data: item, error: fetchErr } = await supabase
      .from('inventory_items')
      .select('id, name, unit, current_stock, cost_per_unit, category')
      .eq('id', inventoryItemId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (fetchErr || !item) {
      return { success: false, error: 'Inventory item not found.' };
    }

    const beforeStock = Number(item.current_stock || 0);
    const afterStock = Math.max(0, Math.round((beforeStock - qty) * 10000) / 10000);
    const unitCost = Number(item.cost_per_unit || 0);
    const totalCostImpact = Math.round(qty * unitCost * 100) / 100;
    const actorName = staffProfile.name || staffProfile.role || 'Staff';

    // 2. Decrement stock in inventory_items
    const { error: stockErr } = await supabase
      .from('inventory_items')
      .update({
        current_stock: afterStock,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inventoryItemId);

    if (stockErr) {
      return { success: false, error: `Stock deduction failed: ${stockErr.message}` };
    }

    // 3. Log audit record in inventory_transactions
    const transactionNote = `Store requisition issued to ${issuedToName}${purposeNote ? ` (${purposeNote})` : ''}: -${qty} ${item.unit}`;
    const { error: txErr } = await supabase
      .from('inventory_transactions')
      .insert({
        restaurant_id: restaurantId,
        inventory_item_id: inventoryItemId,
        quantity: -qty,
        unit: item.unit,
        before_stock: beforeStock,
        after_stock: afterStock,
        transaction_type: 'INTERNAL_CONSUMPTION',
        reference_type: 'store_requisition',
        user_id: staffProfile.id,
        user_name: actorName,
        notes: transactionNote,
      });

    if (txErr) {
      console.warn('[PettyCashService] Audit transaction log warning:', txErr.message);
    }

    // 4. Record expense in restaurant_expenses (Operating Overhead)
    // payment_mode is 'store_inventory', so cash register balance is NOT affected
    if (totalCostImpact > 0) {
      const expenseTitle = `Store Stock Consumed: ${item.name} (${qty} ${item.unit})`;
      const expInsertPayload: any = {
        restaurant_id: restaurantId,
        title: expenseTitle,
        category: 'maintenance',
        amount: totalCostImpact,
        expense_date: new Date().toISOString().split('T')[0],
        payment_mode: 'store_inventory',
        expense_source: 'store_inventory',
        inventory_item_id: item.id,
        approval_status: 'approved',
        approved_by: staffProfile.id,
        approved_at: new Date().toISOString(),
        staff_name: actorName,
        created_by: staffProfile.id,
        notes: `Issued to: ${issuedToName}. ${purposeNote || ''}`.trim(),
      };
      let { error: expErr } = await supabase.from('restaurant_expenses').insert(expInsertPayload);
      if (expErr && (expErr.code === 'PGRST204' || expErr.message?.includes('approval_status') || expErr.message?.includes('schema cache'))) {
        delete expInsertPayload.approval_status;
        delete expInsertPayload.approved_by;
        delete expInsertPayload.approved_at;
        await supabase.from('restaurant_expenses').insert(expInsertPayload);
      }
    }

    return {
      success: true,
      item,
      afterStock,
      expenseAmount: totalCostImpact,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to issue store stock.' };
  }
}

/**
 * 3. Approve or Reject an Expense (Owner / Manager only)
 */
export async function approveOrRejectExpense(input: ExpenseApprovalInput): Promise<{
  success: boolean;
  error?: string;
}> {
  const { expenseId, action, approverProfile, rejectionReason } = input;
  const role = approverProfile.role?.toLowerCase() || '';

  if (!['owner', 'manager', 'super_admin'].includes(role)) {
    return { success: false, error: 'Only Owners and Managers are authorized to approve expenses.' };
  }

  try {
    const updatePayload: Record<string, any> = {
      approval_status: action,
      approved_by: approverProfile.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (action === 'rejected' && rejectionReason) {
      updatePayload.notes = `[REJECTED: ${rejectionReason}]`;
    }

    const { error } = await supabase
      .from('restaurant_expenses')
      .update(updatePayload)
      .eq('id', expenseId);

    if (error) {
      if (error.code === 'PGRST204' || error.message?.includes('approval_status') || error.message?.includes('schema cache')) {
        await supabase.from('restaurant_expenses').update({
          notes: `[STATUS: ${action}] ${rejectionReason ? `Reason: ${rejectionReason}` : ''}`.trim(),
          updated_at: new Date().toISOString(),
        }).eq('id', expenseId);
        return { success: true };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update expense approval status.' };
  }
}

/**
 * 4. Fetch expenses for a specific date (for Cash Register closing and audit list)
 */
export async function fetchDayExpenses(restaurantId: string, dateStr: string): Promise<RestaurantExpense[]> {
  try {
    const { data, error } = await supabase
      .from('restaurant_expenses')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('expense_date', dateStr)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as RestaurantExpense[];
  } catch (_) {
    return [];
  }
}
