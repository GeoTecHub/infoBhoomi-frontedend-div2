import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, Inject, OnInit, ViewChild } from '@angular/core';
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
import { MatTabChangeEvent, MatTabGroup, MatTabsModule } from '@angular/material/tabs';

import { APIsService } from '../../../services/api.service';
import { NotificationService } from '../../../services/notifications.service';
import { CivilianComponent } from '../civilian/civilian.component';
import { CompanyComponent } from '../company/company.component';
import { LegalFirmComponent } from '../legal-firm/legal-firm.component';

import { MatTooltipModule } from '@angular/material/tooltip';

declare var bootstrap: any;

export type RRRRow = {
  party_name: string;
  party_role_type: string;
  sl_ba_unit_name: string;
  sl_ba_unit_type: string;
  share_type: string;
  share: number;
  source_type: string | null;
  file_url: string | null;
  ba_unit_id: string;
};

export type RRRGroup = {
  isCurrent: boolean; // first object = current owners
  rows: RRRRow[];
};

type RRRHistoryTable = {
  suId: number | string;
  rrrGroups: RRRGroup[];
};

@Component({
  selector: 'app-rrr-panel',
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
    MatTooltipModule,
  ],
  templateUrl: './rrr-panel.component.html',
  styleUrls: ['./rrr-panel.component.css'],
})
export class RrrPanelComponent implements OnInit, AfterViewInit {
  rrrGroups: RRRGroup[] = [];
  @ViewChild(MatTabGroup) tabGroup!: MatTabGroup;
  historyTables: RRRHistoryTable[] = []; // all history tables
  historySuId: number | string | null = null;
  showSaveBtn = true;
  permissionsLoaded = false; // <- NEW: track when permission API finished

  party_sub_types_array_to_dialog = [{ name: 'Type 1' }, { name: 'Type 2' }, { name: 'Type 3' }]; // example data
  card = { party_sub_type: '' };

  // DATA LOAD OBJECTS
  right_edit_view: any = {
    right_type: '',
    description: '',
    from: '',
    to: '',
    life_time: true,
  };
  civilian = {
    party_registration_type: '',
    registration_number: '',
  };
  mortgage = {
    amount: '',
    interest: '',
    mortgage_type: '',
    ranking: '',
    Mortgage_ID: '',
    Mortgagee: '',
  };
  selected_dialog: any;
  doc_owner: false | undefined;
  doc_owner_pid: number | null = null;

  // DATA ARRAYS
  right_types_array = ['Ownership', 'Mortgage'];

  ownership = {
    ownership_type: '',
  };
  party_sub_types_array: any = [];
  existing_admin_source: any = [];
  source_types_array: any = [];
  rights_array: any = [];
  unit_type_options: any = [];

  administrative_source: any = {
    admin_source_type: null,
    sl_ba_unit_name: null,
    sl_ba_unit_type: '',
  };

  // BACKEND GET DATA ARRAYS
  mortgage_types_array: any = [];
  ownership_types_array: any = [];
  right_share_types_array: any = [];
  right_party_role_types_array: any = [];

  party_cards: any[] = [];
  adeded_party_cards: any[] = [];
  show_presentage_inputs = false;
  data_of_aded_party: any = {};
  ba_unit: any;

  show_party_add = false;

  add_party = {
    party_sub_type: '',
    share_percentage: '',
    share_type: '',
    party_role_type: '',
  };

  rrrRows: Array<{
    party_name: string;
    party_role_type: string;
    sl_ba_unit_name: string;
    sl_ba_unit_type: string;
    share_type: string;
    share: number;
    source_type: string | null;
    file_url: string | null;
    isCurrent: boolean;
  }> = [];

  private greenBase = '#e7f7e9'; // current group
  private creamShades = [
    // other groups (progressively stronger)
    '#fff8e6',
    '#fff3d6',
    '#ffedc6',
    '#ffe7b8',
    '#ffe1aa',
  ];

  rrr_permisions_array: any = [];
  showPrevOwners = false;

  constructor(
    public dialogRef: MatDialogRef<RrrPanelComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { feature_id: string },
    private apiService: APIsService,
    private dialog: MatDialog,
    private notificationService: NotificationService,
  ) {}

  // -------------------- LIFECYCLE -------------------- //

  ngOnInit(): void {
    // FIRST call: load permissions
    this.getRRRPermisions();

    // independent call – can run in parallel (doesn't depend on permissions)
    this.getBAUnitID();
  }

  ngAfterViewInit(): void {
    // Try to init tabs; will only proceed once permissionsLoaded is true
    this.tryInitTabs();
  }

