import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule, MatIconButton } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRipple } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltip } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { combineLatest, Subject, takeUntil } from 'rxjs';
import { APIsService } from '../../services/api.service';
import { AppStateService } from '../../services/app-state.service';
import { DrawService } from '../../services/draw.service';
import { FeatureService } from '../../services/feature.service';
import { LayerService } from '../../services/layer.service';
import { LoginService } from '../../services/login.service';
import { BaseMapType, MapService } from '../../services/map.service';
import { NotificationService } from '../../services/notifications.service';
import { ToolbarActionService } from '../../services/toolbar-action.service';
import { UserService } from '../../services/user.service';
import { AdminContactComponent } from '../dialogs/admin-contact/admin-contact.component';
import { FeatureNotAvailableComponent } from '../dialogs/feature-not-available/feature-not-available.component';
import { RrrPanalComponent } from '../dialogs/rrr-panal/rrr-panal.component';
import { SubscriptionDetailsComponent } from '../dialogs/subscription-details/subscription-details.component';
import { WorkspaceComponent } from '../dialogs/workspace/workspace.component';
import { LayerPanelComponent } from '../layer-panel/layer-panel.component';
import { ActivityLogComponent } from './settings/activity-log/activity-log.component';
import { UserProfileComponent } from './settings/user-profile/user-profile.component';

interface ParcelResult {
  parcel_id: string;
  address?: string;
  gn_division?: string;
}

type SearchFieldType = 'su_id' | 'nic' | 'valuation';
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatIconButton,
    MatRipple,
    MatMenuModule,
    CommonModule,
    MatCheckboxModule,
    FormsModule,
    MatTooltip,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  animations: [
    trigger('fadeSlideDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translate(-50%, -20px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translate(-50%, 0)' })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translate(-50%, -20px)' })),
      ]),
    ]),
  ],
})
export class HeaderComponent implements OnDestroy, OnInit {
  public activeBaseMap: BaseMapType = 'OSM';

  isSaving: boolean = false;
  sex: string = '';
  user_type: any;
  private dialogRef: any; // Store the dialog reference
  username: string = ''; // replaced with the login response detail - (username)
  organization: string = ''; // replaced with the login response detail - (organization)
  current_location: any = { dist: '', city: '', org_name: '' };
  activeOperation: 'draw' | 'select' | 'split' | 'edit' | null = null;
  private destroy$ = new Subject<void>();
  public canUndo: boolean = false; // For binding to the Undo button's disabled state
  public currentLayerName: string = 'Not Selected';

  isLayersPanelOpen = false;
  isBaseMapMenuOpen = false;

  planName = '';
  planEndsOn = '';

  isSearchOpen = false;
  searchQuery = '';

  selectedSearchField: SearchFieldType = 'su_id';

  searchFields: { label: string; value: SearchFieldType }[] = [
    { label: 'Feature ID', value: 'su_id' },
    { label: 'NIC', value: 'nic' },
    { label: 'Valuation', value: 'valuation' },
  ];

  valuationFrom: number | null = null;
  valuationTo: number | null = null;

  showLabels = false;
  results: ParcelResult[] = [];

  department: string | null = null;
  constructor(
    private dialog: MatDialog,
    private apiService: APIsService,
    private featureService: FeatureService,
    private drawService: DrawService,
    private toolbarActionService: ToolbarActionService, // Inject
    private appStateService: AppStateService, // Inject AppStateService,
    private notificationService: NotificationService,
    private router: Router,
    private authService: LoginService,
    public mapService: MapService, // Inject MapService
    public layerService: LayerService,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
  ) {
    this.userService.user$.pipe(takeUntil(this.destroy$)).subscribe((user: any) => {
      if (user) {
        this.username = user?.username || '';
        this.user_type = user?.user_type || '';
        this.sex = user?.sex || '';
        // this.organization = user?.organization || '';

        this.department = user.department || '';
      }
    });
    this.getCurrentLocation();
    // this.mapService.showLabels$.subscribe((v) => (this.showLabels = v));
  }

  getSearchPlaceholder(): string {
    switch (this.selectedSearchField) {
      case 'nic':
        return 'Search by NIC';
      case 'su_id':
      default:
        return 'Search by Feature ID';
    }
  }

