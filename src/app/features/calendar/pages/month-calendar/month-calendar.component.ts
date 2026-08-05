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

type CalendarView = 'day' | 'month' | 'year';

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
  protected readonly selectedDate = signal(new Date(Date.UTC(2026, 7, 4)));
  protected readonly activeView = signal<CalendarView>('month');
  protected readonly events = signal<ScheduleEntry[]>([]);
  protected readonly people = signal<SchedulePerson[]>([]);
  protected readonly selectedPersonId = signal<string | null>(null);
  protected readonly peopleSearch = signal('');
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  protected readonly hours = Array.from({ length: 16 }, (_, index) => index + 8);
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
  protected readonly yearMonths = computed(() => {
    const year = this.displayedMonth().getUTCFullYear();
    return Array.from({ length: 12 }, (_, month) => ({
      date: new Date(Date.UTC(year, month, 1)),
      days: this.buildMonthDays(year, month),
    }));
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
  protected changeDay(offset: number): void {
    this.selectedDate.update((date) => {
      const next = new Date(date);
      next.setUTCDate(next.getUTCDate() + offset);
      return next;
    });
  }
  protected changeYear(offset: number): void {
    this.displayedMonth.update(
      (date) => new Date(Date.UTC(date.getUTCFullYear() + offset, date.getUTCMonth(), 1)),
    );
  }
  protected setView(view: CalendarView): void {
    this.activeView.set(view);
    if (view === 'day') {
      const month = this.displayedMonth();
      this.selectedDate.set(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 4)));
    }
  }
  protected goToToday(): void {
    this.displayedMonth.set(new Date(Date.UTC(2026, 7, 1)));
  }
  protected eventsFor(day: CalendarDay): ScheduleEntry[] {
    return this.visibleEvents().filter((event) => event.startsAt.slice(0, 10) === day.key);
  }
  protected eventsForDate(date: Date): ScheduleEntry[] {
    const key = date.toISOString().slice(0, 10);
    return this.visibleEvents().filter((event) => event.startsAt.slice(0, 10) === key);
  }
  protected eventsAtHour(hour: number): ScheduleEntry[] {
    return this.eventsForDate(this.selectedDate()).filter(
      (event) => new Date(event.startsAt).getUTCHours() === hour,
    );
  }
  protected selectYearDay(day: CalendarDay): void {
    this.selectedDate.set(day.date);
    this.displayedMonth.set(
      new Date(Date.UTC(day.date.getUTCFullYear(), day.date.getUTCMonth(), 1)),
    );
    this.activeView.set('day');
  }
  protected selectPerson(id: string | null): void {
    this.selectedPersonId.set(id);
  }
  protected updatePeopleSearch(event: Event): void {
    this.peopleSearch.set((event.target as HTMLInputElement).value);
  }

  private buildMonthDays(year: number, month: number): CalendarDay[] {
    const first = new Date(Date.UTC(year, month, 1));
    first.setUTCDate(first.getUTCDate() - first.getUTCDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(first);
      date.setUTCDate(first.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      return { date, key, currentMonth: date.getUTCMonth() === month, today: key === '2026-08-04' };
    });
  }
}
