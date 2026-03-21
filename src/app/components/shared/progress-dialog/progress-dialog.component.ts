import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CommonModule } from '@angular/common';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface ProgressUpdate {
  done: number;
  total: number;
  label: string;
}

export interface ProgressDialogData {
  title: string;
  progress$: Observable<ProgressUpdate>;
}

@Component({
  selector: 'app-progress-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatProgressBarModule],
  templateUrl: './progress-dialog.component.html',
  styleUrl: './progress-dialog.component.css',
})
export class ProgressDialogComponent implements OnInit, OnDestroy {
  done = 0;
  total = 0;
  label = 'Processing...';

  private destroy$ = new Subject<void>();

  constructor(@Inject(MAT_DIALOG_DATA) public data: ProgressDialogData) {}

  ngOnInit(): void {
    this.data.progress$.pipe(takeUntil(this.destroy$)).subscribe((update) => {
      this.done = update.done;
      this.total = update.total;
      this.label = update.label;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get percentage(): number {
    return this.total > 0 ? Math.round((this.done / this.total) * 100) : 0;
  }

  get isIndeterminate(): boolean {
    return this.total === 0;
  }
}
