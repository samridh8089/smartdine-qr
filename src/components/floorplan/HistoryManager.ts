// HistoryManager for Floor Plan Builder
// Supports 50+ undo/redo steps for layout actions

import { FloorPlanItem } from './types';

export class HistoryManager {
  private undoStack: FloorPlanItem[][] = [];
  private redoStack: FloorPlanItem[][] = [];
  private maxSteps: number = 50;

  constructor(maxSteps: number = 50) {
    this.maxSteps = maxSteps;
  }

  // Push new state into history
  push(items: FloorPlanItem[]) {
    // Deep clone to guarantee immutability
    const snapshot = JSON.parse(JSON.stringify(items));
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxSteps) {
      this.undoStack.shift();
    }
    // Clear redo stack on any new action
    this.redoStack = [];
  }

  canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(currentState: FloorPlanItem[]): FloorPlanItem[] | null {
    if (!this.canUndo()) return null;
    const current = this.undoStack.pop();
    if (current) {
      this.redoStack.push(JSON.parse(JSON.stringify(currentState)));
    }
    const previous = this.undoStack[this.undoStack.length - 1];
    return previous ? JSON.parse(JSON.stringify(previous)) : null;
  }

  redo(): FloorPlanItem[] | null {
    if (!this.canRedo()) return null;
    const next = this.redoStack.pop();
    if (next) {
      this.undoStack.push(JSON.parse(JSON.stringify(next)));
      return JSON.parse(JSON.stringify(next));
    }
    return null;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}
