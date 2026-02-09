import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShareLayerComponent } from './share-layer.component';

describe('ShareLayerComponent', () => {
  let component: ShareLayerComponent;
  let fixture: ComponentFixture<ShareLayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShareLayerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ShareLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
