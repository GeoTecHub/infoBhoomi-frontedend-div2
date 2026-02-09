import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RrrPanelComponent } from './rrr-panel.component';

describe('RrrPanelComponent', () => {
  let component: RrrPanelComponent;
  let fixture: ComponentFixture<RrrPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RrrPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RrrPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
