import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ServerTimer } from '@/lib/serverTiming';
import { generateRequestId, logEvent } from '@/lib/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET'
];

export async function GET(req: Request) {
  const totalStart = performance.now();
  const timer = new ServerTimer();
  const requestId = req.headers.get('x-request-id') || generateRequestId();

  // 1. Environment Variable Validation
  timer.start('env_check');
  const missingEnvVars = REQUIRED_ENV_VARS.filter(key => !process.env[key]);
  timer.end('env_check');

  const checks: Record<string, any> = {
    environmentVariables: {
      status: missingEnvVars.length === 0 ? 'pass' : 'warn',
      missing: missingEnvVars
    }
  };

  // 2. Deep Database Connectivity & Query Verification
  let isDbReady = false;
  timer.start('db');
  try {
    if (supabaseUrl && supabaseKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabaseAdmin.from('pricing_plans').select('id').limit(1);
      if (!error) {
        isDbReady = true;
        checks.database = { status: 'pass', latencyMs: Math.round(performance.now() - totalStart) };
      } else {
        checks.database = { status: 'fail', error: error.message };
      }
    } else {
      checks.database = { status: 'fail', error: 'Missing Supabase credentials' };
    }
  } catch (err: any) {
    checks.database = { status: 'fail', error: err.message };
  }
  timer.end('db');

  const isReady = isDbReady;
  const statusCode = isReady ? 200 : 503;
  const durationMs = Math.round(performance.now() - totalStart);

  logEvent({
    requestId,
    level: isReady ? 'info' : 'warn',
    context: 'API-Readiness-Probe',
    message: isReady ? 'System ready for production traffic' : 'Readiness check failed',
    durationMs,
    statusCode,
    metadata: { checks }
  });

  const response = NextResponse.json(
    {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      latencyMs: durationMs,
      requestId,
      checks
    },
    { status: statusCode }
  );

  response.headers.set('X-Request-ID', requestId);
  response.headers.set('Server-Timing', timer.getHeaderString(totalStart));
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  return response;
}
