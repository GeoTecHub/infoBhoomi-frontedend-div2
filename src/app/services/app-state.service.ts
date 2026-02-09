import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AppStateService {
  // --- Undo State Management ---
  private readonly _canUndo = new BehaviorSubject<boolean>(false);
  readonly canUndo$ = this._canUndo.asObservable();

  // --- Redo State Management --- // ✅ ADDED SECTION
  private readonly _canRedo = new BehaviorSubject<boolean>(false);
  readonly canRedo$ = this._canRedo.asObservable();

  constructor() {}
  /**
   * Sets the "can undo" state.
   * @param canUndo True if an undo operation is available, false otherwise.
   */
  setCanUndo(canUndo: boolean): void {
    if (this._canUndo.value !== canUndo) {
      // Only emit if the value changes
      console.log(`[AppStateService] Setting canUndo to: ${canUndo}`);
      this._canUndo.next(canUndo);
    }
  }

  /**
   * Sets the "can redo" state.
   * @param canRedo True if a redo operation is available.
   */
  setCanRedo(canRedo: boolean): void {
    if (this._canRedo.value !== canRedo) {
      // Only emit if the value changes
      console.log(`[AppStateService] Setting canRedo to: ${canRedo}`);
      this._canRedo.next(canRedo);
    }
  }

  /**
   * Gets the current "can undo" state.
   * Useful for synchronous checks if needed, though subscribing to canUndo$ is preferred.
   */
  getCanUndoSnapshot(): boolean {
    return this._canUndo.value;
  }
}
