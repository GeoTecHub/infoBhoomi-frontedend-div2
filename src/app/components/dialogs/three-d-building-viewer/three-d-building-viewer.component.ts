import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogContent, MatDialogRef } from '@angular/material/dialog';
import { APIsService } from '../../../services/api.service';
import { NotificationService } from '../../../services/notifications.service';
import {
  FloorPlan,
  FloorPlanViewerComponent,
} from './floor-plan-viewer/floor-plan-viewer.component';
import { ViewerComponent } from './viewer/viewer.component';

type ViewMode = '3d' | '2d';

@Component({
  selector: 'app-three-d-building-viewer',
  standalone: true,
  imports: [CommonModule, MatDialogContent, ViewerComponent, FloorPlanViewerComponent],
  templateUrl: './three-d-building-viewer.component.html',
  styleUrl: './three-d-building-viewer.component.css',
})
export class ThreeDBuildingViewerComponent implements OnInit, AfterViewInit {
  isLoading: boolean = true;
  buildingData: any | null = null;
  has3DData: boolean = false;

  mode: ViewMode = '3d';
  currentFloorPlan: FloorPlan | null = null;

  constructor(
    public dialogRef: MatDialogRef<ThreeDBuildingViewerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { feature_id: string },
    private apiService: APIsService,
    private notificationService: NotificationService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.getBuildingData(this.data.feature_id);
  }

  ngAfterViewInit(): void {}

  async getBuildingData(featureId: string): Promise<void> {
    if (!featureId) {
      console.error('Feature ID is required to fetch building data.');
      this.isLoading = false;
      return;
    }

    this.apiService.load3DData(featureId).subscribe({
      next: (res) => {
        this.buildingData = res;
        this.has3DData = this.validate3DData(res);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.has3DData = false;
      },
    });
  }

  /** Check whether CityJSON has features */
  validate3DData(data: any): boolean {
    if (!data) return false;
    if (typeof data !== 'object') return false;
    if (!data.features || !Array.isArray(data.features)) return false;
    if (data.features.length === 0) return false;
    return true;
  }

  // Called when a surface is selected in 3D viewer
  onSurfaceSelected(event: { objectId: string; surfaceType: string }) {
    console.log('Surface selected from 3D:', event);
    // In future: call your API here with event.objectId or real surfaceId
    // For now: use hardcoded plan data
    this.load2DPlanMock(event.objectId, event.surfaceType);
  }

  // Mock function – later replace with real API call for 2D plan
  private load2DPlanMock(surfaceId: string, surfaceType: string) {
    // Hardcoded 2D floor plan data
    this.currentFloorPlan = {
      id: surfaceId,
      name: surfaceType === 'RoofSurface' ? 'Roof Plan' : 'Floor 1 Plan',
      width: 1000,
      height: 700,
      surfaces: [
        {
          id: 'room-101',
          name: 'Living Area',
          type: 'Room',
          points: [
            { x: 50, y: 50 },
            { x: 450, y: 50 },
            { x: 450, y: 250 },
            { x: 50, y: 250 },
          ],
        },
        {
          id: 'room-102',
          name: 'Bedroom',
          type: 'Room',
          points: [
            { x: 500, y: 50 },
            { x: 900, y: 50 },
            { x: 900, y: 250 },
            { x: 500, y: 250 },
          ],
        },
        {
          id: 'room-103',
          name: 'Kitchen',
          type: 'Room',
          points: [
            { x: 50, y: 300 },
            { x: 350, y: 300 },
            { x: 350, y: 550 },
            { x: 50, y: 550 },
          ],
        },
        {
          id: 'room-104',
          name: 'Bathroom',
          type: 'Room',
          points: [
            { x: 400, y: 300 },
            { x: 600, y: 300 },
            { x: 600, y: 450 },
            { x: 400, y: 450 },
          ],
        },
        {
          id: 'corridor-1',
          name: 'Corridor',
          type: 'Corridor',
          points: [
            { x: 650, y: 300 },
            { x: 950, y: 300 },
            { x: 950, y: 550 },
            { x: 650, y: 550 },
          ],
        },
      ],
    };

    // Switch mode to 2D
    this.mode = '2d';
  }

  backTo3D() {
    this.mode = '3d';
    // Keep currentFloorPlan if you want user to be able to go back
    // or reset it if you prefer:
    // this.currentFloorPlan = null;
  }
}
