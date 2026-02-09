import { provideRouter, Routes } from '@angular/router';

import { LoginPageComponent } from './components/auth/login-page/login-page.component';
import { MainComponent } from './components/main/main.component';

import { authGuard } from './components/auth/guards/auth.guard';

// ADMIN
import { HomePageComponent } from './admin/home-page/home-page.component';
import { LayersListComponent } from './admin/layers-list/layers-list.component';
import { OrganizationAreaEditComponent } from './admin/organizations/organization-area-edit/organization-area-edit.component';
import { OrganizationEditComponent } from './admin/organizations/organization-edit/organization-edit.component';
import { OrganizationsCreateComponent } from './admin/organizations/organizations-create/organizations-create.component';
import { OrganizationsListComponent } from './admin/organizations/organizations-list/organizations-list.component';
import { OrganizationsLocationEditComponent } from './admin/organizations/organizations-location-edit/organizations-location-edit.component';
import { RolesListComponent } from './admin/roles-list/roles-list.component';
import { UserEditComponent } from './admin/user/user-edit/user-edit.component';
import { UsersCreateComponent } from './admin/user/users-create/users-create.component';
import { UsersListComponent } from './admin/user/users-list/users-list.component';
import { adminGuard } from './components/auth/guards/admin.guard';
import { permissionCheck } from './components/auth/guards/permission-check.guard';
import { superAdminGuard } from './components/auth/guards/super-admin.guard';
import { LandingHomePageComponent } from './landing/home-page/home-page.component';

export const routes: Routes = [
  // { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '', component: LandingHomePageComponent },

  { path: 'main', component: MainComponent, canActivate: [authGuard] },
  { path: 'login', component: LoginPageComponent },
  // ADMIN
  { path: 'admin-home', component: HomePageComponent, canActivate: [adminGuard] },
  {
    path: 'admin-organizations',
    component: OrganizationsListComponent,
    canActivate: [superAdminGuard],
  },
  {
    path: 'admin-organizations-create',
    component: OrganizationsCreateComponent,
    canActivate: [superAdminGuard],
  },
  {
    path: 'admin-organizations-edit/:org_id',
    component: OrganizationEditComponent,
    canActivate: [superAdminGuard],
  },
  {
    path: 'admin-organizations-location-edit/:org_id',
    component: OrganizationsLocationEditComponent,
    canActivate: [superAdminGuard],
  },
  {
    path: 'admin-organizations-area-edit/:org_id',
    component: OrganizationAreaEditComponent,
    canActivate: [superAdminGuard],
  },
  {
    path: 'admin-layers-list',
    component: LayersListComponent,
    canActivate: [adminGuard, permissionCheck],
    data: { permission: { id: 253 as const, action: 'view' as const } },
  },
  {
    path: 'admin-users-list',
    component: UsersListComponent,
    canActivate: [adminGuard, permissionCheck],
    data: { permission: { id: 251 as const, action: 'view' as const } },
  },
  {
    path: 'admin-user-create',
    component: UsersCreateComponent,
    canActivate: [adminGuard, permissionCheck],
    data: { permission: { id: 251 as const, action: 'add' as const } },
  },
  {
    path: 'admin-user-edit',
    component: UserEditComponent,
    canActivate: [adminGuard],
    data: { permission: { id: 251 as const, action: 'edit' as const } },
  },
  {
    path: 'admin-roles-list',
    component: RolesListComponent,
    canActivate: [adminGuard, permissionCheck],
    data: { permission: { id: 252 as const, action: 'view' as const } },
  },
];
export const appRoutingProviders = [provideRouter(routes)];