  ngOnInit() {
    this.getOrgData();

    this.appStateService.canUndo$.pipe(takeUntil(this.destroy$)).subscribe((canUndoState) => {
      this.canUndo = canUndoState;
      console.log('[HeaderComponent] Can Undo state updated:', this.canUndo);
    });

    this.activeBaseMap = this.mapService.getActiveBaseMap();
    // Subscribe to changes in the active base map from the service
    this.mapService.activeBaseMap$.pipe(takeUntil(this.destroy$)).subscribe((type) => {
      this.activeBaseMap = type;
    });

    combineLatest([this.layerService.allLayers$, this.layerService.currentLayerIdForDrawing$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([_, layerId]) => {
        this.updateCurrentLayerName(layerId);
      });
  }
  /**
   * NEW: This method is called when a user clicks an item in the base map menu.
   * @param type The type of base map selected by the user.
   */
  onBaseMapChange(type: BaseMapType): void {
    this.mapService.setBaseMap(type);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = null;
    }
  }

  getOrgData(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.apiService.getDashboardData().subscribe({
        next: (res: any) => {
          this.planName = res.subscription_plan;
          this.planEndsOn = res.permit_end_date;
          this.userService.setUserLimit(res.users_limit);
          this.cdr.detectChanges();
          resolve(true);
        },
        error: (err) => reject(err),
      });
    });
  }

  private async updateCurrentLayerName(layerId: number | string | null): Promise<void> {
    if (layerId !== null && typeof layerId === 'number') {
      try {
        this.currentLayerName =
          (await this.layerService.getLayerNameOnlyById(layerId)) ?? 'Not Found';
      } catch (err) {
        console.error('Error fetching layer name:', err);
        this.currentLayerName = 'Error';
      }
    } else {
      this.currentLayerName = 'Not Selected';
    }
  }

  getCurrentLocation() {
    const user = this.userService.getUser();
    if (user?.user_id) {
      this.apiService.getCurrentLocation().subscribe((res) => {
        // @ts-ignore
        console.log('Current Location Response:', res);
        // @ts-ignore
        this.current_location = res.features[0].properties;
      });
    } else {
      console.warn('User ID not available, skipping location fetch.');
    }
  }

  openRRRDialog(): void {
    this.dialog.open(RrrPanalComponent, {
      width: '75%',
      maxWidth: '85%',
      data: { feature_id: 91 },
    });
  }

  OpenLayersPanel(trigger: HTMLElement) {
    const DIALOG_WIDTH = 420;
    const MARGIN = 16;

    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = null;
      this.isLayersPanelOpen = false;
    } else {
      const rect = trigger.getBoundingClientRect();
      const dialogLeft = rect.left + rect.width / 2 - DIALOG_WIDTH / 2;
      const screenWidth = window.innerWidth;
      const left = Math.max(MARGIN, Math.min(dialogLeft, screenWidth - DIALOG_WIDTH - MARGIN));
      const top = rect.bottom + window.scrollY + 8 + 'px';

      this.dialogRef = this.dialog.open(LayerPanelComponent, {
        hasBackdrop: false,
        panelClass: 'dropdown-dialog-panel',
        position: {
          top,
          left: `${left}px`,
        },
      });

      this.isLayersPanelOpen = true;

      // Define the click listener
      const clickListener = (event: MouseEvent) => {
        const container = document.querySelector('.cdk-overlay-pane');
        if (
          container &&
          !container.contains(event.target as Node) &&
          !this.layerService.getOpenAdditionalLayerModal()
        ) {
          this.dialogRef?.close();
          this.dialogRef = null;
          this.isLayersPanelOpen = false;
          document.removeEventListener('click', clickListener);
        }
      };

      // Always remove the click listener when dialog closes
      this.dialogRef.afterClosed().subscribe(() => {
        document.removeEventListener('click', clickListener);
        this.dialogRef = null;
        this.isLayersPanelOpen = false;
      });

      setTimeout(() => {
        document.addEventListener('click', clickListener);
      });
    }
  }

  OpenWorkspacePanel(): void {
    const dialogRef = this.dialog.open(WorkspaceComponent, {
      width: '300px',
      data: {}, // Pass data if needed
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // this.selectedMode = result;
        console.log('Selected Mode:', result);
      }
    });
  }
  OpenUserProfile() {
    if (this.dialogRef) {
      // If dialog is already open, close it
      this.dialogRef.close();
      this.dialogRef = null; // Reset the reference
    } else {
      // Open a new dialog if it's not already open
      this.dialogRef = this.dialog.open(UserProfileComponent, {
        minWidth: '400px',
        maxWidth: '420px',
      });

      // Reset dialogRef when the dialog is closed
      this.dialogRef.afterClosed().subscribe(() => {
        this.dialogRef = null;
      });
    }
  }

  OpenActivityLog() {
    if (this.dialogRef) {
      // If dialog is already open, close it
      this.dialogRef.close();
      this.dialogRef = null; // Reset the reference
    } else {
      // Open a new dialog if it's not already open
      this.dialogRef = this.dialog.open(ActivityLogComponent, {
        minWidth: '80vw',
      });

      // Reset dialogRef when the dialog is closed
      this.dialogRef.afterClosed().subscribe(() => {
        this.dialogRef = null;
      });
    }
  }

  openContact() {
    if (this.dialogRef) {
      // If dialog is already open, close it
      this.dialogRef.close();
      this.dialogRef = null; // Reset the reference
    } else {
      // Open a new dialog if it's not already open
      this.dialogRef = this.dialog.open(AdminContactComponent, {
        minWidth: '480px',
      });

      // Reset dialogRef when the dialog is closed
      this.dialogRef.afterClosed().subscribe(() => {
        this.dialogRef = null;
      });
    }
  }

  OpenVERTEXT() {
    if (this.dialogRef) {
      // If dialog is already open, close it
      this.dialogRef.close();
      this.dialogRef = null; // Reset the reference
    } else {
      // Open a new dialog if it's not already open

      // Reset dialogRef when the dialog is closed
      this.dialogRef.afterClosed().subscribe(() => {
        this.dialogRef = null;
      });
    }
  }

  openSubscriptionAlert() {
    if (this.dialogRef) {
      // If dialog is already open, close it
      this.dialogRef.close();
      this.dialogRef = null; // Reset the reference
    } else {
      // Open a new dialog if it's not already open
      this.dialogRef = this.dialog.open(SubscriptionDetailsComponent, {
        minWidth: '480px',
      });

      // Reset dialogRef when the dialog is closed
      this.dialogRef.afterClosed().subscribe(() => {
        this.dialogRef = null;
      });
    }
  }

  openProAlert() {
    if (this.dialogRef) {
      // If dialog is already open, close it
      this.dialogRef.close();
      this.dialogRef = null; // Reset the reference
    } else {
      // Open a new dialog if it's not already open
      this.dialogRef = this.dialog.open(FeatureNotAvailableComponent, {
        minWidth: '480px',
      });

      // Reset dialogRef when the dialog is closed
      this.dialogRef.afterClosed().subscribe(() => {
        this.dialogRef = null;
      });
    }
  }

  logout(): void {
    // localStorage.removeItem('userdetail');
    // localStorage.removeItem('user_type');
    // localStorage.removeItem('organization_id');
    // localStorage.removeItem('department');
    // localStorage.removeItem('user_name');
    // localStorage.removeItem('first_name');
    // localStorage.removeItem('last_name');
    // localStorage.removeItem('nic');
    // localStorage.removeItem('mobile');
    // localStorage.removeItem('email');
    // localStorage.removeItem('post');
    // localStorage.removeItem('sex');
    // localStorage.removeItem('birthday');
    // localStorage.removeItem('is_active');
    // localStorage.removeItem('currentLayerId');

    sessionStorage.removeItem('permissions');

    let token = localStorage.getItem('Token');
    this.authService.logout(token).subscribe((res) => {
      // localStorage.removeItem('Token');
      localStorage.clear();
      this.router.navigateByUrl('/login');
    });
  }

  saveAllChanges(): void {
    if (this.isSaving) {
      return; // Prevent double clicks
    }
    console.log('[ToolsComponent] Save button clicked.');
    this.isSaving = true;
    this.notificationService.showInfo('Saving changes...'); // Show immediate feedback

    this.featureService.saveStagedChanges().subscribe({
      next: (response) => {
        // Success message handled by FeatureService on success
        console.log('[ToolsComponent] Save successful.', response);
      },
      error: (err) => {
        // Error message handled by FeatureService
        console.error('[ToolsComponent] Save failed.', err);
        this.isSaving = false; // Reset loading state on error
      },
      complete: () => {
        this.isSaving = false; // Reset loading state
        console.log('[ToolsComponent] Save operation complete (success or error).');
      },
    });
  }

  onHeaderSaveClick(): void {
    console.log('[HeaderComponent] Save button clicked.');
    this.toolbarActionService.triggerSaveAll();
  }

  onHeaderUndoClick(): void {
    this.featureService.onUndo();
  }

  // Implement Undo button trigger
  // triggerUndo(): void {
  //   console.log('[ToolsComponent] Undo button clicked.');
  //   // Deactivate any active drawing/selecting tool first
  //   if (this.activeOperation) {
  //     this.drawService.cleanupActiveInteraction();
  //     this.resetToolStates();
  //     this.activeOperation = null;
  //   }
  //   this.drawService.undoLastStagedChange(); // Call the updated undo method
  // }

  adminPanel() {
    this.router.navigateByUrl('/admin-home');
  }

  goToHome() {
    this.router.navigateByUrl('/main');
  }

  isGndVisible = false;

  toggleGndLayer() {
    this.isGndVisible = !this.isGndVisible;
    this.layerService.toggleLayerVisibility('gnd_boundary_layer');
  }

  getSubscriptionClass(): string {
    switch ((this.planName || '').toLowerCase()) {
      case 'free trial':
        return 'free-trial';
      case 'classic':
        return 'classic';
      case 'premium':
        return 'premium';
      default:
        return 'free-trial';
    }
  }

  getRemainingDays(): number {
    const today = new Date();
    const end = new Date(this.planEndsOn);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  toggleSearch(): void {
    this.isSearchOpen = !this.isSearchOpen;
  }

  closeSearch(): void {
    this.isSearchOpen = false;
  }

  set1 = [
    { parcel_id: '4604', address: 'Demo parcel 50', gn_division: 'Demo GN' },
    { parcel_id: '4407', address: 'Demo parcel 38', gn_division: 'Demo GN' },
    { parcel_id: '4601', address: 'Demo parcel 38', gn_division: 'Demo GN' },
    { parcel_id: '4723', address: 'Demo parcel 38', gn_division: 'Demo GN' },
  ];

  set2 = [
    { parcel_id: '4468', address: 'Demo parcel 50', gn_division: 'Demo GN' },
    { parcel_id: '4469', address: 'Demo parcel 38', gn_division: 'Demo GN' },
    { parcel_id: '4583', address: 'Demo parcel 38', gn_division: 'Demo GN' },
    { parcel_id: '4703', address: 'Demo parcel 38', gn_division: 'Demo GN' },
    { parcel_id: '4724', address: 'Demo parcel 38', gn_division: 'Demo GN' },
  ];

  set3 = [
    { parcel_id: '4495', address: 'Demo parcel 50', gn_division: 'Demo GN' },
    { parcel_id: '4481', address: 'Demo parcel 38', gn_division: 'Demo GN' },
    { parcel_id: '4482', address: 'Demo parcel 38', gn_division: 'Demo GN' },
    { parcel_id: '4483', address: 'Demo parcel 38', gn_division: 'Demo GN' },
    { parcel_id: '4484', address: 'Demo parcel 38', gn_division: 'Demo GN' },
    { parcel_id: '4485', address: 'Demo parcel 38', gn_division: 'Demo GN' },
  ];

  set4 = [
    { parcel_id: '4466', address: 'Demo parcel 60', gn_division: 'Demo GN' },
    { parcel_id: '4467', address: 'Demo parcel 39', gn_division: 'Demo GN' },
    { parcel_id: '4597', address: 'Demo parcel 39', gn_division: 'Demo GN' },
    { parcel_id: '4464', address: 'Demo parcel 39', gn_division: 'Demo GN' },
    { parcel_id: '4460', address: 'Demo parcel 39', gn_division: 'Demo GN' },
    { parcel_id: '4461', address: 'Demo parcel 39', gn_division: 'Demo GN' },
    { parcel_id: '4440', address: 'Demo parcel 39', gn_division: 'Demo GN' },
    { parcel_id: '4711', address: 'Demo parcel 39', gn_division: 'Demo GN' },
  ];

  set5 = [
    { parcel_id: '4607', address: 'Demo parcel 60', gn_division: 'Demo GN' },
    { parcel_id: '4400', address: 'Demo parcel 39', gn_division: 'Demo GN' },
    { parcel_id: '4684', address: 'Demo parcel 39', gn_division: 'Demo GN' },
    { parcel_id: '4464', address: 'Demo parcel 39', gn_division: 'Demo GN' },
    { parcel_id: '4460', address: 'Demo parcel 39', gn_division: 'Demo GN' },
    { parcel_id: '4461', address: 'Demo parcel 39', gn_division: 'Demo GN' },
    { parcel_id: '4440', address: 'Demo parcel 39', gn_division: 'Demo GN' },
    { parcel_id: '4711', address: 'Demo parcel 39', gn_division: 'Demo GN' },
  ];

  allSets = [this.set1, this.set2, this.set3, this.set4, this.set5];
  private getRandomSet() {
    const index = Math.floor(Math.random() * this.allSets.length);
    return this.allSets[index];
  }

  onSearch(): void {
    // ----------------- FEATURE ID (existing behaviour) -----------------
    if (this.selectedSearchField === 'su_id') {
      const suId = (this.searchQuery || '').trim();
      if (!suId) return;

      const feature = this.mapService.zoomToFeatureBySuId(suId, { zoom: 18, durationMs: 700 });
      if (feature) {
        this.drawService.automaticSelectFeature(feature, { multi: false });
        this.notificationService.showSuccess('Feature located and selected.');
        this.closeSearch();
      } else {
        this.notificationService.showError('No feature found for that ID.');
      }
      return;
    }

    // ----------------- NIC (DEMO: multi-select parcels 50 & 38) -----------------
    if (this.selectedSearchField === 'nic') {
      const nic = (this.searchQuery || '').trim();
      if (!nic) return;

      // For demo: hard-code which parcels NIC search returns
      this.results = this.getRandomSet();

      if (this.results.length === 0) {
        this.notificationService.showWarning('No parcels found for this NIC (demo).');
        return;
      }

      const parcelIds = this.results.map((r) => r.parcel_id);
      this.selectParcelsByIds(parcelIds);
      this.closeSearch();
      return;
    }

    // ----------------- VALUATION (DEMO: multi-select parcels 60 & 39) -----------------
    if (this.selectedSearchField === 'valuation') {
      if (this.valuationFrom == null || this.valuationTo == null) {
        this.notificationService.showError('Please enter both "From" and "To" values.');
        return;
      }
      if (this.valuationFrom > this.valuationTo) {
        this.notificationService.showError('"From" value cannot be greater than "To" value.');
        return;
      }

      // For demo: ignore actual values and always return 60, 39
      this.results = this.getRandomSet();

      if (this.results.length === 0) {
        this.notificationService.showWarning('No parcels found in this valuation range (demo).');
        return;
      }

      const parcelIds = this.results.map((r) => r.parcel_id);
      this.selectParcelsByIds(parcelIds);
      this.closeSearch();
    }
  }

  private selectParcelsByIds(parcelIds: string[]): void {
    if (!parcelIds || parcelIds.length === 0) return;

    const features: any[] = [];

    parcelIds.forEach((id, index) => {
      // Zoom only to the first parcel for nicer UX
      const opts = index === 0 ? { zoom: 18, durationMs: 700 } : (undefined as any);
      const feature = this.mapService.zoomToFeatureBySuId(id, opts);

      if (feature) {
        features.push(feature);
      }
    });

    if (features.length === 0) {
      this.notificationService.showError('No features found for the selected parcels (demo).');
      return;
    }

    // Activate multi-select tool
    this.drawService.setActiveTool({ type: 'select', multi: true });

    const sel = this.drawService.olSelectMulti;
    if (!sel) {
      this.notificationService.showError('Select tool is not available.');
      return;
    }

    const coll = sel.getFeatures();
    coll.clear();
    features.forEach((f) => coll.push(f));

    this.notificationService.showSuccess(
      features.length === 1
        ? '1 parcel selected (demo).'
        : `${features.length} parcels selected (demo).`,
    );
  }

  onToggleLabels() {
    this.showLabels = !this.showLabels;
    this.mapService.setShowLabels(this.showLabels);
  }

  setResults(items: ParcelResult[]) {
    this.results = items ?? [];
  }

  onResultClick(item: ParcelResult) {
    this.searchQuery = item.parcel_id;
    this.onSearch();
  }

  trackByParcelId = (_: number, r: ParcelResult) => r.parcel_id;
}
