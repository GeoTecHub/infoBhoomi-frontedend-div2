import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface FloorPlanPoint {
  x: number;
  y: number;
}

export interface FloorPlanSurface {
  id: string;
  name: string;
  type: string;
  points: FloorPlanPoint[];
}

export interface FloorPlan {
  id: string;
  name: string;
  width: number;
  height: number;
  surfaces: FloorPlanSurface[];
}

@Component({
  selector: 'app-floor-plan-viewer',

  standalone: true,
  imports: [CommonModule],
  templateUrl: './floor-plan-viewer.component.html',
  styleUrl: './floor-plan-viewer.component.css',
})
export class FloorPlanViewerComponent {
  @Input() plan!: FloorPlan | null;
  @Output() surfaceClick = new EventEmitter<FloorPlanSurface>();

  selectedSurface: FloorPlanSurface | null = null;

  trackBySurfaceId(index: number, surface: FloorPlanSurface) {
    return surface.id;
  }

  getPointsAttr(surface: FloorPlanSurface): string {
    return surface.points.map((p) => `${p.x},${p.y}`).join(' ');
  }

  onSurfaceClick(event: MouseEvent, surface: FloorPlanSurface) {
    event.stopPropagation();
    this.selectedSurface = surface;
    this.surfaceClick.emit(surface);
  }
}
