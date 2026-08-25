import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const restId = 'c1853f65-c10c-4f8a-b379-00a60f404ef9';
  const { data: tables } = await supabase.from('tables').select('*').eq('restaurant_id', restId);
  console.log('TABLES FOR FOODY HUB:', JSON.stringify(tables, null, 2));

  if (!tables || tables.length === 0) {
    const { data: newTable, error } = await supabase.from('tables').insert({ restaurant_id: restId, name: 'Table 1' }).select();
    console.log('CREATED TABLE 1:', newTable, error);
  }
}

checkTables();
