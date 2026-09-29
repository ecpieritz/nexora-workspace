export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskCategory = 'design' | 'development' | 'research';

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
  category: TaskCategory;
  startsAt: string;
  dueAt: string;
  status: TaskStatus;
  assigneeIds: string[];
  assignees: TaskAssignee[];
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  name: string;
  description?: string | null;
  category: TaskCategory;
  startsAt: string;
  dueAt: string;
  status?: TaskStatus;
  assigneeIds?: string[];
}

export type UpdateTaskInput = Partial<Omit<CreateTaskInput, 'status'>>;

export interface TaskListOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: TaskStatus;
  category?: TaskCategory;
  assigneeId?: string;
  from?: string;
  to?: string;
  sort?: 'name' | 'startsAt' | 'dueAt' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface TaskPage {
  data: WorkspaceTask[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
