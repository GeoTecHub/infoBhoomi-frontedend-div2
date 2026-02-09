import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KeyValueV2Component } from './key-value-v2.component';

describe('KeyValueV2Component', () => {
  let component: KeyValueV2Component;
  let fixture: ComponentFixture<KeyValueV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KeyValueV2Component],
    }).compileComponents();

    fixture = TestBed.createComponent(KeyValueV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
