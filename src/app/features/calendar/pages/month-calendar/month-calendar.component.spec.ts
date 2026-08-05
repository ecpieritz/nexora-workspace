import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScheduleRepository } from '@features/schedule/data-access/schedule.repository';
import { MonthCalendarComponent } from './month-calendar.component';

describe('MonthCalendarComponent', () => {
  let fixture: ComponentFixture<MonthCalendarComponent>;
  beforeEach(async () => {
    const repository = jasmine.createSpyObj<ScheduleRepository>('ScheduleRepository', [
      'getSchedules',
      'getPeople',
    ]);
    repository.getSchedules.and.resolveTo([
      {
        id: 'one',
        title: 'Planning',
        startsAt: '2026-08-04T10:00:00.000Z',
        location: 'Office',
        attendeeIds: ['eddie'],
      },
      {
        id: 'two',
        title: 'Review',
        startsAt: '2026-08-10T10:00:00.000Z',
        location: 'Home',
        attendeeIds: ['alexey'],
      },
    ]);
    repository.getPeople.and.resolveTo([
      { id: 'eddie', name: 'Eddie Lobanovskiy', email: 'eddie@example.com', color: '#87a8ff' },
      { id: 'alexey', name: 'Alexey Stave', email: 'alexey@example.com', color: '#d996ef' },
    ]);
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
});
