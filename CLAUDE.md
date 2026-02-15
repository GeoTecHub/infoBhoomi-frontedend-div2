# CLAUDE.md — InfoBhoomi Frontend V2

## Project Overview

InfoBhoomi V2 is an Angular 19 web GIS (Geographic Information System) application for land and property management. It provides 2D/3D map visualization, parcel/building data management, role-based access control, and administrative tools for organizations, users, and layers.

## Tech Stack

- **Framework**: Angular 19.2.8 (standalone components, SSR-enabled)
- **Language**: TypeScript 5.7.3 (strict mode, target ES2022)
- **Mapping**: OpenLayers 10.5 (2D), iTowns 2.46 (3D), Turf.js 7.2 (spatial analysis)
- **UI**: Angular Material 19.2.8, ng-bootstrap 18, ng-select 14.7, Bootstrap 5 (CDN), Bootstrap Icons
- **State**: RxJS 7.8 BehaviorSubjects (no NgRx/Akita)
- **Notifications**: Angular Material `MatSnackBar` (via `NotificationService`)
- **Styling**: Plain CSS with CSS custom properties (no SCSS, no Tailwind)
- **Testing**: Jasmine 5.1 + Karma 6.4
- **Formatting**: Prettier 3.6.2 + Husky + lint-staged
- **Data Parsing**: PapaParse 5.5 (CSV), ShpJS 6.1 (shapefiles), @tmcw/togeojson 7.1 (KML/GPX)

## Quick Reference Commands

```bash
npm start                        # Dev server (ng serve --no-hmr)
npm run build                    # Production build
npm test                         # Run Jasmine/Karma tests
npm run format                   # Auto-format with Prettier
npm run format:check             # Check formatting without modifying
npm run serve:ssr:InfoBhoomi_V2  # Start Express SSR server
```

## Project Structure

