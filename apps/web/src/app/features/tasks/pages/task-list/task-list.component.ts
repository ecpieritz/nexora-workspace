import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ButtonDirective, InputDirective } from '@shared/ui';
import { TaskRepository } from '../../data-access/task.repository';
import { TaskStatus, WorkspaceTask } from '../../models/task.model';

const STATUSES: readonly TaskStatus[] = ['todo', 'doing', 'done'];
type TaskView = 'list' | 'board' | 'timeline';
@Component({
  selector: 'app-task-list',
  imports: [ButtonDirective, DatePipe, InputDirective],
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskListComponent implements OnInit {
  private readonly repository = inject(TaskRepository);
  protected readonly statuses = STATUSES;
  protected readonly tasks = signal<WorkspaceTask[]>([]);
  protected readonly searchTerm = signal('');
  protected readonly activeView = signal<TaskView>('list');
  protected readonly draggedTaskId = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly mutatingId = signal<string | null>(null);
  protected readonly filteredTasks = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.tasks().filter(
      (task) => !term || task.name.toLowerCase().includes(term) || task.category.includes(term),
    );
  });
  protected readonly timelineDays = computed(() => {
    const tasks = this.filteredTasks();
    if (!tasks.length) return [];
    const first = tasks.reduce(
      (earliest, task) => (task.startsAt < earliest ? task.startsAt : earliest),
      tasks[0].startsAt,
    );
    const last = tasks.reduce(
      (latest, task) => (task.dueAt > latest ? task.dueAt : latest),
      tasks[0].dueAt,
    );
    const days: string[] = [];
    const cursor = new Date(first);
    const end = new Date(last);
    while (cursor <= end) {
      days.push(cursor.toISOString());
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return days;
  });
  ngOnInit(): void {
    void this.load();
  }
  protected async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    try {
      this.tasks.set(await this.repository.getAll());
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }
  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }
  protected setView(view: TaskView): void {
    this.activeView.set(view);
  }
  protected tasksFor(status: TaskStatus): WorkspaceTask[] {
    return this.filteredTasks().filter((task) => task.status === status);
  }
  protected statusLabel(status: TaskStatus): string {
    return { todo: 'To do', doing: 'Doing', done: 'Done' }[status];
  }
  protected timelineColumn(task: WorkspaceTask): string {
    const days = this.timelineDays();
    const start = days.findIndex((day) => day.slice(0, 10) === task.startsAt.slice(0, 10));
    const end = days.findIndex((day) => day.slice(0, 10) === task.dueAt.slice(0, 10));
    return `${start + 2} / ${end + 3}`;
  }
  protected async advance(task: WorkspaceTask): Promise<void> {
    const index = STATUSES.indexOf(task.status);
    if (index === STATUSES.length - 1) return;
    this.mutatingId.set(task.id);
    try {
      this.replace(await this.repository.updateStatus(task.id, STATUSES[index + 1]));
    } finally {
      this.mutatingId.set(null);
    }
  }
  protected startDragging(taskId: string): void {
    this.draggedTaskId.set(taskId);
  }
  protected stopDragging(): void {
    this.draggedTaskId.set(null);
  }
  protected dropIn(status: TaskStatus): void {
    const task = this.tasks().find(({ id }) => id === this.draggedTaskId());
    this.stopDragging();
    if (task && task.status !== status) void this.moveTask(task, status);
  }
  protected previousStatus(task: WorkspaceTask): TaskStatus | null {
    const index = STATUSES.indexOf(task.status);
    return index > 0 ? STATUSES[index - 1] : null;
  }
  protected nextStatus(task: WorkspaceTask): TaskStatus | null {
    const index = STATUSES.indexOf(task.status);
    return index < STATUSES.length - 1 ? STATUSES[index + 1] : null;
  }
  protected async moveTask(task: WorkspaceTask, status: TaskStatus): Promise<void> {
    this.mutatingId.set(task.id);
    try {
      this.replace(await this.repository.updateStatus(task.id, status));
    } finally {
      this.mutatingId.set(null);
    }
  }
  protected async deleteTask(id: string): Promise<void> {
    this.mutatingId.set(id);
    try {
      await this.repository.delete(id);
      this.tasks.update((tasks) => tasks.filter((task) => task.id !== id));
    } finally {
      this.mutatingId.set(null);
    }
  }
  private replace(updated: WorkspaceTask): void {
    this.tasks.update((tasks) => tasks.map((task) => (task.id === updated.id ? updated : task)));
  }
}
