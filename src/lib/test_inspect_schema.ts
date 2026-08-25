import { supabase } from './supabase';

async function testInspect() {
  console.log('Testing Supabase queries...');
  const { data: profs, error: pErr } = await supabase.from('profiles').select('*').limit(5);
  console.log('Profiles sample:', profs, pErr);

  const { data: tables, error: tErr } = await supabase.from('tables').select('*').limit(5);
  console.log('Tables sample:', tables, tErr);

  const { data: assign, error: aErr } = await supabase.from('table_assignments').select('*').limit(5);
  console.log('Table assignments query:', assign, aErr);
}

testInspect();
