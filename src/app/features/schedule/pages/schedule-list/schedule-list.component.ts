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

import { ButtonDirective, InputDirective } from '@shared/ui';

import { ScheduleRepository } from '../../data-access/schedule.repository';
import { ScheduleEntry, ScheduleKind, SchedulePerson } from '../../models/schedule.model';

interface MiniCalendarDay {
  iso: string;
  number: number;
  currentMonth: boolean;
  selected: boolean;
}

@Component({
  selector: 'app-schedule-list',
  imports: [ButtonDirective, DatePipe, InputDirective, ReactiveFormsModule],
  templateUrl: './schedule-list.component.html',
  styleUrl: './schedule-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closeEditor()' },
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
  protected readonly editorOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly eventKinds: readonly ScheduleKind[] = ['event', 'reminder', 'task'];
  protected readonly eventForm = new FormGroup({
    kind: new FormControl<ScheduleKind>('event', { nonNullable: true }),
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    date: new FormControl('2026-08-05', { nonNullable: true, validators: [Validators.required] }),
    startTime: new FormControl('10:00', { nonNullable: true, validators: [Validators.required] }),
    endTime: new FormControl('11:00', { nonNullable: true, validators: [Validators.required] }),
    location: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
    attendeeIds: new FormControl<string[]>([], { nonNullable: true }),
  });
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
  protected openEditor(entry?: ScheduleEntry): void {
    this.editingId.set(entry?.id ?? null);
    const starts = entry ? new Date(entry.startsAt) : new Date('2026-08-05T10:00:00.000Z');
    const ends = entry?.endsAt ? new Date(entry.endsAt) : new Date(starts.getTime() + 3_600_000);
    this.eventForm.reset({
      kind: entry?.kind ?? 'event',
      title: entry?.title ?? '',
      date: starts.toISOString().slice(0, 10),
      startTime: starts.toISOString().slice(11, 16),
      endTime: ends.toISOString().slice(11, 16),
      location: entry?.location ?? '',
      description: entry?.description ?? '',
      attendeeIds: entry ? [...entry.attendeeIds] : [],
    });
    this.saveError.set(null);
    this.editorOpen.set(true);
  }
  protected closeEditor(): void {
    if (!this.saving()) this.editorOpen.set(false);
  }
  protected setEventKind(kind: ScheduleKind): void {
    this.eventForm.controls.kind.setValue(kind);
  }
  protected toggleAttendee(id: string): void {
    const values = this.eventForm.controls.attendeeIds.value;
    this.eventForm.controls.attendeeIds.setValue(
      values.includes(id) ? values.filter((value) => value !== id) : [...values, id],
    );
  }
  protected async saveSchedule(): Promise<void> {
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
      const id = this.editingId();
      const saved = id
        ? await this.repository.update(id, value)
        : await this.repository.create(value);
      this.schedules.update((entries) =>
        id ? entries.map((entry) => (entry.id === id ? saved : entry)) : [...entries, saved],
      );
      this.editorOpen.set(false);
    } catch {
      this.saveError.set('We could not save this schedule. Please try again.');
    } finally {
      this.saving.set(false);
    }
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
