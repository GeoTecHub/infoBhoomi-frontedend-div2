import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeatureNotAvailableComponent } from './feature-not-available.component';

describe('FeatureNotAvailableComponent', () => {
  let component: FeatureNotAvailableComponent;
  let fixture: ComponentFixture<FeatureNotAvailableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureNotAvailableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FeatureNotAvailableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
