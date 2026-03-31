# Optimize Bundle Size — InfoBhoomi Frontend

Reduce the initial bundle size by tree-shaking Turf.js and lazy-loading admin routes.

## Issue 1 — Turf.js Full Bundle Import

`@turf/turf` is installed as a full bundle (~500KB minified). The project already imports some individual packages correctly, but `@turf/turf` in `package.json` means the full lib may still be bundled.

### Fix: Replace any wildcard Turf imports

```bash
# Find any full turf imports
grep -rn "from '@turf/turf'" src/
grep -rn "import \* as turf" src/
```

Replace with individual imports:
```typescript
// BAD
import { area, intersect, booleanWithin } from '@turf/turf';

// GOOD — only imports what's needed
import { area } from '@turf/area';
import { intersect } from '@turf/intersect';
import { booleanWithin } from '@turf/boolean-within';
```

After replacing, remove `@turf/turf` from package.json dependencies:
```bash
npm uninstall @turf/turf
npm install   # verify build still works
```

## Issue 2 — Lazy Load Admin Routes

All `/admin-*` routes load immediately at startup. Since most users are not admins, this is wasted load time.

### Fix: Convert admin routes to lazy-loaded

In `src/app/app.routes.ts`:

```typescript
// BEFORE — eager loading
{
  path: 'admin-home',
  component: AdminComponent,
  canActivate: [adminGuard],
}

// AFTER — lazy loading
{
  path: 'admin-home',
  loadComponent: () =>
    import('./admin/admin.component').then(m => m.AdminComponent),
  canActivate: [adminGuard],
}
```

Apply this pattern to ALL `/admin-*` routes:
- `admin-home`
- `admin-organizations`
- `admin-organizations-create`
- `admin-organizations-edit/:org_id`
- `admin-organizations-location-edit/:org_id`
- `admin-organizations-area-edit/:org_id`
- `admin-layers-list`
- `admin-users-list`
- `admin-user-create`
- `admin-user-edit`
- `admin-roles-list`

## Issue 3 — Lazy Load Dialog Components

The 23 dialog components in `src/app/components/dialogs/` are loaded eagerly. Use Angular's `loadComponent` or dynamic `import()` when opening dialogs.

```typescript
// In the component that opens a dialog
async openBuildingViewer() {
  const { ThreeDBuildingViewerComponent } = await import(
    '../dialogs/three-d-building-viewer/viewer/viewer.component'
  );
  this.dialog.open(ThreeDBuildingViewerComponent, { ... });
}
```

## Verify Bundle Size Improvement

```bash
npm run build -- --stats-json
# Then check dist/info-bhoomi-v2/browser/ for bundle sizes

# Or use source-map-explorer
npx source-map-explorer dist/info-bhoomi-v2/browser/main*.js
```

Target: Initial bundle under 500KB (currently likely ~1MB+).
