// SmartDine AI Floor Planner — Room Reconstructor (Phase 2)
// Automatically constructs the physical room shell (walls, doors, windows, pillars, counter)
// from Gemini Vision analysis so owners immediately recognize their actual space.

import { FloorPlanItem, FurnitureType } from '@/components/floorplan/types';
import { GeminiRoomAnalysis } from '@/lib/ai/floorPlanner';
import { RoomGridBounds } from './RoomAnalyzer';

function safeUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `shell-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
}

export interface ReconstructedShell {
  shellItems: FloorPlanItem[];
  reservedClearanceBoxes: Array<{ x: number; y: number; width: number; height: number }>;
}

export class RoomReconstructor {
  /**
   * Builds the foundational architectural fixtures from Gemini room analysis.
   */
  static buildRoomShell(
    analysis: GeminiRoomAnalysis,
    bounds: RoomGridBounds
  ): ReconstructedShell {
    const shellItems: FloorPlanItem[] = [];
    const reservedClearanceBoxes: Array<{ x: number; y: number; width: number; height: number }> = [];
    const { canvasWidth, usableArea } = bounds;

    // 1. DOORS: Entrance & Access Doors
    const doorFeatures = analysis.doors && analysis.doors.length > 0
      ? analysis.doors
      : [{ wall: 'front', positionPercent: 50, type: 'double_door' as const, widthFt: 6 }];

    doorFeatures.forEach((door, index) => {
      let x = usableArea.minX + (usableArea.width * (door.positionPercent / 100)) - 70;
      let y = usableArea.maxY - 50;
      let width = 140;
      let height = 45;

      if (door.wall === 'back') {
        y = usableArea.minY;
      } else if (door.wall === 'left') {
        x = usableArea.minX;
        y = usableArea.minY + (usableArea.height * (door.positionPercent / 100)) - 50;
        width = 45;
        height = 100;
      } else if (door.wall === 'right') {
        x = usableArea.maxX - 45;
        y = usableArea.minY + (usableArea.height * (door.positionPercent / 100)) - 50;
        width = 45;
        height = 100;
      }

      // Bound within usable canvas
      x = Math.max(usableArea.minX, Math.min(usableArea.maxX - width, x));
      y = Math.max(usableArea.minY, Math.min(usableArea.maxY - height, y));

      const doorItem: FloorPlanItem = {
        id: safeUUID(),
        tableNumber: `DR-${index + 1}`,
        name: 'DOOR',
        kind: 'furniture',
        furnitureType: door.type === 'entrance' ? 'entrance_door' : 'double_door',
        x: Math.round(x),
        y: Math.round(y),
        width,
        height,
        rotation: 0,
        seats: 0,
        status: 'available',
        material: 'black_steel',
        isLocked: true
      };
      shellItems.push(doorItem);

      // Reserve 90px clear corridor in front of door
      reservedClearanceBoxes.push({
        x: doorItem.x - 20,
        y: door.wall === 'front' ? doorItem.y - 90 : doorItem.y + height,
        width: width + 40,
        height: 90
      });
    });

    // 2. WINDOWS: Glass Facades & Street Windows
    const windowFeatures = analysis.windows || [];
    windowFeatures.forEach((win, index) => {
      let x = usableArea.minX + (usableArea.width * (win.positionPercent / 100)) - 60;
      let y = usableArea.maxY - 20;
      let width = Math.min(150, Math.max(80, (win.widthFt || 6) * 16));
      let height = 22;

      if (win.wall === 'front') {
        y = usableArea.maxY - 22;
      } else if (win.wall === 'back') {
        y = usableArea.minY;
      } else if (win.wall === 'left') {
        x = usableArea.minX;
        y = usableArea.minY + (usableArea.height * (win.positionPercent / 100)) - 50;
        width = 22;
        height = 100;
      } else if (win.wall === 'right') {
        x = usableArea.maxX - 22;
        y = usableArea.minY + (usableArea.height * (win.positionPercent / 100)) - 50;
        width = 22;
        height = 100;
      }

      x = Math.max(usableArea.minX, Math.min(usableArea.maxX - width, x));
      y = Math.max(usableArea.minY, Math.min(usableArea.maxY - height, y));

      const windowItem: FloorPlanItem = {
        id: safeUUID(),
        tableNumber: `WIN-${index + 1}`,
        name: 'WINDOW',
        kind: 'furniture',
        furnitureType: 'window',
        x: Math.round(x),
        y: Math.round(y),
        width,
        height,
        rotation: 0,
        seats: 0,
        status: 'available',
        material: 'brass',
        isLocked: true
      };
      shellItems.push(windowItem);
    });

    // 3. PILLARS / STRUCTURAL COLUMNS
    const pillarFeatures = analysis.pillars || [];
    pillarFeatures.forEach((p, index) => {
      const pillarSize = Math.max(35, Math.min(65, (p.sizeFt || 2) * 22));
      const px = usableArea.minX + (usableArea.width * (p.xPercent / 100)) - pillarSize / 2;
      const py = usableArea.minY + (usableArea.height * (p.yPercent / 100)) - pillarSize / 2;

      const pillarItem: FloorPlanItem = {
        id: safeUUID(),
        tableNumber: `COL-${index + 1}`,
        name: 'PILLAR',
        kind: 'furniture',
        furnitureType: 'pillar',
        x: Math.round(Math.max(usableArea.minX + 30, Math.min(usableArea.maxX - pillarSize - 30, px))),
        y: Math.round(Math.max(usableArea.minY + 30, Math.min(usableArea.maxY - pillarSize - 30, py))),
        width: Math.round(pillarSize),
        height: Math.round(pillarSize),
        rotation: 0,
        seats: 0,
        status: 'available',
        material: 'concrete',
        isLocked: true
      };
      shellItems.push(pillarItem);
      reservedClearanceBoxes.push({
        x: pillarItem.x - 15,
        y: pillarItem.y - 15,
        width: pillarItem.width + 30,
        height: pillarItem.height + 30
      });
    });

    // 4. KITCHEN PASS / SERVICE PASS
    let kitchenX = canvasWidth / 2 - 110;
    let kitchenY = usableArea.minY + 20;

    if (analysis.kitchenLocation === 'back-right') {
      kitchenX = usableArea.maxX - 240;
    } else if (analysis.kitchenLocation === 'back-left') {
      kitchenX = usableArea.minX + 160;
    } else if (analysis.kitchenLocation === 'right') {
      kitchenX = usableArea.maxX - 160;
      kitchenY = usableArea.minY + 120;
    }

    const kitchenItem: FloorPlanItem = {
      id: safeUUID(),
      tableNumber: 'KP-1',
      name: 'KITCHEN PASS',
      kind: 'furniture',
      furnitureType: 'kitchen_pass',
      x: Math.round(kitchenX),
      y: Math.round(kitchenY),
      width: 220,
      height: 60,
      rotation: 0,
      seats: 0,
      status: 'available',
      material: 'black_steel'
    };
    shellItems.push(kitchenItem);
    reservedClearanceBoxes.push({
      x: kitchenItem.x - 10,
      y: kitchenItem.y + kitchenItem.height,
      width: kitchenItem.width + 20,
      height: 90
    });

    // Commercial Back-of-House Line behind Kitchen Pass
    const stoveItem: FloorPlanItem = {
      id: safeUUID(),
      tableNumber: 'KIT-1',
      name: 'COMMERCIAL RANGE',
      kind: 'furniture',
      furnitureType: 'stove',
      x: Math.round(kitchenX - 25),
      y: Math.max(usableArea.minY + 2, Math.round(kitchenY - 52)),
      width: 55,
      height: 48,
      rotation: 0,
      seats: 0,
      status: 'available',
      material: 'black_steel'
    };
    const fryerItem: FloorPlanItem = {
      id: safeUUID(),
      tableNumber: 'KIT-2',
      name: 'DEEP FRYER',
      kind: 'furniture',
      furnitureType: 'fryer',
      x: Math.round(kitchenX + 38),
      y: Math.max(usableArea.minY + 2, Math.round(kitchenY - 52)),
      width: 45,
      height: 48,
      rotation: 0,
      seats: 0,
      status: 'available',
      material: 'black_steel'
    };
    const prepItem: FloorPlanItem = {
      id: safeUUID(),
      tableNumber: 'KIT-3',
      name: 'PREP TABLE',
      kind: 'furniture',
      furnitureType: 'prep_counter',
      x: Math.round(kitchenX + 92),
      y: Math.max(usableArea.minY + 2, Math.round(kitchenY - 52)),
      width: 75,
      height: 48,
      rotation: 0,
      seats: 0,
      status: 'available',
      material: 'black_steel'
    };
    const sinkItem: FloorPlanItem = {
      id: safeUUID(),
      tableNumber: 'KIT-4',
      name: 'COMMERCIAL SINK',
      kind: 'furniture',
      furnitureType: 'sink',
      x: Math.round(kitchenX + 175),
      y: Math.max(usableArea.minY + 2, Math.round(kitchenY - 52)),
      width: 70,
      height: 48,
      rotation: 0,
      seats: 0,
      status: 'available',
      material: 'black_steel'
    };
    shellItems.push(stoveItem, fryerItem, prepItem, sinkItem);

    // 5. CASH COUNTER / POS RECEPTION
    if (analysis.existingCounter) {
      let counterX = usableArea.maxX - 180;
      let counterY = usableArea.maxY - 120;

      if (analysis.counterDetails?.positionPercent) {
        counterX = usableArea.minX + (usableArea.width * (analysis.counterDetails.positionPercent / 100)) - 75;
      }

      counterX = Math.max(usableArea.minX + 40, Math.min(usableArea.maxX - 160, counterX));
      counterY = Math.max(usableArea.minY + 40, Math.min(usableArea.maxY - 90, counterY));

      const counterItem: FloorPlanItem = {
        id: safeUUID(),
        tableNumber: 'POS-1',
        name: 'CASH / POS',
        kind: 'furniture',
        furnitureType: 'cash_counter',
        x: Math.round(counterX),
        y: Math.round(counterY),
        width: 140,
        height: 65,
        rotation: 0,
        seats: 0,
        status: 'available',
        material: 'walnut'
      };
      shellItems.push(counterItem);
      reservedClearanceBoxes.push({
        x: counterItem.x - 15,
        y: counterItem.y - 15,
        width: counterItem.width + 30,
        height: counterItem.height + 30
      });
    }

    // 6. RESTROOMS / WASHROOM
    if (analysis.washroomLocation !== 'none') {
      let washroomX = usableArea.minX + 20;
      let washroomY = usableArea.minY + 20;

      if (analysis.washroomLocation === 'back-right') {
        washroomX = usableArea.maxX - 140;
      }

      const washroomItem: FloorPlanItem = {
        id: safeUUID(),
        tableNumber: 'WR-1',
        name: 'WASHROOM',
        kind: 'furniture',
        furnitureType: 'accessible_washroom',
        x: Math.round(washroomX),
        y: Math.round(washroomY),
        width: 110,
        height: 80,
        rotation: 0,
        seats: 0,
        status: 'available',
        material: 'concrete'
      };
      shellItems.push(washroomItem);
      reservedClearanceBoxes.push({
        x: washroomItem.x,
        y: washroomItem.y + washroomItem.height,
        width: washroomItem.width,
        height: 70
      });
    }

    // 7. AC UNITS (Wall split AC and Ceiling cassette AC)
    const acUnits = analysis.acUnits && analysis.acUnits.length > 0 ? analysis.acUnits : [
      { wall: 'right' as const, positionPercent: 50, type: 'wall_ac' as const },
      { wall: 'ceiling' as const, positionPercent: 50, type: 'ceiling_ac' as const }
    ];

    acUnits.forEach((ac, index) => {
      let acX = usableArea.minX + (usableArea.width * (ac.positionPercent / 100)) - 35;
      let acY = usableArea.maxY - 25;
      let width = 70;
      let height = 22;

      if (ac.wall === 'ceiling') {
        acX = usableArea.minX + (usableArea.width * 0.5) - 30;
        acY = usableArea.minY + (usableArea.height * 0.5) - 30;
        width = 60;
        height = 60;
      } else if (ac.wall === 'back') {
        acY = usableArea.minY;
      } else if (ac.wall === 'left') {
        acX = usableArea.minX;
        acY = usableArea.minY + (usableArea.height * (ac.positionPercent / 100)) - 35;
        width = 22;
        height = 70;
      } else if (ac.wall === 'right') {
        acX = usableArea.maxX - 22;
        acY = usableArea.minY + (usableArea.height * (ac.positionPercent / 100)) - 35;
        width = 22;
        height = 70;
      }

      acX = Math.max(usableArea.minX, Math.min(usableArea.maxX - width, acX));
      acY = Math.max(usableArea.minY, Math.min(usableArea.maxY - height, acY));

      const acItem: FloorPlanItem = {
        id: safeUUID(),
        tableNumber: `AC-${index + 1}`,
        name: ac.type === 'ceiling_ac' ? 'CEILING CASSETTE AC' : 'WALL AC UNIT',
        kind: 'furniture',
        furnitureType: ac.type,
        x: Math.round(acX),
        y: Math.round(acY),
        width,
        height,
        rotation: 0,
        seats: 0,
        status: 'available',
        material: 'black_steel',
        isLocked: true
      };
      shellItems.push(acItem);
    });

    return {
      shellItems,
      reservedClearanceBoxes
    };
  }
}
