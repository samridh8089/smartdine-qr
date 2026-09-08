// AutoSaveEngine for Floor Plan Builder
// Automatically saves layout blueprint every 3 seconds if changes exist
// Restores unfinished edits seamlessly on refresh

import { FloorPlanItem, FloorPlanBlueprint } from './types';

const STORAGE_PREFIX = 'cleverops_floorplan_blueprint_';

export class AutoSaveEngine {
  private restaurantId: string;
  private timer: NodeJS.Timeout | null = null;
  private isDirty: boolean = false;
  private pendingItems: FloorPlanItem[] | null = null;
  private onStatusChange?: (status: 'saved' | 'saving' | 'dirty') => void;

  constructor(restaurantId: string, onStatusChange?: (status: 'saved' | 'saving' | 'dirty') => void) {
    this.restaurantId = restaurantId;
    this.onStatusChange = onStatusChange;
  }

  // Notify of state change
  markDirty(items: FloorPlanItem[]) {
    this.isDirty = true;
    this.pendingItems = items;
    this.onStatusChange?.('dirty');

    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.flush();
      }, 3000); // 3-second auto-save interval
    }
  }

  flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.isDirty && this.pendingItems) {
      this.onStatusChange?.('saving');
      const blueprint: FloorPlanBlueprint = {
        version: 1,
        restaurantId: this.restaurantId,
        updatedAt: new Date().toISOString(),
        canvasWidth: 2400,
        canvasHeight: 1600,
        gridSize: 20,
        items: this.pendingItems
      };

      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(`${STORAGE_PREFIX}${this.restaurantId}`, JSON.stringify(blueprint));
        }
        this.isDirty = false;
        this.onStatusChange?.('saved');
      } catch (e) {
        console.error('Failed to auto-save floor plan blueprint:', e);
      }
    }
  }

  // Load stored blueprint or return null
  loadStoredBlueprint(): FloorPlanBlueprint | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${this.restaurantId}`);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to read stored floor plan blueprint:', e);
    }
    return null;
  }

  destroy() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.flush();
  }
}
