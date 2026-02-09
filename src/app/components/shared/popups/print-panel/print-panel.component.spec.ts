import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintPanelComponent } from './print-panel.component';

describe('PrintPanelComponent', () => {
  let component: PrintPanelComponent;
  let fixture: ComponentFixture<PrintPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrintPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PrintPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
