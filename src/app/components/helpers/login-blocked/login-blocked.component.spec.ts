import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginBlockedComponent } from './login-blocked.component';

describe('LoginBlockedComponent', () => {
  let component: LoginBlockedComponent;
  let fixture: ComponentFixture<LoginBlockedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginBlockedComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginBlockedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
