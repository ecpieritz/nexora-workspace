import { ApiError } from '../../errors/api-error.js';
import { WorkspaceRole } from '../../generated/prisma/client.js';
import type { AuthPrincipal } from '../auth/index.js';
import type { CreateTaskInput, TaskListQuery, UpdateTaskInput } from './task.schemas.js';
import type {
  TaskAssignee,
  TaskChanges,
  TaskListOptions,
  TaskRepository,
  TaskStatusValue,
  TaskWriteInput,
  WorkspaceTask,
} from './task.types.js';

export interface TaskListResult {
  data: WorkspaceTask[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface TaskManagementService {
  list(principal: AuthPrincipal, query: TaskListQuery): Promise<TaskListResult>;
  listPeople(principal: AuthPrincipal): Promise<TaskAssignee[]>;
  get(principal: AuthPrincipal, taskId: string): Promise<WorkspaceTask>;
  create(principal: AuthPrincipal, input: CreateTaskInput): Promise<WorkspaceTask>;
  update(principal: AuthPrincipal, taskId: string, input: UpdateTaskInput): Promise<WorkspaceTask>;
  updateStatus(
    principal: AuthPrincipal,
    taskId: string,
    status: TaskStatusValue,
  ): Promise<WorkspaceTask>;
  delete(principal: AuthPrincipal, taskId: string): Promise<void>;
}

function startOfDay(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function endOfDay(value: string): Date {
  return new Date(`${value}T23:59:59.999Z`);
}

function isAdministrator(principal: AuthPrincipal): boolean {
  return principal.role === WorkspaceRole.OWNER || principal.role === WorkspaceRole.ADMIN;
}

function canEdit(principal: AuthPrincipal, task: WorkspaceTask): boolean {
  return task.createdById === principal.userId || isAdministrator(principal);
}

function canMove(principal: AuthPrincipal, task: WorkspaceTask): boolean {
  return (
    canEdit(principal, task) || task.assignees.some(({ userId }) => userId === principal.userId)
  );
}

export class TaskService implements TaskManagementService {
  constructor(private readonly repository: TaskRepository) {}

  async list(principal: AuthPrincipal, query: TaskListQuery): Promise<TaskListResult> {
    const options: TaskListOptions = {
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      order: query.order,
      ...(query.search === undefined ? {} : { search: query.search }),
      ...(query.status === undefined ? {} : { status: query.status }),
      ...(query.category === undefined ? {} : { category: query.category }),
      ...(query.assigneeId === undefined ? {} : { assigneeId: query.assigneeId }),
      ...(query.from === undefined ? {} : { from: startOfDay(query.from) }),
      ...(query.to === undefined ? {} : { to: endOfDay(query.to) }),
    };
    const page = await this.repository.list(principal.workspaceId, options);
    return {
      data: page.items,
      meta: {
        page: query.page,
        limit: query.limit,
        total: page.total,
        totalPages: Math.ceil(page.total / query.limit),
      },
    };
  }

  listPeople(principal: AuthPrincipal): Promise<TaskAssignee[]> {
    return this.repository.listPeople(principal.workspaceId);
  }

  async get(principal: AuthPrincipal, taskId: string): Promise<WorkspaceTask> {
    const task = await this.repository.findById(principal.workspaceId, taskId);
    if (!task) throw ApiError.notFound('Task was not found.');
    return task;
  }

  async create(principal: AuthPrincipal, input: CreateTaskInput): Promise<WorkspaceTask> {
    await this.assertMembers(principal.workspaceId, input.assigneeIds);
    const writeInput: TaskWriteInput = {
      name: input.name,
      category: input.category,
      startsAt: new Date(input.startsAt),
      dueAt: new Date(input.dueAt),
      status: input.status,
      assigneeIds: input.assigneeIds,
      ...(input.description === undefined ? {} : { description: input.description }),
    };
    return this.repository.create(principal.workspaceId, principal.userId, writeInput);
  }

  async update(
    principal: AuthPrincipal,
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<WorkspaceTask> {
    const existing = await this.get(principal, taskId);
    if (!canEdit(principal, existing)) {
      throw ApiError.forbidden('Only the task creator or a workspace administrator can edit it.');
    }
    if (input.assigneeIds) await this.assertMembers(principal.workspaceId, input.assigneeIds);

    const startsAt = input.startsAt ? new Date(input.startsAt) : new Date(existing.startsAt);
    const dueAt = input.dueAt ? new Date(input.dueAt) : new Date(existing.dueAt);
    if (dueAt < startsAt) {
      throw ApiError.badRequest('Due date must be on or after the start date.');
    }

    const changes: TaskChanges = {
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.description === undefined ? {} : { description: input.description }),
      ...(input.category === undefined ? {} : { category: input.category }),
      ...(input.startsAt === undefined ? {} : { startsAt }),
      ...(input.dueAt === undefined ? {} : { dueAt }),
      ...(input.assigneeIds === undefined ? {} : { assigneeIds: input.assigneeIds }),
    };
    const task = await this.repository.update(principal.workspaceId, taskId, changes);
    if (!task) throw ApiError.notFound('Task was not found.');
    return task;
  }

  async updateStatus(
    principal: AuthPrincipal,
    taskId: string,
    status: TaskStatusValue,
  ): Promise<WorkspaceTask> {
    const existing = await this.get(principal, taskId);
    if (!canMove(principal, existing)) {
      throw ApiError.forbidden(
        'Only the creator, an assignee or an administrator can move this task.',
      );
    }
    const task = await this.repository.updateStatus(principal.workspaceId, taskId, status);
    if (!task) throw ApiError.notFound('Task was not found.');
    return task;
  }

  async delete(principal: AuthPrincipal, taskId: string): Promise<void> {
    const existing = await this.get(principal, taskId);
    if (!canEdit(principal, existing)) {
      throw ApiError.forbidden('Only the task creator or a workspace administrator can delete it.');
    }
    const deleted = await this.repository.delete(principal.workspaceId, taskId);
    if (!deleted) throw ApiError.notFound('Task was not found.');
  }

  private async assertMembers(workspaceId: string, memberIds: string[]): Promise<void> {
    if (!(await this.repository.membersExist(workspaceId, memberIds))) {
      throw ApiError.badRequest('All assignees must belong to the active workspace.');
    }
  }
}
