import { TestBed } from '@angular/core/testing';

import { Spoti } from './spoti';

describe('Spoti', () => {
  let service: Spoti;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Spoti);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
