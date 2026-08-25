const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function testStorage() {
  const { data: rest } = await supabaseAdmin.from('restaurants').select('*').eq('slug', 'bistro').maybeSingle();
  console.log('Current settings:', rest.settings);

  const newSettings = {
    ...(rest.settings || {}),
    ai_usage: {
      '2026-08': {
        ai_menu_analysis: 78,
        ai_recipe_generation: 42
      }
    }
  };

  const { error: uErr } = await supabaseAdmin.from('restaurants').update({ settings: newSettings }).eq('id', rest.id);
  console.log('Update settings error:', uErr?.message || 'NONE (Success)');

  const { data: updatedRest } = await supabaseAdmin.from('restaurants').select('settings').eq('id', rest.id).maybeSingle();
  console.log('Updated settings in DB:', updatedRest.settings);

  const { error: aErr } = await supabaseAdmin.from('audit_logs').insert({
    restaurant_id: rest.id,
    user_email: 'system@cleverops.in',
    action: 'ai_credit_consumed',
    details: JSON.stringify({
      feature: 'ai_menu_analysis',
      items_processed: 78,
      credits_consumed: 78,
      billing_period: '2026-08',
      request_id: `req_${Date.now()}`
    })
  });

  console.log('Insert audit log error:', aErr?.message || 'NONE (Success)');
}

testStorage();
