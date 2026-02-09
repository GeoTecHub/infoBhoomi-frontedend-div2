import { TestBed } from '@angular/core/testing';

import { OrgAreaDefineService } from './org-area-define.service';

describe('OrgAreaDefineService', () => {
  let service: OrgAreaDefineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OrgAreaDefineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