  // Try initializing tabs when both:
  // 1) permissions are loaded, and 2) tabGroup is available.
  private tryInitTabs() {
    if (!this.permissionsLoaded || !this.tabGroup) return;

    const initialIndex = this.tabGroup.selectedIndex ?? 0;
    this.handleTabByIndex(initialIndex);
  }

  // -------------------- PERMISSIONS -------------------- //

  getRRRPermisions() {
    this.apiService.getRRRPermisions().subscribe((res) => {
      this.rrr_permisions_array = res;
      this.rrr_permisions_array = this.rrr_permisions_array.reduce(
        (acc: { [x: string]: any }, perm: { permission_id: string | number }) => {
          acc[perm.permission_id] = perm;
          return acc;
        },
        {},
      );

      this.permissionsLoaded = true; // mark as ready

      // Now that permissions are known, run other initial API calls
      this.loadMortgageTypes();
      this.loadOwnershipTypes();
      this.loadPartySubTypes();
      this.loadRightshareTypes();
      this.loadRightPartyRoleTypes();
      this.loadUnitTypes();
      this.getSourceTypes();

      // Initialize the current tab (e.g., View/Edit + getExistingAdminSourceData)
      this.tryInitTabs();
    });
  }

  canAddRRR(permissionId: number): boolean {
    return this.rrr_permisions_array[permissionId]?.add ?? false;
  }

  canViewRRR(permissionId: number): boolean {
    return this.rrr_permisions_array[permissionId]?.view ?? false;
  }

  canEditRRR(permissionId: number): boolean {
    return this.rrr_permisions_array[permissionId]?.edit ?? false;
  }

  canDeleteRRR(permissionId: number): boolean {
    return this.rrr_permisions_array[permissionId]?.delete ?? false;
  }

  // -------------------- TABS -------------------- //

  onTabChange(event: MatTabChangeEvent) {
    this.handleTabByIndex(event.index);
  }

  private handleTabByIndex(index: number) {
    const isViewEdit = index === 0;
    this.showSaveBtn = !isViewEdit;

    if (isViewEdit && this.canViewRRR(38)) {
      this.getExistingAdminSourceData();
    }
  }

  getTabLabel() {
    return this.existing_admin_source.length > 0
      ? 'Refer To An Existing Source'
      : 'Refer To An Existing Source (No Data)';
  }

  // -------------------- INITIAL LOADS -------------------- //

  getBAUnitID() {
    this.apiService.getBAUnitID(this.data.feature_id).subscribe((res) => {
      console.log(res);
      // @ts-ignore
      this.ba_unit = res.ba_unit_id;
    });
  }

  // ADD PARTY CARD

  addNewParty() {
    const newCard = {
      id: this.party_cards.length + 1,
      title: `Card ${this.party_cards.length + 1}`,
      content: 'This is a dynamically added card.',
      party_major_type: '',
      party_sub_type: '',
      share_type: '',
    };
    this.party_cards.push(newCard);
  }

  addNewPartyOneCard() {
    this.show_party_add = true;
  }

  loadMortgageTypes() {
    this.apiService.loadMortgageTypes().subscribe((res) => {
      this.mortgage_types_array = res;
    });
  }

  getSourceTypes() {
    this.apiService.getSourceTypes().subscribe((res) => {
      this.source_types_array = res;
    });
  }

  loadUnitTypes() {
    this.apiService.getUnitTypes().subscribe((res) => {
      console.log('Unit Types:', res);
      this.unit_type_options = res;
    });
  }

  private makeRRRGroupsFromRecords(records: any[], markCurrentOwners: boolean): RRRGroup[] {
    const groups: RRRGroup[] = [];

    if (!Array.isArray(records) || records.length === 0) return groups;

    records.forEach((unit, idx) => {
      const file = (unit.admin_sources && unit.admin_sources[0]) || null;

      const sourceType = file?.admin_source_type ?? null;
      const fileUrl = file?.file_url ?? null; // from API

      const rows: RRRRow[] = (unit.rrrs || []).map((r: any) => ({
        party_name: r.party_name,
        party_role_type: r.party_role_type,
        sl_ba_unit_name: unit.sl_ba_unit_name,
        sl_ba_unit_type: unit.sl_ba_unit_type,
        ba_unit_id: unit.ba_unit_id,
        share_type: r.share_type,
        share: Number(r.share) || 0,
        source_type: sourceType,
        file_url: fileUrl,
      }));

      groups.push({
        isCurrent: markCurrentOwners && idx === 0, // only first group of CURRENT table
        rows,
      });
    });

    return groups;
  }

