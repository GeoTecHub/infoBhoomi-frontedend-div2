import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserAuthenticatorComponent } from './user-authenticator.component';

describe('UserAuthenticatorComponent', () => {
  let component: UserAuthenticatorComponent;
  let fixture: ComponentFixture<UserAuthenticatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserAuthenticatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UserAuthenticatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
