import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LegalFirmComponent } from './legal-firm.component';

describe('LegalFirmComponent', () => {
  let component: LegalFirmComponent;
  let fixture: ComponentFixture<LegalFirmComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LegalFirmComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LegalFirmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
