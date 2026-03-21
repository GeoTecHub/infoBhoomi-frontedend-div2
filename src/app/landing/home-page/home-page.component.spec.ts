import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LandingHomePageComponent } from './home-page.component';

describe('LandingHomePageComponent', () => {
  let component: LandingHomePageComponent;
  let fixture: ComponentFixture<LandingHomePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingHomePageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingHomePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
