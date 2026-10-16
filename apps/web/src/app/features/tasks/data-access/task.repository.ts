import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '@env/environment';

import {
  CreateTaskInput,
  TaskAssignee,
  TaskListOptions,
  TaskPage,
  TaskStatus,
  UpdateTaskInput,
  WorkspaceTask,
} from '../models/task.model';

interface ApiDataResponse<T> {
  data: T;
}

@Injectable({ providedIn: 'root' })
export class TaskRepository {
  private readonly http = inject(HttpClient);
  private readonly tasksUrl = `${environment.apiUrl}/tasks`;

  async getAll(): Promise<WorkspaceTask[]> {
    const firstPage = await this.list({ page: 1, limit: 100 });
    if (firstPage.meta.totalPages <= 1) return firstPage.data;

    const remainingPages = await Promise.all(
      Array.from({ length: firstPage.meta.totalPages - 1 }, (_, index) =>
        this.list({ page: index + 2, limit: 100 }),
      ),
    );
    return [firstPage, ...remainingPages].flatMap((page) => page.data);
  }

  list(options: TaskListOptions = {}): Promise<TaskPage> {
    let params = new HttpParams()
      .set('page', options.page ?? 1)
      .set('limit', options.limit ?? 20)
      .set('sort', options.sort ?? 'dueAt')
      .set('order', options.order ?? 'asc');
    if (options.search) params = params.set('search', options.search);
    if (options.status) params = params.set('status', options.status);
    if (options.category) params = params.set('category', options.category);
    if (options.assigneeId) params = params.set('assigneeId', options.assigneeId);
    if (options.from) params = params.set('from', options.from);
    if (options.to) params = params.set('to', options.to);
    return firstValueFrom(this.http.get<TaskPage>(this.tasksUrl, { params }));
  }

  async getPeople(): Promise<TaskAssignee[]> {
    const response = await firstValueFrom(
      this.http.get<ApiDataResponse<TaskAssignee[]>>(`${this.tasksUrl}/people`),
    );
    return response.data;
  }

  async getById(id: string): Promise<WorkspaceTask> {
    const response = await firstValueFrom(
      this.http.get<ApiDataResponse<WorkspaceTask>>(`${this.tasksUrl}/${id}`),
    );
    return response.data;
  }

  async create(input: CreateTaskInput): Promise<WorkspaceTask> {
    const response = await firstValueFrom(
      this.http.post<ApiDataResponse<WorkspaceTask>>(this.tasksUrl, input),
    );
    return response.data;
  }

  async update(id: string, input: UpdateTaskInput): Promise<WorkspaceTask> {
    const response = await firstValueFrom(
      this.http.patch<ApiDataResponse<WorkspaceTask>>(`${this.tasksUrl}/${id}`, input),
    );
    return response.data;
  }

  async updateStatus(id: string, status: TaskStatus): Promise<WorkspaceTask> {
    const response = await firstValueFrom(
      this.http.patch<ApiDataResponse<WorkspaceTask>>(`${this.tasksUrl}/${id}/status`, { status }),
    );
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.tasksUrl}/${id}`));
  }
}
