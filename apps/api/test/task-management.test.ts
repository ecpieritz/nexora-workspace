import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import request from 'supertest';

import { createApp } from '../src/app.js';
import { JwtTokenService, type AuthPrincipal } from '../src/features/auth/index.js';
import {
  TaskService,
  type CreateTaskInput,
  type TaskAssignee,
  type TaskListQuery,
  type TaskListResult,
  type TaskManagementService,
  type TaskPage,
  type TaskRepository,
  type TaskStatusValue,
  type TaskWriteInput,
  type UpdateTaskInput,
  type WorkspaceTask,
} from '../src/features/tasks/index.js';
import { WorkspaceRole } from '../src/generated/prisma/client.js';
import { testAppOptions } from './test-app-options.js';

const taskId = '70000000-0000-4000-8000-000000000001';
const memberId = '30000000-0000-4000-8000-000000000002';
const assigneeUserId = '20000000-0000-4000-8000-000000000002';
const owner: AuthPrincipal = {
  userId: '20000000-0000-4000-8000-000000000001',
  sessionId: '30000000-0000-4000-8000-000000000001',
  workspaceId: '10000000-0000-4000-8000-000000000001',
  role: WorkspaceRole.OWNER,
};

const assignee: TaskAssignee = {
  id: memberId,
  userId: assigneeUserId,
  name: 'Eddie Lobanovskiy',
  email: 'eddie@example.com',
  avatarUrl: null,
  color: '#87a8ff',
};

