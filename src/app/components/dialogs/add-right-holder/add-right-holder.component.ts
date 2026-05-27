import {
  Component,
  Inject,
  OnInit,
  inject,
  DestroyRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { PartyType, PARTY_TYPE_DISPLAY } from '../../../models/building-info.model';
import { APIsService } from '../../../services/api.service';
import { NotificationService } from '../../../services/notifications.service';
import { UserService } from '../../../services/user.service';

export interface AddRightHolderResult {
  partyName: string;
  partyFullName: string;
  partyId: string;
  partyType: PartyType;
  regType: string;
  regNumber: string;
}

type DialogStep = 'select-type' | 'enter-id' | 'search-result' | 'create-new';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-add-right-holder',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatIconModule],
  templateUrl: './add-right-holder.component.html',
  styleUrls: ['./add-right-holder.component.css'],
})
export class AddRightHolderComponent implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private userId: any;

  // Steps
  currentStep: DialogStep = 'select-type';
  stepLabels = ['Party Type', 'Identification', 'Confirm'];

  getStepNumber(): number {
    switch (this.currentStep) {
      case 'select-type':
        return 1;
      case 'enter-id':
        return 2;
      case 'search-result':
      case 'create-new':
        return 3;
    }
  }

  // Step 1: Party type selection
  partyTypes = Object.values(PartyType);
  partyTypeDisplayMap = PARTY_TYPE_DISPLAY;
  selectedPartyType: PartyType | null = null;

  // Step 2: Registration type + number
  registrationType = '';
  registrationNumber = '';

  // Registration type options depend on party type
  registrationTypeOptions: { value: string; label: string }[] = [];

  // Validation
  idValidationError = '';
  isSearching = false;

  // Step 3: Search result / existing party
  partyFound = false;
  partyData: any = null;

  // Step 4: Create new party form
  newParty: any = {
    party_name: '',
    party_full_name: '',
    pmt_address: '',
    specific_tp: '',
    tp: '',
    email: '',
    date_of_birth: '',
    gender: null,
    edu: null,
    married_status: null,
    race: null,
    religion: '',
    health_status: null,
    remark: '',
  };
  isSaving = false;
  dataSaved = false;

  // Backend dropdown data (for civilian form)
  genderTypes: any[] = [];
  educationLevels: any[] = [];
  marriedStatuses: any[] = [];
  raceTypes: any[] = [];
  religionTypes: any[] = [];
  healthStatuses: any[] = [];

  // For Group / Legal Firm
  groupNames: any[] = [];
  selectedGroupId = '';

  // View-only mode: when set, the dialog skips the wizard and renders the
  // existing party's details. Activated by passing
  //   data: { viewOnly: true, holderId, holderType, holderRegType, holderRegNumber }
  // — used when the user clicks an existing right holder row to inspect it.
  viewOnly = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<AddRightHolderComponent>,
    private apiService: APIsService,
    private notificationService: NotificationService,
    private userService: UserService,
  ) {}

  ngOnInit(): void {
    this.userService.user$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user: any) => {
      if (user) this.userId = user.user_id || '';

      this.cdr.markForCheck();
    });

    // View-only: pre-populate from the backend instead of running the wizard.
    if (this.data?.viewOnly && this.data?.holderId) {
      this.viewOnly = true;
      this.selectedPartyType = this.data.holderType || null;
      this.registrationType = this.data.holderRegType || '';
      this.registrationNumber = this.data.holderRegNumber || '';
      this.apiService
        .getPartyDataFromPID({ registration_number: this.data.holderId })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res: any) => {
            const row = Array.isArray(res) ? res[0] : res;
            if (row) {
              this.partyData = row;
              this.partyFound = true;
              this.currentStep = 'search-result';
            } else {
              this.notificationService.showError('Could not load party details.');
            }
            this.cdr.markForCheck();
          },
          error: () => {
            this.notificationService.showError('Failed to load party details.');
            this.cdr.markForCheck();
          },
        });
    }
  }

  // ─── Step 1: Select Party Type ─────────────────────────────

  selectPartyType(type: PartyType): void {
    this.selectedPartyType = type;

    switch (type) {
      case PartyType.CIVILIAN:
        this.registrationTypeOptions = [
          { value: 'nic', label: 'National Identity Card' },
          { value: 'ps', label: 'Passport' },
          { value: 'dl', label: 'Driving License' },
        ];
        this.registrationType = 'nic';
        this.loadCivilianDropdowns();
        break;
      case PartyType.COMPANY:
        this.registrationTypeOptions = [{ value: 'br', label: 'Business Registration' }];
        this.registrationType = 'br';
        break;
      case PartyType.LEGAL_FIRM:
        this.registrationTypeOptions = [{ value: 'lfr', label: 'Legal Firm Registration' }];
        this.registrationType = 'lfr';
        this.loadGroupNames('Legal Firm');
        break;
      case PartyType.GROUP:
        this.registrationTypeOptions = [{ value: 'grp', label: 'Group Registration' }];
        this.registrationType = 'grp';
        this.loadGroupNames('Group');
        break;
    }

    this.registrationNumber = '';
    this.idValidationError = '';
    this.currentStep = 'enter-id';
  }

  getPartyTypeIcon(type: PartyType): string {
    switch (type) {
      case PartyType.CIVILIAN:
        return 'person';
      case PartyType.COMPANY:
        return 'business';
      case PartyType.LEGAL_FIRM:
        return 'gavel';
      case PartyType.GROUP:
        return 'groups';
      default:
        return 'person';
    }
  }

  // ─── Step 2: Enter ID & Search ─────────────────────────────

  goBackToTypeSelection(): void {
    this.currentStep = 'select-type';
    this.selectedPartyType = null;
    this.registrationNumber = '';
    this.idValidationError = '';
    this.partyFound = false;
    this.partyData = null;
    this.dataSaved = false;
  }

  validateRegistrationNumber(): boolean {
    this.idValidationError = '';
    const num = this.registrationNumber.trim();

    if (!num) {
      this.idValidationError = 'Please enter a registration number.';
      return false;
    }

    if (this.registrationType === 'nic') {
      const oldNic = /^\d{9}[VXvx]$/;
      const newNic = /^\d{12}$/;
      if (!oldNic.test(num) && !newNic.test(num)) {
        this.idValidationError = 'NIC must be 9 digits + V/X, or 12 digits.';
        return false;
      }
    } else if (this.registrationType === 'ps') {
      const passport = /^[A-Z]\d{7}$/;
      if (!passport.test(num.toUpperCase())) {
        this.idValidationError = 'Passport must be 1 letter + 7 digits (e.g. A1234567).';
        return false;
      }
    } else if (this.registrationType === 'dl') {
      const oldFormat = /^\d{7}$/;
      const newFormat = /^[A-Z]\d{8}$/;
      if (!oldFormat.test(num) && !newFormat.test(num.toUpperCase())) {
        this.idValidationError = 'License must be 7 digits or 1 letter + 8 digits.';
        return false;
      }
    }

    return true;
  }

  searchParty(): void {
    if (!this.validateRegistrationNumber()) return;

    this.isSearching = true;
    this.partyFound = false;
    this.partyData = null;

    if (
      this.selectedPartyType === PartyType.LEGAL_FIRM ||
      this.selectedPartyType === PartyType.GROUP
    ) {
      // For groups/firms, search by selected group ID
      if (!this.selectedGroupId) {
        this.notificationService.showError('Please select from the list.');
        this.isSearching = false;
        return;
      }
      this.apiService.getPartyDataFromPID({ registration_number: this.selectedGroupId }).subscribe({
        next: (res: any) => {
          this.isSearching = false;
          if (Array.isArray(res) && res.length > 0) {
            this.partyData = res[0];
            this.partyFound = true;
            this.currentStep = 'search-result';
          } else {
            this.handleNotFound();
          }

          this.cdr.markForCheck();
        },
        error: () => {
          this.isSearching = false;
          this.handleNotFound();
          this.cdr.markForCheck();
        },
      });
      return;
    }

    // For Civilian / Company
    const searchData = {
      party_registration_type: this.registrationType,
      registration_number: this.registrationNumber.trim(),
    };

    this.apiService.getCivilianPartyData(searchData).subscribe({
      next: (res: any) => {
        this.isSearching = false;
        if (Array.isArray(res) && res.length > 0) {
          this.partyData = res[0];
          this.partyFound = true;
          this.currentStep = 'search-result';
        } else {
          this.handleNotFound();
        }

        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isSearching = false;
        if (err?.status === 404) {
          this.handleNotFound();
        } else {
          this.notificationService.showError('Search failed. Please try again.');
        }
        this.cdr.markForCheck();
      },
    });
  }

  private handleNotFound(): void {
    this.partyFound = false;
    this.partyData = null;
    this.notificationService.showError('No record found. Please enter new details.');

    // Pre-fill new party form
    this.newParty = {
      party_name: '',
      party_full_name: '',
      pmt_address: '',
      specific_tp: '',
      tp: '',
      email: '',
      date_of_birth: '',
      gender: null,
      edu: null,
      married_status: null,
      race: null,
      religion: '',
      health_status: null,
      remark: '',
    };
    this.dataSaved = false;
    this.currentStep = 'create-new';
    this.cdr.markForCheck();
  }

  // ─── Step 3: View found party and select ───────────────────

  selectFoundParty(): void {
    if (!this.partyData) return;
    const result: AddRightHolderResult = {
      partyName: this.partyData.party_name || this.partyData.party_full_name || '',
      partyFullName: this.partyData.party_full_name || this.partyData.party_name || '',
      partyId: this.partyData.pid || '',
      partyType: this.selectedPartyType!,
      regType: this.registrationType,
      regNumber: this.partyData.ext_pid || this.registrationNumber || this.selectedGroupId || '',
    };
    this.dialogRef.close(result);
  }

  // ─── Step 4: Create new party ──────────────────────────────

  goBackToSearch(): void {
    this.currentStep = 'enter-id';
    this.dataSaved = false;
  }

  saveNewParty(): void {
    if (!this.newParty.party_name?.trim()) {
      this.notificationService.showError('Name is required.');
      return;
    }

    this.isSaving = true;
    const payload: any = {
      ext_pid_type: this.registrationType,
      ext_pid: this.registrationNumber.trim(),
      la_party_type:
        this.selectedPartyType === PartyType.CIVILIAN ? 'Natural Person' : 'Non Natural Person',
      sl_party_type: this.selectedPartyType,
      party_name: this.newParty.party_name,
      party_full_name: this.newParty.party_full_name || this.newParty.party_name,
      pmt_address: this.newParty.pmt_address || null,
      specific_tp: this.newParty.specific_tp || null,
      tp: this.newParty.tp ? [this.newParty.tp] : null,
      email: this.newParty.email || null,
      date_of_birth: this.newParty.date_of_birth || null,
      gender: this.newParty.gender || null,
      edu: this.newParty.edu || null,
      married_status: this.newParty.married_status || null,
      race: this.newParty.race || null,
      religion: this.newParty.religion || null,
      health_status: this.newParty.health_status || null,
      remark: this.newParty.remark || null,
    };

    this.apiService.pathchCivilianPartyForm('create', payload).subscribe({
      next: (response: any) => {
        this.isSaving = false;
        this.dataSaved = true;
        this.notificationService.showSuccess('Party saved successfully.');

        // Return the result immediately
        const result: AddRightHolderResult = {
          partyName: payload.party_name,
          partyFullName: payload.party_full_name,
          partyId: response.pid || '',
          partyType: this.selectedPartyType!,
          regType: this.registrationType,
          regNumber: this.registrationNumber.trim(),
        };
        this.dialogRef.close(result);

        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isSaving = false;
        if (err?.error?.email) {
          this.notificationService.showError(err.error.email[0]);
        } else if (err?.error?.specific_tp) {
          this.notificationService.showError(err.error.specific_tp[0]);
        } else {
          this.notificationService.showError('Failed to save. Please try again.');
        }
      },
    });
  }

  // ─── Dropdown loading ──────────────────────────────────────

  private loadCivilianDropdowns(): void {
    this.apiService.loadGenderTypes().subscribe((res: any) => {
      this.genderTypes = res || [];
      this.cdr.markForCheck();
    });
    this.apiService.getEducationLevelTypes().subscribe((res: any) => {
      this.educationLevels = res || [];
      this.cdr.markForCheck();
    });
    this.apiService.grtMarriedStatus().subscribe((res: any) => {
      this.marriedStatuses = res || [];
      this.cdr.markForCheck();
    });
    this.apiService.getRaceTypes().subscribe((res: any) => {
      this.raceTypes = res || [];
      this.cdr.markForCheck();
    });
    this.apiService.getReligionTypes().subscribe((res: any) => {
      this.religionTypes = res || [];
      this.cdr.markForCheck();
    });
    this.apiService.getHelthdTypes().subscribe((res: any) => {
      this.healthStatuses = res || [];
      this.cdr.markForCheck();
    });
  }

  private loadGroupNames(type: string): void {
    if (type === 'Legal Firm') {
      this.apiService.getMinisrtTypes().subscribe((res: any) => (this.groupNames = res || []));
    } else {
      this.apiService.getGroupNames().subscribe((res: any) => (this.groupNames = res || []));
    }
  }

  closeDialog(): void {
    this.dialogRef.close(null);
  }
}
