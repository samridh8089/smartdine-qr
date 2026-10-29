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

    if (!path && !attendanceId) {
      return NextResponse.json({ error: 'path or attendanceId is required' }, { status: 400 });
    }

    // Path traversal / malformed path validation: reject '..' or '//'
    if (path) {
      if (path.includes('..') || path.includes('//') || path.includes('\\')) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'Invalid path: directory traversal or double slashes are not allowed' },
          { status: 400 }
        );
      }
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
    let cleanPath = '';

    if (path) {
      cleanPath = path.replace(/^\/+/, '').replace(/^attendance-selfies\//, '');

      // Double-check sanitized cleanPath
      if (cleanPath.includes('..') || cleanPath.includes('//') || cleanPath.includes('\\')) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'Invalid path format' },
          { status: 400 }
        );
      }

      // Prevent IDOR: path must start with the restaurantId folder
      if (!cleanPath.startsWith(restaurantId + '/') && cleanPath !== restaurantId) {
        return NextResponse.json(
          { error: 'FORBIDDEN', message: 'Cannot access selfies from another restaurant' },
          { status: 403 }
        );
      }

      // Requirement: "path" parameter ke liye bhi staff_attendance table se verify karo ki woh path usi restaurant ke record ka hai.
      const { data: record, error: recordErr } = await admin
        .from('staff_attendance')
        .select('id, selfie_url')
        .eq('restaurant_id', restaurantId)
        .or(`selfie_url.eq.${path},selfie_url.eq.${cleanPath}`)
        .limit(1)
        .maybeSingle();

      if (recordErr || !record || !record.selfie_url) {
        return NextResponse.json(
          { error: 'NOT_FOUND', message: 'Selfie record not found for this restaurant' },
          { status: 404 }
        );
      }
    } else if (attendanceId) {
      // Look up path in staff_attendance table by attendanceId
      const { data: attRecord, error: attErr } = await admin
        .from('staff_attendance')
        .select('selfie_url, restaurant_id')
        .eq('id', attendanceId)
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (attErr || !attRecord || !attRecord.selfie_url) {
        return NextResponse.json(
          { error: 'NOT_FOUND', message: 'Selfie not found for this attendance record' },
          { status: 404 }
        );
      }

      cleanPath = attRecord.selfie_url.replace(/^\/+/, '').replace(/^attendance-selfies\//, '');
      if (cleanPath.includes('..') || cleanPath.includes('//') || cleanPath.includes('\\')) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'Invalid path stored in record' },
          { status: 400 }
        );
      }
    }

    // Generate short-lived signed URL (300 seconds / 5 minutes) via service-role
    const { data: signedData, error: signErr } = await admin.storage
      .from('attendance-selfies')
      .createSignedUrl(cleanPath, 300);

    if (signErr || !signedData?.signedUrl) {
      console.warn('[attendance/selfie-url] Signed URL generation notice:', signErr?.message);
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', message: 'Failed to generate signed URL' },
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
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: 'Internal server error' }, { status: 500 });
  }
}
