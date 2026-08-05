import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ScheduleRepository } from '@features/schedule/data-access/schedule.repository';
import {
  ScheduleEntry,
  ScheduleKind,
  SchedulePerson,
} from '@features/schedule/models/schedule.model';
import { ButtonDirective, InputDirective } from '@shared/ui';

interface CalendarDay {
  date: Date;
  key: string;
  currentMonth: boolean;
  today: boolean;
}

type CalendarView = 'day' | 'week' | 'month' | 'year';

@Component({
  selector: 'app-month-calendar',
  imports: [ButtonDirective, DatePipe, InputDirective, ReactiveFormsModule],
  templateUrl: './month-calendar.component.html',
  styleUrl: './month-calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closeCreateEvent()' },
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
  protected readonly createOpen = signal(false);
  protected readonly selectedEvent = signal<ScheduleEntry | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly eventForm = new FormGroup({
    kind: new FormControl<ScheduleKind>('event', { nonNullable: true }),
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    date: new FormControl('2026-08-05', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    startTime: new FormControl('10:00', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    endTime: new FormControl('11:00', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    location: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
    attendeeIds: new FormControl<string[]>([], { nonNullable: true }),
  });
  protected readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  protected readonly hours = Array.from({ length: 16 }, (_, index) => index + 8);
  protected readonly eventKinds: readonly ScheduleKind[] = ['event', 'reminder', 'task'];
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
  protected readonly weekDays = computed(() => {
    const start = new Date(this.selectedDate());
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      return date;
    });
  });
  protected readonly selectedDateKey = computed(() =>
    this.selectedDate().toISOString().slice(0, 10),
  );
  protected readonly selectedWeekKeys = computed(
    () => new Set(this.weekDays().map((date) => date.toISOString().slice(0, 10))),
  );

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
    const next = new Date(this.selectedDate());
    next.setUTCDate(next.getUTCDate() + offset);
    this.selectMiniDate(next);
  }
  protected changeWeek(offset: number): void {
    this.changeDay(offset * 7);
  }
  protected selectMiniDate(date: Date): void {
    this.selectedDate.set(new Date(date));
    this.displayedMonth.set(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)));
  }
  protected isSelectedMiniDay(day: CalendarDay): boolean {
    return this.activeView() === 'day' && day.key === this.selectedDateKey();
  }
  protected isSelectedMiniWeek(day: CalendarDay): boolean {
    return this.activeView() === 'week' && this.selectedWeekKeys().has(day.key);
  }
  protected changeYear(offset: number): void {
    this.displayedMonth.update(
      (date) => new Date(Date.UTC(date.getUTCFullYear() + offset, date.getUTCMonth(), 1)),
    );
  }
  protected setView(view: CalendarView): void {
    const previousView = this.activeView();
    this.activeView.set(view);
    if (
      (view === 'day' || view === 'week') &&
      (previousView === 'month' || previousView === 'year')
    ) {
      const month = this.displayedMonth();
      this.selectedDate.set(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 4)));
    }
  }
  protected goToToday(): void {
    this.displayedMonth.set(new Date(Date.UTC(2026, 7, 1)));
    this.selectedDate.set(new Date(Date.UTC(2026, 7, 4)));
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

  protected openCreateEvent(date?: Date): void {
    const selected = date ?? this.selectedDate();
    this.eventForm.reset({
      kind: 'event',
      title: '',
      date: selected.toISOString().slice(0, 10),
      startTime: '10:00',
      endTime: '11:00',
      location: '',
      description: '',
      attendeeIds: [],
    });
    this.saveError.set(null);
    this.createOpen.set(true);
  }
  protected closeCreateEvent(): void {
    if (!this.saving()) this.createOpen.set(false);
  }
  protected openEventDetails(event: ScheduleEntry): void {
    this.selectedEvent.set(event);
  }
  protected closeEventDetails(): void {
    this.selectedEvent.set(null);
  }
  protected attendeeNames(event: ScheduleEntry): string {
    return event.attendeeIds
      .map((id) => this.people().find((person) => person.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  }
  protected setEventKind(kind: ScheduleKind): void {
    this.eventForm.controls.kind.setValue(kind);
  }
  protected toggleAttendee(id: string): void {
    const attendees = this.eventForm.controls.attendeeIds.value;
    this.eventForm.controls.attendeeIds.setValue(
      attendees.includes(id) ? attendees.filter((item) => item !== id) : [...attendees, id],
    );
  }
  protected async createEvent(): Promise<void> {
    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      this.saveError.set('Complete all required fields.');
      return;
    }
    const value = this.eventForm.getRawValue();
    if (value.endTime <= value.startTime) {
      this.saveError.set('End time must be after start time.');
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const created = await this.repository.create(value);
      this.events.update((events) => [...events, created]);
      this.displayedMonth.set(new Date(`${value.date}T00:00:00.000Z`));
      this.selectedDate.set(new Date(`${value.date}T00:00:00.000Z`));
      this.createOpen.set(false);
    } catch {
      this.saveError.set('We could not create this event. Please try again.');
    } finally {
      this.saving.set(false);
    }
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
