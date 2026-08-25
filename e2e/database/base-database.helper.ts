/**
 * SmartDine SaaS — Base Database Helper
 * Phase 7A.2 — Infrastructure
 *
 * Spec Reference: Appendix I (Test Data Management Strategy)
 */

import { EnvironmentHelper } from '../helpers/environment.helper';

export class BaseDatabaseHelper {
  protected supabaseUrl = EnvironmentHelper.supabaseUrl;
  protected serviceRoleKey = EnvironmentHelper.supabaseServiceKey;

  /**
   * Health check to confirm database connection configuration.
   */
  public isConfigured(): boolean {
    return Boolean(this.supabaseUrl && this.serviceRoleKey);
  }

  /**
   * Cleans ephemeral test records matching a given prefix.
   */
  public async cleanupEphemeralRecords(table: string, prefix: string): Promise<void> {
    if (!this.isConfigured()) return;
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(this.supabaseUrl, this.serviceRoleKey);
      if (table === 'orders') {
        await supabase.from('orders').delete().ilike('id', `${prefix}%`);
      } else {
        await supabase.from(table).delete().ilike('name', `${prefix}%`);
      }
    } catch (err) {
      console.warn(`[BaseDatabaseHelper] Cleanup skipped for ${table}: ${err}`);
    }
  }

  /**
   * TDM-003: Ephemeral Data Creation Helpers
   */

  public async createTestOrder(restaurantId: string, tableSlug: string, items: any[]): Promise<string> {
    if (!this.isConfigured()) return 'mock-order-id';
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(this.supabaseUrl, this.serviceRoleKey);
      const { data, error } = await supabase.from('orders').insert({
        restaurant_id: restaurantId,
        table_slug: tableSlug,
        status: 'new',
        subtotal: items.reduce((acc, item) => acc + item.subtotal, 0),
        discount: 0,
        gst: 0,
        service_charge: 0,
        grand_total: items.reduce((acc, item) => acc + item.subtotal, 0),
      }).select('id').single();
      if (error) throw error;

      if (items.length > 0) {
        const orderItems = items.map((i) => ({
          order_id: data.id,
          menu_item_id: i.menu_item_id,
          item_name: i.item_name,
          price: i.price,
          quantity: i.quantity,
          subtotal: i.subtotal,
        }));
        await supabase.from('order_items').insert(orderItems);
      }
      return data.id;
    } catch (err) {
      console.error('[BaseDatabaseHelper] Failed to create test order:', err);
      throw err;
    }
  }

  public async createTestCustomerRequest(restaurantId: string, tableSlug: string): Promise<string> {
    if (!this.isConfigured()) return 'mock-request-id';
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(this.supabaseUrl, this.serviceRoleKey);
      const { data, error } = await supabase.from('customer_requests').insert({
        restaurant_id: restaurantId,
        table_slug: tableSlug,
        status: 'pending',
      }).select('id').single();
      if (error) throw error;
      return data.id;
    } catch (err) {
      console.error('[BaseDatabaseHelper] Failed to create test customer request:', err);
      throw err;
    }
  }

  public async createTestStaffAccount(email: string, password: string, name: string, role: string, restaurantId: string): Promise<string> {
    if (!this.isConfigured()) return 'mock-staff-id';
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(this.supabaseUrl, this.serviceRoleKey);
      
      // Create user in Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (authError) throw authError;

      const userId = authData.user.id;

      // Upsert profile
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        email,
        name,
        role,
        restaurant_id: restaurantId,
      });
      if (profileError) throw profileError;

      return userId;
    } catch (err) {
      console.error('[BaseDatabaseHelper] Failed to create test staff account:', err);
      throw err;
    }
  }
}
