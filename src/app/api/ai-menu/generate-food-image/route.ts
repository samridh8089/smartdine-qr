import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    success: false,
    disabled: true,
    message: 'AI food image generation has been removed to conserve API credits. Owners control item images manually via Upload Image or Take Photo.'
  }, { status: 200 });
}

