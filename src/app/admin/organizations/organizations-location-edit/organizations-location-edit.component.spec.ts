import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrganizationsLocationEditComponent } from './organizations-location-edit.component';

describe('OrganizationsLocationEditComponent', () => {
  let component: OrganizationsLocationEditComponent;
  let fixture: ComponentFixture<OrganizationsLocationEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationsLocationEditComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OrganizationsLocationEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
