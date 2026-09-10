import { NextResponse } from 'next/server';

export async function GET() {
  const commit =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
    'f8cf8c0';

  return NextResponse.json({
    commit,
    buildTime: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    onboardingZeroFailureApplied: true,
    version: '2026.08.24-v2-production'
  });
}
