import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThreeDBuildingViewerComponent } from './three-d-building-viewer.component';

describe('ThreeDBuildingViewerComponent', () => {
  let component: ThreeDBuildingViewerComponent;
  let fixture: ComponentFixture<ThreeDBuildingViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThreeDBuildingViewerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThreeDBuildingViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
