import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { take } from 'rxjs/operators';
import { UserAuthenticatorComponent } from '../../../components/auth/user-authenticator/user-authenticator.component';
import { APIsService } from '../../../services/api.service';
import { NotificationService } from '../../../services/notifications.service';
import { AdminHeaderComponent } from '../../common/admin-header/admin-header.component';
import { AdminSideBarComponent } from '../../common/admin-side-bar/admin-side-bar.component';

@Component({
  selector: 'app-organizations-location-edit',
  standalone: true,
  imports: [
    CommonModule,
    AdminHeaderComponent,
    AdminSideBarComponent,
    MatIconModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    UserAuthenticatorComponent,
  ],
  templateUrl: './organizations-location-edit.component.html',
  styleUrl: './organizations-location-edit.component.css',
})
export class OrganizationsLocationEditComponent implements OnInit {
  organizationLocationForm!: FormGroup;
  orgId!: string;
  loading = false;
  orgName = '';
  distList: any[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private notificationService: NotificationService,
    private apiService: APIsService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.organizationLocationForm = this.fb.group({
      dist: ['', Validators.required],
      city: ['', Validators.required],
      latitude: ['', [Validators.required, this.rangeValidator(-90, 90)]],
      longitude: ['', [Validators.required, this.rangeValidator(-180, 180)]],
    });

    this.route.paramMap.pipe(take(1)).subscribe(async (params) => {
      const id = params.get('org_id');
      if (!id) {
        this.notificationService.showError('Invalid organization ID');
        this.goBack();
        return;
      }
      this.orgId = id;
      await this.fetchDistList();
      await this.fetchOrganizationLocation(id);
    });
  }

  goBack() {
    this.router.navigate(['/admin-organizations']);
  }

  private fetchDistList() {
    this.loading = true;
    this.apiService
      .getDistList()
      .pipe(take(1))
      .subscribe({
        next: (org: any) => {
          this.distList = org;
        },
        error: (error: any) => {
          console.error('Failed to load District list:', error);
          this.notificationService.showError('Failed to load District list');
          this.loading = false;
          this.cdr.detectChanges();
          this.goBack();
        },
      });
  }

  private fetchOrganizationLocation(id: string) {
    this.loading = true;
    this.apiService
      .getOrganizationLocationById(id)
      .pipe(take(1))
      .subscribe({
        next: (org: any) => {
          const props = org?.properties || org;
          const geom = org?.geometry || org?.location?.geometry || null;

          const dist = props?.dist ?? '';
          const city = props?.city ?? '';
          this.orgName = props?.org_name ?? '';

          let lat = '';
          let lng = '';
          if (geom && geom.type === 'Point' && Array.isArray(geom.coordinates)) {
            lng = String(geom.coordinates[0] ?? '');
            lat = String(geom.coordinates[1] ?? '');
          }

          this.organizationLocationForm.patchValue({
            dist,
            city,
            latitude: lat,
            longitude: lng,
          });

          this.organizationLocationForm.updateValueAndValidity({
            onlySelf: false,
            emitEvent: true,
          });
          this.loading = false;
          this.cdr.detectChanges();
          console.log('loading=', this.loading, 'status=', this.organizationLocationForm.status);
        },
        error: (error) => {
          console.error('Failed to load organization location:', error);
          this.notificationService.showError('Failed to load organization location');
          this.loading = false;
          this.cdr.detectChanges();
          this.goBack();
        },
      });
  }

  private buildGeoJsonPayload() {
    const { dist, city, latitude, longitude } = this.organizationLocationForm.value;
    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);

    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lng, lat],
      },
      properties: {
        dist,
        city,
      },
    };
  }

  saveLocation() {
    if (this.organizationLocationForm.invalid) {
      this.organizationLocationForm.markAllAsTouched();
      this.notificationService.showError('Please fix validation errors');
      return;
    }

    const payload = this.buildGeoJsonPayload();

    this.loading = true;
    this.cdr.detectChanges();
    this.apiService
      .editOrganizationLocation(this.orgId, payload)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.loading = false;
          this.notificationService.showSuccess('Location updated successfully');
          this.goBack();
        },
        error: (error) => {
          this.loading = false;
          console.error('Failed to update location:', error);
          this.notificationService.showError(error?.error?.error || 'Failed to update location');
        },
      });
  }

  ctrl(name: string) {
    return this.organizationLocationForm.get(name);
  }

  private rangeValidator(min: number, max: number) {
    return (control: AbstractControl) => {
      const raw = control.value;
      if (raw === null || raw === undefined || raw === '') return null;
      const v = typeof raw === 'number' ? raw : parseFloat(String(raw).trim());
      if (!Number.isFinite(v)) return { range: true };
      return v < min || v > max ? { range: true } : null;
    };
  }
}
