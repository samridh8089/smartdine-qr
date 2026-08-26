import { supabase } from './supabase';

async function testProfileCols() {
  const { data: prof, error } = await supabase.from('profiles').select('*').limit(1);
  console.log('Profile columns:', prof, error);
}

testProfileCols();
