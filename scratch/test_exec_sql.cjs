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

async function createAiUsageTables() {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.ai_usage (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
      feature_key TEXT NOT NULL,
      usage_count INTEGER NOT NULL DEFAULT 0,
      usage_month TEXT NOT NULL,
      limit_snapshot INTEGER,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(restaurant_id, feature_key, usage_month)
    );

    CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
      feature_key TEXT NOT NULL,
      usage_month TEXT NOT NULL,
      request_id TEXT,
      items_processed INTEGER NOT NULL DEFAULT 0,
      credits_consumed INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Allow public all access on ai_usage" ON public.ai_usage FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow public all access on ai_usage_logs" ON public.ai_usage_logs FOR ALL USING (true) WITH CHECK (true);
  `;

  // Test exec_sql rpc
  const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql });
  console.log('exec_sql result:', data, 'error:', error?.message);
}

createAiUsageTables();
