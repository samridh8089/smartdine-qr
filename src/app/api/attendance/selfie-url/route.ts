import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyStaffRequest } from '@/lib/staffAuthGuard';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || serviceKey === '[SENSITIVE]') {
    throw new Error('Supabase admin service role key is required and missing');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');
    const path = searchParams.get('path');
    const attendanceId = searchParams.get('attendanceId');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    // Security check: Only Owner and Manager can access signed URLs for attendance selfies
    const authCheck = await verifyStaffRequest(
      req,
      ['owner', 'manager', 'super_admin'],
      restaurantId
    );

    if (!authCheck.isAuthorized) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Only owners and managers can access attendance selfies' },
        { status: 403 }
      );
    }

    const admin = getSupabaseAdmin();
    let targetPath = path;

    // If attendanceId was passed instead of path, look up path in staff_attendance table
    if (!targetPath && attendanceId) {
      const { data: attRecord, error: attErr } = await admin
        .from('staff_attendance')
        .select('selfie_url, restaurant_id')
        .eq('id', attendanceId)
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (attErr || !attRecord || !attRecord.selfie_url) {
        return NextResponse.json({ error: 'Selfie not found for this attendance record' }, { status: 404 });
      }

      targetPath = attRecord.selfie_url;
    }

    if (!targetPath) {
      return NextResponse.json({ error: 'path or attendanceId is required' }, { status: 400 });
    }

    // Clean leading slash or bucket name if present
    let cleanPath = targetPath.replace(/^\/+/, '').replace(/^attendance-selfies\//, '');

    // Prevent IDOR: path must start with the restaurantId folder
    if (!cleanPath.startsWith(restaurantId + '/') && !cleanPath.startsWith(restaurantId)) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Cannot access selfies from another restaurant' },
        { status: 403 }
      );
    }

    // Generate short-lived signed URL (300 seconds / 5 minutes)
    const { data: signedData, error: signErr } = await admin.storage
      .from('attendance-selfies')
      .createSignedUrl(cleanPath, 300);

    if (signErr || !signedData?.signedUrl) {
      console.warn('[attendance/selfie-url] Signed URL generation notice:', signErr?.message);
      return NextResponse.json(
        { error: 'Failed to generate signed URL', message: signErr?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      signedUrl: signedData.signedUrl,
      expiresIn: 300
    });
  } catch (err: any) {
    console.error('[attendance/selfie-url] Unexpected error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
