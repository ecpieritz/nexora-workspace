import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import request from 'supertest';

import { createApp } from '../src/app.js';
import { JwtTokenService, type AuthPrincipal } from '../src/features/auth/index.js';
import {
  ScheduleService,
  type CalendarEventQuery,
  type CreateScheduleInput,
  type ScheduleEntry,
  type ScheduleListQuery,
  type ScheduleListResult,
  type ScheduleManagementService,
  type SchedulePage,
  type SchedulePerson,
  type ScheduleRepository,
  type ScheduleWriteInput,
  type UpdateScheduleInput,
} from '../src/features/schedules/index.js';
import { WorkspaceRole } from '../src/generated/prisma/client.js';
import { testAppOptions } from './test-app-options.js';

const scheduleId = '70000000-0000-4000-8000-000000000001';
const memberId = '30000000-0000-4000-8000-000000000002';
const owner: AuthPrincipal = {
  userId: '20000000-0000-4000-8000-000000000001',
  sessionId: '30000000-0000-4000-8000-000000000001',
  workspaceId: '10000000-0000-4000-8000-000000000001',
  role: WorkspaceRole.OWNER,
};

const person: SchedulePerson = {
  id: memberId,
  userId: '20000000-0000-4000-8000-000000000002',
  name: 'Eddie Lobanovskiy',
  email: 'eddie@example.com',
  avatarUrl: null,
  color: '#87a8ff',
};

const schedule: ScheduleEntry = {
  id: scheduleId,
  organizerId: owner.userId,
  organizer: {
    id: owner.userId,
    name: 'Emilyn Pieritz',
    email: 'demo@nexora.app',
    avatarUrl: null,
  },
  title: 'Product planning',
  description: 'Plan the next product cycle.',
  location: 'Office meeting',
  kind: 'event',
  startsAt: '2026-08-12T10:15:00.000Z',
  endsAt: '2026-08-12T11:15:00.000Z',
  attendeeIds: [memberId],
  attendees: [person],
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
};

class FakeScheduleService implements ScheduleManagementService {
  listQuery: ScheduleListQuery | undefined;
  calendarQuery: CalendarEventQuery | undefined;
  created: CreateScheduleInput | undefined;
  updated: { id: string; input: UpdateScheduleInput } | undefined;
  deletedId: string | undefined;

  list(_principal: AuthPrincipal, query: ScheduleListQuery): Promise<ScheduleListResult> {
    this.listQuery = query;
    return Promise.resolve({
      data: [schedule],
      meta: { page: query.page, limit: query.limit, total: 1, totalPages: 1 },
    });
  }

  listCalendarEvents(
    _principal: AuthPrincipal,
    query: CalendarEventQuery,
  ): Promise<ScheduleEntry[]> {
    this.calendarQuery = query;
    return Promise.resolve([schedule]);
  }

  listPeople(): Promise<SchedulePerson[]> {
    return Promise.resolve([person]);
  }

  get(): Promise<ScheduleEntry> {
    return Promise.resolve(schedule);
  }

  create(_principal: AuthPrincipal, input: CreateScheduleInput): Promise<ScheduleEntry> {
    this.created = input;
    return Promise.resolve(schedule);
  }

  update(
    _principal: AuthPrincipal,
    id: string,
    input: UpdateScheduleInput,
  ): Promise<ScheduleEntry> {
    this.updated = { id, input };
    return Promise.resolve(schedule);
  }

  delete(_principal: AuthPrincipal, id: string): Promise<void> {
    this.deletedId = id;
    return Promise.resolve();
  }
}

class FakeScheduleRepository implements ScheduleRepository {
  entry = schedule;
  membersAreValid = true;
  writeInput: ScheduleWriteInput | undefined;

  list(): Promise<SchedulePage> {
    return Promise.resolve({ items: [this.entry], total: 1 });
  }

  listCalendarEvents(): Promise<ScheduleEntry[]> {
    return Promise.resolve([this.entry]);
  }

  listPeople(): Promise<SchedulePerson[]> {
    return Promise.resolve([person]);
  }

  findById(): Promise<ScheduleEntry | null> {
    return Promise.resolve(this.entry);
  }

  membersExist(): Promise<boolean> {
    return Promise.resolve(this.membersAreValid);
  }

  create(_workspaceId: string, _organizerId: string, input: ScheduleWriteInput) {
    this.writeInput = input;
    return Promise.resolve(this.entry);
  }

  update(): Promise<ScheduleEntry | null> {
    return Promise.resolve(this.entry);
  }

