import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import earcut from 'earcut';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { APIsService } from '../../../services/api.service';
import { NotificationService } from '../../../services/notifications.service';
import { qa, qaErr } from '../../../core/qa-log';

export interface UnitCompositionData {
  /** survey_rep.id of the building whose rooms are being composed. */
  buildingSuId: number;
  /** Optional building label for the header. */
  buildingName?: string;
}

interface PoolUnit {
  su_id: number;
  apt_name: string | null;
  floor_no: number | null;
  floor_area: number | null;
  building_unit_type: string | null;
  cadastral_id: string | null;
  /** CityJSON room object ids this unit represents (usually one). */
  component_units: string[];
  selected: boolean;
  /** primary room object id used as the 3D handle / highlight key. */
  roomId: string;
}

const PRIVATE_TYPES = ['RESIDENTIAL', 'COMMERCIAL'];
const COMMON_TYPES = ['CIRCULATION', 'SERVICE', 'PARKING', 'AMENITY'];

/**
 * Unit Composition window — manual grouping of building rooms (units) into a
 * Legal Space Building Unit (apartment or common space). Renders the building's
 * rooms in 3D; rows and meshes are linked for two-way highlight so the surveyor
 * can confirm each unit before saving.
 */
@Component({
  selector: 'app-unit-composition',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatDialogModule, MatProgressSpinnerModule],
  templateUrl: './unit-composition.component.html',
  styleUrl: './unit-composition.component.css',
})
export class UnitCompositionComponent implements AfterViewInit, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly api = inject(APIsService);
  private readonly notify = inject(NotificationService);

  @ViewChild('sceneContainer', { static: true })
  sceneContainer!: ElementRef<HTMLDivElement>;

  pool: PoolUnit[] = [];
  loading = true;
  statusMsg = 'Loading building…';
  saving = false;

  /** Pool grouped by floor (issue #6) — easier to compose per-floor apartments. */
  get floorGroups(): Array<{ floor: number | null; label: string; units: PoolUnit[] }> {
    const map = new Map<number | null, PoolUnit[]>();
    for (const u of this.pool) {
      const f = u.floor_no ?? null;
      if (!map.has(f)) map.set(f, []);
      map.get(f)!.push(u);
    }
    const groups = Array.from(map.entries()).map(([floor, units]) => ({
      floor,
      label: floor === null ? 'Unknown floor' : `Floor ${floor}`,
      units,
    }));
    // sort: known floors ascending, unknown last
    groups.sort((a, b) => {
      if (a.floor === null) return 1;
      if (b.floor === null) return -1;
      return a.floor - b.floor;
    });
    return groups;
  }

  /** Select / deselect every room on a floor at once. */
  toggleFloor(group: { units: PoolUnit[] }): void {
    const allSel = group.units.every((u) => u.selected);
    for (const u of group.units) {
      u.selected = !allSel;
      this.applyHighlight(u);
    }
    qa('UnitComp', 'toggle floor', { count: group.units.length, selected: !allSel });
  }

  // composition form
  readonly privateTypes = PRIVATE_TYPES;
  readonly commonTypes = COMMON_TYPES;
  lsbuType = 'RESIDENTIAL';
  cadastralId = '';
  aptName = '';

  // three.js
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private animationId: number | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  // roomId -> meshes; mesh -> roomId
  private roomMeshes = new Map<string, THREE.Mesh[]>();
  private meshRoom = new Map<THREE.Mesh, string>();
  private buildingGroup!: THREE.Group;

  private readonly COLOR_DEFAULT = 0xb8c6d8;
  private readonly COLOR_SELECTED = 0xffc107;

  constructor(
    public dialogRef: MatDialogRef<UnitCompositionComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: UnitCompositionData,
  ) {}

  ngAfterViewInit(): void {
    this.initScene();
    this.loadData();
  }

  ngOnDestroy(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.renderer?.dispose();
    this.renderer?.domElement.removeEventListener('click', this.onCanvasClick);
  }

  get isPrivate(): boolean {
    return PRIVATE_TYPES.includes(this.lsbuType);
  }

  get selectedCount(): number {
    return this.pool.filter((u) => u.selected).length;
  }

  // ---------------------------------------------------------------- data
  private loadData(): void {
    qa('UnitComp', 'load', { buildingSuId: this.data.buildingSuId });
    forkJoin({
      units: this.api.listBuildingUnits(this.data.buildingSuId).pipe(catchError((e) => {
        qaErr('UnitComp', 'listBuildingUnits FAILED', e?.error ?? e);
        return of(null);
      })),
      cj: this.api.load3DData(this.data.buildingSuId).pipe(
        map((res) => this.extractCityJson(res)),
        catchError((e) => {
          qaErr('UnitComp', 'load3DData FAILED', e?.error ?? e);
          return of(null);
        }),
      ),
    }).subscribe(({ units, cj }) => {
      if (!units) {
        this.loading = false;
        this.statusMsg = 'Failed to load building units.';
        this.notify.showError('Failed to load building units.');
        this.cdr.markForCheck();
        return;
      }
      this.pool = (units.pool ?? []).map((u: any) => ({
        ...u,
        selected: false,
        roomId: (u.component_units && u.component_units[0]) ?? String(u.su_id),
      }));
      if (cj) this.drawRooms(cj);
      const cjObjs = cj?.CityObjects ? Object.keys(cj.CityObjects).length : 0;
      qa('UnitComp', 'loaded', {
        poolUnits: this.pool.length,
        existingLsbus: units.lsbus?.length ?? 0,
        cityObjects: cjObjs,
        roomMeshKeys: this.roomMeshes.size,
        sampleRoomIds: this.pool.slice(0, 3).map((u) => u.roomId),
      });
      if (this.pool.length > 0 && this.roomMeshes.size === 0) {
        qaErr('UnitComp', 'HIGHLIGHT RISK: pool units exist but NO room meshes — ' +
          'roomId↔mesh map empty (two-way highlight will not work). Check that ' +
          'pool roomId (component_units[0]) matches a CityJSON CityObject id.', {
          poolRoomIds: this.pool.map((u) => u.roomId),
          cityObjectIds: cj?.CityObjects ? Object.keys(cj.CityObjects).slice(0, 10) : [],
        });
      }
      this.loading = false;
      this.statusMsg = `${this.pool.length} unassigned room(s).`;
      this.cdr.markForCheck();
    });
  }

  private extractCityJson(res: any): any {
    if (!res) return null;
    if (res.CityObjects) return res;
    const rows = Array.isArray(res) ? res : Array.isArray(res?.results) ? res.results : null;
    if (rows && rows.length > 0) return rows[0]?.cityjson_data ?? rows[0] ?? null;
    if (res.cityjson_data) return res.cityjson_data;
    return null;
  }

  // ---------------------------------------------------------------- three.js
  private initScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xeef2f6);

    const el = this.sceneContainer.nativeElement;
    const w = el.clientWidth || 700;
    const h = el.clientHeight || 500;

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1_000_000);
    this.camera.up.set(0, 0, 1);

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    el.appendChild(canvas);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(80, 80, 160);
    this.scene.add(dir);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.15;
    this.controls.maxPolarAngle = Math.PI;

    this.renderer.domElement.addEventListener('click', this.onCanvasClick);
    this.animate();
  }

  private drawRooms(cityjson: any): void {
    if (!cityjson?.CityObjects || !cityjson?.vertices) return;
    this.buildingGroup = new THREE.Group();

    const t = cityjson.transform;
    const verts: number[][] = (cityjson.vertices as number[][]).map((v) => [
      t ? v[0] * t.scale[0] + t.translate[0] : v[0],
      t ? v[1] * t.scale[1] + t.translate[1] : v[1],
      t ? v[2] * t.scale[2] + t.translate[2] : v[2],
    ]);

    const box = new THREE.Box3();
    verts.forEach((v) => box.expandByPoint(new THREE.Vector3(v[0], v[1], v[2])));
    const c = box.getCenter(new THREE.Vector3());

    Object.entries<any>(cityjson.CityObjects).forEach(([roomId, obj]) => {
      if (!obj.geometry || obj.type === 'Building') return;
      obj.geometry.forEach((geom: any) => {
        this.traverse(geom.boundaries, (ring) => {
          const g = this.ringGeom(ring, verts, c);
          if (!g) return;
          const mesh = new THREE.Mesh(
            g,
            new THREE.MeshStandardMaterial({
              color: this.COLOR_DEFAULT,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.9,
            }),
          );
          this.meshRoom.set(mesh, roomId);
          if (!this.roomMeshes.has(roomId)) this.roomMeshes.set(roomId, []);
          this.roomMeshes.get(roomId)!.push(mesh);
          this.buildingGroup.add(mesh);
        });
      });
    });

    this.scene.add(this.buildingGroup);

    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 5);
    const d = maxDim * 1.8;
    this.camera.position.set(-d, -d, d);
    this.camera.lookAt(0, 0, 0);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  private ringGeom(indices: number[], vertices: number[][], c: THREE.Vector3) {
    if (!Array.isArray(indices) || indices.length < 3) return null;
    const pts = indices.map((i) => vertices[i]).filter(Boolean);
    if (pts.length < 3) return null;
    const local = pts.map((p) => [p[0] - c.x, p[1] - c.y, p[2] - c.z]);
    const n = this.normal(local);
    let a1 = 0;
    let a2 = 1;
    if (Math.abs(n[2]) >= Math.abs(n[0]) && Math.abs(n[2]) >= Math.abs(n[1])) {
      a1 = 0;
      a2 = 1;
    } else if (Math.abs(n[0]) >= Math.abs(n[1])) {
      a1 = 1;
      a2 = 2;
    } else {
      a1 = 0;
      a2 = 2;
    }
    const flat = local.map((p) => [p[a1], p[a2]]).flat();
    const tris = earcut(flat);
    if (!tris.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(local.flat(), 3));
    g.setIndex(tris);
    g.computeVertexNormals();
    return g;
  }

  private traverse(b: any, cb: (ring: number[]) => void): void {
    if (!b) return;
    if (Array.isArray(b[0])) b.forEach((x: any) => this.traverse(x, cb));
    else if (typeof b[0] === 'number') cb(b);
  }

  private normal(p: number[][]): number[] {
    let nx = 0;
    let ny = 0;
    let nz = 0;
    for (let i = 0; i < p.length; i++) {
      const a = p[i];
      const b = p[(i + 1) % p.length];
      nx += (a[1] - b[1]) * (a[2] + b[2]);
      ny += (a[2] - b[2]) * (a[0] + b[0]);
      nz += (a[0] - b[0]) * (a[1] + b[1]);
    }
    return [nx, ny, nz];
  }

  private animate = (): void => {
    if (this.renderer && this.scene && this.camera) {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this.animationId = requestAnimationFrame(this.animate);
    }
  };

  // ---------------------------------------------------------------- selection (two-way)
  private onCanvasClick = (event: MouseEvent): void => {
    if (!this.buildingGroup) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.buildingGroup.children, true);
    if (!hits.length) return;
    const roomId = this.meshRoom.get(hits[0].object as THREE.Mesh);
    if (!roomId) return;
    const unit = this.pool.find((u) => u.roomId === roomId);
    if (unit) {
      unit.selected = !unit.selected;
      this.applyHighlight(unit);
      qa('UnitComp', '3D→list highlight', { roomId, selected: unit.selected, su_id: unit.su_id });
      this.cdr.markForCheck();
    } else {
      qaErr('UnitComp', '3D pick: room not in pool (already grouped or id mismatch)', { roomId });
    }
  };

  /** Row click → toggle + highlight the matching 3D mesh (two-way). */
  toggleUnit(unit: PoolUnit): void {
    unit.selected = !unit.selected;
    const meshes = this.roomMeshes.get(unit.roomId)?.length ?? 0;
    this.applyHighlight(unit);
    qa('UnitComp', 'list→3D highlight', {
      roomId: unit.roomId, selected: unit.selected, meshesForRoom: meshes,
    });
    if (meshes === 0) {
      qaErr('UnitComp', 'list→3D highlight: 0 meshes for this roomId (mesh not found)', {
        roomId: unit.roomId,
      });
    }
  }

  /** Row hover → emphasise the mesh momentarily for confirmation. */
  hoverUnit(unit: PoolUnit | null): void {
    // re-apply base colours, then emphasise the hovered one if any
    this.pool.forEach((u) => this.applyHighlight(u));
    if (unit) {
      const meshes = this.roomMeshes.get(unit.roomId) || [];
      meshes.forEach((m) => ((m.material as THREE.MeshStandardMaterial).color.set(0x2196f3)));
    }
  }

  private applyHighlight(unit: PoolUnit): void {
    const meshes = this.roomMeshes.get(unit.roomId) || [];
    const color = unit.selected ? this.COLOR_SELECTED : this.COLOR_DEFAULT;
    meshes.forEach((m) => ((m.material as THREE.MeshStandardMaterial).color.set(color)));
  }

  // ---------------------------------------------------------------- save
  compose(): void {
    const picked = this.pool.filter((u) => u.selected);
    if (picked.length === 0) {
      this.notify.showWarning('Select at least one room.');
      return;
    }
    if (this.isPrivate && !this.cadastralId.trim()) {
      this.notify.showWarning('A cadastral ID is required for a private apartment.');
      return;
    }

    this.saving = true;
    this.cdr.markForCheck();

    const payload = {
      buildingSuId: this.data.buildingSuId,
      unitSuIds: picked.map((u) => u.su_id),
      buildingUnitType: this.lsbuType,
      cadastralId: this.isPrivate ? this.cadastralId.trim() : undefined,
      aptName: this.aptName.trim() || undefined,
    };
    qa('UnitComp', 'compose request', payload);

    this.api.composeLsbu(payload).subscribe({
      next: (res) => {
        this.saving = false;
        qa('UnitComp', 'compose OK', res);
        this.notify.showSuccess(
          `${this.lsbuType} created from ${res.member_room_count} room(s).`,
        );
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.saving = false;
        qaErr('UnitComp', `compose FAILED (HTTP ${err?.status})`, err?.error ?? err);
        this.notify.showError(
          err?.error?.error || err?.error?.detail || 'Composition failed.',
        );
        this.cdr.markForCheck();
      },
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
