import { TestBed } from '@angular/core/testing';

import { SidebarControlService } from './sidebar-control.service';

describe('SidebarControlService', () => {
  let service: SidebarControlService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SidebarControlService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