```
/
├── src/
│   ├── app/
│   │   ├── app.component.ts          # Root standalone component
│   │   ├── app.routes.ts             # All route definitions
│   │   ├── app.config.ts             # App providers config
│   │   ├── app.config.server.ts      # SSR config
│   │   ├── admin/                    # Admin panel
│   │   │   ├── admin.component.ts    # Admin root component
│   │   │   ├── common/               # Shared admin components
│   │   │   │   ├── admin-header/
│   │   │   │   └── admin-side-bar/
│   │   │   ├── home-page/            # Admin dashboard
│   │   │   ├── layers-list/          # Layer management
│   │   │   ├── organizations/        # Org CRUD
│   │   │   │   ├── organizations-list/
│   │   │   │   ├── organizations-create/
│   │   │   │   ├── organization-edit/
│   │   │   │   ├── organizations-location-edit/
│   │   │   │   └── organization-area-edit/
│   │   │   ├── roles-list/           # Role management
│   │   │   └── user/                 # User CRUD
│   │   │       ├── users-list/
│   │   │       ├── users-create/
│   │   │       └── user-edit/
│   │   ├── assets/                   # Static assets
│   │   │   ├── icons/                # SVG icons (location.svg, snap.svg)
│   │   │   ├── logos/                # App logos (LOGO.svg, logo-small.png, suleco-logo.webp)
│   │   │   └── sample/              # Sample images (avatars, house photos)
│   │   ├── components/               # Main app components
│   │   │   ├── auth/                 # Authentication
│   │   │   │   ├── guards/           # authGuard, adminGuard, superAdminGuard, permissionCheck
│   │   │   │   ├── login-page/
│   │   │   │   └── user-authenticator/
│   │   │   ├── dialogs/              # 23 modal dialog components
│   │   │   │   ├── dialogs.component.ts  # Main dialogs container
│   │   │   │   ├── about/
│   │   │   │   ├── add-layer/
│   │   │   │   ├── add-role/
│   │   │   │   ├── add-role-users/
│   │   │   │   ├── admin-contact/
│   │   │   │   ├── civilian/
│   │   │   │   ├── company/
│   │   │   │   ├── feature-not-available/
│   │   │   │   ├── group/
│   │   │   │   ├── info-modal/
│   │   │   │   ├── legal-firm/
│   │   │   │   ├── manage-ass-wards/
│   │   │   │   ├── manage-departments/
│   │   │   │   ├── online-users/
│   │   │   │   ├── rrr-panal/        # Note: typo in directory name
│   │   │   │   ├── rrr-panel/
│   │   │   │   ├── share-layer/
│   │   │   │   ├── subscription-details/
│   │   │   │   ├── three-d-building-viewer/
│   │   │   │   │   ├── floor-plan-viewer/
│   │   │   │   │   └── viewer/
│   │   │   │   ├── vertext/
│   │   │   │   └── workspace/
│   │   │   ├── header/               # App header
│   │   │   │   ├── search/
│   │   │   │   └── settings/
│   │   │   │       ├── activity-log/
│   │   │   │       └── user-profile/
│   │   │   │           ├── user-password-change/
│   │   │   │           └── user-username-change/
│   │   │   ├── helpers/              # UI helpers
│   │   │   │   ├── login-blocked/
│   │   │   │   └── pro-version-message/
│   │   │   ├── layer-panel/          # Layer management panel
│   │   │   │   ├── create-layer/
│   │   │   │   ├── custom-tooltip/
│   │   │   │   └── edit-delete-layer/
│   │   │   │       └── model-verification/
│   │   │   ├── main/                 # Main map component
│   │   │   ├── shared/               # Reusable components
│   │   │   │   ├── collapsible/
│   │   │   │   ├── custom-buttons/
│   │   │   │   ├── key-value/
│   │   │   │   ├── key-value-dropdown/
│   │   │   │   ├── key-value-v2/
│   │   │   │   ├── panel-img/
│   │   │   │   └── popups/
│   │   │   │       ├── confirm-dialog/
│   │   │   │       ├── export-data/
│   │   │   │       │   └── select-attributes/
│   │   │   │       ├── import-data/
│   │   │   │       ├── load-temp-data/
│   │   │   │       ├── print-panel/
│   │   │   │       └── query-builder/
│   │   │   ├── side-panel/           # Property data tabs
│   │   │   │   ├── home-tab/
│   │   │   │   ├── land-tab/
│   │   │   │   ├── land-info-panel/
│   │   │   │   ├── building-tab/
│   │   │   │   ├── building-info-panel/
│   │   │   │   ├── legal-spaces-tab/
│   │   │   │   ├── external-tab/
│   │   │   │   ├── loader/
│   │   │   │   └── dropdown_lists.js  # Dropdown option data
│   │   │   └── tools/                # Map toolbar
│   │   ├── core/                     # Utilities
│   │   │   ├── constant.ts           # Permission ID sets, Token helper
│   │   │   ├── PermissionIds.ts      # Permission ID definitions (mirrors constant.ts)
│   │   │   └── pipes/
│   │   │       ├── sort-array.pipe.ts
│   │   │       ├── sort-by-date-pipe.pipe.ts
│   │   │       └── sort-by-id.pipe.ts
│   │   ├── landing/                  # Public landing page
│   │   │   └── home-page/
│   │   ├── models/                   # TypeScript interfaces
│   │   │   ├── API.ts                # API response interfaces
│   │   │   ├── building-info.model.ts
│   │   │   ├── form-data.model.ts
│   │   │   ├── geometry.ts
│   │   │   ├── intersection-result.ts
│   │   │   ├── land-parcel.model.ts
│   │   │   └── orgArea.ts
│   │   └── services/                 # 22 injectable services
│   ├── styles.css                    # Global styles with CSS custom properties
│   ├── index.html                    # Main HTML entry
│   ├── main.ts                       # App bootstrap entry
│   ├── main.server.ts                # SSR bootstrap entry
│   └── shp.d.ts                      # ShpJS type declarations
├── environments/
│   └── environment.ts                # API URLs and config
├── angular.json                      # Angular CLI config
├── tsconfig.json                     # TypeScript config (strict)
├── tsconfig.app.json                 # App-specific TS config
├── package.json
├── server.ts                         # Express SSR server (port 4000)
├── proxy.conf.json                   # Dev proxy config (currently empty)
├── .prettierrc                       # Prettier config
├── .prettierignore                   # Ignores dist/, node_modules/, coverage/
├── .editorconfig                     # Editor config
├── layers.json                       # Layer definitions
└── change-log.md                     # Project changelog
```

