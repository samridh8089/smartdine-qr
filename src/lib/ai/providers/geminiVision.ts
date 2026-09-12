// SmartDine AI Floor Planner — Server-Side Gemini 2.5 Flash Vision Provider
// Analyzes uploaded room photos and generates calibrated structural JSON.
// SECURITY: Strictly server-side. GEMINI_API_KEY is never exposed to the client.

import { generateStructuredGeminiJSON } from '@/lib/gemini';
import { 
  GeminiRoomAnalysis, 
  RoomDimensions, 
  RoomPhoto,
  DoorFeature,
  WindowFeature,
  PillarFeature,
  WallFeature
} from '@/lib/ai/floorPlanner';

export interface AnalyzeRoomPhotosInput {
  photos: RoomPhoto[];
  dimensions: RoomDimensions;
  restaurantName?: string;
}

export class GeminiVisionProvider {
  /**
   * Analyzes camera-captured room photos to detect architectural features,
   * doors, windows, structural pillars, counters, and service zones.
   */
  static async analyzeRoomPhotos(input: AnalyzeRoomPhotosInput): Promise<GeminiRoomAnalysis> {
    const { photos, dimensions, restaurantName = 'Restaurant' } = input;

    // Check if GEMINI_API_KEY is available
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey || photos.length === 0) {
      return this.generateDeterministicFallback(dimensions, photos);
    }

