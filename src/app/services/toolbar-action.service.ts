import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ToolbarActionService {
  private _saveAllSubject = new Subject<void>();
  saveAllTriggered$ = this._saveAllSubject.asObservable();

  private _undoSubject = new Subject<void>();
  undoTriggered$ = this._undoSubject.asObservable();

  constructor() {}

  /**
   * Call this method to signal that a "Save All" action should be performed.
   */
  triggerSaveAll(): void {
    console.log('[ToolbarActionService] Triggering Save All action...');
    this._saveAllSubject.next();
  }

  /**
   * Call this method to signal that an "Undo" action should be performed.
   */
  triggerUndo(): void {
    console.log('[ToolbarActionService] Triggering Undo action...');
    this._undoSubject.next();
  }
}