## Architecture & Patterns

### Component Architecture

- All components are **standalone** (Angular 19 pattern — no NgModules).
- Component prefix is `app` (e.g., `app-header`, `app-side-panel`).
- Each component has its own `.component.ts`, `.component.html`, and `.component.css`.
- Some spec files are missing (e.g., `building-info-panel`, `land-info-panel`).

### App Configuration (Providers)

Defined in `src/app/app.config.ts`:

```typescript
providers: [
  provideZoneChangeDetection({ eventCoalescing: true }),
  provideRouter(routes),
  provideClientHydration(),
  provideAnimationsAsync(),
  provideHttpClient(withFetch()),
]
```

- **Zone change detection** with event coalescing for performance
- **Client hydration** for SSR support
- **HTTP client** uses the Fetch API (not XMLHttpRequest)
- **Animations** loaded asynchronously

### State Management

Uses RxJS `BehaviorSubject` streams in services — not a dedicated store library:

| Service | State | Purpose |
|---------|-------|---------|
| `UserService` | `user$`, `orgUserLimit$` | Current user details |
| `AuthService` | `currentUser$` | Auth state (delegates to UserService) |
| `AppStateService` | `canUndo$`, `canRedo$` | Undo/redo state |
| `LayerService` | `isLoading$` | Loading indicator |
| `DrawService` | selected features | Drawing/editing state |
| `SidebarControlService` | sidebar state | Sidebar panel visibility |
| `ToolbarActionService` | action triggers | Toolbar save/undo actions |

### API Integration

- **Central API client**: `APIsService` in `src/app/services/api.service.ts` (~1880 lines, 110+ endpoints)
- **Base URLs**: Defined in `environments/environment.ts`
  - Primary: `https://infobhoomiback.geoinfobox.com/api/user/`
  - Secondary (Vertext): `https://vertextback.geoinfobox.com/api/user/`
- **Additional env config**: `baseMaps.sentinalID` for Sentinel satellite imagery
- **Auth**: Token-based (`Authorization: Token <token>`)
- **Token storage**: `localStorage.getItem('Token')`
- **File uploads**: Use `FormData` with `reportProgress: true`
- **Caching**: `DataService` implements basic data caching

### Routing

All routes are defined in `src/app/app.routes.ts`:

| Path | Guard | Permission | Purpose |
|------|-------|------------|---------|
| `/` | none | — | Landing page |
| `/login` | none | — | Login page |
| `/main` | `authGuard` | — | Main map view |
| `/admin-home` | `adminGuard` | — | Admin dashboard |
| `/admin-organizations` | `superAdminGuard` | — | Org list |
| `/admin-organizations-create` | `superAdminGuard` | — | Create org |
| `/admin-organizations-edit/:org_id` | `superAdminGuard` | — | Edit org |
| `/admin-organizations-location-edit/:org_id` | `superAdminGuard` | — | Edit org location |
| `/admin-organizations-area-edit/:org_id` | `superAdminGuard` | — | Edit org area |
| `/admin-layers-list` | `adminGuard` + `permissionCheck` | `id: 253, action: 'view'` | Layer management |
| `/admin-users-list` | `adminGuard` + `permissionCheck` | `id: 251, action: 'view'` | User list |
| `/admin-user-create` | `adminGuard` + `permissionCheck` | `id: 251, action: 'add'` | Create user |
| `/admin-user-edit` | `adminGuard` | `id: 251, action: 'edit'` | Edit user |
| `/admin-roles-list` | `adminGuard` + `permissionCheck` | `id: 252, action: 'view'` | Role management |

Permission-based routes use `data: { permission: { id: <number>, action: '<view|add|edit>' } }`.

**Route-level permission IDs:**
- **251** — User management
- **252** — Role management
- **253** — Layer management

### Authentication Flow

1. User logs in via `LoginService.login()`
2. Token stored in `localStorage`
3. Route guards call `userAuthentication()` API to verify token
4. `UserService.setUser()` stores user details
5. Permissions stored in `sessionStorage`
6. Guards check role (admin/superAdmin) and specific permission IDs

### Permission System

