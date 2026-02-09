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
import { CivilianComponent } from '../civilian/civilian.component';
import { CompanyComponent } from '../company/company.component';
@Component({
  selector: 'app-group',
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
    NgSelectModule,
  ],
  templateUrl: './group.component.html',
  styleUrl: './group.component.css',
})
export class GroupComponent {
  selectedGroup: any = null;
  filterValue: any;
  party_identification: any = {
    ext_pid: '',
    sl_group_party_type: '',
    date_of_birth: null,
    done_by: '',
    edu: null,
    email: '',
    ext_pid_type: '',
    gender: null,
    health_status: null,
    la_party_type: 'Non Natural Person',
    married_status: null,
    other_reg: null,
    party_full_name: null,
    party_name: null,
    pid: '',
    pmt_address: '',
    race: null,
    ref_id: null,
    religion: null,
    remark: '',
    sl_party_type: 'Group',
    specific_tp: null,
    tp: 0,
  };

  edit_or_create_form = false;
  party_already_existing = false;
  data_not_found = false;
  id_number_validation = false;
  registration_array: any = [];
  party_cards: any[] = [];

  // BACKEND GET DATA ARRAYS
  group_names_array: any = [];
  group_types_array: any = [];
  party_sub_types_array: any = [];
  user_id: any;

  group_card = {
    party_sub_type: '',
    registration_number: '',
  };

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.getGroupTypes();
    this.getGroupNames();
    this.loadPartySubTypes();
  }
  civilian_: any;
  // featureId: string;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<GroupComponent>,
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

  // GET GROUP NAMES

  getGroupNames() {
    this.apiService.getGroupNames().subscribe((res) => {
      this.group_names_array = res;
    });
  }

  // GET GROUP TYPES
  getGroupTypes() {
    this.apiService.getGroupTypes().subscribe((res) => {
      console.log(res);
      this.group_types_array = res;
    });
  }

  loadPartySubTypes() {
    this.apiService.loadPartySubTypes().subscribe((res) => {
      console.log(res);
      this.party_sub_types_array = res;
    });
  }
  onPartySubTypeChange(type: any) {}

  onGroupChange(event: any) {
    this.selectedGroup = event;
  }
  filterGroups() {
    this.group_names_array = this.group_names_array.filter((option: { party_full_name: string }) =>
      option.party_full_name
        .toLowerCase()
        .includes(this.selectedGroup.party_full_name.toLowerCase()),
    );
  }
  // GET SAVED GROUP DATA
  getGroupData() {
    console.log(this.selectedGroup);
    if (this.selectedGroup?.pid) {
      let input_data = {
        registration_number: this.selectedGroup?.pid,
      };
      this.apiService.getPartyDataFromPID(input_data).subscribe((res) => {
        console.log(res);
        if (Array.isArray(res) && res.length > 0) {
          this.party_already_existing = true;
          this.data_not_found = false;
          const firstEntry = res[0];

          this.party_identification = {
            date_of_birth: firstEntry.date_of_birth ?? null,
            done_by: firstEntry.done_by ?? '',
            email: firstEntry.email ?? null,
            ext_pid: firstEntry.ext_pid ?? '',
            ext_pid_type: firstEntry.ext_pid_type ?? '',
            other_reg: firstEntry.other_reg ?? null,
            party_name: firstEntry.party_name ?? null,
            pid: firstEntry.pid ?? '',
            pmt_address: firstEntry.pmt_address ?? '',
            ref_id: firstEntry.ref_id ?? [], // Ensure it's an array
            remark: firstEntry.remark ?? null,
            sl_group_party_type: firstEntry.sl_group_party_type ?? '',
            specific_tp: firstEntry.specific_tp ?? null,
            tp: firstEntry.tp ?? null,
          };
        } else {
          console.log('No data found');
          this.party_already_existing = false;
          this.data_not_found = true;
        }
      });
    }
  }

  // ADD PARTY CARD

  addNewParty() {
    console.log('add');
    if (
      this.group_card.party_sub_type == 'nic' ||
      this.group_card.party_sub_type == 'ps' ||
      this.group_card.party_sub_type == 'dl'
    ) {
      const dialogRef = this.dialog.open(CivilianComponent, {
        minWidth: ' 85%',
        maxWidth: '450px',
        data: {
          partyType: this.group_card.party_sub_type,
          path: 'create_form',
          registration_number: this.group_card.registration_number,
          group_card: this.group_card.party_sub_type,
        }, // Pass the selected value to the dialog
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          let input_data = {
            party_name: result.party_name,
            registration_number: result.registration_number,
          };
          this.party_cards.push(input_data);
          console.log('Dialog result:', result); // You can handle the result here
        }
      });
    }
    if (this.group_card.party_sub_type == 'br') {
      const dialogRef = this.dialog.open(CompanyComponent, {
        minWidth: ' 85%',
        maxWidth: '450px',
        data: {
          partyType: this.group_card.party_sub_type,
          path: 'create_form',
          registration_number: this.group_card.registration_number,
          group_card: this.group_card.party_sub_type,
        }, // Pass the selected value to the dialog
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          let input_data = {
            party_name: result.party_name,
            registration_number: result.registration_number,
          };
          this.party_cards.push(input_data);
          console.log('Dialog result:', result); // You can handle the result here
        }
      });
    }
  }

  removeEntry(index: number) {
    this.registration_array.splice(index, 1);
  }

  showPartyAllInputs() {
    this.edit_or_create_form = true;
  }

  removeCard(index: number) {
    this.party_cards.splice(index, 1);
  }

  // SAVE OR UPDATE GROUP TABLE
  SubmitAll() {
    // if (!this.party_identification) {
    //   this.notificationService.showError('Invalid data');
    //   return;
    // }
    ((this.party_identification.party_full_name = this.selectedGroup.party_full_name),
      (this.party_identification.ext_pid_type = 'gp'),
      (this.party_identification.la_party_type = 'Non Natural Person'),
      (this.party_identification.other_reg = null));
    this.party_identification.ref_id = null;
    if (this.party_identification.tp != null) {
      if (!Array.isArray(this.party_identification.tp)) {
        this.party_identification.tp = [this.party_identification.tp];
      }
    }
    if (this.party_already_existing == false) {
      this.apiService
        .pathchCivilianPartyForm('create', this.party_identification, this.party_identification.pid)
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
