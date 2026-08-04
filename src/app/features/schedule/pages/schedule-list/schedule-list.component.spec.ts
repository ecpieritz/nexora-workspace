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
        title: 'Planning',
        startsAt: '2026-08-04T10:00:00.000Z',
        location: 'Office',
        attendeeIds: ['eddie'],
      },
      {
        id: 'two',
        title: 'Review',
        startsAt: '2026-08-05T10:00:00.000Z',
        location: 'Home',
        attendeeIds: ['alexey'],
      },
    ]);
    repository.getPeople.and.resolveTo([
      { id: 'eddie', name: 'Eddie Lobanovskiy', email: 'eddie@example.com', color: '#87a8ff' },
      { id: 'alexey', name: 'Alexey Stave', email: 'alexey@example.com', color: '#d996ef' },
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
