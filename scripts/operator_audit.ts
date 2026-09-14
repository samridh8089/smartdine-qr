import fs from 'fs';
import path from 'path';
import { db } from '../src/lib/db';
import { supabase } from '../src/lib/supabase';

async function main() {
  console.log('=== OPERATOR AUDIT: INITIAL INSPECTION ===');
  
  const res = await supabase.from('restaurants').select('*');
  console.log('Supabase query result:');
  console.log('Error:', res.error);
  console.log('Data length:', res.data?.length);
  if (res.data && res.data.length > 0) {
    console.log('First restaurant:', res.data[0].id, res.data[0].name, res.data[0].slug);
  }
}

main().catch(console.error);
