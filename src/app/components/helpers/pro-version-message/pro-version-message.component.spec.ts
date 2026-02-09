import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProVersionMessageComponent } from './pro-version-message.component';

describe('ProVersionMessageComponent', () => {
  let component: ProVersionMessageComponent;
  let fixture: ComponentFixture<ProVersionMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProVersionMessageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProVersionMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
