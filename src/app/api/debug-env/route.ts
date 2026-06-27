import { NextResponse } from 'next/server';

export async function GET() {
  const envKeys = Object.keys(process.env);
  const envData: Record<string, string> = {};
  for (const key of envKeys) {
    envData[key] = process.env[key] || '';
  }
  return NextResponse.json(envData);
}
