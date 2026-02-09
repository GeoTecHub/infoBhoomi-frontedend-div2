import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BuildingTabComponent } from './building-tab.component';

describe('BuildingTabComponent', () => {
  let component: BuildingTabComponent;
  let fixture: ComponentFixture<BuildingTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BuildingTabComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BuildingTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
