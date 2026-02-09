import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RrrPanalComponent } from './rrr-panal.component';

describe('RrrPanalComponent', () => {
  let component: RrrPanalComponent;
  let fixture: ComponentFixture<RrrPanalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RrrPanalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RrrPanalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
