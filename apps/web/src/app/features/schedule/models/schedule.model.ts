export interface SchedulePerson {
  id: string;
  name: string;
  email: string;
  color: string;
}

export interface ScheduleEntry {
  id: string;
  title: string;
  startsAt: string;
  location: string;
  attendeeIds: string[];
  endsAt?: string;
  kind?: ScheduleKind;
  description?: string;
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
