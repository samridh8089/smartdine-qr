import { chromium } from 'playwright';

async function testClientDbCreateOrder() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.cleverops.in/menu/foodyhub/table/433daa89-186c-454c-a978-e184a85577b2');
  await page.waitForTimeout(3000);

  const evalResult = await page.evaluate(async () => {
    try {
      // Find the window db object or trigger handlePlaceOrder and catch error
      // In CustomerMenu, let's see what error db.createOrder throws
      // We can test by importing or running Supabase insert directly from client
      // @ts-ignore
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const client = createClient('https://tiuwfhkrjvtkshebdwlp.supabase.co', 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-');
      
      const { data, error } = await client.from('orders').insert({
        restaurant_id: '81fa8201-51d7-4da5-98f5-a52dbff4e6ae',
        table_id: '433daa89-186c-454c-a978-e184a85577b2',
        table_name: 'Table 1',
        status: 'new',
        order_type: 'dine_in',
        payment_status: 'pending',
        subtotal: 180,
        total: 189
      }).select();

      return { data, error };
    } catch (e) {
      return { caught: e.message };
    }
  });

  console.log('Client anon key insert result:', JSON.stringify(evalResult, null, 2));
  await browser.close();
}

testClientDbCreateOrder().catch(console.error);
