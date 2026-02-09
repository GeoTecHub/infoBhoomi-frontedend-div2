import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LayerPanelComponent } from './layer-panel.component';

describe('LayerPanelComponent', () => {
  let component: LayerPanelComponent;
  let fixture: ComponentFixture<LayerPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayerPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LayerPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
