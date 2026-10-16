import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import { CreateScheduleInput, ScheduleEntry, SchedulePerson } from '../models/schedule.model';
import { ScheduleRepository } from './schedule.repository';

describe('ScheduleRepository', () => {
  let repository: ScheduleRepository;
  let httpTesting: HttpTestingController;

  const person: SchedulePerson = {
    id: '40000000-0000-4000-8000-000000000001',
    userId: '50000000-0000-4000-8000-000000000001',
    name: 'Eddie Lobanovskiy',
    email: 'eddie@example.com',
    avatarUrl: null,
    color: '#87a8ff',
  };
  const input: CreateScheduleInput = {
    title: 'Planning session',
    date: '2026-08-05',
    startTime: '10:00',
    endTime: '11:00',
    location: 'Office',
    attendeeIds: [person.id],
    kind: 'event',
    description: 'Plan the next workspace release.',
  };
  const schedule: ScheduleEntry = {
    id: '60000000-0000-4000-8000-000000000001',
    organizerId: person.userId,
    organizer: {
      id: person.userId,
      name: person.name,
      email: person.email,
      avatarUrl: null,
    },
    title: input.title,
    description: input.description,
    location: input.location,
    kind: input.kind,
    startsAt: '2026-08-05T10:00:00.000Z',
    endsAt: '2026-08-05T11:00:00.000Z',
    attendeeIds: input.attendeeIds,
    attendees: [person],
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    repository = TestBed.inject(ScheduleRepository);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should load workspace people from the API', async () => {
    const result = repository.getPeople();
    const request = httpTesting.expectOne('/api/schedules/people');
    expect(request.request.method).toBe('GET');
    request.flush({ data: [person] });
    await expectAsync(result).toBeResolvedTo([person]);
  });

  it('should list schedules with server-side filters', async () => {
    const result = repository.list({
      search: 'planning',
      kind: 'event',
      attendeeId: person.id,
      from: '2026-08-01',
      to: '2026-08-31',
      order: 'desc',
    });
    const request = httpTesting.expectOne((candidate) => candidate.url === '/api/schedules');
    expect(request.request.params.get('search')).toBe('planning');
    expect(request.request.params.get('kind')).toBe('event');
    expect(request.request.params.get('attendeeId')).toBe(person.id);
    expect(request.request.params.get('from')).toBe('2026-08-01');
    expect(request.request.params.get('to')).toBe('2026-08-31');
    expect(request.request.params.get('order')).toBe('desc');
    request.flush({ data: [schedule], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } });
    expect((await result).data).toEqual([schedule]);
  });

  it('should combine every schedule page used by the list view', fakeAsync(() => {
    const second = { ...schedule, id: '60000000-0000-4000-8000-000000000002' };
    let schedules: ScheduleEntry[] | undefined;
    void repository.getSchedules().then((result) => (schedules = result));

    httpTesting
      .expectOne((candidate) => candidate.params.get('page') === '1')
      .flush({ data: [schedule], meta: { page: 1, limit: 100, total: 2, totalPages: 2 } });
    tick();
    httpTesting
      .expectOne((candidate) => candidate.params.get('page') === '2')
      .flush({ data: [second], meta: { page: 2, limit: 100, total: 2, totalPages: 2 } });
    tick();

    expect(schedules).toEqual([schedule, second]);
  }));

  it('should load calendar events for the requested range', async () => {
    const result = repository.getCalendarEvents({ from: '2026-01-01', to: '2026-12-31' });
    const request = httpTesting.expectOne((candidate) => candidate.url === '/api/calendar/events');
    expect(request.request.params.get('from')).toBe('2026-01-01');
    expect(request.request.params.get('to')).toBe('2026-12-31');
    request.flush({ data: [schedule], meta: { from: '2026-01-01', to: '2026-12-31', count: 1 } });
    await expectAsync(result).toBeResolvedTo([schedule]);
  });

  it('should retrieve, create, and update schedules through the API', async () => {
    const retrieved = repository.getById(schedule.id);
    httpTesting.expectOne(`/api/schedules/${schedule.id}`).flush({ data: schedule });
    await expectAsync(retrieved).toBeResolvedTo(schedule);

    const created = repository.create(input);
    const createRequest = httpTesting.expectOne('/api/schedules');
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual({
      title: input.title,
      description: input.description,
      location: input.location,
      kind: input.kind,
      startsAt: '2026-08-05T10:00:00.000Z',
      endsAt: '2026-08-05T11:00:00.000Z',
      attendeeIds: input.attendeeIds,
    });
    createRequest.flush({ data: schedule });
    await expectAsync(created).toBeResolvedTo(schedule);

    const updated = repository.update(schedule.id, { ...input, title: 'Updated planning' });
    const updateRequest = httpTesting.expectOne(`/api/schedules/${schedule.id}`);
    expect(updateRequest.request.method).toBe('PATCH');
    expect(updateRequest.request.body.title).toBe('Updated planning');
    updateRequest.flush({ data: { ...schedule, title: 'Updated planning' } });
    expect((await updated).title).toBe('Updated planning');
  });

  it('should delete schedules through the API', async () => {
    const deletion = repository.delete(schedule.id);
    const request = httpTesting.expectOne(`/api/schedules/${schedule.id}`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    await expectAsync(deletion).toBeResolved();
  });
});
