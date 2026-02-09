import { Injectable } from '@angular/core';

export interface AreaRow {
  pd?: string;
  dist: string;
  dsd: string;
  gnd: string;
  gid: number;
}

@Injectable({ providedIn: 'root' })
export class OrgAreaDefineService {
  public pdList = [
    'Uva',
    'North Western',
    'Sabaragamuwa',
    'Southern',
    'Central',
    'North Central',
    'Eastern',
    'Western',
    'Northern',
  ];

  public allAreas: AreaRow[] = [];

  public distList: string[] = [];
  public dsdList: string[] = [];
  public gndList: string[] = [];

  public selectedPd: string | null = null;
  public selectedDist: string | null = null;
  public selectedDsd: string | null = null;

  public selectedGndMap: Record<string, boolean> = {};

  public gndsForOrg: AreaRow[] = [];

  constructor() {}

  setAreas(rows: AreaRow[] | null | undefined) {
    this.allAreas = rows ?? [];
  }

  buildDistrictsForProvince(pd: string | null): string[] {
    if (!pd) return [];
    const set = new Set(this.allAreas.filter((r) => r.pd === pd).map((r) => r.dist));
    return Array.from(set).sort();
  }

  buildDsdsForProvinceAndDistrict(pd: string | null, dist: string | null): string[] {
    if (!pd || !dist) return [];
    const set = new Set(
      this.allAreas.filter((r) => r.pd === pd && r.dist === dist).map((r) => r.dsd),
    );
    return Array.from(set).sort();
  }

  buildGndsForSelection(pd: string | null, dist: string | null, dsd: string | null): string[] {
    if (!pd || !dist || !dsd) return [];
    const set = new Set(
      this.allAreas
        .filter((r) => r.pd === pd && r.dist === dist && r.dsd === dsd)
        .map((r) => r.gnd),
    );
    return Array.from(set).sort();
  }

  getAvailableGnds(pd: string | null, dist: string | null, dsd: string | null): AreaRow[] {
    if (!pd || !dist || !dsd) return [];
    const added = new Set(this.gndsForOrg.map((r) => r.gid));
    return this.allAreas.filter(
      (r) => r.pd === pd && r.dist === dist && r.dsd === dsd && !added.has(r.gid),
    );
  }

  getAreaRowForGnd(gnd: string): AreaRow | null {
    const row = this.allAreas.find(
      (r) =>
        r.pd === this.selectedPd &&
        r.dist === this.selectedDist &&
        r.dsd === this.selectedDsd &&
        r.gnd === gnd,
    );
    return row ?? null;
  }

  addOrgAreaFromApi(entries: AreaRow[]) {
    if (!Array.isArray(entries) || !entries.length) return;
    const existing = new Set(this.gndsForOrg.map((r) => r.gid));
    for (const e of entries) {
      if (!existing.has(e.gid)) {
        this.gndsForOrg.push({ dist: e.dist, dsd: e.dsd, gnd: e.gnd, gid: e.gid });
        existing.add(e.gid);
      }
    }
    this.sortAdded();
  }

  addCheckedGndsToOrg() {
    const existing = new Set(this.gndsForOrg.map((r) => r.gid));
    for (const key of Object.keys(this.selectedGndMap)) {
      if (!this.selectedGndMap[Number(key)]) continue;
      const gid = Number(key);
      if (existing.has(gid)) continue;
      const row = this.allAreas.find((r) => r.gid === gid);
      if (row) {
        this.gndsForOrg.push({
          dist: row.dist,
          dsd: row.dsd,
          gnd: row.gnd,
          gid: row.gid,
        });
        existing.add(gid);
      }
    }
    this.selectedGndMap = {};
    // this.sortAdded();
  }

  removeGndFromOrg(gid: number) {
    const index = this.gndsForOrg.findIndex((r) => r.gid === gid);
    if (index !== -1) {
      this.gndsForOrg.splice(index, 1);
      // this.sortAdded();
    } else {
      console.warn(`GND with gid ${gid} not found in the organization areas.`);
    }
  }

  clearAllAddedGnds() {
    this.gndsForOrg = [];
  }

  resetBelowProvince() {
    this.distList = [];
    this.dsdList = [];
    this.gndList = [];
    this.selectedDist = null;
    this.selectedDsd = null;
    this.selectedGndMap = {};
  }

  resetBelowDistrict() {
    this.dsdList = [];
    this.gndList = [];
    this.selectedDsd = null;
    this.selectedGndMap = {};
  }

  resetBelowDsd() {
    this.gndList = [];
    this.selectedGndMap = {};
  }

  resetAll() {
    this.resetBelowProvince();
    this.resetBelowDistrict();
    this.resetBelowDsd();
    this.selectedPd = null;
    this.selectedDist = null;
    this.selectedDsd = null;
    this.gndsForOrg = [];
  }

  private sortAdded() {
    const cmp = (a: string, b: string) =>
      a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });

    this.gndsForOrg.sort((a, b) => {
      const byDist = cmp(a.dist, b.dist);
      if (byDist !== 0) return byDist;

      const byDsd = cmp(a.dsd, b.dsd);
      if (byDsd !== 0) return byDsd;

      return cmp(a.gnd, b.gnd);
    });
  }
}