  civilianShowButton(presentage: any) {
    const newShare = this.toNum(presentage);

    if (newShare <= 0) {
      this.notificationService.showError('Share (%) must be greater than 0.');
      return;
    }
    if (newShare > 100) {
      this.notificationService.showError('Share (%) cannot exceed 100%.');
      return;
    }

    const currentTotal = this.getTotalShare();
    if (currentTotal + newShare > 100 + 1e-6) {
      const remaining = Math.max(0, 100 - currentTotal);
      this.notificationService.showError(
        `Total shares cannot exceed 100%. Remaining allocable: ${remaining.toFixed(2)}%.`,
      );
      return;
    }

    if (this.right_edit_view.life_time === true) {
      this.right_edit_view.to = null;
    }
    if (this.right_edit_view.description === '') {
      this.right_edit_view.description = null;
    }

    const input_data = {
      party_name: this.data_of_aded_party.party_name,
      share: newShare,
      party_type: this.add_party.party_sub_type,
      date_start: this.right_edit_view.from,
      date_end: this.right_edit_view.to,
      description: this.right_edit_view.description,
      party: this.data_of_aded_party.pid,
      right_type: this.ownership.ownership_type,
      share_type: this.add_party.share_type,
      party_role_type: this.add_party.party_role_type,
    };

    this.adeded_party_cards.push(input_data);
    this.add_party.share_type = '';
    this.add_party.share_percentage = '';
    this.show_party_add = false;
    this.data_of_aded_party.party_name = '';
  }

  loadPartySubTypes() {
    this.apiService.loadPartySubTypes().subscribe((res) => {
      this.party_sub_types_array = res;
    });
  }

  loadOwnershipTypes() {
    this.apiService.loadOwnershipTypes().subscribe((res) => {
      this.ownership_types_array = res;
    });
  }

  loadRightshareTypes() {
    this.apiService.loadRightshareTypes().subscribe((res) => {
      console.log(res);
      this.right_share_types_array = res;
    });
  }

  loadRightPartyRoleTypes() {
    this.apiService.loadRightPartyRoleTypes().subscribe((res) => {
      console.log('loadRightPartyRoleTypes res', res);
      this.right_party_role_types_array = res;
    });
  }

  onPartySubTypeChange(selectedValue: string) {
    this.selected_dialog = selectedValue;
  }

  toggleLifeTimeSelection() {}

  // -------------------- PARTY DIALOGS -------------------- //

  openPartyTypeDialog(partyType: string) {
    if (this.add_party.party_sub_type) {
      if (this.add_party.party_sub_type == 'Group') {
        this.notificationService.showInfo('Group party type is under development.');
        return;
      }
      if (this.add_party.party_sub_type == 'Company') {
        const dialogRef = this.dialog.open(CompanyComponent, {
          minWidth: '55vw',
          maxWidth: '450px',
          panelClass: 'rrr-centered-dialog',
          data: { partyType: partyType, path: 'full' },
        });

        dialogRef.afterClosed().subscribe((result) => {
          if (result) {
            this.data_of_aded_party = result.data;
            this.show_presentage_inputs = true;
          }
        });
      }
      if (this.add_party.party_sub_type == 'Ministry') {
        const dialogRef = this.dialog.open(LegalFirmComponent, {
          minWidth: '55vw',
          maxWidth: '450px',
          panelClass: 'rrr-centered-dialog',
          data: { partyType: partyType },
        });

        dialogRef.afterClosed().subscribe((result) => {
          if (result) {
            console.log('Dialog result:', result);
          }
        });
      }
      if (this.add_party.party_sub_type == 'Civilian') {
        const dialogRef = this.dialog.open(CivilianComponent, {
          minWidth: '55vw',
          maxWidth: '450px',
          panelClass: 'rrr-centered-dialog',
          data: { partyType: partyType, path: 'full' },
        });

        dialogRef.afterClosed().subscribe((result) => {
          if (result) {
            console.log('Dialog result:', result);
            this.data_of_aded_party = result.data;
            this.show_presentage_inputs = true;
          }
        });
      }
    } else {
      this.notificationService.showError('Please select type');
    }
  }

  // -------------------- VIEW / EXISTING RRR -------------------- //

  getHistoryRowColor(historyIndex: number, groupIndex: number): string {
    // Start history groups from index 1 so that:
    // groupIndex 0 -> creamShades[0]
    // groupIndex 1 -> creamShades[1]
    // etc.
    const shiftedIndex = historyIndex * this.creamShades.length + groupIndex + 1;
    const isCurrent = false;

    return this.getRowColor(shiftedIndex, isCurrent);
  }

