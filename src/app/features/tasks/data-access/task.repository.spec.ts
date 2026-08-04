import { TestBed } from '@angular/core/testing';
import { MockApiService } from '@core/mock-api';
import { TaskRepository } from './task.repository';

class MockApiStub {
  async execute<T>(operation: () => T | Promise<T>): Promise<T> {
    return operation();
  }
}
describe('TaskRepository', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [TaskRepository, { provide: MockApiService, useClass: MockApiStub }],
    });
  });
  afterEach(() => localStorage.clear());
  it('should return seeded tasks', async () => {
    expect((await TestBed.inject(TaskRepository).getAll()).length).toBe(6);
  });
  it('should persist status updates and deletions', async () => {
    const repository = TestBed.inject(TaskRepository);
    expect((await repository.updateStatus('task-1', 'doing')).status).toBe('doing');
    await repository.delete('task-2');
    const tasks = await repository.getAll();
    expect(tasks.find(({ id }) => id === 'task-1')?.status).toBe('doing');
    expect(tasks.some(({ id }) => id === 'task-2')).toBeFalse();
  });
});
