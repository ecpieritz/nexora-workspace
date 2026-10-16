export type ScheduleKindValue = 'event' | 'reminder' | 'task';
export type ScheduleSortOrder = 'asc' | 'desc';

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
  kind: ScheduleKindValue;
  startsAt: string;
  endsAt: string | null;
  attendeeIds: string[];
  attendees: SchedulePerson[];
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleWriteInput {
  title: string;
  description?: string | null;
  location?: string | null;
  kind: ScheduleKindValue;
  startsAt: Date;
  endsAt?: Date | null;
  attendeeIds: string[];
}

export interface ScheduleChanges {
  title?: string;
  description?: string | null;
  location?: string | null;
  kind?: ScheduleKindValue;
  startsAt?: Date;
  endsAt?: Date | null;
  attendeeIds?: string[];
}

export interface ScheduleListOptions {
  page: number;
  limit: number;
  search?: string;
  kind?: ScheduleKindValue;
  attendeeId?: string;
  from?: Date;
  to?: Date;
  order: ScheduleSortOrder;
}

export interface CalendarEventOptions {
  from: Date;
  to: Date;
  attendeeId?: string;
  kind?: ScheduleKindValue;
}

export interface SchedulePage {
  items: ScheduleEntry[];
  total: number;
}

export interface ScheduleRepository {
  list(workspaceId: string, options: ScheduleListOptions): Promise<SchedulePage>;
  listCalendarEvents(workspaceId: string, options: CalendarEventOptions): Promise<ScheduleEntry[]>;
  listPeople(workspaceId: string): Promise<SchedulePerson[]>;
  findById(workspaceId: string, scheduleId: string): Promise<ScheduleEntry | null>;
  membersExist(workspaceId: string, memberIds: string[]): Promise<boolean>;
  create(
    workspaceId: string,
    organizerId: string,
    input: ScheduleWriteInput,
  ): Promise<ScheduleEntry>;
  update(
    workspaceId: string,
    scheduleId: string,
    changes: ScheduleChanges,
  ): Promise<ScheduleEntry | null>;
  delete(workspaceId: string, scheduleId: string): Promise<boolean>;
}
