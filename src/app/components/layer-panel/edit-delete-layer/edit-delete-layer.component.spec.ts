import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditDeleteLayerComponent } from './edit-delete-layer.component';

describe('EditDeleteLayerComponent', () => {
  let component: EditDeleteLayerComponent;
  let fixture: ComponentFixture<EditDeleteLayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditDeleteLayerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EditDeleteLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
