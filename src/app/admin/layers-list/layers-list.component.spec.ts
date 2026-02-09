import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LayesListComponent } from './layers-list.component';

describe('LayesListComponent', () => {
  let component: LayesListComponent;
  let fixture: ComponentFixture<LayesListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayesListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LayesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