    try {
      // Prepare inline image parts for Gemini multimodal input
      const images = photos
        .filter(p => p.dataUrl && p.dataUrl.includes('base64,'))
        .slice(0, 5)
        .map(photo => {
          const parts = photo.dataUrl.split('base64,');
          const mimeMatch = photo.dataUrl.match(/data:([^;]+);/);
          const mimeType = mimeMatch ? mimeMatch[1] : (photo.type || 'image/jpeg');
          return {
            inlineData: {
              mimeType,
              data: parts[1]
            }
          };
        });

      if (images.length === 0) {
        return this.generateDeterministicFallback(dimensions, photos);
      }

      const prompt = `
You are an expert restaurant architectural surveyor and interior space planner analyzing photos of "${restaurantName}".
The owner reported physical room dimensions of approx ${dimensions.width} x ${dimensions.length} ${dimensions.unit} (${dimensions.areaSqFt} sq ft).

Analyze the provided room photos (showing entrance, walls, kitchen, and interior) and extract a precise architectural floor plan blueprint.
Detect:
1. Room shape (rectangle, square, l_shaped, open)
2. Existing entrance doors (width, position along front/side wall)
3. Windows (natural light sources, wall positions)
4. Structural pillars or columns that obstruct walking
5. Existing service counters or cash/POS desks
6. Location of the kitchen pass or kitchen door (e.g. back-right, back-left, back-center)
7. Location of guest washrooms or restroom doors (e.g. back-left, back-right, front-left)
8. AC units (wall AC units or ceiling cassette AC units)
9. Ceiling height estimate (in feet, typically 9.5 - 14 ft)
10. Natural lighting direction (natural_front, natural_side, ambient_overhead, warm_perimeter)
11. Unused corners suitable for indoor plants or decorative accent seating

Respond with ONLY valid JSON strictly following this schema:
{
  "room": {
    "shape": "rectangle",
    "estimatedWidth": ${dimensions.width},
    "estimatedLength": ${dimensions.length}
  },
  "walls": [
    { "side": "front", "features": ["entrance_door", "street_windows"], "estimatedLength": ${dimensions.width} },
    { "side": "back", "features": ["kitchen_pass", "washroom_door"], "estimatedLength": ${dimensions.width} },
    { "side": "left", "features": ["solid_wall"], "estimatedLength": ${dimensions.length} },
    { "side": "right", "features": ["accent_wall"], "estimatedLength": ${dimensions.length} }
  ],
  "windows": [
    { "wall": "front", "positionPercent": 25, "widthFt": 8 }
  ],
  "doors": [
    { "wall": "front", "positionPercent": 50, "type": "double_door", "widthFt": 6 },
    { "wall": "back", "positionPercent": 15, "type": "washroom_door", "widthFt": 3 }
  ],
  "pillars": [
    { "xPercent": 35, "yPercent": 40, "sizeFt": 2 }
  ],
  "existingCounter": true,
  "counterDetails": { "wall": "front", "positionPercent": 82, "type": "cash_counter" },
  "kitchenLocation": "back-right",
  "washroomLocation": "back-left",
  "ceilingHeightFt": 11.5,
  "lightingDirection": "natural_front",
  "acUnits": [
    { "wall": "right", "positionPercent": 50, "type": "wall_ac" },
    { "wall": "ceiling", "positionPercent": 50, "type": "ceiling_ac" }
  ],
  "unusedCorners": [
    { "corner": "front-left", "recommendation": "Ideal for architectural indoor tree and waiting bench" },
    { "corner": "back-right", "recommendation": "Service station or server POS terminal" }
  ],
  "confidenceScore": 0.94,
  "spatialNotes": "Detected double glass entrance doors on the front wall with reception counter on right and ceiling cassette cooling."
}
`;

      const result = await generateStructuredGeminiJSON<GeminiRoomAnalysis>({
        prompt,
        systemInstruction: 'You are an architectural layout engine for restaurant interiors. Output pure valid JSON without markdown fences.',
        images,
        temperature: 0.15
      });

      if (result.success && result.data) {
        return this.sanitizeAndValidateAnalysis(result.data, dimensions);
      }

      console.warn('Gemini Vision returned error, using spatial fallback:', result.error);
      return this.generateDeterministicFallback(dimensions, photos);
    } catch (err: any) {
      console.error('Gemini Vision execution failed:', err);
      return this.generateDeterministicFallback(dimensions, photos);
    }
  }

  /**
   * Sanitizes and bounds-checks the AI output to ensure schema compliance and physical sanity.
   */
  private static sanitizeAndValidateAnalysis(
    raw: any,
    dimensions: RoomDimensions
  ): GeminiRoomAnalysis {
    const validShapes: Array<'rectangle' | 'square' | 'l_shaped' | 'open'> = ['rectangle', 'square', 'l_shaped', 'open'];
    const shape = validShapes.includes(raw.room?.shape) ? raw.room.shape : 'rectangle';

    const estimatedWidth = Number(raw.room?.estimatedWidth) || dimensions.width;
    const estimatedLength = Number(raw.room?.estimatedLength) || dimensions.length;

    // Sanitize walls
    const walls: WallFeature[] = Array.isArray(raw.walls) ? raw.walls.map((w: any) => ({
      side: ['front', 'back', 'left', 'right'].includes(w.side) ? w.side : 'front',
      features: Array.isArray(w.features) ? w.features.map(String) : [],
      estimatedLength: Number(w.estimatedLength) || 30
    })) : [
      { side: 'front', features: ['entrance'], estimatedLength: estimatedWidth },
      { side: 'back', features: ['kitchen_pass'], estimatedLength: estimatedWidth },
      { side: 'left', features: ['banquette_wall'], estimatedLength: estimatedLength },
      { side: 'right', features: ['perimeter_wall'], estimatedLength: estimatedLength }
    ];

    // Sanitize doors
    const doors: DoorFeature[] = Array.isArray(raw.doors) ? raw.doors.map((d: any) => ({
      wall: ['front', 'back', 'left', 'right'].includes(d.wall) ? d.wall : 'front',
      positionPercent: Math.max(5, Math.min(95, Number(d.positionPercent) || 50)),
      type: ['entrance', 'double_door', 'single_door', 'washroom_door', 'sliding_door'].includes(d.type) ? d.type : 'double_door',
      widthFt: Math.max(3, Math.min(10, Number(d.widthFt) || 6))
    })) : [
      { wall: 'front', positionPercent: 50, type: 'double_door', widthFt: 6 }
    ];

    // Ensure at least one entrance door exists
    if (!doors.some(d => d.wall === 'front' || d.type === 'entrance' || d.type === 'double_door')) {
      doors.unshift({ wall: 'front', positionPercent: 50, type: 'double_door', widthFt: 6 });
    }

    // Sanitize windows
    const windows: WindowFeature[] = Array.isArray(raw.windows) ? raw.windows.map((win: any) => ({
      wall: ['front', 'back', 'left', 'right'].includes(win.wall) ? win.wall : 'front',
      positionPercent: Math.max(5, Math.min(95, Number(win.positionPercent) || 30)),
      widthFt: Math.max(3, Math.min(15, Number(win.widthFt) || 6))
    })) : [
      { wall: 'front', positionPercent: 20, widthFt: 8 },
      { wall: 'front', positionPercent: 80, widthFt: 8 }
    ];

    // Sanitize pillars
    const pillars: PillarFeature[] = Array.isArray(raw.pillars) ? raw.pillars.map((p: any) => ({
      xPercent: Math.max(15, Math.min(85, Number(p.xPercent) || 30)),
      yPercent: Math.max(15, Math.min(85, Number(p.yPercent) || 40)),
      sizeFt: Math.max(1, Math.min(4, Number(p.sizeFt) || 2))
    })) : [];

    const existingCounter = Boolean(raw.existingCounter ?? true);
    const kitchenLocations = ['back-right', 'back-left', 'back-center', 'left', 'right'];
    const kitchenLocation = kitchenLocations.includes(raw.kitchenLocation) ? raw.kitchenLocation : 'back-right';

    const washroomLocations = ['back-left', 'back-right', 'front-left', 'none'];
    const washroomLocation = washroomLocations.includes(raw.washroomLocation) ? raw.washroomLocation : 'back-left';

    const ceilingHeightFt = Math.max(8, Math.min(22, Number(raw.ceilingHeightFt) || 11.5));
    const validLighting = ['natural_front', 'natural_side', 'ambient_overhead', 'warm_perimeter'];
    const lightingDirection = validLighting.includes(raw.lightingDirection) ? raw.lightingDirection : 'natural_front';

    const acUnits = Array.isArray(raw.acUnits) ? raw.acUnits.map((ac: any) => ({
      wall: ['front', 'back', 'left', 'right', 'ceiling'].includes(ac.wall) ? ac.wall : 'right',
      positionPercent: Math.max(10, Math.min(90, Number(ac.positionPercent) || 50)),
      type: ac.type === 'ceiling_ac' ? 'ceiling_ac' : 'wall_ac'
    })) : [
      { wall: 'right', positionPercent: 50, type: 'wall_ac' as const },
      { wall: 'ceiling', positionPercent: 50, type: 'ceiling_ac' as const }
    ];

    const unusedCorners = Array.isArray(raw.unusedCorners) ? raw.unusedCorners.map((c: any) => ({
      corner: ['front-left', 'front-right', 'back-left', 'back-right'].includes(c.corner) ? c.corner : 'front-left',
      recommendation: String(c.recommendation || 'Feature indoor plant or lounge seating')
    })) : [
      { corner: 'front-left', recommendation: 'Indoor statement tree and waiting lounge' },
      { corner: 'back-right', recommendation: 'Service pass & waitstaff station' }
    ];

    return {
      room: {
        shape,
        estimatedWidth,
        estimatedLength
      },
      walls,
      windows,
      doors,
      pillars,
      existingCounter,
      counterDetails: raw.counterDetails || { wall: 'front', positionPercent: 80, type: 'cash_counter' },
      kitchenLocation,
      washroomLocation,
      ceilingHeightFt,
      lightingDirection,
      acUnits,
      unusedCorners,
      confidenceScore: Math.max(0.7, Math.min(0.99, Number(raw.confidenceScore) || 0.91)),
      spatialNotes: raw.spatialNotes || 'Architectural features reconciled and calibrated from multi-angle room photography.',
      isFallback: false
    };
  }

  /**
   * Deterministic architectural fallback when API key is missing or offline.
   */
  public static generateDeterministicFallback(
    dimensions: RoomDimensions,
    photos: RoomPhoto[]
  ): GeminiRoomAnalysis {
    const hasKitchenPhoto = photos.some(p => p.wallTag === 'kitchen' || p.captureTarget === 'kitchen');

    return {
      room: {
        shape: 'rectangle',
        estimatedWidth: dimensions.width,
        estimatedLength: dimensions.length
      },
      walls: [
        { side: 'front', features: ['entrance_double_door', 'glass_facade'], estimatedLength: dimensions.width },
        { side: 'back', features: ['kitchen_pass', 'restroom_access'], estimatedLength: dimensions.width },
        { side: 'left', features: ['banquette_wall', 'acoustic_panelling'], estimatedLength: dimensions.length },
        { side: 'right', features: ['feature_wall', 'perimeter_seating'], estimatedLength: dimensions.length }
      ],
      windows: [
        { wall: 'front', positionPercent: 22, widthFt: 8 },
        { wall: 'front', positionPercent: 78, widthFt: 8 }
      ],
      doors: [
        { wall: 'front', positionPercent: 50, type: 'double_door', widthFt: 6 },
        { wall: 'back', positionPercent: 12, type: 'washroom_door', widthFt: 3 }
      ],
      pillars: dimensions.areaSqFt > 1200 ? [
        { xPercent: 32, yPercent: 45, sizeFt: 2 }
      ] : [],
      existingCounter: true,
      counterDetails: {
        wall: 'front',
        positionPercent: 82,
        type: 'cash_counter'
      },
      kitchenLocation: hasKitchenPhoto ? 'back-right' : 'back-center',
      washroomLocation: 'back-left',
      ceilingHeightFt: 11.5,
      lightingDirection: 'natural_front',
      acUnits: [
        { wall: 'right', positionPercent: 50, type: 'wall_ac' },
        { wall: 'ceiling', positionPercent: 50, type: 'ceiling_ac' }
      ],
      unusedCorners: [
        { corner: 'front-left', recommendation: 'Indoor statement tree and waiting bench' },
        { corner: 'back-right', recommendation: 'Service station' }
      ],
      confidenceScore: 0.88,
      spatialNotes: 'Spatial blueprint calibrated from room dimensions and architectural standards.',
      isFallback: true
    };
  }
}