  getRowColor(groupIndex: number, isCurrent: boolean): string {
    if (isCurrent) return this.greenBase; // group 0
    const idx = Math.max(0, groupIndex - 1) % this.creamShades.length;
    return this.creamShades[idx];
  }

  private buildRRRGroups(payload: any[], append = false) {
    if (!Array.isArray(payload) || payload.length === 0) return;

    const baseIndex = append ? this.rrrGroups.length : 0;

    if (!append) {
      this.rrrGroups = [];
    }

    payload.forEach((unit, localIdx) => {
      const globalIdx = baseIndex + localIdx;

      const file = (unit.admin_sources && unit.admin_sources[0]) || null;
      const sourceType = file?.admin_source_type ?? null;
      const fileUrl = file?.file_url ?? null; // from API

      const rows: RRRRow[] = (unit.rrrs || []).map((r: any) => ({
        party_name: r.party_name,
        party_role_type: r.party_role_type,
        sl_ba_unit_name: unit.sl_ba_unit_name,
        sl_ba_unit_type: unit.sl_ba_unit_type,
        ba_unit_id: unit.ba_unit_id,
        share_type: r.share_type,
        share: Number(r.share) || 0,
        source_type: sourceType,
        file_url: fileUrl, // store file_url
      }));

      this.rrrGroups.push({
        isCurrent: globalIdx === 0, // only very first group is current
        rows,
      });
    });
  }

  getExistingAdminSourceData() {
    this.apiService.getExistingAdminSourceData(this.data.feature_id).subscribe((res: any) => {
      const records = Array.isArray(res.records) ? res.records : [];

      this.existing_admin_source = records;
      this.rrrGroups = this.makeRRRGroupsFromRecords(records, true); // mark current owners

      this.historySuId = res?.history_su_id ?? null;

      this.historyTables = [];
      this.showPrevOwners = false; // <-- reset when (re)loading
    });
  }

  private loadAdminSourceDataBySuId(suId: number | string, append = false) {
    this.apiService.getExistingAdminSourceData(suId).subscribe((res: any) => {
      const records = Array.isArray(res.records) ? res.records : [];

      // Track next history_su_id (or null if not available)
      this.historySuId = res?.history_su_id ?? null;

      if (!records.length) {
        if (!append) {
          this.existing_admin_source = [];
          this.rrrGroups = [];
        }
        return;
      }

      if (append) {
        this.existing_admin_source = [...this.existing_admin_source, ...records];
        this.buildRRRGroups(records, true);
      } else {
        this.existing_admin_source = records;
        this.buildRRRGroups(records, false);
      }
    });
  }

  loadMoreHistory() {
    if (!this.historySuId) {
      return;
    }

    const suIdToLoad = this.historySuId;

    this.apiService.getExistingAdminSourceData(suIdToLoad).subscribe((res: any) => {
      const records = Array.isArray(res.records) ? res.records : [];

      if (!records.length) {
        // even if no records, still move to previous history if provided
        this.historySuId = res?.history_su_id ?? null;
        return;
      }

      const groups = this.makeRRRGroupsFromRecords(records, false); // NO current owners in history

      this.historyTables.push({
        suId: suIdToLoad,
        rrrGroups: groups,
      });

      // update next history su_id (or null)
      this.historySuId = res?.history_su_id ?? null;
    });
  }

  onEdit(item: any) {}

  openPdfInNewTab(item: any) {
    console.log(item.file_path);
    this.apiService.getPDF(item.file_url).subscribe((res) => {
      const fileURL = URL.createObjectURL(res);
      window.open(fileURL, '_blank');
    });
  }

  // -------------------- CIVILIAN DATA / DOC OWNER -------------------- //

  getCivilianUserData() {
    this.apiService.getCivilianPartyData(this.administrative_source).subscribe((res) => {
      if (Array.isArray(res) && res.length > 0) {
        const firstEntry = res[0];
        console.log(firstEntry);
        ((this.administrative_source.party_full_name = firstEntry.party_full_name),
          (this.administrative_source.document_owner_id = firstEntry.pid));
      } else {
        this.notificationService.showWarning('No any records found');
      }
    });
  }

  toggleSelection(card: any) {
    console.log(card);

    if (this.doc_owner_pid === card.party) {
      console.log(this.doc_owner_pid);
      this.doc_owner_pid = null; // Uncheck if already selected
    } else {
      this.doc_owner_pid = card.party; // Select new checkbox
    }
  }

  private buildPartiesPayload() {
    return (this.adeded_party_cards || []).map((c: any) => ({
      pid: c.party,
      party_role_type: c.party_role_type,
      share_type: c.share_type,
      share: this.toNum(c.share),
    }));
  }

