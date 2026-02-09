import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FloorPlanViewerComponent } from './floor-plan-viewer.component';

describe('FloorPlanViewerComponent', () => {
  let component: FloorPlanViewerComponent;
  let fixture: ComponentFixture<FloorPlanViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloorPlanViewerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FloorPlanViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
