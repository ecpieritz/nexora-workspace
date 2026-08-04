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
}
