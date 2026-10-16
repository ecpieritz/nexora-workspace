import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScheduleRepository } from '@features/schedule/data-access/schedule.repository';
import { MonthCalendarComponent } from './month-calendar.component';

describe('MonthCalendarComponent', () => {
  let fixture: ComponentFixture<MonthCalendarComponent>;
  beforeEach(async () => {
    const repository = jasmine.createSpyObj<ScheduleRepository>('ScheduleRepository', [
      'getCalendarEvents',
      'getPeople',
      'create',
    ]);
    repository.getCalendarEvents.and.resolveTo([
      {
        id: 'one',
        organizerId: 'owner',
        organizer: { id: 'owner', name: 'Owner', email: 'owner@example.com', avatarUrl: null },
        title: 'Planning',
        description: null,
        startsAt: '2026-08-04T10:00:00.000Z',
        endsAt: '2026-08-04T11:00:00.000Z',
        location: 'Office',
        kind: 'event',
        attendeeIds: ['eddie'],
        attendees: [],
        createdAt: '2026-08-01T10:00:00.000Z',
        updatedAt: '2026-08-01T10:00:00.000Z',
      },
      {
        id: 'two',
        organizerId: 'owner',
        organizer: { id: 'owner', name: 'Owner', email: 'owner@example.com', avatarUrl: null },
        title: 'Review',
        description: null,
        startsAt: '2026-08-10T10:00:00.000Z',
        endsAt: '2026-08-10T11:00:00.000Z',
        location: 'Home',
        kind: 'event',
        attendeeIds: ['alexey'],
        attendees: [],
        createdAt: '2026-08-01T10:00:00.000Z',
        updatedAt: '2026-08-01T10:00:00.000Z',
      },
    ]);
    repository.getPeople.and.resolveTo([
      {
        id: 'eddie',
        userId: 'eddie-user',
        name: 'Eddie Lobanovskiy',
        email: 'eddie@example.com',
        avatarUrl: null,
        color: '#87a8ff',
      },
      {
        id: 'alexey',
        userId: 'alexey-user',
        name: 'Alexey Stave',
        email: 'alexey@example.com',
        avatarUrl: null,
        color: '#d996ef',
      },
    ]);
    repository.create.and.callFake(async (input) => ({
      id: 'created',
      organizerId: 'owner',
      organizer: { id: 'owner', name: 'Owner', email: 'owner@example.com', avatarUrl: null },
      title: input.title,
      description: input.description,
      startsAt: `${input.date}T${input.startTime}:00.000Z`,
      endsAt: `${input.date}T${input.endTime}:00.000Z`,
      location: input.location,
      attendeeIds: input.attendeeIds,
      attendees: [],
      kind: input.kind,
      createdAt: '2026-08-01T10:00:00.000Z',
      updatedAt: '2026-08-01T10:00:00.000Z',
    }));
    await TestBed.configureTestingModule({
      imports: [MonthCalendarComponent],
      providers: [{ provide: ScheduleRepository, useValue: repository }],
    }).compileComponents();
    fixture = TestBed.createComponent(MonthCalendarComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });
  it('should render a six-week month grid and its events', () => {
    expect(fixture.nativeElement.querySelectorAll('.month-calendar__day').length).toBe(42);
    expect(fixture.nativeElement.querySelectorAll('.month-calendar__event').length).toBe(2);
  });
  it('should navigate between months', () => {
    const next: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[aria-label="Next month"]',
    );
    next.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.month-calendar__controls').textContent).toContain(
      'September 2026',
    );
  });
  it('should filter events by person', () => {
    const personButtons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        '.month-calendar__person',
      ),
    );
    personButtons.find((button) => button.textContent?.includes('Eddie'))!.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.month-calendar__event').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Planning');
  });
  it('should render events in the daily time grid', () => {
    const day: HTMLButtonElement = fixture.nativeElement.querySelector(
      'nav[aria-label="Calendar views"] button:first-child',
    );
    day.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.day-calendar__hour').length).toBe(16);
    expect(fixture.nativeElement.querySelectorAll('.day-calendar__event').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Planning');
  });
  it('should render all months and open a selected day from the year view', () => {
    const year: HTMLButtonElement = fixture.nativeElement.querySelector(
      'nav[aria-label="Calendar views"] button:last-child',
    );
    year.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.year-calendar__month').length).toBe(12);
    const eventDay: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.year-calendar__day--events',
    );
    eventDay.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.day-calendar')).not.toBeNull();
  });
  it('should validate and create an event from the dialog', async () => {
    const repository = TestBed.inject(ScheduleRepository) as jasmine.SpyObj<ScheduleRepository>;
    const open: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.month-calendar__sidebar [appButton]',
    );
    open.click();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const setValue = (selector: string, value: string) => {
      const input = root.querySelector<HTMLInputElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    setValue('[formControlName="title"]', 'Portfolio review');
    setValue('[formControlName="location"]', 'Studio');
    const submit: HTMLButtonElement = root.querySelector('.event-dialog button[type="submit"]')!;
    submit.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(repository.create).toHaveBeenCalled();
    expect(root.querySelector('.event-dialog')).toBeNull();
    expect(root.textContent).toContain('Portfolio review');
  });
});
