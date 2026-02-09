# CLAUDE.md — InfoBhoomi Frontend V2

## Project Overview

InfoBhoomi V2 is an Angular 19 web GIS (Geographic Information System) application for land and property management. It provides 2D/3D map visualization, parcel/building data management, role-based access control, and administrative tools for organizations, users, and layers.

## Tech Stack

- **Framework**: Angular 19.2.8 (standalone components, SSR-enabled)
- **Language**: TypeScript 5.7.3 (strict mode)
- **Mapping**: OpenLayers 10.5 (2D), iTowns 2.46 (3D), Turf.js 7.2 (spatial analysis)
- **UI**: Angular Material 19.2.8, ng-bootstrap 18, Bootstrap 5 (CDN), Bootstrap Icons
- **State**: RxJS BehaviorSubjects (no NgRx/Akita)
- **Styling**: Plain CSS with CSS custom properties (no SCSS, no Tailwind)
- **Testing**: Jasmine 5.1 + Karma 6.4
- **Formatting**: Prettier 3.6.2 + Husky + lint-staged

## Quick Reference Commands

```bash
npm start           # Dev server (ng serve --no-hmr)
npm run build       # Production build
npm test            # Run Jasmine/Karma tests
npm run format      # Auto-format with Prettier
npm run format:check  # Check formatting without modifying
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
│   │   │   ├── common/               # Shared admin components
│   │   │   ├── home-page/            # Admin dashboard
│   │   │   ├── layers-list/          # Layer management
│   │   │   ├── organizations/        # Org CRUD (list, create, edit, location-edit, area-edit)
│   │   │   ├── roles-list/           # Role management
│   │   │   └── user/                 # User CRUD (list, create, edit)
│   │   ├── components/               # Main app components
│   │   │   ├── auth/                 # Authentication
│   │   │   │   ├── guards/           # authGuard, adminGuard, superAdminGuard, permissionCheck
│   │   │   │   ├── login-page/
│   │   │   │   └── user-authenticator/
│   │   │   ├── dialogs/              # 20+ modal dialogs (about, add-layer, civilian, rrr-panel, etc.)
│   │   │   ├── header/               # App header with search and settings
│   │   │   ├── helpers/              # login-blocked, pro-version-message
│   │   │   ├── layer-panel/          # Layer management panel (create, edit-delete, tooltip)
│   │   │   ├── main/                 # Main map component
│   │   │   ├── shared/               # Reusable: collapsible, custom-buttons, key-value, popups
│   │   │   ├── side-panel/           # Property tabs: home, land, building, legal-spaces, external
│   │   │   └── tools/                # Map toolbar
│   │   ├── core/                     # Utilities
│   │   │   ├── constant.ts           # Permission ID sets (LandTabPermissions, BuildingsTabPermissions)
│   │   │   ├── PermissionIds.ts      # Permission ID definitions
│   │   │   └── pipes/                # sort-array, sort-by-date, sort-by-id
│   │   ├── landing/                  # Public landing page
│   │   ├── models/                   # TypeScript interfaces (API.ts, geometry.ts, orgArea.ts, etc.)
│   │   └── services/                 # ~34 injectable services
│   ├── styles.css                    # Global styles with CSS custom properties
│   └── index.html
├── environments/
│   └── environment.ts                # API URLs and config
├── angular.json                      # Angular CLI config
├── tsconfig.json                     # TypeScript config (strict)
├── package.json
├── server.ts                         # Express SSR server
├── proxy.conf.json                   # Dev proxy config
├── .prettierrc                       # Prettier config
├── .editorconfig                     # Editor config
└── layers.json                       # Layer definitions
```

## Architecture & Patterns

### Component Architecture

- All components are **standalone** (Angular 19 pattern — no NgModules).
- Component prefix is `app` (e.g., `app-header`, `app-side-panel`).
- Each component has its own `.component.ts`, `.component.html`, and `.component.css`.

### State Management

Uses RxJS `BehaviorSubject` streams in services — not a dedicated store library:

| Service | State | Purpose |
|---------|-------|---------|
| `UserService` | `user$`, `orgUserLimit$` | Current user details |
| `AuthService` | `currentUser$` | Auth state (delegates to UserService) |
| `AppStateService` | `canUndo$`, `canRedo$` | Undo/redo state |
| `LayerService` | `isLoading$` | Loading indicator |
| `DrawService` | selected features | Drawing/editing state |

### API Integration

- **Central API client**: `APIsService` in `src/app/services/API.service.ts` (~1800 lines)
- **Base URLs**: Defined in `environments/environment.ts`
  - Primary: `https://infobhoomiback.geoinfobox.com/api/user/`
  - Secondary (Vertext): `https://vertextback.geoinfobox.com/api/user/`
- **Auth**: Token-based (`Authorization: Token <token>`)
- **Token storage**: `localStorage.getItem('Token')`
- **File uploads**: Use `FormData` with `reportProgress: true`
- **Caching**: `DataService` implements basic data caching

### Routing

All routes are defined in `src/app/app.routes.ts`:

| Path | Guard | Purpose |
|------|-------|---------|
| `/` | none | Landing page |
| `/login` | none | Login page |
| `/main` | `authGuard` | Main map view |
| `/admin-home` | `adminGuard` | Admin dashboard |
| `/admin-organizations*` | `superAdminGuard` | Organization management |
| `/admin-layers-list` | `adminGuard` + `permissionCheck` | Layer management |
| `/admin-users-list` | `adminGuard` + `permissionCheck` | User management |
| `/admin-roles-list` | `adminGuard` + `permissionCheck` | Role management |

Permission-based routes use `data: { permission: { id: <number>, action: '<view|add|edit>' } }`.

### Authentication Flow

1. User logs in via `LoginService.login()`
2. Token stored in `localStorage`
3. Route guards call `userAuthentication()` API to verify token
4. `UserService.setUser()` stores user details
5. Permissions stored in `sessionStorage`
6. Guards check role (admin/superAdmin) and specific permission IDs

### Styling Conventions

- Plain CSS files per component (Angular view encapsulation)
- Global CSS variables defined in `src/styles.css`:
  - `--color-primary-*`, `--color-secondary-*`, `--color-accent-*`
  - `--color-neutral-*`, `--color-success`, `--color-warning`, `--color-error`, `--color-info`
  - `--color-background-*`, `--color-text-*`
- Bootstrap 5 utility classes available via CDN
- Icon sets: Bootstrap Icons, Font Awesome 6, Material Icons, Themify Icons

## Key Services Reference

| Service | File | Responsibility |
|---------|------|---------------|
| `APIsService` | `services/API.service.ts` | All HTTP calls (~100+ endpoints) |
| `AuthService` | `services/auth.service.ts` | Auth state |
| `UserService` | `services/user.service.ts` | User state |
| `LoginService` | `services/login.service.ts` | Login/logout/password |
| `MapService` | `services/map.service.ts` | OpenLayers map instance |
| `LayerService` | `services/layer.service.ts` | Layer CRUD and state |
| `DrawService` | `services/draw.service.ts` | Drawing tools, feature selection |
| `FeatureService` | `services/feature.service.ts` | Feature operations |
| `GeomService` | `services/geom.service.ts` | Geometry operations |
| `DataService` | `services/data.service.ts` | Data fetching with caching |
| `PermissionsService` | `services/permissions.service.ts` | Permission checks |
| `NotificationService` | `services/notifications.service.ts` | Toast notifications (ngx-toastr) |
| `AppStateService` | `services/app-state.service.ts` | Undo/redo state |
| `AdminService` | `services/admin.service.ts` | Admin operations |
| `VertextService` | `services/vertext.service.ts` | 3D vertex operations |

## Development Conventions

### Code Style

- **Prettier** auto-formats on commit via Husky + lint-staged.
- Config (`.prettierrc`): single quotes, semicolons, trailing commas, 100 char width, 2-space indent.
- Run `npm run format` before committing. Run `npm run format:check` to verify.

### TypeScript

- Strict mode enabled (`strict: true` in tsconfig).
- `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch` all enabled.
- Angular strict templates enabled (`strictTemplates`, `strictInjectionParameters`, `strictInputAccessModifiers`).

### Component Conventions

- Use standalone components (do not create NgModules).
- Component selector prefix: `app-`.
- Services use `providedIn: 'root'` for singleton injection.
- Prefer `inject()` function or constructor injection for DI.
- Use RxJS operators (`switchMap`, `map`, `catchError`, `takeUntil`) for async flows.

### SSR Awareness

- The app uses Angular SSR. Use `isPlatformBrowser(platformId)` checks before accessing browser-only APIs (`window`, `localStorage`, `document`).
- See `server.ts` for Express-based SSR configuration.

### File Naming

- Components: `<name>.component.ts`, `<name>.component.html`, `<name>.component.css`
- Services: `<name>.service.ts`
- Guards: `<name>.guard.ts`
- Models: located in `src/app/models/`
- Pipes: located in `src/app/core/pipes/`

### Geospatial Libraries

When working with map features:
- **OpenLayers** (`ol`) for 2D map rendering, layers, interactions, and features
- **iTowns** for 3D visualization
- **Turf.js** for spatial analysis (intersections, measurements, point-on-line)
- **Proj4** for coordinate system transformations
- **GeoTIFF** for raster data
- **ShpJS** for shapefile handling

## Build & Deployment

- **Dev**: `npm start` (serves at localhost with proxy config from `proxy.conf.json`)
- **Build**: `npm run build` produces output in `dist/info-bhoomi-v2/`
- **SSR**: `npm run serve:ssr:InfoBhoomi_V2` starts the Express server
- **Budget**: Production initial bundle warning at 1MB, error at 5MB

## Common Pitfalls

- The `APIsService` is very large (~1800 lines). When adding new endpoints, add methods there following the existing patterns.
- Token is read from `localStorage` — always guard with `typeof window !== 'undefined'` for SSR compatibility (see `core/constant.ts`).
- Permission IDs are numeric and defined in `core/constant.ts` and `core/PermissionIds.ts`. Route guards reference them by ID.
- The `proxy.conf.json` is currently empty — API calls go directly to the backend URLs in `environment.ts`.
- Components in `dialogs/` have some naming inconsistencies (e.g., `rrr-panel` vs `rrr-panal`) — match existing names when referencing.
