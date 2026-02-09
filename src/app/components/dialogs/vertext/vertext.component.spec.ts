import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VertextComponent } from './vertext.component';

describe('VertextComponent', () => {
  let component: VertextComponent;
  let fixture: ComponentFixture<VertextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VertextComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VertextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
