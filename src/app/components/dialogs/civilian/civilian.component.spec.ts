import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CivilianComponent } from './civilian.component';

describe('CivilianComponent', () => {
  let component: CivilianComponent;
  let fixture: ComponentFixture<CivilianComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CivilianComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CivilianComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
