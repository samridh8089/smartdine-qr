import { NextResponse } from 'next/server';
import { generateRequestId } from '@/lib/logger';

const startTime = Date.now();
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0-production';

export async function GET(req: Request) {
  const requestId = req.headers.get('x-request-id') || generateRequestId();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  const response = NextResponse.json({
    status: 'healthy',
    uptime: uptimeSeconds,
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    requestId
  });

  response.headers.set('X-Request-ID', requestId);
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  return response;
}
