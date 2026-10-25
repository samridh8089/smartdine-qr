import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySuperAdminRequest } from '@/lib/superAdminGuard';

export async function GET(req: Request) {
  try {
    const authCheck = await verifySuperAdminRequest(req);
    if (!authCheck.isSuperAdmin) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Super admin authorization required' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase service role configuration' }, { status: 500 });
    }

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