const task: WorkspaceTask = {
  id: taskId,
  createdById: owner.userId,
  name: 'UI design',
  description: 'Create the product interface.',
  category: 'design',
  startsAt: '2026-08-03T00:00:00.000Z',
  dueAt: '2026-08-05T00:00:00.000Z',
  status: 'todo',
  assigneeIds: [memberId],
  assignees: [assignee],
  memberCount: 1,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

class FakeTaskService implements TaskManagementService {
  listQuery: TaskListQuery | undefined;
  created: CreateTaskInput | undefined;
  updated: { id: string; input: UpdateTaskInput } | undefined;
  status: TaskStatusValue | undefined;
  deletedId: string | undefined;

  list(_principal: AuthPrincipal, query: TaskListQuery): Promise<TaskListResult> {
    this.listQuery = query;
    return Promise.resolve({
      data: [task],
      meta: { page: query.page, limit: query.limit, total: 1, totalPages: 1 },
    });
  }

  listPeople(): Promise<TaskAssignee[]> {
    return Promise.resolve([assignee]);
  }

  get(): Promise<WorkspaceTask> {
    return Promise.resolve(task);
  }

  create(_principal: AuthPrincipal, input: CreateTaskInput): Promise<WorkspaceTask> {
    this.created = input;
    return Promise.resolve(task);
  }

  update(_principal: AuthPrincipal, id: string, input: UpdateTaskInput): Promise<WorkspaceTask> {
    this.updated = { id, input };
    return Promise.resolve(task);
  }

  updateStatus(
    _principal: AuthPrincipal,
    _id: string,
    status: TaskStatusValue,
  ): Promise<WorkspaceTask> {
    this.status = status;
    return Promise.resolve(task);
  }

  delete(_principal: AuthPrincipal, id: string): Promise<void> {
    this.deletedId = id;
    return Promise.resolve();
  }
}

class FakeTaskRepository implements TaskRepository {
  entry = task;
  membersAreValid = true;
  writeInput: TaskWriteInput | undefined;
  changedStatus: TaskStatusValue | undefined;

  list(): Promise<TaskPage> {
    return Promise.resolve({ items: [this.entry], total: 1 });
  }

  listPeople(): Promise<TaskAssignee[]> {
    return Promise.resolve([assignee]);
  }

  findById(): Promise<WorkspaceTask | null> {
    return Promise.resolve(this.entry);
  }

  membersExist(): Promise<boolean> {
    return Promise.resolve(this.membersAreValid);
  }

  create(_workspaceId: string, _createdById: string, input: TaskWriteInput) {
    this.writeInput = input;
    return Promise.resolve(this.entry);
  }

  update(): Promise<WorkspaceTask | null> {
    return Promise.resolve(this.entry);
  }

  updateStatus(
    _workspaceId: string,
    _taskId: string,
    status: TaskStatusValue,
  ): Promise<WorkspaceTask | null> {
    this.changedStatus = status;
    return Promise.resolve({ ...this.entry, status });
  }

  delete(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

const jwt = new JwtTokenService({
  secret: testAppOptions.jwtAccessSecret,
  issuer: testAppOptions.jwtIssuer,
  audience: testAppOptions.jwtAudience,
  ttlSeconds: testAppOptions.jwtAccessTtlSeconds,
});

async function authorizationHeader(): Promise<string> {
  return `Bearer ${await jwt.sign(owner)}`;
}

const createInput = {
  name: 'UI design',
  description: 'Create the product interface.',
  category: 'design',
  startsAt: '2026-08-03T00:00:00.000Z',
  dueAt: '2026-08-05T00:00:00.000Z',
  assigneeIds: [memberId],
} as const;

void describe('task management API', () => {
  void it('requires authentication and normalizes filters for every task view', async () => {
    const service = new FakeTaskService();
    const app = createApp({ ...testAppOptions, taskService: service });

    const unauthorized = await request(app).get('/api/tasks');
    const authorized = await request(app)
      .get('/api/tasks')
      .set('Authorization', await authorizationHeader())
      .query({ search: '  design ', status: 'doing', category: 'design', assigneeId: memberId });

    assert.equal(unauthorized.status, 401);
    assert.equal(authorized.status, 200);
    assert.deepEqual(service.listQuery, {
      page: 1,
      limit: 20,
      search: 'design',
      status: 'doing',
      category: 'design',
      assigneeId: memberId,
      sort: 'dueAt',
      order: 'asc',
    });
  });

  void it('supports people, task creation, editing, status changes and deletion', async () => {
    const service = new FakeTaskService();
    const app = createApp({ ...testAppOptions, taskService: service });
    const authorization = await authorizationHeader();

    const people = await request(app).get('/api/tasks/people').set('Authorization', authorization);
    const created = await request(app)
      .post('/api/tasks')
      .set('Authorization', authorization)
      .send(createInput);
    const updated = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', authorization)
      .send({ name: 'Updated UI design' });
    const moved = await request(app)
      .patch(`/api/tasks/${taskId}/status`)
      .set('Authorization', authorization)
      .send({ status: 'doing' });
    const deleted = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', authorization);

    assert.equal(people.status, 200);
    assert.equal(created.status, 201);
    assert.equal(service.created?.status, 'todo');
    assert.deepEqual(service.created?.assigneeIds, [memberId]);
    assert.equal(updated.status, 200);
    assert.deepEqual(service.updated, { id: taskId, input: { name: 'Updated UI design' } });
    assert.equal(moved.status, 200);
    assert.equal(service.status, 'doing');
    assert.equal(deleted.status, 204);
    assert.equal(service.deletedId, taskId);
  });

  void it('rejects invalid date ranges and duplicate assignees', async () => {
    const service = new FakeTaskService();
    const app = createApp({ ...testAppOptions, taskService: service });
    const authorization = await authorizationHeader();

    const dates = await request(app)
      .post('/api/tasks')
      .set('Authorization', authorization)
      .send({ ...createInput, startsAt: createInput.dueAt, dueAt: createInput.startsAt });
    const assignees = await request(app)
      .post('/api/tasks')
      .set('Authorization', authorization)
      .send({ ...createInput, assigneeIds: [memberId, memberId] });

    assert.equal(dates.status, 422);
    assert.equal(assignees.status, 422);
  });

  void it('allows assignees to move tasks without granting structural edits', async () => {
    const repository = new FakeTaskRepository();
    const service = new TaskService(repository);
    const memberPrincipal: AuthPrincipal = {
      ...owner,
      userId: assigneeUserId,
      role: WorkspaceRole.MEMBER,
    };

    await service.updateStatus(memberPrincipal, taskId, 'doing');
    assert.equal(repository.changedStatus, 'doing');
    await assert.rejects(service.update(memberPrincipal, taskId, { name: 'Not allowed' }), {
      statusCode: 403,
    });
    await assert.rejects(service.delete(memberPrincipal, taskId), { statusCode: 403 });

    repository.membersAreValid = false;
    await assert.rejects(
      service.create(owner, { ...createInput, status: 'todo', assigneeIds: [memberId] }),
      { statusCode: 400 },
    );
  });
});
