// Server-Side API Route for SmartDine Vision+ Photo Analysis
// Route: /api/ai/floor-planner/analyze
// Integrates Gemini 2.5 Flash Vision server-side without exposing keys to the client.

import { NextRequest, NextResponse } from 'next/server';
import { GeminiVisionProvider } from '@/lib/ai/providers/geminiVision';
import { RoomDimensions, RoomPhoto } from '@/lib/ai/floorPlanner';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { photos, dimensions, restaurantName } = body;

    if (!dimensions || !dimensions.width || !dimensions.length) {
      return NextResponse.json(
        { success: false, error: 'Invalid room dimensions provided.' },
        { status: 400 }
      );
    }

    const sanitizedDimensions: RoomDimensions = {
      width: Math.max(10, Math.min(250, Number(dimensions.width) || 40)),
      length: Math.max(10, Math.min(250, Number(dimensions.length) || 25)),
      unit: dimensions.unit === 'm' ? 'm' : 'ft',
      areaSqFt: dimensions.areaSqFt || (dimensions.width * dimensions.length),
      areaSqM: dimensions.areaSqM || Math.round(dimensions.width * dimensions.length * 0.0929)
    };

    const sanitizedPhotos: RoomPhoto[] = Array.isArray(photos) ? photos : [];

    const analysis = await GeminiVisionProvider.analyzeRoomPhotos({
      photos: sanitizedPhotos,
      dimensions: sanitizedDimensions,
      restaurantName: restaurantName || 'Restaurant'
    });

    return NextResponse.json({
      success: true,
      analysis,
      photoCount: sanitizedPhotos.length,
      analyzedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('API Error in /api/ai/floor-planner/analyze:', err);
    return NextResponse.json(
      { 
        success: false, 
        error: err.message || 'An unexpected error occurred during room photo analysis.' 
      },
      { status: 500 }
    );
  }
}
