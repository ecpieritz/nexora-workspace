import { TestBed } from '@angular/core/testing';

import { MockStorageService } from './mock-storage.service';

describe('MockStorageService', () => {
  let service: MockStorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(MockStorageService);
  });

  afterEach(() => localStorage.clear());

  it('should persist and restore typed data', () => {
    service.write('test:items', [{ id: 1 }]);
    expect(service.read<{ id: number }[]>('test:items', [])).toEqual([{ id: 1 }]);
  });

  it('should return a fresh fallback when stored data is invalid', () => {
    localStorage.setItem('test:items', '{invalid-json');
    const fallback = [{ id: 1 }];
    const result = service.read('test:items', fallback);

    expect(result).toEqual(fallback);
    expect(result).not.toBe(fallback);
    expect(localStorage.getItem('test:items')).toBeNull();
  });
});
