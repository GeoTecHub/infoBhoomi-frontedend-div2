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
  selector: 'app-civilian',
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
  templateUrl: './civilian.component.html',
  styleUrl: './civilian.component.css',
})
export class CivilianComponent {
  // VALIDATION VARIABLES
  id_number_validation = true;
  ps_number_validation = true;
  license_number_validation = true;

  // DATA LOAD OBJECTS
  civilian = {
    party_registration_type: 'nic',
    registration_number: '',
  };
  civilian_party = {
    party_registration_type: '',
    registration_number: '',
  };
  show_all_inputs = false;
  mortgage = {
    amount: '',
    interest: '',
    mortgage_type: '',
    ranking: '',
    Mortgage_ID: '',
    Mortgagee: '',
  };

  party_identification: any = {
    pid: '',
    date_of_birth: '',
    done_by: '',
    edu: null,
    email: null,
    ext_pid: null,
    ext_pid_type: '',
    gender: null,
    health_status: null,
    la_party_type: 'Natural Person',
    married_status: null,
    other_reg: null,
    party_full_name: null,
    party_name: null,
    pmt_address: null,
    race: null,
    ref_id: null,
    religion: '',
    remark: null,
    sl_group_party_type: null,
    sl_party_type: 'Civilian',
    specific_tp: null,
    tp: null,
  };

  gender_types_array: any = [];
  education_leval_types_array: any = [];
  religion_types_array: any = [];
  married_types_array: any = [];
  helth_types_array: any = [];
  race_types_array: any = [];
  registed_number_searched = false;
  party_already_existing = false;
  registration_array: any = [];
  party_cards: any[] = [];