  // -------------------- FILE / SUBMIT -------------------- //

  onFileSelected(event: any) {
    const file = event.target?.files?.[0];
    if (file) {
      this.administrative_source.source = file; // <-- use .source
    } else {
      this.notificationService.showError('No file selected!');
    }
  }

  SubmitAll() {
    const total = this.getTotalShare();
    if (Math.abs(total - 100) > 1e-6) {
      this.notificationService.showError(
        `All party shares must total 100%. Current total: ${total.toFixed(2)}%.`,
      );
      return;
    }

    const file: File | null =
      this.administrative_source?.source || this.administrative_source?.file_path || null;

    if (!this.administrative_source?.admin_source_type) {
      this.notificationService.showError('Please select a Document Type');
      return;
    }
    if (!file) {
      this.notificationService.showError('Please attach the Document file (PDF)');
      return;
    }
    if (!this.administrative_source?.sl_ba_unit_name) {
      this.notificationService.showError('Please enter Unit Name');
      return;
    }
    if (!this.administrative_source?.sl_ba_unit_type) {
      this.notificationService.showError('Please select Unit Type');
      return;
    }

    const parties = this.buildPartiesPayload();
    if (!parties.length) {
      this.notificationService.showError('Please add at least one party');
      return;
    }

    this.notificationService.showInfo('Saving ...');

    const fd = new FormData();
    fd.append('su_id', String(this.data.feature_id)); // e.g. 50
    fd.append('sl_ba_unit_name', this.administrative_source.sl_ba_unit_name);
    fd.append('sl_ba_unit_type', this.administrative_source.sl_ba_unit_type);
    fd.append('admin_source_type', this.administrative_source.admin_source_type);
    fd.append('source', file);
    fd.append('parties', JSON.stringify(parties));

    this.apiService.postAdminSource(fd).subscribe(
      (response: any) => {
        this.notificationService.showSuccess('Data saved successfully');
        this.administrative_source = {};
        this.adeded_party_cards = [];
      },
      (error: any) => {
        console.error('Error saving:', error);
        this.handleApiErrors(error);
      },
    );
  }

  /**
   * Handles API errors and displays appropriate toasts.
   */
  handleApiErrors(error: any) {
    if (error.error) {
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

  addDocumentOwner() {
    this.administrative_source.document_owner = this.administrative_source.party_full_name;
  }

  removeCard(index: number) {
    this.adeded_party_cards.splice(index, 1);
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  private toNum(v: any): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  private getTotalShare(): number {
    return (this.adeded_party_cards || []).reduce((sum, c: any) => sum + this.toNum(c.share), 0);
  }

  openPdfFromRow(row: any) {
    console.log('Preview clicked row:', row);

    if (!row?.file_url) {
      console.warn('No file_url available on this row');
      return;
    }

    // Call the new API method and just log the result for now
    this.apiService.getRRRFile(row.file_url).subscribe({
      next: (res) => {
        console.log('RRR file response:', res);
      },
      error: (err) => {
        console.error('Error fetching RRR file:', err);
      },
    });
  }

  // -------------------- DELETE FLOW -------------------- //

  passwordVisible: boolean = false;
  admin_password = '';

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  ba_unit_id_to_delete: string | null = null;

  openDeleteModal(ba_unit_id: string) {
    this.ba_unit_id_to_delete = ba_unit_id;
    const modalElement = document.getElementById('confirmDeleteModal');
    let modal: any;
    if (modalElement) {
      modal = new bootstrap.Modal(modalElement, {
        backdrop: false, // Disable backdrop to prevent overlay issues
        keyboard: true,
      });
      modal.show();
    }
  }

  confirmDelete() {
    if (!this.ba_unit_id_to_delete) {
      this.notificationService.showError('No RRR selected for deletion.');
      return;
    }
    if (this.admin_password != '') {
      const input_data = {
        password: this.admin_password,
      };
      this.apiService.postPassword(input_data).subscribe((res) => {
        this.apiService.deleteRrr(this.ba_unit_id_to_delete as string).subscribe(
          (response: any) => {
            this.notificationService.showSuccess('RRR removed successfully!');
            const modal = bootstrap.Modal.getInstance(
              document.getElementById('confirmDeleteModal'),
            );
            modal.hide();
            this.getExistingAdminSourceData();
            this.ba_unit_id_to_delete = null;
          },
          (error: any) => {
            console.error('Error deleting RRR:', error);
            if (error?.error?.non_field_errors) {
              this.notificationService.showError('RRR could not be removed');
            } else {
              this.notificationService.showError('RRR could not be removed');
            }
          },
        );
      });
    }
  }
}
