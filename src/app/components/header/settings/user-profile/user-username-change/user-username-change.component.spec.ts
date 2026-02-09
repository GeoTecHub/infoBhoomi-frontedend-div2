import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserUsernameChangeComponent } from './user-username-change.component';

describe('UserUsernameChangeComponent', () => {
  let component: UserUsernameChangeComponent;
  let fixture: ComponentFixture<UserUsernameChangeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserUsernameChangeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UserUsernameChangeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
