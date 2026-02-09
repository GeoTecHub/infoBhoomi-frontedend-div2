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
import { Subject, takeUntil } from 'rxjs';
import { APIsService } from '../../../services/api.service';
import { NotificationService } from '../../../services/notifications.service';
import { UserService } from '../../../services/user.service';
@Component({
  selector: 'app-company',
  standalone: true,
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
  ],
  templateUrl: './company.component.html',
  styleUrl: './company.component.css',
})
export class CompanyComponent {
  company_info = {
    registration_number: '',
    party_registration_type: 'br',
  };
  party_identification: any = {
    date_of_birth: null,
    done_by: '',
    edu: null,
    email: null,
    ext_pid: '',
    ext_pid_type: null,
    gender: null,
    health_status: null,
    la_party_type: 'Non Natural Person',
    married_status: null,
    other_reg: null,
    party_full_name: null,
    party_name: '',
    pid: '',
    pmt_address: null,
    race: null,
    ref_id: null,
    religion: null,
    remark: null,
    sl_group_party_type: null,
    sl_party_type: 'Company',
    specific_tp: null,
    tp: null,
  };

  data_submited = false;
  edit_or_create_form = false;
  party_already_existing = false;
  data_not_found = false;
  id_number_validation = false;
  registration_array: any = [];
  party_cards: any[] = [];

  // BACKEND GET DATA ARRAYS
  ownership_types_array: any = [];
  user_id: any;

  private destroy$ = new Subject<void>();

