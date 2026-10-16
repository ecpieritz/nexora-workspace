import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '@env/environment';

import {
  CalendarEventOptions,
  CreateScheduleInput,
  ScheduleEntry,
  ScheduleListOptions,
  SchedulePage,
  SchedulePerson,
  UpdateScheduleInput,
} from '../models/schedule.model';

interface ApiDataResponse<T> {
  data: T;
}

interface ScheduleWritePayload {
  title?: string;
  description?: string | null;
  location?: string | null;
  kind?: CreateScheduleInput['kind'];
  startsAt?: string;
  endsAt?: string | null;
  attendeeIds?: string[];
}

@Injectable({ providedIn: 'root' })
export class ScheduleRepository {
  private readonly http = inject(HttpClient);
  private readonly schedulesUrl = `${environment.apiUrl}/schedules`;
  private readonly calendarEventsUrl = `${environment.apiUrl}/calendar/events`;

  async getPeople(): Promise<SchedulePerson[]> {
    const response = await firstValueFrom(
      this.http.get<ApiDataResponse<SchedulePerson[]>>(`${this.schedulesUrl}/people`),
    );
    return response.data;
  }

  async getSchedules(): Promise<ScheduleEntry[]> {
    const firstPage = await this.list({ page: 1, limit: 100 });
    if (firstPage.meta.totalPages <= 1) return firstPage.data;

    const remainingPages = await Promise.all(
      Array.from({ length: firstPage.meta.totalPages - 1 }, (_, index) =>
        this.list({ page: index + 2, limit: 100 }),
      ),
    );
    return [firstPage, ...remainingPages].flatMap((page) => page.data);
  }

  list(options: ScheduleListOptions = {}): Promise<SchedulePage> {
    let params = new HttpParams()
      .set('page', options.page ?? 1)
      .set('limit', options.limit ?? 20)
      .set('order', options.order ?? 'asc');
    if (options.search) params = params.set('search', options.search);
    if (options.kind) params = params.set('kind', options.kind);
    if (options.attendeeId) params = params.set('attendeeId', options.attendeeId);
    if (options.from) params = params.set('from', options.from);
    if (options.to) params = params.set('to', options.to);
    return firstValueFrom(this.http.get<SchedulePage>(this.schedulesUrl, { params }));
  }

  async getCalendarEvents(options: CalendarEventOptions): Promise<ScheduleEntry[]> {
    let params = new HttpParams().set('from', options.from).set('to', options.to);
    if (options.attendeeId) params = params.set('attendeeId', options.attendeeId);
    if (options.kind) params = params.set('kind', options.kind);
    const response = await firstValueFrom(
      this.http.get<ApiDataResponse<ScheduleEntry[]>>(this.calendarEventsUrl, { params }),
    );
    return response.data;
  }

  async getById(id: string): Promise<ScheduleEntry> {
    const response = await firstValueFrom(
      this.http.get<ApiDataResponse<ScheduleEntry>>(`${this.schedulesUrl}/${id}`),
    );
    return response.data;
  }

  async create(input: CreateScheduleInput): Promise<ScheduleEntry> {
    const response = await firstValueFrom(
      this.http.post<ApiDataResponse<ScheduleEntry>>(this.schedulesUrl, this.toPayload(input)),
    );
    return response.data;
  }

  async update(id: string, input: UpdateScheduleInput): Promise<ScheduleEntry> {
    const response = await firstValueFrom(
      this.http.patch<ApiDataResponse<ScheduleEntry>>(
        `${this.schedulesUrl}/${id}`,
        this.toPayload(input),
      ),
    );
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.schedulesUrl}/${id}`));
  }

  private toPayload(input: UpdateScheduleInput): ScheduleWritePayload {
    const hasDateAndStart = input.date !== undefined && input.startTime !== undefined;
    const hasDateAndEnd = input.date !== undefined && input.endTime !== undefined;
    return {
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(input.description === undefined ? {} : { description: input.description || null }),
      ...(input.location === undefined ? {} : { location: input.location || null }),
      ...(input.kind === undefined ? {} : { kind: input.kind }),
      ...(hasDateAndStart ? { startsAt: `${input.date}T${input.startTime}:00.000Z` } : {}),
      ...(hasDateAndEnd ? { endsAt: `${input.date}T${input.endTime}:00.000Z` } : {}),
      ...(input.attendeeIds === undefined ? {} : { attendeeIds: input.attendeeIds }),
    };
  }
}
