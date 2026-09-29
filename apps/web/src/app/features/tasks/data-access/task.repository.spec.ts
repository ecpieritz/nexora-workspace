import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { CreateTaskInput, TaskAssignee, WorkspaceTask } from '../models/task.model';
import { TaskRepository } from './task.repository';

describe('TaskRepository', () => {
  let repository: TaskRepository;
  let httpTesting: HttpTestingController;

  const assignee: TaskAssignee = {
    id: 'member-1',
    userId: 'user-1',
    name: 'Emilyn Pieritz',
    email: 'demo@nexora.app',
    avatarUrl: null,
    color: '#625df5',
  };
  const task: WorkspaceTask = {
    id: 'task-1',
    createdById: 'user-1',
    name: 'Dashboard design',
    description: 'Connect the task board.',
    category: 'design',
    startsAt: '2026-09-28T09:00:00.000Z',
    dueAt: '2026-09-30T18:00:00.000Z',
    status: 'todo',
    assigneeIds: [assignee.id],
    assignees: [assignee],
    memberCount: 1,
    createdAt: '2026-09-28T08:00:00.000Z',
    updatedAt: '2026-09-28T08:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    repository = TestBed.inject(TaskRepository);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should list tasks with server-side filters and sorting', async () => {
    const result = repository.list({
      page: 2,
      limit: 10,
      search: 'dashboard',
      status: 'doing',
      category: 'design',
      assigneeId: assignee.id,
      from: '2026-09-01',
      to: '2026-09-30',
      sort: 'createdAt',
      order: 'desc',
    });
    const request = httpTesting.expectOne((candidate) => candidate.url === '/api/tasks');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('limit')).toBe('10');
    expect(request.request.params.get('search')).toBe('dashboard');
    expect(request.request.params.get('status')).toBe('doing');
    expect(request.request.params.get('category')).toBe('design');
    expect(request.request.params.get('assigneeId')).toBe(assignee.id);
    expect(request.request.params.get('from')).toBe('2026-09-01');
    expect(request.request.params.get('to')).toBe('2026-09-30');
    expect(request.request.params.get('sort')).toBe('createdAt');
    expect(request.request.params.get('order')).toBe('desc');
    request.flush({ data: [task], meta: { page: 2, limit: 10, total: 11, totalPages: 2 } });

    expect((await result).data).toEqual([task]);
  });

  it('should load people and a task by id', async () => {
    const people = repository.getPeople();
    httpTesting.expectOne('/api/tasks/people').flush({ data: [assignee] });
    await expectAsync(people).toBeResolvedTo([assignee]);

    const retrieved = repository.getById(task.id);
    httpTesting.expectOne(`/api/tasks/${task.id}`).flush({ data: task });
    await expectAsync(retrieved).toBeResolvedTo(task);
  });

  it('should create and update tasks through the API', async () => {
    const input: CreateTaskInput = {
      name: task.name,
      description: task.description,
      category: task.category,
      startsAt: task.startsAt,
      dueAt: task.dueAt,
      assigneeIds: task.assigneeIds,
    };
    const created = repository.create(input);
    const createRequest = httpTesting.expectOne('/api/tasks');
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual(input);
    createRequest.flush({ data: task });
    await expectAsync(created).toBeResolvedTo(task);

    const updated = repository.update(task.id, { name: 'Updated dashboard design' });
    const updateRequest = httpTesting.expectOne(`/api/tasks/${task.id}`);
    expect(updateRequest.request.method).toBe('PATCH');
    expect(updateRequest.request.body).toEqual({ name: 'Updated dashboard design' });
    updateRequest.flush({ data: { ...task, name: 'Updated dashboard design' } });
    expect((await updated).name).toBe('Updated dashboard design');
  });

  it('should update status and delete tasks through the API', async () => {
    const updated = repository.updateStatus(task.id, 'doing');
    const statusRequest = httpTesting.expectOne(`/api/tasks/${task.id}/status`);
    expect(statusRequest.request.method).toBe('PATCH');
    expect(statusRequest.request.body).toEqual({ status: 'doing' });
    statusRequest.flush({ data: { ...task, status: 'doing' } });
    expect((await updated).status).toBe('doing');

    const deletion = repository.delete(task.id);
    const deleteRequest = httpTesting.expectOne(`/api/tasks/${task.id}`);
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush(null, { status: 204, statusText: 'No Content' });
    await expectAsync(deletion).toBeResolved();
  });
});
