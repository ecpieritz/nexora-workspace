import { TestBed } from '@angular/core/testing';

import { ApiLoadingService } from './api-loading.service';

describe('ApiLoadingService', () => {
  it('should remain active until every pending request finishes', () => {
    const service = TestBed.inject(ApiLoadingService);

    service.start();
    service.start();
    expect(service.isLoading()).toBeTrue();

    service.finish();
    expect(service.isLoading()).toBeTrue();

    service.finish();
    expect(service.isLoading()).toBeFalse();
  });

  it('should not allow the pending request count to become negative', () => {
    const service = TestBed.inject(ApiLoadingService);

    service.finish();

    expect(service.isLoading()).toBeFalse();
  });
});
