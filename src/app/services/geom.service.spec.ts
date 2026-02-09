import { TestBed } from '@angular/core/testing';

import { GeomService } from './geom.service';

describe('GeomService', () => {
  let service: GeomService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeomService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