  ownership = {
    ownership_type: '',
  };
  data_submitted = false;
  // BACKEND GET DATA ARRAYS
  mortgage_types_array: any = [];
  ownership_types_array: any = [];
  civilian_data__array: any = [];
  user_id: any;
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.loadMortgageTypes();
    this.loadOwnershipTypes();
    this.addNewParty();
    this.loadGenderTypes();
    this.getReligionTypes();
    this.getMarriedTypes();
    this.getHelthdTypes();
    this.getRaceTypes();
    this.loadEducationLevelTypes();
  }

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<CivilianComponent>,
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
    if (this.data.path == 'create_form') {
      this.getCivilianUserData();
    }
  }

  showCreateInputs() {
    this.show_all_inputs = true;
    this.data_submitted = false;
    this.registed_number_searched = true;
    this.notificationService.showError('Data not found');
    this.party_already_existing = false;
    this.civilian_data__array = [];
    // Assign default values properly if no data is found
    this.party_identification = {
      ext_pid_type: this.civilian.party_registration_type,
      ext_pid: this.civilian.registration_number,
      la_party_type: 'Natural Person',
      sl_party_type: 'Civilian',
    };
    if (this.data.path == 'create_form') {
      ((this.civilian.party_registration_type = this.data.partyType),
        (this.civilian.registration_number = this.data.registration_number));
      this.party_identification.ext_pid = this.data.registration_number;
    }
  }

  // ADD PARTY CARD

  addNewParty() {
    const newCard = {
      id: this.party_cards.length + 1,
      title: `Card ${this.party_cards.length + 1}`,
      content: 'This is a dynamically added card.',
      party_major_type: '',
      party_sub_type: '',
    };
    this.party_cards.push(newCard);
  }

  getCivilianUserData() {
    if (!this.civilian.registration_number || !this.civilian.party_registration_type) {
      this.notificationService.showError('Please select registration type and number');
      return;
    }

    if (!this.party_identification) this.party_identification = {};

    if (this.data.path === 'create_form') {
      this.civilian.party_registration_type = this.data.partyType;
      this.civilian.registration_number = this.data.registration_number;
    }
    this.party_identification.ext_pid_type = this.civilian.party_registration_type;
    this.party_identification.ext_pid = this.civilian.registration_number;
    this.party_identification.la_party_type = 'Natural Person';
    this.party_identification.sl_party_type = 'Civilian';

    this.apiService.getCivilianPartyData(this.civilian).subscribe({
      next: (res: any) => {
        if (Array.isArray(res) && res.length > 0) {
          this.data_submitted = true;
          this.party_already_existing = true;
          this.civilian_data__array = res;
          const firstEntry = res[0];

          if (firstEntry.other_reg != null) this.registration_array = firstEntry.other_reg;

          this.party_identification = {
            date_of_birth: firstEntry.date_of_birth ?? null,
            done_by: firstEntry.done_by ?? '',
            edu: firstEntry.edu ?? null,
            email: firstEntry.email ?? null,
            ext_pid: firstEntry.ext_pid ?? '',
            ext_pid_type: firstEntry.ext_pid_type ?? '',
            gender: firstEntry.gender ?? null,
            health_status: firstEntry.health_status ?? null,
            la_party_type: firstEntry.la_party_type ?? 'Natural Person',
            married_status: firstEntry.married_status ?? null,
            other_reg: firstEntry.other_reg ?? null,
            party_full_name: firstEntry.party_full_name ?? null,
            party_name: firstEntry.party_name ?? null,
            pid: firstEntry.pid ?? '',
            pmt_address: firstEntry.pmt_address ?? null,
            race: firstEntry.race ?? null,
            ref_id: firstEntry.ref_id ?? null,
            religion: firstEntry.religion ?? null,
            remark: firstEntry.remark ?? null,
            sl_group_party_type: firstEntry.sl_group_party_type ?? null,
            sl_party_type: firstEntry.sl_party_type ?? 'Civilian',
            specific_tp: firstEntry.specific_tp ?? null,
            tp: firstEntry.tp ?? null,
          };
        } else {
          this.handleNotFound();
        }
      },
      error: (err) => {
        if (err?.status === 404) {
          this.notificationService.showError(err?.error?.message || 'Data not found');
          this.handleNotFound();
          return;
        }
        this.notificationService.showError('Failed to fetch data');
        console.error(err);
      },
    });
  }

  private handleNotFound() {
    this.data_submitted = false;
    this.registed_number_searched = true;
    this.party_already_existing = false;
    this.civilian_data__array = [];
    this.registration_array = [];
    this.party_identification = {
      ext_pid_type: this.civilian.party_registration_type,
      ext_pid: this.civilian.registration_number,
      la_party_type: 'Natural Person',
      sl_party_type: 'Civilian',
    };
  }

  loadMortgageTypes() {
    this.apiService.loadMortgageTypes().subscribe((res) => {
      console.log(res);
      this.mortgage_types_array = res;
    });
  }

  loadGenderTypes() {
    this.apiService.loadGenderTypes().subscribe((res) => {
      console.log(res);
      this.gender_types_array = res;
    });
  }

  showCreatePop() {}

  addRegistrationTypes() {
    console.log(this.registration_array);
    let validate = true;
    for (let item of this.registration_array) {
      console.log(item);
      if (item.split('|')[0] == this.civilian_party.party_registration_type) {
        validate = false;
      }
    }
    if (validate) {
      if (this.civilian_party.party_registration_type && this.civilian_party.registration_number) {
        this.registration_array.push(
          `${this.civilian_party.party_registration_type}|${this.civilian_party.registration_number}`,
        );
        // Clear inputs after adding
        this.civilian_party.party_registration_type = '';
        this.civilian_party.registration_number = '';
      }
    } else {
      this.notificationService.showError('This registration type already existing');
    }
  }

  removeEntry(index: number) {
    this.registration_array.splice(index, 1);
  }

  getReligionTypes() {
    this.apiService.getReligionTypes().subscribe((res: any) => {
      this.religion_types_array = res;
    });
  }

  getMarriedTypes() {
    this.apiService.grtMarriedStatus().subscribe((res: any) => {
      this.married_types_array = res;
    });
  }

  getHelthdTypes() {
    this.apiService.getHelthdTypes().subscribe((res: any) => {
      this.helth_types_array = res;
    });
  }

  getRaceTypes() {
    this.apiService.getRaceTypes().subscribe((res: any) => {
      console.log(res);
      this.race_types_array = res;
    });
  }

  loadEducationLevelTypes() {
    this.apiService.getEducationLevelTypes().subscribe((res: any) => {
      console.log(res);
      this.education_leval_types_array = res;
    });
  }

  loadOwnershipTypes() {
    this.apiService.loadOwnershipTypes().subscribe((res: any) => {
      this.ownership_types_array = res;
    });
  }

  showPartyAllInputs() {
    this.show_all_inputs = true;
  }

  SubmitAll() {
    console.log(this.party_identification);
    if (!this.party_identification) {
      this.notificationService.showError('Invalid data');
      return;
    }
    if (this.party_identification.tp != null) {
      this.party_identification.tp = [this.party_identification.tp].toString();
      this.party_identification.tp = Array.isArray(this.party_identification.tp)
        ? this.party_identification.tp
        : [this.party_identification.tp];
    }
    this.party_identification.other_reg = this.registration_array;
    if (this.party_identification.other_reg.length == 0) {
      this.party_identification.other_reg = null;
    }
    if (this.party_already_existing == false) {
      this.apiService
        .pathchCivilianPartyForm('create', this.party_identification, this.party_identification.pid)
        .subscribe(
          (response: any) => {
            console.log(response);
            this.data_submitted = true;
            this.party_identification.pid = response.pid;
            this.notificationService.showSuccess('Data saved successfully');
          },
          (error: any) => {
            console.error('Error saving administrative info:', error);
            this.handleApiErrors(error);
          },
        );
    }
    if (this.party_already_existing == true) {
      let Id = this.party_identification.pid;
      delete this.party_identification.pid;

      this.apiService.pathchCivilianPartyForm('update', this.party_identification, Id).subscribe(
        (response: any) => {
          this.data_submitted = true;

          console.log(response);
          this.notificationService.showSuccess('Data saved successfully');
        },
        (error: any) => {
          console.error('Error saving administrative info:', error);
          this.handleApiErrors(error);
        },
      );
    }
  }

  /**
   * Handles API errors and displays appropriate toasts.
   */
  handleApiErrors(error: any) {
    if (error.error) {
      this.data_submitted = false;

      if (error.error.email) {
        console.log(error.error.email[0]);
        this.notificationService.showError(error.error.email[0]);
      }
      if (error.error.specific_tp) {
        console.log(error.error.specific_tp[0]);

        this.notificationService.showError(error.error.specific_tp[0]);
      }
    } else {
      this.notificationService.showError('Data not saved due to an unknown error.');
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

  canEditTrue(): boolean {
    return this.party_already_existing;
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

  addCivilian() {
    const response = { data: this.party_identification };
    this.dialogRef.close(response);
  }

  addData() {
    let party_type = '';
    if (this.data.partyType == 'nic') {
      party_type = 'NIC';
    }
    if (this.data.partyType == 'ps') {
      party_type = 'Passport';
    }
    if (this.data.partyType == 'dl') {
      party_type = 'License';
    }
    const response = { data: this.party_identification };
    this.dialogRef.close(response);
  }

  // INPUT VALIDATIONS
  // NIC VALIDATIONS

  validateAndFormatNIC(value: string): void {
    this.ps_number_validation = true;
    this.license_number_validation = true;
    if (!value) {
      this.id_number_validation = false;
      return;
    }
    // Patterns for validation
    const tenCharPattern = /^[0-9]{9}[VXvx]$/; // 9 digits + 'V' or 'X' (case insensitive)
    const twelveDigitPattern = /^[0-9]{12}$/; // 12-digit NIC

    // Format input: Capitalize first character, lowercase middle, and uppercase last character if 'V' or 'X'
    let formattedNIC =
      value.charAt(0).toUpperCase() +
      value.slice(1, -1).toLowerCase() +
      (value.length > 1 ? value.charAt(value.length - 1).toUpperCase() : '');

    // Ensure last character is 'V' or 'X' only if it matches old NIC format
    if (tenCharPattern.test(formattedNIC)) {
      const lastChar = formattedNIC.charAt(9).toUpperCase();
      if (lastChar === 'V' || lastChar === 'X') {
        formattedNIC = formattedNIC.slice(0, 9) + lastChar; // Ensure uppercase
      }
    }

    // Update model value safely
    setTimeout(() => {
      this.civilian.registration_number = formattedNIC;
    });

    // Validate formatted NIC
    this.id_number_validation =
      tenCharPattern.test(formattedNIC) || twelveDigitPattern.test(formattedNIC);
    if (this.civilian_party.registration_number != '') {
      this.id_number_validation =
        tenCharPattern.test(formattedNIC) || twelveDigitPattern.test(formattedNIC);
    }
  }

  // LICENCE VALIDATION
  validateLicenseNumber() {
    this.id_number_validation = true;
    this.ps_number_validation = true;
    const oldFormatPattern = /^\d{7}$/; // Old Format: 7 digits
    const newFormatPattern = /^[A-Z]\d{8}$/; // New Format: 1 Letter + 8 Digits

    let licenseNumber = this.civilian.registration_number;
    if (this.civilian_party.registration_number != '') {
      licenseNumber = this.civilian_party.registration_number;
    }
    this.license_number_validation =
      oldFormatPattern.test(licenseNumber) || newFormatPattern.test(licenseNumber);
  }
  // PASSPORT VALIDATION
  validatePassportNumber() {
    this.id_number_validation = true;
    this.license_number_validation = true;
    const pattern = /^[A-Z]\d{7}$/;
    this.ps_number_validation = pattern.test(this.civilian.registration_number);
    if (this.civilian_party.registration_number != '') {
      this.ps_number_validation = pattern.test(this.civilian_party.registration_number);
    }
  }

  partyTypeChange() {
    this.civilian_party.registration_number = '';
    this.license_number_validation = true;
    this.ps_number_validation = true;
    this.id_number_validation = true;
  }
}
