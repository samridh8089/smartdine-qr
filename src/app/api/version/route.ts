import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    commit: '556c5d5',
    buildTime: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    onboardingZeroFailureApplied: true,
    version: '2026.08.24-v2-production'
  });
}
