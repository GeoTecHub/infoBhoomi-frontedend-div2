import { CommonModule } from '@angular/common'; //
import { Component, Inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subject, takeUntil } from 'rxjs';
import { APIsService } from '../../../services/api.service';
import { NotificationService } from '../../../services/notifications.service';
import { UserService } from '../../../services/user.service';
@Component({
  selector: 'app-legal-firm',
  imports: [
    MatDialogModule,
    MatTabsModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    NgSelectModule,
  ],
  templateUrl: './legal-firm.component.html',
  styleUrl: './legal-firm.component.css',
  standalone: true,
})
export class LegalFirmComponent {
  selectedGroup: any = {}; // Initialize as an empty object to avoid null errors

  filterValue: any;
  user_id: any;
  if_search_show_all_inputs = false;

  // DATA LOAD OBJECTS
  ministry = {
    party_registration_type: '',
    party_NIC: '',
    party_reg_type: '',
    registration_number: '',
  };

  party_identification: any = {
    date_of_birth: null,
    done_by: '',
    edu: null,
    email: null,
    ext_pid: null,
    ext_pid_type: 'lfr',
    gender: null,
    health_status: null,
    la_party_type: 'Non Natural Person',
    married_status: null,
    other_reg: null,
    party_full_name: 'Legal Firm',
    party_name: 'Legal Firm',
    pid: '',
    pmt_address: null,
    race: null,
    ref_id: null,
    religion: null,
    remark: null,
    sl_group_party_type: null,
    sl_party_type: 'Legal Firm',
    specific_tp: null,
    tp: null,
  };

  registed_number_searched = false;
  party_already_existing = false;
  id_number_validation = false;
  party_cards: any[] = [];
  minstry_types_array: any = [];
  ownership = {
    ownership_type: '',
  };

  // BACKEND GET DATA ARRAYS
  authority_types_array: any = [];

  private destroy$ = new Subject<void>();

  selectedGroupId: string | null = null;

