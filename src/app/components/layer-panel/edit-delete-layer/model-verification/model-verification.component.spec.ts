import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModelVerificationComponent } from './model-verification.component';

describe('ModelVerificationComponent', () => {
  let component: ModelVerificationComponent;
  let fixture: ComponentFixture<ModelVerificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModelVerificationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ModelVerificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
