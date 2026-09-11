import { inject, Injectable } from '@angular/core';
import { MockApiError, MockApiService, MockStorageService } from '@core/mock-api';
import { TaskStatus, WorkspaceTask } from '../models/task.model';

const TASKS_STORAGE_KEY = 'nexora:tasks';
const TASKS: readonly WorkspaceTask[] = [
  {
    id: 'task-1',
    name: 'UI design',
    category: 'design',
    startsAt: '2026-08-03T00:00:00.000Z',
    dueAt: '2026-08-05T00:00:00.000Z',
    memberCount: 5,
    status: 'todo',
  },
  {
    id: 'task-2',
    name: 'Logo design',
    category: 'design',
    startsAt: '2026-08-03T00:00:00.000Z',
    dueAt: '2026-08-05T00:00:00.000Z',
    memberCount: 3,
    status: 'todo',
  },
  {
    id: 'task-3',
    name: 'Graphic design',
    category: 'design',
    startsAt: '2026-08-02T00:00:00.000Z',
    dueAt: '2026-08-06T00:00:00.000Z',
    memberCount: 4,
    status: 'doing',
  },
  {
    id: 'task-4',
    name: 'Web development',
    category: 'development',
    startsAt: '2026-08-01T00:00:00.000Z',
    dueAt: '2026-08-08T00:00:00.000Z',
    memberCount: 6,
    status: 'doing',
  },
  {
    id: 'task-5',
    name: 'User research',
    category: 'research',
    startsAt: '2026-07-28T00:00:00.000Z',
    dueAt: '2026-08-02T00:00:00.000Z',
    memberCount: 2,
    status: 'done',
  },
  {
    id: 'task-6',
    name: 'Design system',
    category: 'design',
    startsAt: '2026-07-25T00:00:00.000Z',
    dueAt: '2026-08-01T00:00:00.000Z',
    memberCount: 5,
    status: 'done',
  },
];

@Injectable({ providedIn: 'root' })
export class TaskRepository {
  private readonly mockApi = inject(MockApiService);
  private readonly storage = inject(MockStorageService);
  getAll(): Promise<WorkspaceTask[]> {
    return this.mockApi.execute(() => this.read());
  }
  updateStatus(id: string, status: TaskStatus): Promise<WorkspaceTask> {
    return this.mockApi.execute(() => {
      const tasks = this.read();
      const index = tasks.findIndex((task) => task.id === id);
      if (index < 0) throw new MockApiError(404, 'Task not found.');
      tasks[index] = { ...tasks[index], status };
      this.storage.write(TASKS_STORAGE_KEY, tasks);
      return { ...tasks[index] };
    });
  }
  delete(id: string): Promise<void> {
    return this.mockApi.execute(() => {
      const tasks = this.read();
      if (!tasks.some((task) => task.id === id)) throw new MockApiError(404, 'Task not found.');
      this.storage.write(
        TASKS_STORAGE_KEY,
        tasks.filter((task) => task.id !== id),
      );
    });
  }
  private read(): WorkspaceTask[] {
    return this.storage.read<WorkspaceTask[]>(
      TASKS_STORAGE_KEY,
      TASKS.map((task) => ({ ...task })),
    );
  }
}
