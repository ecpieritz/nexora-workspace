export type TaskStatus = 'todo' | 'doing' | 'done';

export interface WorkspaceTask {
  id: string;
  name: string;
  category: 'design' | 'development' | 'research';
  startsAt: string;
  dueAt: string;
  memberCount: number;
  status: TaskStatus;
}
