import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LandTabComponent } from './land-tab.component';

describe('LandTabComponent', () => {
  let component: LandTabComponent;
  let fixture: ComponentFixture<LandTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandTabComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LandTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
