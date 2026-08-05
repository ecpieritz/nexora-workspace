import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';

import { ButtonDirective, InputDirective } from '@shared/ui';

import { ScheduleRepository } from '../../data-access/schedule.repository';
import { ScheduleEntry, SchedulePerson } from '../../models/schedule.model';

interface MiniCalendarDay {
  iso: string;
  number: number;
  currentMonth: boolean;
  selected: boolean;
}

@Component({
  selector: 'app-schedule-list',
  imports: [ButtonDirective, DatePipe, InputDirective],
  templateUrl: './schedule-list.component.html',
  styleUrl: './schedule-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleListComponent implements OnInit {
  private readonly repository = inject(ScheduleRepository);
  protected readonly schedules = signal<ScheduleEntry[]>([]);
  protected readonly people = signal<SchedulePerson[]>([]);
  protected readonly peopleSearch = signal('');
  protected readonly selectedPersonId = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly miniCalendarDays = this.createMiniCalendarDays(2026, 7, 4);
  protected readonly filteredPeople = computed(() => {
    const term = this.peopleSearch().trim().toLowerCase();
    return this.people().filter(
      (person) =>
        !term ||
        person.name.toLowerCase().includes(term) ||
        person.email.toLowerCase().includes(term),
    );
  });
  protected readonly filteredSchedules = computed(() => {
    const personId = this.selectedPersonId();
    return this.schedules().filter((entry) => !personId || entry.attendeeIds.includes(personId));
  });

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    try {
      const [schedules, people] = await Promise.all([
        this.repository.getSchedules(),
        this.repository.getPeople(),
      ]);
      this.schedules.set(schedules);
      this.people.set(people);
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  protected updatePeopleSearch(event: Event): void {
    this.peopleSearch.set((event.target as HTMLInputElement).value);
  }
  protected selectPerson(id: string | null): void {
    this.selectedPersonId.set(id);
  }
  protected attendeeNames(entry: ScheduleEntry): string {
    return entry.attendeeIds
      .map((id) => this.people().find((person) => person.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  }
  protected async deleteSchedule(id: string): Promise<void> {
    this.deletingId.set(id);
    try {
      await this.repository.delete(id);
      this.schedules.update((entries) => entries.filter((entry) => entry.id !== id));
    } finally {
      this.deletingId.set(null);
    }
  }

  private createMiniCalendarDays(
    year: number,
    month: number,
    selectedDay: number,
  ): MiniCalendarDay[] {
    const firstDay = new Date(Date.UTC(year, month, 1));
    const gridStart = new Date(firstDay);
    gridStart.setUTCDate(1 - firstDay.getUTCDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setUTCDate(gridStart.getUTCDate() + index);
      return {
        iso: date.toISOString().slice(0, 10),
        number: date.getUTCDate(),
        currentMonth: date.getUTCMonth() === month,
        selected:
          date.getUTCFullYear() === year &&
          date.getUTCMonth() === month &&
          date.getUTCDate() === selectedDay,
      };
    });
  }
}
