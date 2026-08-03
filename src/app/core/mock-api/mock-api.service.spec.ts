import { TestBed } from '@angular/core/testing';

import { MockApiService } from './mock-api.service';

describe('MockApiService', () => {
  let service: MockApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MockApiService);
  });

  it('should execute an asynchronous mock operation', async () => {
    const result = await service.execute(() => ({ id: 'item-1' }), { delay: 0 });
    expect(result).toEqual({ id: 'item-1' });
  });

  it('should paginate a collection without mutating it', () => {
    const items = ['one', 'two', 'three', 'four'];
    const result = service.paginate(items, { page: 2, pageSize: 2 });

    expect(result.data).toEqual(['three', 'four']);
    expect(result.total).toBe(4);
    expect(result.totalPages).toBe(2);
    expect(items).toEqual(['one', 'two', 'three', 'four']);
  });
});
