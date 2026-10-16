export type TaskStatusValue = 'todo' | 'doing' | 'done';
export type TaskCategoryValue = 'design' | 'development' | 'research';
export type TaskSortField = 'name' | 'startsAt' | 'dueAt' | 'createdAt';
export type TaskSortOrder = 'asc' | 'desc';

export interface TaskAssignee {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  color: string;
}

export interface WorkspaceTask {
  id: string;
  createdById: string;
  name: string;
  description: string | null;
  category: TaskCategoryValue;
  startsAt: string;
  dueAt: string;
  status: TaskStatusValue;
  assigneeIds: string[];
  assignees: TaskAssignee[];
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWriteInput {
  name: string;
  description?: string | null;
  category: TaskCategoryValue;
  startsAt: Date;
  dueAt: Date;
  status: TaskStatusValue;
  assigneeIds: string[];
}

export interface TaskChanges {
  name?: string;
  description?: string | null;
  category?: TaskCategoryValue;
  startsAt?: Date;
  dueAt?: Date;
  assigneeIds?: string[];
}

export interface TaskListOptions {
  page: number;
  limit: number;
  search?: string;
  status?: TaskStatusValue;
  category?: TaskCategoryValue;
  assigneeId?: string;
  from?: Date;
  to?: Date;
  sort: TaskSortField;
  order: TaskSortOrder;
}

export interface TaskPage {
  items: WorkspaceTask[];
  total: number;
}

export interface TaskRepository {
  list(workspaceId: string, options: TaskListOptions): Promise<TaskPage>;
  listPeople(workspaceId: string): Promise<TaskAssignee[]>;
  findById(workspaceId: string, taskId: string): Promise<WorkspaceTask | null>;
  membersExist(workspaceId: string, memberIds: string[]): Promise<boolean>;
  create(workspaceId: string, createdById: string, input: TaskWriteInput): Promise<WorkspaceTask>;
  update(workspaceId: string, taskId: string, changes: TaskChanges): Promise<WorkspaceTask | null>;
  updateStatus(
    workspaceId: string,
    taskId: string,
    status: TaskStatusValue,
  ): Promise<WorkspaceTask | null>;
  delete(workspaceId: string, taskId: string): Promise<boolean>;
}
