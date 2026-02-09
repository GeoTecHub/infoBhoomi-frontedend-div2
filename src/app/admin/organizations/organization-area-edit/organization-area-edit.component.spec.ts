import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrganizationAreaEditComponent } from './organization-area-edit.component';

describe('OrganizationAreaEditComponent', () => {
  let component: OrganizationAreaEditComponent;
  let fixture: ComponentFixture<OrganizationAreaEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationAreaEditComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OrganizationAreaEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