  ngOnInit(): void {
    this.getAuthorityTypes();
  }

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<LegalFirmComponent>,
    private apiService: APIsService,
    private dialog: MatDialog,
    private notificationService: NotificationService,
    private userService: UserService,
  ) {
    this.userService.user$.pipe(takeUntil(this.destroy$)).subscribe((user: any) => {
      if (user) {
        this.user_id = user.user_id || '';
      }
    });
  }

  // GET MINISTRY PARTY DATA

  getMinistryPaartyData() {
    if (!this.selectedGroupId) {
      this.notificationService.showWarning('Please select a legal firm from the list');
      return;
    }

    this.party_identification.ext_pid = this.selectedGroupId;

    this.apiService.getMinisrtTypes().subscribe({
      next: (res) => {
        const resArray = Array.isArray(res) ? res : [];
        this.minstry_types_array = resArray.filter(
          (obj: any) => obj.ext_pid == this.selectedGroupId,
        );

        if (!this.minstry_types_array.length) {
          this.handleNotFound();
          return;
        }

        const input_data = { registration_number: this.minstry_types_array[0].pid };

        this.apiService.getPartyDataFromPID(input_data).subscribe({
          next: (res2: any) => {
            if (Array.isArray(res2) && res2.length > 0) {
              this.party_already_existing = true;
              this.if_search_show_all_inputs = false;
              const firstEntry = res2[0];

              this.party_identification = {
                done_by: firstEntry.done_by ?? '',
                email: firstEntry.email ?? null,
                ext_pid: firstEntry.ext_pid ?? this.selectedGroupId,
                ext_pid_type: firstEntry.ext_pid_type ?? 'lfr',
                party_full_name:
                  firstEntry.party_full_name ?? (this.selectedGroup.name || 'Legal Firm'),
                party_name: firstEntry.party_name ?? (this.selectedGroup.name || 'Legal Firm'),
                pid: firstEntry.pid ?? '',
                pmt_address: firstEntry.pmt_address ?? null,
                remark: firstEntry.remark ?? null,
                specific_tp: firstEntry.specific_tp ?? null,
                tp: firstEntry.tp ?? null,
                la_party_type: 'Non Natural Person',
                sl_party_type: 'Legal Firm',
              };
            } else {
              this.handleNotFound();
            }
          },
          error: (err) => {
            if (err?.status === 404) {
              this.notificationService.showError(err?.error?.message || 'No matching party found');
              this.handleNotFound();
            } else {
              this.notificationService.showError('Failed to fetch legal-firm data');
              console.error(err);
            }
          },
        });
      },
      error: (err) => {
        this.notificationService.showError('Failed to load authority types');
        console.error(err);
      },
    });
  }

  private handleNotFound() {
    this.party_already_existing = false;
    this.if_search_show_all_inputs = true;

    this.party_identification = {
      ...this.party_identification,
      ext_pid: this.selectedGroupId || null,
      ext_pid_type: 'lfr',
      la_party_type: 'Non Natural Person',
      sl_party_type: 'Legal Firm',
      party_name: this.selectedGroup?.name || 'Legal Firm',
      party_full_name: this.selectedGroup?.name || 'Legal Firm',
      specific_tp: this.party_identification.specific_tp ?? null,
      tp: this.party_identification.tp ?? null,
    };
  }

  onAuthorityChange(event: Event) {
    const selectedValue = (event.target as HTMLSelectElement).value;
  }

  getAuthorityTypes() {
    this.apiService.getAuthorityTypes().subscribe((res) => {
      console.log(res);
      this.authority_types_array = res;
    });
  }
  onGroupChange(id: string | null) {
    this.party_identification.ext_pid = id ?? null;
    this.selectedGroup = this.authority_types_array.find((obj: any) => obj.id === id) || {};
  }

  // onGroupChange(event: any) {
  //   this.selectedGroup = event;
  //   this.party_identification.ext_pid = this.selectedGroupId;
  // }

  addData() {
    const response = { data: this.party_identification };
    this.dialogRef.close(response);
  }

  showPartyAllInputs() {
    this.if_search_show_all_inputs = true;
  }

  SubmitAll() {
    if (!this.party_identification) {
      this.notificationService.showError('Invalid data');
      return;
    }
    if (this.party_identification.tp != null) {
      if (!Array.isArray(this.party_identification.tp)) {
        this.party_identification.tp = [this.party_identification.tp];
      }
    }
    if (this.party_already_existing == false) {
      this.apiService.pathchCivilianPartyForm('create', this.party_identification, 'id').subscribe(
        (response: any) => {
          console.log(response);
          this.notificationService.showSuccess('Data saved successfully');
        },
        (error: any) => {
          console.error('Error saving administrative info:', error);
          if (error?.error?.non_field_errors) {
            this.notificationService.showWarning('Telephone or email already existing');
          } else {
            this.notificationService.showError('Data not saved');
          }
        },
      );
    }
    if (this.party_already_existing == true) {
      this.apiService
        .pathchCivilianPartyForm('update', this.party_identification, this.party_identification.pid)
        .subscribe(
          (response: any) => {
            console.log(response);
            this.notificationService.showSuccess('Data saved successfully');
          },
          (error: any) => {
            console.error('Error saving administrative info:', error);
            if (error?.error?.non_field_errors) {
              this.notificationService.showWarning('Telephone or email already existing');
            } else {
              this.notificationService.showError('Data not saved');
            }
          },
        );
    }
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  // PHONE NUMBER VALIDATIONS
  validationsCheck(event: any, field: string) {
    const value = event.target.value;
    const phoneRegex = /^0\d{9}$/;
  }

  // Allow only numbers (0-9)
  allowOnlyNumbers(event: KeyboardEvent) {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  }

  // Limit input length to 10 digits dynamically
  limitInputLength(event: any) {
    if (event.target.value.length > 10) {
      event.target.value = event.target.value.slice(0, 10);
    }
  }
}
