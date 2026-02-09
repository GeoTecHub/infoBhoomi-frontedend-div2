import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExternalTabComponent } from './external-tab.component';

describe('ExternalTabComponent', () => {
  let component: ExternalTabComponent;
  let fixture: ComponentFixture<ExternalTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExternalTabComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExternalTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
