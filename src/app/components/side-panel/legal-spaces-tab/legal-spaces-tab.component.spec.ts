import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LegalSpacesTabComponent } from './legal-spaces-tab.component';

describe('LegalSpacesTabComponent', () => {
  let component: LegalSpacesTabComponent;
  let fixture: ComponentFixture<LegalSpacesTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LegalSpacesTabComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LegalSpacesTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