  delete(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

const jwt = new JwtTokenService({
  secret: testAppOptions.jwtAccessSecret,
  issuer: testAppOptions.jwtIssuer,
  audience: testAppOptions.jwtAudience,
  ttlSeconds: testAppOptions.jwtAccessTtlSeconds,
});

async function authorizationHeader(role: WorkspaceRole = WorkspaceRole.OWNER): Promise<string> {
  return `Bearer ${await jwt.sign({ ...owner, role })}`;
}

const createInput = {
  title: 'Product planning',
  description: 'Plan the next product cycle.',
  location: 'Office meeting',
  startsAt: '2026-08-12T10:15:00.000Z',
  endsAt: '2026-08-12T11:15:00.000Z',
  attendeeIds: [memberId],
} as const;

void describe('schedule and calendar event API', () => {
  void it('requires authentication and normalizes schedule list filters', async () => {
    const service = new FakeScheduleService();
    const app = createApp({ ...testAppOptions, scheduleService: service });

    const unauthorized = await request(app).get('/api/schedules');
    const authorized = await request(app)
      .get('/api/schedules')
      .set('Authorization', await authorizationHeader())
      .query({ search: '  planning ', kind: 'event', attendeeId: memberId });

    assert.equal(unauthorized.status, 401);
    assert.equal(authorized.status, 200);
    assert.deepEqual(service.listQuery, {
      page: 1,
      limit: 20,
      search: 'planning',
      kind: 'event',
      attendeeId: memberId,
      order: 'asc',
    });
  });

  void it('exposes people and supports schedule creation, editing and deletion', async () => {
    const service = new FakeScheduleService();
    const app = createApp({ ...testAppOptions, scheduleService: service });
    const authorization = await authorizationHeader(WorkspaceRole.MEMBER);

    const people = await request(app)
      .get('/api/schedules/people')
      .set('Authorization', authorization);
    const created = await request(app)
      .post('/api/schedules')
      .set('Authorization', authorization)
      .send(createInput);
    const updated = await request(app)
      .patch(`/api/schedules/${scheduleId}`)
      .set('Authorization', authorization)
      .send({ title: 'Updated planning' });
    const deleted = await request(app)
      .delete(`/api/schedules/${scheduleId}`)
      .set('Authorization', authorization);

    assert.equal(people.status, 200);
    assert.equal(created.status, 201);
    assert.equal(service.created?.kind, 'event');
    assert.deepEqual(service.created?.attendeeIds, [memberId]);
    assert.equal(updated.status, 200);
    assert.deepEqual(service.updated, { id: scheduleId, input: { title: 'Updated planning' } });
    assert.equal(deleted.status, 204);
    assert.equal(service.deletedId, scheduleId);
  });

  void it('returns bounded calendar ranges for day, week, month and year views', async () => {
    const service = new FakeScheduleService();
    const app = createApp({ ...testAppOptions, scheduleService: service });
    const authorization = await authorizationHeader();

    const valid = await request(app)
      .get('/api/calendar/events?from=2026-01-01&to=2026-12-31')
      .set('Authorization', authorization);
    const invalid = await request(app)
      .get('/api/calendar/events?from=2026-01-01&to=2027-12-31')
      .set('Authorization', authorization);

    assert.equal(valid.status, 200);
    assert.deepEqual(service.calendarQuery, { from: '2026-01-01', to: '2026-12-31' });
    assert.deepEqual((valid.body as { meta: { from: string; to: string; count: number } }).meta, {
      from: '2026-01-01',
      to: '2026-12-31',
      count: 1,
    });
    assert.equal(invalid.status, 422);
  });

  void it('enforces attendee tenancy and organizer ownership in the service', async () => {
    const repository = new FakeScheduleRepository();
    const service = new ScheduleService(repository);
    repository.membersAreValid = false;

    await assert.rejects(
      service.create(owner, {
        ...createInput,
        kind: 'event',
        attendeeIds: [memberId],
      }),
      { statusCode: 400 },
    );

    repository.membersAreValid = true;
    repository.entry = { ...schedule, organizerId: '20000000-0000-4000-8000-000000000099' };
    const memberPrincipal = { ...owner, role: WorkspaceRole.MEMBER };
    await assert.rejects(service.update(memberPrincipal, scheduleId, { title: 'Denied' }), {
      statusCode: 403,
    });

    await service.update(owner, scheduleId, { title: 'Allowed for owner' });
  });
});
