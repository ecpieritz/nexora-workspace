import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScheduleRepository } from '../../data-access/schedule.repository';
import { ScheduleListComponent } from './schedule-list.component';

describe('ScheduleListComponent', () => {
  let fixture: ComponentFixture<ScheduleListComponent>;
  beforeEach(async () => {
    const repository = jasmine.createSpyObj<ScheduleRepository>('ScheduleRepository', [
      'getSchedules',
      'getPeople',
      'delete',
    ]);
    repository.getSchedules.and.resolveTo([
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
        startsAt: '2026-08-05T10:00:00.000Z',
        endsAt: '2026-08-05T11:00:00.000Z',
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
    repository.delete.and.resolveTo();
    await TestBed.configureTestingModule({
      imports: [ScheduleListComponent],
      providers: [{ provide: ScheduleRepository, useValue: repository }],
    }).compileComponents();
    fixture = TestBed.createComponent(ScheduleListComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should render schedules returned by the repository', () => {
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Planning');
  });

  it('should render a complete six-week mini calendar', () => {
    const days = fixture.nativeElement.querySelectorAll('.schedule-list__days span');
    expect(days.length).toBe(42);
    expect(days[0].textContent.trim()).toBe('26');
    expect(days[41].textContent.trim()).toBe('5');
  });

  it('should filter people by search and schedules by selected person', () => {
    const search: HTMLInputElement = fixture.nativeElement.querySelector('input[type="search"]');
    search.value = 'Alexey';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.schedule-list__person').length).toBe(2);
    const root = fixture.nativeElement as HTMLElement;
    const buttons = root.querySelectorAll<HTMLButtonElement>('.schedule-list__person');
    const alexey = Array.from(buttons).find((button) => button.textContent?.includes('Alexey'))!;
    alexey.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Review');
  });
});
