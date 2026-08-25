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
      return NextResponse.json({ assignments: [] });
    }

    const assignments = rest.settings?.table_assignments || [];
    return NextResponse.json({ assignments: assignments.filter((a: any) => a.active !== false) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch assignments' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    const body = await req.json();
    const { restaurantId, assignments, requesterUserId } = body;

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    // Fetch restaurant settings
    const { data: rest, error: fetchErr } = await supabaseAdmin
      .from('restaurants')
      .select('settings')
      .eq('id', restaurantId)
      .maybeSingle();

    if (fetchErr || !rest) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const updatedSettings = {
      ...rest.settings,
      table_assignments: assignments || []
    };

    const { error: updateErr } = await supabaseAdmin
      .from('restaurants')
      .update({ settings: updatedSettings })
      .eq('id', restaurantId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message || 'Failed to update table assignments' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Table assignments updated successfully',
      assignments: assignments || []
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error updating assignments' }, { status: 500 });
  }
}
