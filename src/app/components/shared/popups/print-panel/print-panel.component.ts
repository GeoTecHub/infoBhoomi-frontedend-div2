import { Component, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';

import { CustomButtonsComponent } from '../../custom-buttons/custom-buttons.component';
import { MapService } from '../../../../services/map.service';
import { NotificationService } from '../../../../services/notifications.service';

@Component({
  selector: 'app-print-panel',
  imports: [
    CommonModule,
    MatDialogClose,
    MatDialogActions,
    MatDialogContent,
    MatDialogModule,
    CustomButtonsComponent,
    FormsModule,
  ],
  templateUrl: './print-panel.component.html',
  styleUrl: './print-panel.component.css',
})
export class PrintPanelComponent {
  private mapService = inject(MapService);
  private notify = inject(NotificationService);
  private dialogRef = inject(MatDialogRef<PrintPanelComponent>);
  private platformId = inject(PLATFORM_ID);

  dataSetName: string = 'InfoBhoomi Map Print';
  selectedScale = '1:10000';
  selectedLayout = 'A4';
  selectedOrientation = 'Landscape';

  scales = ['1:1000', '1:5000', '1:10000', '1:25000', '1:50000'];
  layouts = ['A4', 'A3', 'A2', 'A1', 'A0'];
  orientations = ['Portrait', 'Landscape'];

  isPrinting = false;

  printMap(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const map = this.mapService.getMap$();
    if (!map) {
      this.notify.showError('Map is not available for printing.');
      return;
    }

    this.isPrinting = true;

    // Force OL to render at full size before capturing canvas
    map.once('rendercomplete', () => {
      try {
        const mapCanvas = document.createElement('canvas');
        const size = map.getSize() ?? [800, 600];
        mapCanvas.width = size[0];
        mapCanvas.height = size[1];
        const mapCtx = mapCanvas.getContext('2d')!;

        // Composite all OL layer canvases
        const olViewport = map.getTargetElement();
        olViewport.querySelectorAll<HTMLCanvasElement>('.ol-layer canvas').forEach((canvas) => {
          if (canvas.width > 0) {
            const opacity = (canvas.parentElement as HTMLElement)?.style?.opacity ?? '1';
            mapCtx.globalAlpha = parseFloat(opacity);
            const transform = canvas.style.transform;
            if (transform) {
              const matrix = new DOMMatrix(transform);
              mapCtx.setTransform(matrix);
            } else {
              mapCtx.setTransform(1, 0, 0, 1, 0, 0);
            }
            mapCtx.drawImage(canvas, 0, 0);
          }
        });
        mapCtx.globalAlpha = 1;
        mapCtx.setTransform(1, 0, 0, 1, 0, 0);

        const imgSrc = mapCanvas.toDataURL('image/png');
        this._openPrintWindow(imgSrc);
      } catch {
        this.notify.showError('Unable to capture map. Please try again.');
      } finally {
        this.isPrinting = false;
      }
    });

    map.renderSync();
  }

  private _openPrintWindow(imgSrc: string): void {
    const win = window.open('', '_blank');
    if (!win) {
      this.notify.showError('Popup blocked — please allow popups for this site.');
      return;
    }
    const isLandscape = this.selectedOrientation === 'Landscape';
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${this.dataSetName}</title>
  <style>
    @page { size: ${this.selectedLayout} ${isLandscape ? 'landscape' : 'portrait'}; margin: 12mm; }
    body { margin: 0; font-family: system-ui, sans-serif; background: #fff; }
    .print-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; }
    .print-title { font-size: 16px; font-weight: 700; color: #1a1a2e; }
    .print-meta { font-size: 10px; color: #888; text-align: right; }
    .map-img { width: 100%; border: 1px solid #ccc; display: block; }
    .print-footer { margin-top: 6px; font-size: 9px; color: #aaa; display: flex; justify-content: space-between; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <div class="print-header">
    <div class="print-title">${this.dataSetName}</div>
    <div class="print-meta">Scale: ${this.selectedScale} &nbsp;|&nbsp; Layout: ${this.selectedLayout} ${this.selectedOrientation}<br>Generated: ${new Date().toLocaleString('en-GB')}</div>
  </div>
  <img class="map-img" src="${imgSrc}" />
  <div class="print-footer">
    <span>InfoBhoomi Land Information System — LADM ISO 19152</span>
    <span>Printed: ${new Date().toLocaleDateString('en-GB')}</span>
  </div>
</body>
</html>`);
    win.document.close();
    win.focus();
    win.print();
    this.dialogRef.close();
  }
}
