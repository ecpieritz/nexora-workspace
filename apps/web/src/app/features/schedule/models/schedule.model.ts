export interface SchedulePerson {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  color: string;
}

export interface ScheduleOrganizer {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface ScheduleEntry {
  id: string;
  organizerId: string;
  organizer: ScheduleOrganizer;
  title: string;
  description: string | null;
  location: string | null;
  kind: ScheduleKind;
  startsAt: string;
  endsAt: string | null;
  attendeeIds: string[];
  attendees: SchedulePerson[];
  createdAt: string;
  updatedAt: string;
}

export type ScheduleKind = 'event' | 'reminder' | 'task';

export interface CreateScheduleInput {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  attendeeIds: string[];
  kind: ScheduleKind;
  description: string;
}

export type UpdateScheduleInput = CreateScheduleInput;

export interface ScheduleListOptions {
  page?: number;
  limit?: number;
  search?: string;
  kind?: ScheduleKind;
  attendeeId?: string;
  from?: string;
  to?: string;
  order?: 'asc' | 'desc';
}

export interface CalendarEventOptions {
  from: string;
  to: string;
  attendeeId?: string;
  kind?: ScheduleKind;
}

export interface SchedulePage {
  data: ScheduleEntry[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