  ngOnInit(): void {}
  civilian_: any;
  // featureId: string;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<CompanyComponent>,
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
    console.log(this.data);
    this.data.ath == 'create_form';
    if (this.data.path == 'create_form') {
      this.getCompanyData();
    }
  }

  getCompanyData() {
    const input_data = {
      party_registration_type: 'br',
      registration_number: this.company_info.registration_number,
    };

    this.party_identification.ext_pid = this.company_info.registration_number;

    if (this.data?.path === 'create_form') {
      input_data.registration_number = this.data.registration_number;
      this.party_identification.ext_pid = this.data.registration_number;
    }

    if (!input_data.registration_number) return;

    this.apiService.getCivilianPartyData(input_data).subscribe({
      next: (res: any) => {
        if (Array.isArray(res) && res.length > 0) {
          this.party_already_existing = true;
          this.data_not_found = false;

          const firstEntry = res[0];
          this.party_identification = {
            date_of_birth: firstEntry.date_of_birth ?? null,
            done_by: firstEntry.done_by ?? '',
            edu: firstEntry.edu ?? null,
            email: firstEntry.email ?? null,
            ext_pid: firstEntry.ext_pid ?? '',
            ext_pid_type: firstEntry.ext_pid_type ?? 'br',
            gender: firstEntry.gender ?? null,
            health_status: firstEntry.health_status ?? null,
            la_party_type: firstEntry.la_party_type ?? 'Non Natural Person',
            married_status: firstEntry.married_status ?? null,
            other_reg: firstEntry.other_reg ?? null,
            party_full_name: firstEntry.party_full_name ?? null,
            party_name: firstEntry.party_name ?? '',
            pid: firstEntry.pid ?? '',
            pmt_address: firstEntry.pmt_address ?? '',
            race: firstEntry.race ?? null,
            ref_id: firstEntry.ref_id ?? null,
            religion: firstEntry.religion ?? null,
            remark: firstEntry.remark ?? null,
            sl_group_party_type: firstEntry.sl_group_party_type ?? null,
            sl_party_type: firstEntry.sl_party_type ?? 'Company',
            specific_tp: firstEntry.specific_tp ?? null,
            tp: firstEntry.tp ?? null,
          };
        } else {
          this.handleNotFound();
        }
      },
      error: (err) => {
        if (err?.status === 404) {
          this.notificationService.showError(err?.error?.message || 'No matching party found');
          this.handleNotFound();
          return;
        }
        this.notificationService.showError('Failed to fetch company data');
        console.error(err);
      },
    });
  }

  private handleNotFound() {
    this.party_already_existing = false;
    this.data_not_found = true;
    this.edit_or_create_form = false;
    this.party_identification = {
      ...this.party_identification,
      ext_pid_type: 'br',
      ext_pid:
        this.party_identification.ext_pid ||
        this.company_info.registration_number ||
        this?.data?.registration_number ||
        '',
      la_party_type: 'Non Natural Person',
      sl_party_type: 'Company',
      party_name: this.party_identification.party_name ?? '',
      party_full_name: this.party_identification.party_full_name ?? '',
    };
  }

  addData() {
    const response = { data: this.party_identification };
    this.dialogRef.close(response);
  }

  removeEntry(index: number) {
    this.registration_array.splice(index, 1);
  }

  showPartyAllInputs() {
    this.edit_or_create_form = true;
    this.party_identification.ext_pid = this.company_info.registration_number;
  }
  addCompany() {
    const response = { data: this.party_identification };
    this.dialogRef.close(response);
  }

  SubmitAll() {
    if (!this.party_identification) {
      this.notificationService.showError('Invalid data');
      return;
    }
    if (this.party_identification.tp != null) {
      this.party_identification.tp = [this.party_identification.tp];
    }
    console.log(this.party_identification);
    if (this.party_already_existing == false) {
      this.party_identification.party_full_name = this.party_identification.party_name;

      this.apiService
        .pathchCivilianPartyForm('create', this.party_identification, this.party_identification.pid)
        .subscribe(
          (response: any) => {
            console.log(response);
            this.data_submited = true;
            this.notificationService.showSuccess('Data saved successfully');
          },
          (error: any) => {
            console.error('Error saving administrative info:', error);
            this.notificationService.showError('Data not saved');
          },
        );
    }
    if (this.party_already_existing == true) {
      console.log(this.party_identification);
      this.apiService
        .pathchCivilianPartyForm('update', this.party_identification, this.party_identification.pid)
        .subscribe(
          (response: any) => {
            console.log(response);
            this.notificationService.showSuccess('Data saved successfully');
          },
          (error: any) => {
            console.error('Error saving administrative info:', error);
            this.notificationService.showError('Data not saved');
          },
        );
    }
  }

  // PHONE NUMBER VALIDATIONS
  validationsCheck(event: any, field: string) {
    const value = event.target.value;
    const phoneRegex = /^0\d{9}$/;
    // if(field== 'second_number'){
    //   this.mobileInvalid2 = !phoneRegex.test(value);

    // }
    // if(field== 'mobile_number'){
    //   this.mobileInvalid = !phoneRegex.test(value);

    // }
  }

  allowOnlyNumbers(event: KeyboardEvent) {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  }

  limitInputLength(event: any) {
    if (event.target.value.length > 10) {
      event.target.value = event.target.value.slice(0, 10);
    }
  }

  // NIC VALIDATIONS

  validationsCheckNIC(event: any, field: string) {
    let value = event.target.value.toUpperCase(); // Convert input to uppercase

    // Validate Old NIC (9 digits + 'V' or 'X')
    const oldNICRegex = /^\d{9}[V]$/;

    // Validate New NIC (12 digits + 'X')
    const newNICRegex = /^\d{12}X$/;

    if (oldNICRegex.test(value) || newNICRegex.test(value)) {
      this.id_number_validation = false; // Valid NIC
    } else {
      this.id_number_validation = true; // Invalid NIC
    }
  }

  // Allow only numbers and a single 'V' or 'X'
  allowOnlyNICCharacters(event: KeyboardEvent) {
    const input = (event.target as HTMLInputElement).value.toUpperCase();
    const char = String.fromCharCode(event.which ? event.which : event.keyCode).toUpperCase();

    // Allow numbers (0-9)
    if (char.match(/[0-9]/)) {
      return;
    }

    // Allow only one 'V' or 'X', and it must be the last character
    if ((char === 'V' || char === 'X') && !input.includes('V') && !input.includes('X')) {
      return;
    }

    // Block all other characters
    event.preventDefault();
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  onLeftClick(): void {
    console.log('Left button clicked!');
  }

  onRightClick(): void {
    console.log('Right button clicked!');
  }
}
