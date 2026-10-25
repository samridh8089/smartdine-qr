import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { verifyStaffRequest } from '@/lib/staffAuthGuard';

let _supabaseAdmin: SupabaseClient | null = null;
function getSupabaseClient() {
  if (_supabaseAdmin) return _supabaseAdmin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service role configuration');
  _supabaseAdmin = createClient(url, key, { auth: { persistSession: false } });
  return _supabaseAdmin;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');
    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    // Tenant Isolation Guard: only authorized staff of this restaurant
    const authCheck = await verifyStaffRequest(
      req,
      ['owner', 'manager', 'supervisor', 'super_admin'],
      restaurantId
    );
    if (!authCheck.isAuthorized) {
      return authCheck.response || NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const client = getSupabaseClient();

    const { data: rest, error } = await client
      .from('restaurants')
      .select('settings')
      .eq('id', restaurantId)
      .maybeSingle();

    const activeDevicesObj = rest?.settings?.active_devices || {};
    const webDevices = Object.values(activeDevicesObj);

    const { data: profiles } = await client
      .from('profiles')
      .select('id, email, full_name, role, push_token, updated_at')
      .eq('restaurant_id', restaurantId)
      .not('push_token', 'is', null);

    const appDevices: any[] = [];
    if (profiles && profiles.length > 0) {
      for (const p of profiles) {
        if (!p.push_token) continue;
        const isNativeMobileToken = p.push_token.startsWith('ExponentPushToken') || 
                                   p.push_token.includes(':APA91b') || 
                                   (!p.push_token.startsWith('{') && p.push_token.length > 20);

        if (isNativeMobileToken) {
          appDevices.push({
            device_id: `app_session_${p.id}`,
            device_session_id: `app_session_${p.id}`,
            device_name: `CleverOps Android App (${p.full_name || p.role || 'Staff'})`,
            platform: 'Mobile',
            user_email: p.email,
            user_id: p.id,
            is_trusted: true,
            is_current: false,
            is_app: true,
            last_active_at: p.updated_at || new Date().toISOString()
          });
        }
      }
    }

    const allDevices = [...webDevices, ...appDevices];
    return NextResponse.json({ devices: allDevices });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch devices' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { restaurantId, action = 'register', deviceId, deviceName, platform, userEmail, userId, targetDeviceId } = body;

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    // Require staff authorization for device management
    const authCheck = await verifyStaffRequest(
      req,
      action === 'register'
        ? ['owner', 'manager', 'supervisor', 'head_chef', 'chef', 'kitchen', 'waiter', 'captain', 'cashier', 'super_admin']
        : ['owner', 'manager', 'super_admin'],
      restaurantId
    );
    if (!authCheck.isAuthorized) {
      return authCheck.response || NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const client = getSupabaseClient();

    const { data: rest, error: fetchErr } = await client
      .from('restaurants')
      .select('settings')
      .eq('id', restaurantId)
      .maybeSingle();

    if (fetchErr || !rest) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const currentSettings = rest.settings || {};
    let activeDevices = { ...(currentSettings.active_devices || {}) };
    let revokedDevices = { ...(currentSettings.revoked_devices || {}) };

    if (action === 'register') {
      if (!deviceId) {
        return NextResponse.json({ error: 'deviceId is required' }, { status: 400 });
      }

      // If this device was previously in revoked list, remove it upon fresh active registration
      delete revokedDevices[deviceId];

      // Cleanup devices inactive for > 30 days
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      for (const [id, dev] of Object.entries(activeDevices) as [string, any][]) {
        if (dev.last_active_at && new Date(dev.last_active_at).getTime() < thirtyDaysAgo) {
          delete activeDevices[id];
        }
      }

      // Upsert current device
      activeDevices[deviceId] = {
        device_id: deviceId,
        device_session_id: deviceId,
        device_name: deviceName || 'Web Device',
        platform: platform || 'Desktop',
        user_email: userEmail || '',
        user_id: userId || '',
        is_trusted: true,
        last_active_at: new Date().toISOString()
      };
    } else if (action === 'logout_device' || action === 'remove_device') {
      if (targetDeviceId) {
        // Add to revokedDevices so target device gets kicked out on next tick/heartbeat
        revokedDevices[targetDeviceId] = {
          revoked_at: new Date().toISOString()
        };

        // If target is a native mobile app session, clear push_token from profile
        if (targetDeviceId.startsWith('app_session_')) {
          const profileId = targetDeviceId.replace('app_session_', '');
          await client
            .from('profiles')
            .update({ push_token: null, updated_at: new Date().toISOString() })
            .eq('id', profileId);
        }

        // Delete from active_devices in restaurant settings
        delete activeDevices[targetDeviceId];
        for (const [k, v] of Object.entries(activeDevices) as [string, any][]) {
          if (v.device_id === targetDeviceId || v.device_session_id === targetDeviceId || k === targetDeviceId) {
            delete activeDevices[k];
          }
        }
      }
    } else if (action === 'logout_all') {
      for (const k of Object.keys(activeDevices)) {
        revokedDevices[k] = { revoked_at: new Date().toISOString() };
      }
      activeDevices = {};
      await client
        .from('profiles')
        .update({ push_token: null, updated_at: new Date().toISOString() })
        .eq('restaurant_id', restaurantId);
    }

    // Prune revoked devices older than 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const [id, rev] of Object.entries(revokedDevices) as [string, any][]) {
      if (rev.revoked_at && new Date(rev.revoked_at).getTime() < sevenDaysAgo) {
        delete revokedDevices[id];
      }
    }

    const { error: updateErr } = await client
      .from('restaurants')
      .update({
        settings: {
          ...currentSettings,
          active_devices: activeDevices,
          revoked_devices: revokedDevices
        }
      })
      .eq('id', restaurantId);

    if (updateErr) {
      console.warn('Device session update notice:', updateErr.message);
    }

    return NextResponse.json({ success: true, devices: Object.values(activeDevices) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to manage device session' }, { status: 500 });
  }
}
