// Collision & Table Merge Engine for Floor Plan
// Uses Axis-Aligned Bounding Box (AABB) Intersection Detection with configurable proximity padding

import { FloorPlanItem } from './types';

export interface BoundingBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export function getBoundingBox(item: FloorPlanItem, padding: number = 0): BoundingBox {
  return {
    left: item.x - padding,
    right: item.x + item.width + padding,
    top: item.y - padding,
    bottom: item.y + item.height + padding,
    width: item.width + padding * 2,
    height: item.height + padding * 2,
    centerX: item.x + item.width / 2,
    centerY: item.y + item.height / 2
  };
}

export function checkAABBCollision(boxA: BoundingBox, boxB: BoundingBox): boolean {
  return (
    boxA.left < boxB.right &&
    boxA.right > boxB.left &&
    boxA.top < boxB.bottom &&
    boxA.bottom > boxB.top
  );
}

// Find table candidate colliding with dragged item
export function findCollidingTable(
  draggedItem: FloorPlanItem,
  allItems: FloorPlanItem[],
  proximityPadding: number = 18
): FloorPlanItem | null {
  if (draggedItem.kind !== 'table') return null;

  const boxA = getBoundingBox(draggedItem, proximityPadding);

  for (const item of allItems) {
    if (item.id === draggedItem.id) continue;
    if (item.kind !== 'table') continue;
    
    // Don't merge if already merged together
    if (item.isMerged && item.mergedWithIds?.includes(draggedItem.id)) continue;

    const boxB = getBoundingBox(item, 0);
    if (checkAABBCollision(boxA, boxB)) {
      return item;
    }
  }

  return null;
}

// Merge Table A and Table B into a single merged table
export function mergeTables(tableA: FloorPlanItem, tableB: FloorPlanItem): FloorPlanItem {
  const combinedSeats = (tableA.seats || 2) + (tableB.seats || 2);
  const minX = Math.min(tableA.x, tableB.x);
  const minY = Math.min(tableA.y, tableB.y);
  const maxX = Math.max(tableA.x + tableA.width, tableB.x + tableB.width);
  const maxY = Math.max(tableA.y + tableA.height, tableB.y + tableB.height);

  const cleanNumA = tableA.tableNumber.replace(/^T-?/, '');
  const cleanNumB = tableB.tableNumber.replace(/^T-?/, '');
  const combinedNumber = `${cleanNumA} + ${cleanNumB}`;

  return {
    id: `merged_${tableA.id}_${tableB.id}`,
    tableNumber: combinedNumber,
    name: `Table ${combinedNumber}`,
    kind: 'table',
    shape: 'rectangle',
    x: minX,
    y: minY,
    width: Math.max(120, maxX - minX),
    height: Math.max(90, maxY - minY),
    rotation: 0,
    seats: combinedSeats,
    status: 'merged',
    isMerged: true,
    mergedWithIds: [tableA.id, tableB.id],
    originalSeats: tableA.seats
  };
}

// Split a merged table back into its original tables
export function splitTable(
  mergedTable: FloorPlanItem, 
  originalTablesMap: Record<string, FloorPlanItem>
): FloorPlanItem[] {
  if (!mergedTable.mergedWithIds || mergedTable.mergedWithIds.length < 2) {
    return [{ ...mergedTable, isMerged: false, status: 'available' }];
  }

  const [idA, idB] = mergedTable.mergedWithIds;
  const tableA = originalTablesMap[idA];
  const tableB = originalTablesMap[idB];

  if (tableA && tableB) {
    return [
      { ...tableA, status: 'available', isMerged: false, mergedWithIds: undefined },
      { ...tableB, status: 'available', isMerged: false, mergedWithIds: undefined }
    ];
  }

  // Fallback if original map missing: recreate side-by-side
  const halfSeats = Math.ceil(mergedTable.seats / 2);
  const tA: FloorPlanItem = {
    id: idA || `table_${Date.now()}_1`,
    tableNumber: mergedTable.tableNumber.split('+')[0]?.trim() || 'T-A',
    name: `Table ${mergedTable.tableNumber.split('+')[0]?.trim() || 'A'}`,
    kind: 'table',
    shape: 'square',
    x: mergedTable.x,
    y: mergedTable.y,
    width: 80,
    height: 80,
    rotation: 0,
    seats: halfSeats,
    status: 'available',
    isMerged: false
  };

  const tB: FloorPlanItem = {
    id: idB || `table_${Date.now()}_2`,
    tableNumber: mergedTable.tableNumber.split('+')[1]?.trim() || 'T-B',
    name: `Table ${mergedTable.tableNumber.split('+')[1]?.trim() || 'B'}`,
    kind: 'table',
    shape: 'square',
    x: mergedTable.x + 95,
    y: mergedTable.y,
    width: 80,
    height: 80,
    rotation: 0,
    seats: Math.max(2, mergedTable.seats - halfSeats),
    status: 'available',
    isMerged: false
  };

  return [tA, tB];
}