Permissions are numeric IDs defined in `src/app/core/constant.ts`:

```
LandTabPermissions:
  L_ADMIN_INFO:      IDs 1–11
  L_LAND_OVERVIEW:   IDs 12–18
  L_UTILITY_INFO:    IDs 19–24
  L_LAND_TENURE:     IDs 25–34, 39
  L_ASSES_TAX_INFO:  IDs 47–60

BuildingsTabPermissions:
  B_ADMIN_INFO:       (empty — not yet implemented)
  B_BUILDING_OVERVIEW: (empty — not yet implemented)
```

The `Token` constant uses SSR-safe access: `typeof window !== 'undefined' ? localStorage.getItem('Token') : null`.

### Styling Conventions

- Plain CSS files per component (Angular view encapsulation)
- Global CSS variables defined in `src/styles.css`:
  - **Primary**: `--color-primary-l1`, `--color-primary-l2`, `--color-primary`, `--color-primary-d1`
  - **Secondary**: `--color-secondary-l1` through `--color-secondary-d3`
  - **Accent**: `--color-accent-light`, `--color-accent`, `--color-accent-dark`
  - **Neutral**: `--color-neutral-l1` through `--color-neutral-d3`
  - **Status**: `--color-success`, `--color-warning`, `--color-error`, `--color-info`
  - **Background**: `--color-background-l1`, `--color-background-d1`
  - **Text**: `--color-text-primary`, `--color-text-secondary`, `--color-text-inverse`
  - **Border**: `--color-border-l1`, `--color-border-d1`
  - **Blues**: `--color-blue-1` through `--color-blue-d1-4`
- Angular Material theme: `azure-blue` (prebuilt)
- Bootstrap 5 utility classes available via CDN
- Icon sets: Bootstrap Icons, Font Awesome 6, Material Icons, Themify Icons

## Key Services Reference

All 22 services in `src/app/services/`:

| Service | File | Responsibility |
|---------|------|---------------|
| `APIsService` | `api.service.ts` | Central HTTP client (~1880 lines, 110+ endpoints) |
| `AuthService` | `auth.service.ts` | Auth state, current user delegation |
| `UserService` | `user.service.ts` | User state BehaviorSubject |
| `LoginService` | `login.service.ts` | Login/logout/password operations |
| `MapService` | `map.service.ts` | OpenLayers map instance, projections, basemaps |
| `LayerService` | `layer.service.ts` | Layer CRUD, state, GeoJSON parsing |
| `DrawService` | `draw.service.ts` | Drawing tools, feature selection, OL interactions |
| `FeatureService` | `feature.service.ts` | Feature operations, geometry manipulation |
| `FeatureLinkService` | `feature-link.service.ts` | Feature linking operations |
| `GeomService` | `geom.service.ts` | Geometry operations using Turf.js |
| `DataService` | `data.service.ts` | Data fetching with caching |
| `PermissionService` | `permissions.service.ts` | Role-based permission checks |
| `NotificationService` | `notifications.service.ts` | Notifications via `MatSnackBar` (success/error/warning/info) |
| `AppStateService` | `app-state.service.ts` | Undo/redo state |
| `AdminService` | `admin.service.ts` | Admin role types and permission mappings |
| `ActivityLogService` | `activity-log.service.ts` | User activity log fetching |
| `OrgAreaDefineService` | `org-area-define.service.ts` | Organization area (PD, District, DSD, GND) definitions |
| `SidebarControlService` | `sidebar-control.service.ts` | Sidebar panel state control |
| `SplitService` | `split.service.ts` | Polygon splitting using Turf.js |
| `StyleFactoryService` | `style-factory.service.ts` | OpenLayers style factory for feature styling |
| `ToolbarActionService` | `toolbar-action.service.ts` | Toolbar action triggers (Save All, Undo) |
| `VertextService` | `vertext.service.ts` | 3D Vertext backend integration |

## Development Conventions

### Code Style

- **Prettier** auto-formats on commit via Husky + lint-staged.
- Config (`.prettierrc`): single quotes, semicolons, trailing commas, 100 char width, 2-space indent.
- Ignored paths (`.prettierignore`): `dist/`, `node_modules/`, `coverage/`.
- Run `npm run format` before committing. Run `npm run format:check` to verify.

