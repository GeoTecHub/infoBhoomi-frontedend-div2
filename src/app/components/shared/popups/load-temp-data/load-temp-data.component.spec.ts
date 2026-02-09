import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoadTempDataComponent } from './load-temp-data.component';

describe('LoadTempDataComponent', () => {
  let component: LoadTempDataComponent;
  let fixture: ComponentFixture<LoadTempDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadTempDataComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadTempDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
