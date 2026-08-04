import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskRepository } from '../../data-access/task.repository';
import { TaskListComponent } from './task-list.component';

describe('TaskListComponent', () => {
  let fixture: ComponentFixture<TaskListComponent>;
  let repository: jasmine.SpyObj<TaskRepository>;
  beforeEach(async () => {
    repository = jasmine.createSpyObj<TaskRepository>('TaskRepository', [
      'getAll',
      'updateStatus',
      'delete',
    ]);
    repository.getAll.and.resolveTo([
      {
        id: 'one',
        name: 'UI design',
        category: 'design',
        startsAt: '2026-08-03T00:00:00.000Z',
        dueAt: '2026-08-05T00:00:00.000Z',
        memberCount: 5,
        status: 'todo',
      },
      {
        id: 'two',
        name: 'Web development',
        category: 'development',
        startsAt: '2026-08-01T00:00:00.000Z',
        dueAt: '2026-08-08T00:00:00.000Z',
        memberCount: 4,
        status: 'doing',
      },
    ]);
    repository.updateStatus.and.callFake(async (id, status) => ({
      ...(await repository.getAll()).find((task) => task.id === id)!,
      status,
    }));
    repository.delete.and.resolveTo();
    await TestBed.configureTestingModule({
      imports: [TaskListComponent],
      providers: [{ provide: TaskRepository, useValue: repository }],
    }).compileComponents();
    fixture = TestBed.createComponent(TaskListComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });
  it('should group tasks by status', () => {
    expect(fixture.nativeElement.querySelectorAll('.task-list__group').length).toBe(3);
    expect(fixture.nativeElement.textContent).toContain('UI design');
  });
  it('should filter tasks by search term', () => {
    const search: HTMLInputElement = fixture.nativeElement.querySelector('input[type="search"]');
    search.value = 'Web';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('UI design');
    expect(fixture.nativeElement.textContent).toContain('Web development');
  });
  it('should advance a task to the next status', async () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[aria-label="Advance UI design"]',
    );
    button.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(repository.updateStatus).toHaveBeenCalledOnceWith('one', 'doing');
  });

  it('should display tasks in kanban columns and move them forward', async () => {
    const boardButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button.task-list__view:nth-child(2)',
    );
    boardButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.task-board__column').length).toBe(3);
    expect(fixture.nativeElement.querySelectorAll('.task-board__card').length).toBe(2);

    const moveForward: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[aria-label="Move UI design forward"]',
    );
    moveForward.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(repository.updateStatus).toHaveBeenCalledOnceWith('one', 'doing');
  });

  it('should display tasks across their date range in the timeline', () => {
    const timelineButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button.task-list__view:nth-child(3)',
    );
    timelineButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.task-timeline__section').length).toBe(3);
    expect(fixture.nativeElement.querySelectorAll('.task-timeline__bar').length).toBe(2);
    const uiDesign: HTMLElement = fixture.nativeElement.querySelector(
      '.task-timeline__bar[aria-label^="UI design"]',
    );
    expect(uiDesign.style.gridColumn).toBeTruthy();
  });
});
