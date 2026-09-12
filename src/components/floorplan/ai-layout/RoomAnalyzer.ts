// SmartDine AI Floor Planner — Room Analyzer
// Handles unit conversions, bounding boxes, clearance zones, and image spatial metadata.

import { RoomDimensions, RoomPhoto, WallTag } from '@/lib/ai/floorPlanner';

export interface RoomGridBounds {
  canvasWidth: number;
  canvasHeight: number;
  pixelsPerUnit: number;
  unit: 'ft' | 'm';
  usableArea: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
  zones: {
    entrance: { x: number; y: number; width: number; height: number };
    waiting: { x: number; y: number; width: number; height: number };
    cashier: { x: number; y: number; width: number; height: number };
    kitchenPass: { x: number; y: number; width: number; height: number };
    washroom: { x: number; y: number; width: number; height: number };
    centralDining: { x: number; y: number; width: number; height: number };
    leftPerimeter: { x: number; y: number; width: number; height: number };
    rightPerimeter: { x: number; y: number; width: number; height: number };
  };
}

export class RoomAnalyzer {
  /**
   * Converts room dimensions into calibrated Konva canvas coordinates with safety margins.
   */
  static analyzeDimensions(dimensions: RoomDimensions): RoomGridBounds {
    const { width, length, unit } = dimensions;
    
    // Calibrate pixel scaling:
    // 1 foot ~= 24 px (a 50ft room = 1200px)
    // 1 meter ~= 78.7 px (a 15m room = 1180px)
    const pixelsPerUnit = unit === 'ft' ? 26 : 85;
    
    // Determine canvas dimensions bounded between safe comfortable ranges
    const rawWidth = Math.round(width * pixelsPerUnit);
    const rawHeight = Math.round(length * pixelsPerUnit);
    
    const canvasWidth = Math.max(1000, Math.min(2400, rawWidth));
    const canvasHeight = Math.max(700, Math.min(1800, rawHeight));
    
    // 40px safety inset from canvas outer edge
    const margin = 40;
    const usableWidth = canvasWidth - margin * 2;
    const usableHeight = canvasHeight - margin * 2;
    
    const usableArea = {
      minX: margin,
      minY: margin,
      maxX: canvasWidth - margin,
      maxY: canvasHeight - margin,
      width: usableWidth,
      height: usableHeight
    };

    // Calculate intelligent zone distributions:
    // Front wall: Entrance at bottom or top (default bottom-center or top-left)
    // We position Entrance at bottom-center (x = mid - 100, y = maxY - 80)
    // Cashier/POS: near entrance (bottom right or bottom left)
    // Kitchen Pass: back wall (top center or top right)
    // Washroom: top-left corner
    // Central Dining: center field
    // Left/Right Perimeter: ideal for booths and banquettes
    
    const entrance = {
      x: Math.round(canvasWidth / 2 - 80),
      y: usableArea.maxY - 70,
      width: 160,
      height: 70
    };

    const waiting = {
      x: usableArea.minX + 30,
      y: usableArea.maxY - 140,
      width: 180,
      height: 120
    };

    const cashier = {
      x: usableArea.maxX - 200,
      y: usableArea.maxY - 130,
      width: 170,
      height: 100
    };

    const kitchenPass = {
      x: Math.round(canvasWidth / 2 - 130),
      y: usableArea.minY + 20,
      width: 260,
      height: 100
    };

    const washroom = {
      x: usableArea.minX + 20,
      y: usableArea.minY + 20,
      width: 150,
      height: 120
    };

    const leftPerimeter = {
      x: usableArea.minX + 20,
      y: usableArea.minY + 160,
      width: 160,
      height: usableHeight - 320
    };

    const rightPerimeter = {
      x: usableArea.maxX - 180,
      y: usableArea.minY + 160,
      width: 160,
      height: usableHeight - 320
    };

    const centralDining = {
      x: usableArea.minX + 200,
      y: usableArea.minY + 140,
      width: usableWidth - 400,
      height: usableHeight - 280
    };

    return {
      canvasWidth,
      canvasHeight,
      pixelsPerUnit,
      unit,
      usableArea,
      zones: {
        entrance,
        waiting,
        cashier,
        kitchenPass,
        washroom,
        centralDining,
        leftPerimeter,
        rightPerimeter
      }
    };
  }

  /**
   * Helper to format room area dynamically based on ft or meters.
   */
  static formatArea(width: number, length: number, unit: 'ft' | 'm'): { sqFt: number; sqM: number; label: string } {
    if (unit === 'ft') {
      const sqFt = Math.round(width * length);
      const sqM = Math.round(sqFt * 0.092903 * 10) / 10;
      return { sqFt, sqM, label: `${sqFt.toLocaleString()} sq ft (${sqM} m²)` };
    } else {
      const sqM = Math.round(width * length * 10) / 10;
      const sqFt = Math.round(sqM * 10.7639);
      return { sqFt, sqM, label: `${sqM.toLocaleString()} m² (${sqFt.toLocaleString()} sq ft)` };
    }
  }

  /**
   * Validates and processes uploaded room photo files locally.
   */
  static async processPhotoUpload(file: File, wallTag: WallTag): Promise<RoomPhoto> {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      throw new Error(`Unsupported image type (${file.type}). Please upload a JPEG, PNG, or WebP photo.`);
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error(`Image size exceeds 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: reader.result as string,
          wallTag,
          uploadedAt: new Date().toISOString()
        });
      };
      reader.onerror = () => reject(new Error('Failed to read photo file.'));
      reader.readAsDataURL(file);
    });
  }
}
