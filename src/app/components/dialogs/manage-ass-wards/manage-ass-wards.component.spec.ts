import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageAssWardsComponent } from './manage-ass-wards.component';

describe('ManageAssWardsComponent', () => {
  let component: ManageAssWardsComponent;
  let fixture: ComponentFixture<ManageAssWardsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageAssWardsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageAssWardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
