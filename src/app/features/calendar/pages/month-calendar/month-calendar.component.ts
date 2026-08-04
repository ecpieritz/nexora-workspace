import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';

import { ScheduleRepository } from '@features/schedule/data-access/schedule.repository';
import { ScheduleEntry, SchedulePerson } from '@features/schedule/models/schedule.model';
import { ButtonDirective, InputDirective } from '@shared/ui';

interface CalendarDay {
  date: Date;
  key: string;
  currentMonth: boolean;
  today: boolean;
}

@Component({
  selector: 'app-month-calendar',
  imports: [ButtonDirective, DatePipe, InputDirective],
  templateUrl: './month-calendar.component.html',
  styleUrl: './month-calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthCalendarComponent implements OnInit {
  private readonly repository = inject(ScheduleRepository);
  protected readonly displayedMonth = signal(new Date(Date.UTC(2026, 7, 1)));
  protected readonly events = signal<ScheduleEntry[]>([]);
  protected readonly people = signal<SchedulePerson[]>([]);
  protected readonly selectedPersonId = signal<string | null>(null);
  protected readonly peopleSearch = signal('');
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  protected readonly days = computed<CalendarDay[]>(() => {
    const month = this.displayedMonth();
    const first = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
    first.setUTCDate(first.getUTCDate() - first.getUTCDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(first);
      date.setUTCDate(first.getUTCDate() + index);
      return {
        date,
        key: date.toISOString().slice(0, 10),
        currentMonth: date.getUTCMonth() === month.getUTCMonth(),
        today: date.toISOString().slice(0, 10) === '2026-08-04',
      };
    });
  });
  protected readonly filteredPeople = computed(() => {
    const term = this.peopleSearch().trim().toLowerCase();
    return this.people().filter((person) => !term || person.name.toLowerCase().includes(term));
  });
  protected readonly visibleEvents = computed(() => {
    const personId = this.selectedPersonId();
    return this.events().filter((event) => !personId || event.attendeeIds.includes(personId));
  });

  ngOnInit(): void {
    void this.load();
  }
  protected async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    try {
      const [events, people] = await Promise.all([
        this.repository.getSchedules(),
        this.repository.getPeople(),
      ]);
      this.events.set(events);
      this.people.set(people);
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }
  protected changeMonth(offset: number): void {
    this.displayedMonth.update(
      (month) => new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + offset, 1)),
    );
  }
  protected goToToday(): void {
    this.displayedMonth.set(new Date(Date.UTC(2026, 7, 1)));
  }
  protected eventsFor(day: CalendarDay): ScheduleEntry[] {
    return this.visibleEvents().filter((event) => event.startsAt.slice(0, 10) === day.key);
  }
  protected selectPerson(id: string | null): void {
    this.selectedPersonId.set(id);
  }
  protected updatePeopleSearch(event: Event): void {
    this.peopleSearch.set((event.target as HTMLInputElement).value);
  }
}
