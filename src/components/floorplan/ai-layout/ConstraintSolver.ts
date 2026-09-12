// SmartDine AI Floor Planner — Constraint Solver
// Deterministic 2D spatial constraint satisfaction engine.
// Enforces aisle clearances, door swings, service paths, and table separation buffers.

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  id?: string;
  kind?: string;
  clearanceBuffer?: number;
}

export interface CorridorArea {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class ConstraintSolver {
  /**
   * Tests if two bounding boxes intersect, accounting for an optional clearance buffer.
   */
  static boxesIntersect(
    a: BoundingBox, 
    b: BoundingBox, 
    padding: number = 0
  ): boolean {
    const totalBuffer = padding + (a.clearanceBuffer || 0) + (b.clearanceBuffer || 0);
    return !(
      a.x + a.width + totalBuffer <= b.x ||
      b.x + b.width + totalBuffer <= a.x ||
      a.y + a.height + totalBuffer <= b.y ||
      b.y + b.height + totalBuffer <= a.y
    );
  }

  /**
   * Checks whether a proposed box stays entirely within the allowed room boundaries.
   */
  static isWithinBounds(
    box: BoundingBox, 
    bounds: { minX: number; minY: number; maxX: number; maxY: number }
  ): boolean {
    return (
      box.x >= bounds.minX &&
      box.y >= bounds.minY &&
      box.x + box.width <= bounds.maxX &&
      box.y + box.height <= bounds.maxY
    );
  }

  /**
   * Checks whether a candidate position intersects with any active corridor or clearance reservation.
   */
  static intersectsCorridors(
    candidate: BoundingBox,
    corridors: CorridorArea[]
  ): boolean {
    for (const corridor of corridors) {
      if (
        !(
          candidate.x + candidate.width <= corridor.x ||
          corridor.x + corridor.width <= candidate.x ||
          candidate.y + candidate.height <= corridor.y ||
          corridor.y + corridor.height <= candidate.y
        )
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Finds the best valid non-overlapping position within target bounds.
   * Scans systematically with grid step snapping.
   */
  static findPlacement(
    width: number,
    height: number,
    targetBounds: { minX: number; minY: number; maxX: number; maxY: number },
    occupiedBoxes: BoundingBox[],
    corridors: CorridorArea[] = [],
    buffer: number = 40,
    scanDirection: 'left-to-right' | 'top-to-bottom' | 'center-out' = 'left-to-right',
    gridSnap: number = 10
  ): { x: number; y: number } | null {
    const candidate: BoundingBox = { x: 0, y: 0, width, height };
    const step = Math.max(10, gridSnap);

    if (scanDirection === 'center-out') {
      const centerX = Math.round((targetBounds.minX + targetBounds.maxX - width) / 2 / step) * step;
      const centerY = Math.round((targetBounds.minY + targetBounds.maxY - height) / 2 / step) * step;
      
      const maxRadius = Math.max(targetBounds.maxX - targetBounds.minX, targetBounds.maxY - targetBounds.minY);
      for (let r = 0; r <= maxRadius; r += step) {
        for (let dx = -r; dx <= r; dx += step) {
          for (let dy = -r; dy <= r; dy += step) {
            if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
            candidate.x = centerX + dx;
            candidate.y = centerY + dy;

            if (!this.isWithinBounds(candidate, targetBounds)) continue;
            if (this.intersectsCorridors(candidate, corridors)) continue;

            const collides = occupiedBoxes.some(box => this.boxesIntersect(candidate, box, buffer));
            if (!collides) {
              return { x: candidate.x, y: candidate.y };
            }
          }
        }
      }
      return null;
    }

    // Default row-by-row or column-by-column scanning
    for (let y = targetBounds.minY; y <= targetBounds.maxY - height; y += step) {
      for (let x = targetBounds.minX; x <= targetBounds.maxX - width; x += step) {
        candidate.x = x;
        candidate.y = y;

        if (!this.isWithinBounds(candidate, targetBounds)) continue;
        if (this.intersectsCorridors(candidate, corridors)) continue;

        const collides = occupiedBoxes.some(box => this.boxesIntersect(candidate, box, buffer));
        if (!collides) {
          return { x: candidate.x, y: candidate.y };
        }
      }
    }

    return null;
  }

  /**
   * Generates clearance corridors protecting entrance pathways, kitchen arteries, and washrooms.
   */
  static createSafetyCorridors(
    canvasWidth: number,
    canvasHeight: number,
    usableArea: { minX: number; minY: number; maxX: number; maxY: number },
    aisleWidth: number = 110
  ): CorridorArea[] {
    const corridors: CorridorArea[] = [];

    // 1. Central Dining Spine (Horizontal or Vertical walking artery)
    // Vertical central artery from Entrance (bottom center) to Kitchen (top center)
    const centralAisleWidth = Math.max(90, Math.min(140, aisleWidth));
    const usableHeight = usableArea.maxY - usableArea.minY;
    corridors.push({
      name: 'Main Center Artery',
      x: Math.round(canvasWidth / 2 - centralAisleWidth / 2),
      y: usableArea.minY + 90,
      width: centralAisleWidth,
      height: usableHeight - 180
    });

    // 2. Front Door Clearance buffer (100px deep buffer)
    corridors.push({
      name: 'Door Swing Zone',
      x: Math.round(canvasWidth / 2 - 100),
      y: usableArea.maxY - 110,
      width: 200,
      height: 100
    });

    // 3. Kitchen Pass Runway (100px deep buffer across kitchen pass)
    corridors.push({
      name: 'Kitchen Pass Service Lane',
      x: Math.round(canvasWidth / 2 - 140),
      y: usableArea.minY + 80,
      width: 280,
      height: 80
    });

    // 4. Washroom Access Runway
    corridors.push({
      name: 'Washroom Access Path',
      x: usableArea.minX + 30,
      y: usableArea.minY + 110,
      width: 140,
      height: 60
    });

    return corridors;
  }
}
