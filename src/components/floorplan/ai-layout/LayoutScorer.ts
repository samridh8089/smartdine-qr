// SmartDine AI Floor Planner — Layout Scorer
// Computes objective metrics: seating capacity, walking corridors, kitchen transit, and density.

import { FloorPlanItem } from '@/components/floorplan/types';
import { LayoutMetrics, RoomDimensions } from '@/lib/ai/floorPlanner';

export class LayoutScorer {
  /**
   * Computes comprehensive operational metrics for a generated layout.
   */
  static scoreLayout(
    items: FloorPlanItem[],
    canvasWidth: number,
    canvasHeight: number,
    dimensions: RoomDimensions
  ): LayoutMetrics {
    // 1. Calculate seats and table count
    let seats = 0;
    let tableCount = 0;

    items.forEach(item => {
      if (item.kind === 'table') {
        tableCount++;
        seats += item.seats || 4;
      } else if (item.seats && item.seats > 0) {
        seats += item.seats;
      }
    });

    // 2. Walking Space Analysis
    // Sum of footprints of all items
    const totalItemArea = items.reduce((acc, item) => acc + (item.width * item.height), 0);
    const totalCanvasArea = canvasWidth * canvasHeight;
    const occupiedRatio = totalItemArea / totalCanvasArea;
    const freeSpaceRatio = 1 - occupiedRatio;

    let walkingSpace: 'Excellent' | 'Good' | 'Fair' = 'Good';
    if (freeSpaceRatio >= 0.65) {
      walkingSpace = 'Excellent';
    } else if (freeSpaceRatio >= 0.48) {
      walkingSpace = 'Good';
    } else {
      walkingSpace = 'Fair';
    }

    // 3. Kitchen Distance Calculation
    // Find kitchen pass or kitchen fixture
    const kitchenFixture = items.find(
      it => it.furnitureType === 'kitchen_pass' || it.furnitureType === 'kitchen'
    );
    const kitchenX = kitchenFixture ? kitchenFixture.x + kitchenFixture.width / 2 : canvasWidth / 2;
    const kitchenY = kitchenFixture ? kitchenFixture.y + kitchenFixture.height / 2 : 60;

    const diningTables = items.filter(it => it.kind === 'table');
    let avgKitchenDist = 0;

    if (diningTables.length > 0) {
      const totalDist = diningTables.reduce((sum, tbl) => {
        const tblCenterX = tbl.x + tbl.width / 2;
        const tblCenterY = tbl.y + tbl.height / 2;
        const dist = Math.hypot(tblCenterX - kitchenX, tblCenterY - kitchenY);
        return sum + dist;
      }, 0);
      avgKitchenDist = totalDist / diningTables.length;
    }

    let kitchenDistance: 'Short' | 'Moderate' | 'Direct' = 'Moderate';
    if (avgKitchenDist < canvasHeight * 0.4) {
      kitchenDistance = 'Short';
    } else if (avgKitchenDist < canvasHeight * 0.6) {
      kitchenDistance = 'Direct';
    } else {
      kitchenDistance = 'Moderate';
    }

    // 4. Table Density
    const effectiveSqFt = dimensions.areaSqFt || (dimensions.width * dimensions.length);
    const tablesPer500SqFt = effectiveSqFt > 0 ? (tableCount / effectiveSqFt) * 500 : 4;

    let tableDensity: 'Spacious' | 'Balanced' | 'High' = 'Balanced';
    if (tablesPer500SqFt < 3.2) {
      tableDensity = 'Spacious';
    } else if (tablesPer500SqFt <= 6.0) {
      tableDensity = 'Balanced';
    } else {
      tableDensity = 'High';
    }

    // 5. Accessibility Score (0-100)
    let accessibilityScore = 80;
    if (walkingSpace === 'Excellent') accessibilityScore += 12;
    if (walkingSpace === 'Fair') accessibilityScore -= 15;
    if (kitchenDistance === 'Short' || kitchenDistance === 'Direct') accessibilityScore += 8;
    accessibilityScore = Math.max(50, Math.min(99, accessibilityScore));

    // 6. Estimated Dining Capacity (seats * turnover estimate)
    const estimatedCapacity = Math.round(seats * 2.8);

    return {
      seats,
      tableCount,
      walkingSpace,
      kitchenDistance,
      tableDensity,
      accessibilityScore,
      estimatedCapacity
    };
  }
}
