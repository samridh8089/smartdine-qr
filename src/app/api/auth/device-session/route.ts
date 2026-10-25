import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');
    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    const { data: rest, error } = await supabaseAdmin
      .from('restaurants')
      .select('settings')
      .eq('id', restaurantId)
      .maybeSingle();

    if (error || !rest) {
      return NextResponse.json({ devices: [] });
    }

    const activeDevicesObj = rest.settings?.active_devices || {};
    const devicesList = Object.values(activeDevicesObj);
    return NextResponse.json({ devices: devicesList });
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

    const { data: rest, error: fetchErr } = await supabaseAdmin
      .from('restaurants')
      .select('settings')
      .eq('id', restaurantId)
      .maybeSingle();

    if (fetchErr || !rest) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const currentSettings = rest.settings || {};
    let activeDevices = { ...(currentSettings.active_devices || {}) };

    if (action === 'register') {
      if (!deviceId) {
        return NextResponse.json({ error: 'deviceId is required' }, { status: 400 });
      }

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
        device_name: deviceName || 'Web Device',
        platform: platform || 'Desktop',
        user_email: userEmail || '',
        user_id: userId || '',
        is_trusted: true,
        last_active_at: new Date().toISOString()
      };
    } else if (action === 'logout_device' || action === 'remove_device') {
      if (targetDeviceId && activeDevices[targetDeviceId]) {
        delete activeDevices[targetDeviceId];
      }
    } else if (action === 'logout_all') {
      activeDevices = {};
    }

    const { error: updateErr } = await supabaseAdmin
      .from('restaurants')
      .update({
        settings: {
          ...currentSettings,
          active_devices: activeDevices
        }
      })
      .eq('id', restaurantId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, devices: Object.values(activeDevices) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to manage device session' }, { status: 500 });
  }
}
