import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelImgComponent } from './panel-img.component';

describe('PanelImgComponent', () => {
  let component: PanelImgComponent;
  let fixture: ComponentFixture<PanelImgComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelImgComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PanelImgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