### TypeScript

- Strict mode enabled (`strict: true` in tsconfig).
- `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch` all enabled.
- Angular strict templates enabled (`strictTemplates`, `strictInjectionParameters`, `strictInputAccessModifiers`).
- Target: ES2022, Module: ES2022, Module resolution: bundler.
- `useDefineForClassFields: false` (required for Angular decorator compatibility).

### Component Conventions

- Use standalone components (do not create NgModules).
- Component selector prefix: `app-`.
- Services use `providedIn: 'root'` for singleton injection.
- Prefer `inject()` function or constructor injection for DI.
- Use RxJS operators (`switchMap`, `map`, `catchError`, `takeUntil`) for async flows.

### SSR Awareness

- The app uses Angular SSR with `CommonEngine` from `@angular/ssr/node`.
- Express server runs on port 4000 (configurable via `PORT` env var).
- Static files served from `/browser` with 1-year cache.
- Use `isPlatformBrowser(platformId)` checks before accessing browser-only APIs (`window`, `localStorage`, `document`).
- The `Token` constant in `core/constant.ts` uses `typeof window !== 'undefined'` guard.
- See `server.ts` for Express-based SSR configuration.

### File Naming

- Components: `<name>.component.ts`, `<name>.component.html`, `<name>.component.css`
- Services: `<name>.service.ts`
- Guards: `<name>.guard.ts`
- Models: located in `src/app/models/`
- Pipes: located in `src/app/core/pipes/`
- Type declarations: `src/shp.d.ts` (ShpJS types)

### Geospatial Libraries

When working with map features:
- **OpenLayers** (`ol`) for 2D map rendering, layers, interactions, and features
- **iTowns** for 3D visualization
- **Turf.js** for spatial analysis (intersections, measurements, point-on-line, polygon splitting)
- **Proj4** for coordinate system transformations
- **GeoTIFF** for raster data
- **ShpJS** for shapefile handling
- **Earcut** for polygon triangulation (3D building rendering)
- **@tmcw/togeojson** for KML/GPX to GeoJSON conversion
- **PapaParse** for CSV parsing

## Build & Deployment

- **Dev**: `npm start` (serves at localhost with proxy config from `proxy.conf.json`)
- **Build**: `npm run build` produces output in `dist/info-bhoomi-v2/`
- **SSR**: `npm run serve:ssr:InfoBhoomi_V2` starts the Express server on port 4000
- **Budget**: Production initial bundle warning at 1MB, error at 5MB; component style warning at 500kB, error at 2MB
- **Assets**: Served from both `public/` and `src/app/assets/` (configured in `angular.json`)
- **Styles loaded**: Angular Material `azure-blue` theme, `src/styles.css`, `ol/ol.css`

## Common Pitfalls

- The `APIsService` is very large (~1880 lines). When adding new endpoints, add methods there following the existing patterns.
- Token is read from `localStorage` — always guard with `typeof window !== 'undefined'` for SSR compatibility (see `core/constant.ts`).
- Permission IDs are numeric and defined in `core/constant.ts` and `core/PermissionIds.ts`. Route guards reference them by ID.
- The `proxy.conf.json` is currently empty — API calls go directly to the backend URLs in `environment.ts`.
- Components in `dialogs/` have naming inconsistencies: both `rrr-panel/` and `rrr-panal/` exist as separate components. Match existing names when referencing.
- `ngx-toastr` is listed as a dependency in `package.json` but is **not used** in any source code. Notifications use `MatSnackBar` via `NotificationService`.
- The `admin-user-edit` route uses only `adminGuard` (no `permissionCheck` guard), unlike other admin routes — the `permissionCheck` is defined in route data but not enforced by a guard.
- `building-info-panel` and `land-info-panel` components have no `.spec.ts` test files.
- The `PermissionIds.ts` and `constant.ts` files have overlapping exports (`LandTabPermissions`, `BuildingsTabPermissions`). The `constant.ts` version includes the additional `Token` export and permission ID 39 in `L_LAND_TENURE`.
- The `side-panel/` directory contains a `dropdown_lists.js` file (plain JS, not TypeScript).
