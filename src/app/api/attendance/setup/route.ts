import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET() {
  try {
    const admin = createClient(supabaseUrl, supabaseKey);
    const tableStatus: Record<string, string> = {};

    const tables = ['staff_profiles', 'shifts', 'staff_shifts', 'staff_attendance', 'salary_records'];

    for (const t of tables) {
      const { data, error } = await admin.from(t).select('id').limit(1);
      tableStatus[t] = error ? `NOT_FOUND: ${error.message}` : 'READY';
    }

    return NextResponse.json({
      success: true,
      tables: tableStatus,
      migration_file: 'supabase/migrations/20261021000000_staff_attendance_payroll.sql'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
