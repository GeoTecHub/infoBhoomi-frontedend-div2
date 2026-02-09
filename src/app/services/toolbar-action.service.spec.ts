import { TestBed } from '@angular/core/testing';

import { ToolbarActionService } from './toolbar-action.service';

describe('ToolbarActionService', () => {
  let service: ToolbarActionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToolbarActionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
