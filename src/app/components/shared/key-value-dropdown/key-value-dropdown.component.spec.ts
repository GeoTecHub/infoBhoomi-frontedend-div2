import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KeyValueDropdownComponent } from './key-value-dropdown.component';

describe('KeyValueDropdownComponent', () => {
  let component: KeyValueDropdownComponent;
  let fixture: ComponentFixture<KeyValueDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KeyValueDropdownComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(KeyValueDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
