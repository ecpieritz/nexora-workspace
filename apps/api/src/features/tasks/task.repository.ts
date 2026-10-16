import { prisma } from '../../database/prisma.js';
import {
  Prisma,
  TaskCategory,
  TaskStatus,
  type PrismaClient,
  type TaskCategory as PrismaTaskCategory,
  type TaskStatus as PrismaTaskStatus,
} from '../../generated/prisma/client.js';
import type {
  TaskAssignee,
  TaskCategoryValue,
  TaskChanges,
  TaskListOptions,
  TaskPage,
  TaskRepository,
  TaskStatusValue,
  TaskWriteInput,
  WorkspaceTask,
} from './task.types.js';

const assigneeSelect = {
  id: true,
  userId: true,
  user: { select: { fullName: true, email: true, avatarUrl: true } },
} satisfies Prisma.WorkspaceMemberSelect;

const taskSelect = {
  id: true,
  createdById: true,
  name: true,
  description: true,
  category: true,
  startsAt: true,
  dueAt: true,
  status: true,
  assignees: {
    select: { member: { select: assigneeSelect } },
    orderBy: { member: { user: { fullName: 'asc' as const } } },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.WorkspaceTaskSelect;

type AssigneeRecord = Prisma.WorkspaceMemberGetPayload<{ select: typeof assigneeSelect }>;
type TaskRecord = Prisma.WorkspaceTaskGetPayload<{ select: typeof taskSelect }>;

const publicToDatabaseStatus: Record<TaskStatusValue, PrismaTaskStatus> = {
  todo: TaskStatus.TODO,
  doing: TaskStatus.DOING,
  done: TaskStatus.DONE,
};

const databaseToPublicStatus: Record<PrismaTaskStatus, TaskStatusValue> = {
  [TaskStatus.TODO]: 'todo',
  [TaskStatus.DOING]: 'doing',
  [TaskStatus.DONE]: 'done',
};

const publicToDatabaseCategory: Record<TaskCategoryValue, PrismaTaskCategory> = {
  design: TaskCategory.DESIGN,
  development: TaskCategory.DEVELOPMENT,
  research: TaskCategory.RESEARCH,
};

const databaseToPublicCategory: Record<PrismaTaskCategory, TaskCategoryValue> = {
  [TaskCategory.DESIGN]: 'design',
  [TaskCategory.DEVELOPMENT]: 'development',
  [TaskCategory.RESEARCH]: 'research',
};

const memberColors = ['#87a8ff', '#d996ef', '#66c7c5', '#ff9c87', '#f1c66a', '#7cb9a8'];

function memberColor(id: string): string {
  const hash = [...id].reduce((value, character) => value + character.charCodeAt(0), 0);
  return memberColors[hash % memberColors.length] ?? '#87a8ff';
}

function toAssignee(member: AssigneeRecord): TaskAssignee {
  return {
    id: member.id,
    userId: member.userId,
    name: member.user.fullName,
    email: member.user.email,
    avatarUrl: member.user.avatarUrl,
    color: memberColor(member.id),
  };
}

function toTask(task: TaskRecord): WorkspaceTask {
  const assignees = task.assignees.map(({ member }) => toAssignee(member));
  return {
    id: task.id,
    createdById: task.createdById,
    name: task.name,
    description: task.description,
    category: databaseToPublicCategory[task.category],
    startsAt: task.startsAt.toISOString(),
    dueAt: task.dueAt.toISOString(),
    status: databaseToPublicStatus[task.status],
    assigneeIds: assignees.map(({ id }) => id),
    assignees,
    memberCount: assignees.length,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

function createWhere(
  workspaceId: string,
  options: TaskListOptions,
): Prisma.WorkspaceTaskWhereInput {
  const search = options.search?.trim();
  const dateRange =
    options.from || options.to
      ? {
          ...(options.to === undefined ? {} : { startsAt: { lte: options.to } }),
          ...(options.from === undefined ? {} : { dueAt: { gte: options.from } }),
        }
      : {};
  return {
    workspaceId,
    ...dateRange,
    ...(options.status === undefined ? {} : { status: publicToDatabaseStatus[options.status] }),
    ...(options.category === undefined
      ? {}
      : { category: publicToDatabaseCategory[options.category] }),
    ...(options.assigneeId === undefined
      ? {}
      : { assignees: { some: { memberId: options.assigneeId } } }),
    ...(search
      ? {
          OR: ['name', 'description'].map((field) => ({
            [field]: { contains: search, mode: Prisma.QueryMode.insensitive },
          })),
        }
      : {}),
  };
}

function taskData(input: TaskWriteInput | TaskChanges) {
  return {
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.category === undefined ? {} : { category: publicToDatabaseCategory[input.category] }),
    ...(input.startsAt === undefined ? {} : { startsAt: input.startsAt }),
    ...(input.dueAt === undefined ? {} : { dueAt: input.dueAt }),
  };
}

export class PrismaTaskRepository implements TaskRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  async list(workspaceId: string, options: TaskListOptions): Promise<TaskPage> {
    const where = createWhere(workspaceId, options);
    const [items, total] = await this.database.$transaction([
      this.database.workspaceTask.findMany({
        where,
        select: taskSelect,
        orderBy: [{ [options.sort]: options.order }, { id: 'asc' }],
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      this.database.workspaceTask.count({ where }),
    ]);
    return { items: items.map(toTask), total };
  }

  async listPeople(workspaceId: string): Promise<TaskAssignee[]> {
    const members = await this.database.workspaceMember.findMany({
      where: { workspaceId },
      select: assigneeSelect,
      orderBy: [{ user: { fullName: 'asc' } }, { id: 'asc' }],
    });
    return members.map(toAssignee);
  }

  async findById(workspaceId: string, taskId: string): Promise<WorkspaceTask | null> {
    const task = await this.database.workspaceTask.findFirst({
      where: { id: taskId, workspaceId },
      select: taskSelect,
    });
    return task ? toTask(task) : null;
  }

  async membersExist(workspaceId: string, memberIds: string[]): Promise<boolean> {
    const uniqueIds = [...new Set(memberIds)];
    const count = await this.database.workspaceMember.count({
      where: { workspaceId, id: { in: uniqueIds } },
    });
    return count === uniqueIds.length;
  }

  async create(
    workspaceId: string,
    createdById: string,
    input: TaskWriteInput,
  ): Promise<WorkspaceTask> {
    const task = await this.database.workspaceTask.create({
      data: {
        workspaceId,
        createdById,
        ...taskData(input),
        name: input.name,
        category: publicToDatabaseCategory[input.category],
        startsAt: input.startsAt,
        dueAt: input.dueAt,
        status: publicToDatabaseStatus[input.status],
        assignees: { create: input.assigneeIds.map((memberId) => ({ memberId })) },
      },
      select: taskSelect,
    });
    return toTask(task);
  }

  async update(
    workspaceId: string,
    taskId: string,
    changes: TaskChanges,
  ): Promise<WorkspaceTask | null> {
    return this.database.$transaction(async (transaction) => {
      const existing = await transaction.workspaceTask.findFirst({
        where: { id: taskId, workspaceId },
        select: { id: true },
      });
      if (!existing) return null;

      await transaction.workspaceTask.update({ where: { id: taskId }, data: taskData(changes) });
      if (changes.assigneeIds) {
        await transaction.taskAssignee.deleteMany({ where: { taskId } });
        await transaction.taskAssignee.createMany({
          data: changes.assigneeIds.map((memberId) => ({ taskId, memberId })),
        });
      }
      const task = await transaction.workspaceTask.findUnique({
        where: { id: taskId },
        select: taskSelect,
      });
      return task ? toTask(task) : null;
    });
  }

  async updateStatus(
    workspaceId: string,
    taskId: string,
    status: TaskStatusValue,
  ): Promise<WorkspaceTask | null> {
    const updated = await this.database.workspaceTask.updateMany({
      where: { id: taskId, workspaceId },
      data: { status: publicToDatabaseStatus[status] },
    });
    return updated.count === 1 ? this.findById(workspaceId, taskId) : null;
  }

  async delete(workspaceId: string, taskId: string): Promise<boolean> {
    const deleted = await this.database.workspaceTask.deleteMany({
      where: { id: taskId, workspaceId },
    });
    return deleted.count === 1;
  }
}
