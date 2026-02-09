import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrganizationsCreateComponent } from './organizations-create.component';

describe('OrganizationsCreateComponent', () => {
  let component: OrganizationsCreateComponent;
  let fixture: ComponentFixture<OrganizationsCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationsCreateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OrganizationsCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
