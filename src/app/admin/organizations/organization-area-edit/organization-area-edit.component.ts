import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { take } from 'rxjs';
import { APIsService } from '../../../services/api.service';
import { NotificationService } from '../../../services/notifications.service';
import { AreaRow, OrgAreaDefineService } from '../../../services/org-area-define.service';
import { AdminHeaderComponent } from '../../common/admin-header/admin-header.component';
import { AdminSideBarComponent } from '../../common/admin-side-bar/admin-side-bar.component';

@Component({
  selector: 'app-organization-area-edit',
  imports: [
    CommonModule,
    AdminHeaderComponent,
    AdminSideBarComponent,
    MatIconModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './organization-area-edit.component.html',
  styleUrls: ['./organization-area-edit.component.css'],
})
export class OrganizationAreaEditComponent implements OnInit, OnDestroy {
  orgId!: string;
  loading = false;

  selectedProvince: string | null = null;
  selectedDistrict: string | null = null;
  selectedDsd: string | null = null;

  gnSearchTerm = '';

  searchAddedGNTerm = '';
  filterAddedDist: string | null = null;
  filterAddedDsd: string | null = null;

  orgName = '';

  get gndOptions(): AreaRow[] {
    return this.orgAreaDefineService.getAvailableGnds(
      this.selectedProvince,
      this.selectedDistrict,
      this.selectedDsd,
    );
  }

  get selectedGndMap() {
    return this.orgAreaDefineService.selectedGndMap;
  }
  get gndsForOrg(): AreaRow[] {
    return this.orgAreaDefineService.gndsForOrg;
  }

  get addedDistOptions(): string[] {
    const set = new Set(this.gndsForOrg.map((r) => r.dist));
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
    );
  }

  get addedDsdOptions(): string[] {
    const pool = this.filterAddedDist
      ? this.gndsForOrg.filter((r) => r.dist === this.filterAddedDist)
      : this.gndsForOrg;

    const set = new Set(pool.map((r) => r.dsd));
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
    );
  }

  get filteredAddedGnds() {
    let rows = this.gndsForOrg;

    if (this.filterAddedDist) {
      rows = rows.filter((r) => r.dist === this.filterAddedDist);
    }
    if (this.filterAddedDsd) {
      rows = rows.filter((r) => r.dsd === this.filterAddedDsd);
    }
    if (this.searchAddedGNTerm.trim()) {
      const q = this.norm(this.searchAddedGNTerm.trim());
      rows = rows.filter((r) => this.norm(r.gnd).includes(q));
    }

    return rows;
  }

  get filteredGndOptions() {
    const all = this.gndOptions;
    const q = this.norm(this.gnSearchTerm.trim());
    if (!q) return all;
    return all.filter((r) => this.norm(r.gnd).includes(q));
  }

  get selectedVisibleCount(): number {
    return this.filteredGndOptions.reduce(
      (acc, r) => acc + (this.selectedGndMap[r.gid] ? 1 : 0),
      0,
    );
  }

  get allVisibleChecked(): boolean {
    const total = this.filteredGndOptions.length;
    return total > 0 && this.selectedVisibleCount === total;
  }

  get someVisibleChecked(): boolean {
    const total = this.filteredGndOptions.length;
    return this.selectedVisibleCount > 0 && this.selectedVisibleCount < total;
  }

  get hasAnySelected(): boolean {
    for (const key in this.selectedGndMap) {
      if (this.selectedGndMap[key]) return true;
    }
    return false;
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private notificationService: NotificationService,
    private apiService: APIsService,
    private cdr: ChangeDetectorRef,
    public orgAreaDefineService: OrgAreaDefineService,
  ) {}

  ngOnInit(): void {
    this.selectedProvince = this.orgAreaDefineService.selectedPd ?? null;
    this.selectedDistrict = this.orgAreaDefineService.selectedDist ?? null;
    this.selectedDsd = this.orgAreaDefineService.selectedDsd ?? null;

    this.route.paramMap.pipe(take(1)).subscribe((params) => {
      const id = params.get('org_id');
      if (!id) {
        this.notificationService.showError('Invalid organization ID');
        this.goBack();
        return;
      }
      this.orgId = id;
      this.fetchOrganizationArea(id);
    });
  }

  private fetchOrganizationArea(id: string) {
    this.loading = true;
    this.apiService
      .getOrganizationAreaById(id)
      .pipe(take(1))
      .subscribe({
        next: (org: any) => {
          const entries: AreaRow[] = Array.isArray(org?.org_area) ? org.org_area : [];
          this.orgAreaDefineService.addOrgAreaFromApi(entries);
          this.orgName = org?.org_name || '';
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Failed to load organization area:', error);
          this.notificationService.showError('Failed to load organization area');
          this.loading = false;
          this.cdr.detectChanges();
          this.goBack();
        },
      });
  }

  getPdList() {
    return this.orgAreaDefineService.pdList || [];
  }

  onProvinceChange(province: string | null) {
    this.selectedProvince = province;
    this.orgAreaDefineService.selectedPd = province;

    this.orgAreaDefineService.resetBelowProvince();
    this.selectedDistrict = null;
    this.selectedDsd = null;

    if (!province) return;

    this.loading = true;
    this.apiService
      .getOrgAreas(province)
      .pipe(take(1))
      .subscribe({
        next: (rows: AreaRow[]) => {
          this.orgAreaDefineService.setAreas(rows);
          this.orgAreaDefineService.distList =
            this.orgAreaDefineService.buildDistrictsForProvince(province);
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load areas:', err);
          this.notificationService.showError('Failed to load areas');
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  onDistrictChange(district: string | null) {
    this.selectedDistrict = district;
    this.orgAreaDefineService.selectedDist = district;

    this.orgAreaDefineService.resetBelowDistrict();
    this.selectedDsd = null;

    if (!this.selectedProvince || !district) return;

    this.orgAreaDefineService.dsdList = this.orgAreaDefineService.buildDsdsForProvinceAndDistrict(
      this.selectedProvince,
      district,
    );
  }

  onDsdChange(dsd: string | null) {
    this.selectedDsd = dsd;
    this.orgAreaDefineService.selectedDsd = dsd;

    this.orgAreaDefineService.resetBelowDsd();

    if (!this.selectedProvince || !this.selectedDistrict || !dsd) return;

    this.orgAreaDefineService.gndList = this.orgAreaDefineService.buildGndsForSelection(
      this.selectedProvince,
      this.selectedDistrict,
      dsd,
    );
    this.gnSearchTerm = '';
    console.log('Selected DSD:', dsd);
  }

  toggleGnd(gid: number, checked: boolean) {
    this.orgAreaDefineService.selectedGndMap[gid] = checked;
  }

  addSelectedGnds() {
    this.orgAreaDefineService.addCheckedGndsToOrg();
  }

  removeSingleGnd(gid: number) {
    this.orgAreaDefineService.removeGndFromOrg(gid);
  }

  removeAllAddedGnds() {
    this.orgAreaDefineService.clearAllAddedGnds();
  }

  applyAddedGnds() {
    if (!this.orgId) {
      this.notificationService.showError('Missing organization ID');
      return;
    }

    const rows = this.orgAreaDefineService.gndsForOrg || [];
    // if (!rows.length) {
    //   this.notificationService.showError('Please add at least one GN Division');
    //   return;
    // }

    const payload = rows.map((r) => ({
      dist: r.dist,
      dsd: r.dsd,
      gnd: r.gnd,
      gid: r.gid,
    }));

    const seen = new Set<number>();
    const uniquePayload = payload.filter((p) => {
      if (seen.has(p.gid)) return false;
      seen.add(p.gid);
      return true;
    });

    this.loading = true;
    this.apiService
      .updateOrgArea(this.orgId, uniquePayload)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.loading = false;
          this.notificationService.showSuccess('Area updated successfully');
          this.goBack();
        },
        error: (error) => {
          this.loading = false;
          console.error('Failed to update area:', error);
          this.notificationService.showError(error?.error?.error || 'Failed to update area');
        },
      });
  }

  toggleSelectAllVisible(event: any): void {
    const checked = event?.target?.checked ?? false;
    for (const row of this.filteredGndOptions) {
      this.selectedGndMap[row.gid] = checked;
    }
  }

  trackByStr = (_: number, v: string) => v;
  trackByGid = (_: number, r: AreaRow) => r.gid;

  private norm(s: string): string {
    return (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  onFilterDistChange(val: string | null) {
    this.filterAddedDist = val;
    if (this.filterAddedDsd && !this.addedDsdOptions.includes(this.filterAddedDsd)) {
      this.filterAddedDsd = null;
    }
  }

  goBack() {
    this.orgAreaDefineService.resetAll();
    this.router.navigate(['/admin-organizations']);
  }

  ngOnDestroy(): void {
    this.orgAreaDefineService.resetAll();
  }
}
