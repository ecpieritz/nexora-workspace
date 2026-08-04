import { TestBed } from '@angular/core/testing';

import { MockApiService } from '@core/mock-api';

import { ScheduleRepository } from './schedule.repository';

class MockApiStub {
  async execute<T>(operation: () => T | Promise<T>): Promise<T> {
    return operation();
  }
}

describe('ScheduleRepository', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [ScheduleRepository, { provide: MockApiService, useClass: MockApiStub }],
    });
  });
  afterEach(() => localStorage.clear());

  it('should return isolated schedule and people records', async () => {
    const repository = TestBed.inject(ScheduleRepository);
    expect((await repository.getSchedules()).length).toBe(8);
    expect((await repository.getPeople()).length).toBe(4);
  });

  it('should persist deleted schedule entries', async () => {
    const repository = TestBed.inject(ScheduleRepository);
    await repository.delete('schedule-1');
    expect((await repository.getSchedules()).some(({ id }) => id === 'schedule-1')).toBeFalse();
  });
});
