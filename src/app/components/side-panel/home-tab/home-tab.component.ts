import { AfterViewInit, ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { MapService } from '../../../services/map.service';
import { UserService } from '../../../services/user.service';
import { AboutComponent } from '../../dialogs/about/about.component';
import { FeatureNotAvailableComponent } from '../../dialogs/feature-not-available/feature-not-available.component';
import { GisQueryConsoleComponent } from '../../dialogs/gis-query-console/gis-query-console.component';
import { VertextComponent } from '../../dialogs/vertext/vertext.component';
import { ExportDataComponent } from '../../shared/popups/export-data/export-data.component';
import { ImportDataComponent } from './../../shared/popups/import-data/import-data.component';

@Component({
  selector: 'app-home-tab',
  standalone: true,
  imports: [
    MatIconModule,
    MatDividerModule,
    MatListModule,
    MatRippleModule,
    MatButtonModule,
    MatButtonModule,
    MatDialogModule,
    CommonModule,
  ],
  templateUrl: './home-tab.component.html',
  styleUrl: './home-tab.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeTabComponent implements AfterViewInit {
  dialog = inject(MatDialog);
  private dialogRef: any;
  user_type: any;
  show_admin_panel = false;

  constructor(
    public mapService: MapService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private userService: UserService,
  ) {}

  ngAfterViewInit(): void {
    const user = this.userService.getUser();
    this.user_type = user?.user_type;
    console.log('USER TYPE CHECK IN HOME TAB------------------', this.user_type);
    if (this.user_type === 'admin' || this.user_type === 'super_admin') {
      this.show_admin_panel = true;
      this.cdr.detectChanges();
    }
  }

  openImportDialog() {
    this.dialog.open(ImportDataComponent, {
      minWidth: '450px',
      maxWidth: '450px',
    });
  }

  openExportPanel() {
    this.dialog.open(ExportDataComponent, {
      minWidth: '400px',
      maxWidth: '420px',
    });
  }

  openQueryBuilderPanel() {
    this.dialog.open(GisQueryConsoleComponent, {
      panelClass: 'gqc-dark-dialog',
      width: '92vw',
      maxWidth: '1280px',
      height: '82vh',
    });
  }

  openProAlert() {
    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = null;
    } else {
      this.dialogRef = this.dialog.open(FeatureNotAvailableComponent, {
        minWidth: '480px',
      });

      this.dialogRef.afterClosed().subscribe(() => {
        this.dialogRef = null;
      });
    }
  }

  OpenVERTEXT() {
    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = null;
    } else {
      this.dialogRef = this.dialog.open(VertextComponent, {
        minWidth: '420px',
        maxWidth: '420px',
        hasBackdrop: true,
      });

      this.dialogRef.afterClosed().subscribe(() => {
        this.dialogRef = null;
      });
    }
  }

  OpenAbout() {
    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = null;
    } else {
      this.dialogRef = this.dialog.open(AboutComponent, {
        minWidth: '520px',
        maxWidth: '520px',
        hasBackdrop: true,
      });

      this.dialogRef.afterClosed().subscribe(() => {
        this.dialogRef = null;
      });
    }
  }

  openAdminPanelDialog() {
    this.router.navigateByUrl('/admin-home');
  }
}
