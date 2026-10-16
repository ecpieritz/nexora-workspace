import { ApiError } from '../../errors/api-error.js';
import { WorkspaceRole } from '../../generated/prisma/client.js';
import type { AuthPrincipal } from '../auth/index.js';
import type {
  CalendarEventQuery,
  CreateScheduleInput,
  ScheduleListQuery,
  UpdateScheduleInput,
} from './schedule.schemas.js';
import type {
  CalendarEventOptions,
  ScheduleChanges,
  ScheduleEntry,
  ScheduleListOptions,
  SchedulePerson,
  ScheduleRepository,
  ScheduleWriteInput,
} from './schedule.types.js';

export interface ScheduleListResult {
  data: ScheduleEntry[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface ScheduleManagementService {
  list(principal: AuthPrincipal, query: ScheduleListQuery): Promise<ScheduleListResult>;
  listCalendarEvents(principal: AuthPrincipal, query: CalendarEventQuery): Promise<ScheduleEntry[]>;
  listPeople(principal: AuthPrincipal): Promise<SchedulePerson[]>;
  get(principal: AuthPrincipal, scheduleId: string): Promise<ScheduleEntry>;
  create(principal: AuthPrincipal, input: CreateScheduleInput): Promise<ScheduleEntry>;
  update(
    principal: AuthPrincipal,
    scheduleId: string,
    input: UpdateScheduleInput,
  ): Promise<ScheduleEntry>;
  delete(principal: AuthPrincipal, scheduleId: string): Promise<void>;
}

function startOfDay(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function endOfDay(value: string): Date {
  return new Date(`${value}T23:59:59.999Z`);
}

function canManage(principal: AuthPrincipal, schedule: ScheduleEntry): boolean {
  return (
    schedule.organizerId === principal.userId ||
    principal.role === WorkspaceRole.OWNER ||
    principal.role === WorkspaceRole.ADMIN
  );
}

export class ScheduleService implements ScheduleManagementService {
  constructor(private readonly repository: ScheduleRepository) {}

  async list(principal: AuthPrincipal, query: ScheduleListQuery): Promise<ScheduleListResult> {
    const options: ScheduleListOptions = {
      page: query.page,
      limit: query.limit,
      order: query.order,
      ...(query.search === undefined ? {} : { search: query.search }),
      ...(query.kind === undefined ? {} : { kind: query.kind }),
      ...(query.attendeeId === undefined ? {} : { attendeeId: query.attendeeId }),
      ...(query.from === undefined ? {} : { from: startOfDay(query.from) }),
      ...(query.to === undefined ? {} : { to: endOfDay(query.to) }),
    };
    const page = await this.repository.list(principal.workspaceId, options);
    return {
      data: page.items,
      meta: {
        page: query.page,
        limit: query.limit,
        total: page.total,
        totalPages: Math.ceil(page.total / query.limit),
      },
    };
  }

  async listCalendarEvents(
    principal: AuthPrincipal,
    query: CalendarEventQuery,
  ): Promise<ScheduleEntry[]> {
    const options: CalendarEventOptions = {
      from: startOfDay(query.from),
      to: endOfDay(query.to),
      ...(query.kind === undefined ? {} : { kind: query.kind }),
      ...(query.attendeeId === undefined ? {} : { attendeeId: query.attendeeId }),
    };
    return this.repository.listCalendarEvents(principal.workspaceId, options);
  }

  listPeople(principal: AuthPrincipal): Promise<SchedulePerson[]> {
    return this.repository.listPeople(principal.workspaceId);
  }

  async get(principal: AuthPrincipal, scheduleId: string): Promise<ScheduleEntry> {
    const schedule = await this.repository.findById(principal.workspaceId, scheduleId);
    if (!schedule) throw ApiError.notFound('Schedule entry was not found.');
    return schedule;
  }

  async create(principal: AuthPrincipal, input: CreateScheduleInput): Promise<ScheduleEntry> {
    await this.assertMembers(principal.workspaceId, input.attendeeIds);
    const writeInput: ScheduleWriteInput = {
      title: input.title,
      kind: input.kind,
      startsAt: new Date(input.startsAt),
      attendeeIds: input.attendeeIds,
      ...(input.description === undefined ? {} : { description: input.description }),
      ...(input.location === undefined ? {} : { location: input.location }),
      ...(input.endsAt === undefined
        ? {}
        : { endsAt: input.endsAt === null ? null : new Date(input.endsAt) }),
    };
    return this.repository.create(principal.workspaceId, principal.userId, writeInput);
  }

  async update(
    principal: AuthPrincipal,
    scheduleId: string,
    input: UpdateScheduleInput,
  ): Promise<ScheduleEntry> {
    const existing = await this.get(principal, scheduleId);
    if (!canManage(principal, existing)) {
      throw ApiError.forbidden(
        'Only the organizer or a workspace administrator can edit this event.',
      );
    }
    if (input.attendeeIds) await this.assertMembers(principal.workspaceId, input.attendeeIds);

    const startsAt = input.startsAt ? new Date(input.startsAt) : new Date(existing.startsAt);
    const endsAt =
      input.endsAt === undefined
        ? existing.endsAt === null
          ? null
          : new Date(existing.endsAt)
        : input.endsAt === null
          ? null
          : new Date(input.endsAt);
    if (endsAt && endsAt <= startsAt) {
      throw ApiError.badRequest('End date must be after the start date.');
    }

    const changes: ScheduleChanges = {
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(input.description === undefined ? {} : { description: input.description }),
      ...(input.location === undefined ? {} : { location: input.location }),
      ...(input.kind === undefined ? {} : { kind: input.kind }),
      ...(input.startsAt === undefined ? {} : { startsAt }),
      ...(input.endsAt === undefined ? {} : { endsAt }),
      ...(input.attendeeIds === undefined ? {} : { attendeeIds: input.attendeeIds }),
    };
    const schedule = await this.repository.update(principal.workspaceId, scheduleId, changes);
    if (!schedule) throw ApiError.notFound('Schedule entry was not found.');
    return schedule;
  }

  async delete(principal: AuthPrincipal, scheduleId: string): Promise<void> {
    const existing = await this.get(principal, scheduleId);
    if (!canManage(principal, existing)) {
      throw ApiError.forbidden(
        'Only the organizer or a workspace administrator can delete this event.',
      );
    }
    const deleted = await this.repository.delete(principal.workspaceId, scheduleId);
    if (!deleted) throw ApiError.notFound('Schedule entry was not found.');
  }

  private async assertMembers(workspaceId: string, memberIds: string[]): Promise<void> {
    if (!(await this.repository.membersExist(workspaceId, memberIds))) {
      throw ApiError.badRequest('All attendees must belong to the active workspace.');
    }
  }
}
