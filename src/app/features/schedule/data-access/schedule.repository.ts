import { inject, Injectable } from '@angular/core';

import { MockApiError, MockApiService, MockStorageService } from '@core/mock-api';

import { CreateScheduleInput, ScheduleEntry, SchedulePerson } from '../models/schedule.model';

const SCHEDULE_STORAGE_KEY = 'nexora:schedule';

const PEOPLE: readonly SchedulePerson[] = [
  { id: 'eddie', name: 'Eddie Lobanovskiy', email: 'lobanovskiy@gmail.com', color: '#87a8ff' },
  { id: 'alexey', name: 'Alexey Stave', email: 'alexey@gmail.com', color: '#d996ef' },
  { id: 'anton', name: 'Anton Tkacheve', email: 'tkacheveanton@gmail.com', color: '#66c7c5' },
  { id: 'maya', name: 'Maya Chen', email: 'maya@nexora.app', color: '#ff9c87' },
];

const SCHEDULES: readonly ScheduleEntry[] = [
  {
    id: 'schedule-1',
    title: 'Product planning',
    startsAt: '2026-08-12T10:15:00.000Z',
    location: 'Office meeting',
    attendeeIds: ['eddie', 'alexey'],
  },
  {
    id: 'schedule-2',
    title: 'Design critique',
    startsAt: '2026-08-10T11:20:00.000Z',
    location: 'Home',
    attendeeIds: ['alexey', 'maya'],
  },
  {
    id: 'schedule-3',
    title: 'Customer interview',
    startsAt: '2026-08-09T11:45:00.000Z',
    location: 'Friends zone',
    attendeeIds: ['anton'],
  },
  {
    id: 'schedule-4',
    title: 'Sprint review',
    startsAt: '2026-08-08T12:15:00.000Z',
    location: 'Office meeting',
    attendeeIds: ['eddie', 'anton', 'maya'],
  },
  {
    id: 'schedule-5',
    title: 'Roadmap sync',
    startsAt: '2026-08-07T13:20:00.000Z',
    location: 'Home',
    attendeeIds: ['maya'],
  },
  {
    id: 'schedule-6',
    title: 'Team workshop',
    startsAt: '2026-08-05T10:15:00.000Z',
    location: 'Meeting outside',
    attendeeIds: ['eddie', 'alexey', 'anton'],
  },
  {
    id: 'schedule-7',
    title: 'Weekly check-in',
    startsAt: '2026-08-04T11:15:00.000Z',
    location: 'Office meeting',
    attendeeIds: ['eddie'],
  },
  {
    id: 'schedule-8',
    title: 'Project kickoff',
    startsAt: '2026-08-02T10:15:00.000Z',
    location: 'Friends',
    attendeeIds: ['alexey', 'anton'],
  },
];

@Injectable({ providedIn: 'root' })
export class ScheduleRepository {
  private readonly mockApi = inject(MockApiService);
  private readonly storage = inject(MockStorageService);

  getPeople(): Promise<SchedulePerson[]> {
    return this.mockApi.execute(() => PEOPLE.map((person) => ({ ...person })));
  }

  getSchedules(): Promise<ScheduleEntry[]> {
    return this.mockApi.execute(() => this.readSchedules());
  }

  create(input: CreateScheduleInput): Promise<ScheduleEntry> {
    return this.mockApi.execute(() => {
      const schedules = this.readSchedules();
      const entry: ScheduleEntry = {
        id: this.mockApi.createId(),
        title: input.title,
        startsAt: `${input.date}T${input.startTime}:00.000Z`,
        endsAt: `${input.date}T${input.endTime}:00.000Z`,
        location: input.location,
        attendeeIds: [...input.attendeeIds],
        kind: input.kind,
        description: input.description,
      };
      this.storage.write(SCHEDULE_STORAGE_KEY, [...schedules, entry]);
      return { ...entry, attendeeIds: [...entry.attendeeIds] };
    });
  }

  delete(id: string): Promise<void> {
    return this.mockApi.execute(() => {
      const schedules = this.readSchedules();
      if (!schedules.some((entry) => entry.id === id)) {
        throw new MockApiError(404, 'Schedule entry not found.');
      }
      this.storage.write(
        SCHEDULE_STORAGE_KEY,
        schedules.filter((entry) => entry.id !== id),
      );
    });
  }

  private readSchedules(): ScheduleEntry[] {
    return this.storage.read<ScheduleEntry[]>(
      SCHEDULE_STORAGE_KEY,
      SCHEDULES.map((entry) => ({ ...entry, attendeeIds: [...entry.attendeeIds] })),
    );
  }
}
