import { prisma } from '../../database/prisma.js';
import {
  Prisma,
  ScheduleKind,
  type PrismaClient,
  type ScheduleKind as PrismaScheduleKind,
} from '../../generated/prisma/client.js';
import type {
  CalendarEventOptions,
  ScheduleChanges,
  ScheduleEntry,
  ScheduleKindValue,
  ScheduleListOptions,
  SchedulePage,
  SchedulePerson,
  ScheduleRepository,
  ScheduleWriteInput,
} from './schedule.types.js';

const personSelect = {
  id: true,
  userId: true,
  user: {
    select: { fullName: true, email: true, avatarUrl: true },
  },
} satisfies Prisma.WorkspaceMemberSelect;

const scheduleSelect = {
  id: true,
  organizerId: true,
  organizer: {
    select: { id: true, fullName: true, email: true, avatarUrl: true },
  },
  title: true,
  description: true,
  location: true,
  kind: true,
  startsAt: true,
  endsAt: true,
  attendees: {
    select: { member: { select: personSelect } },
    orderBy: { member: { user: { fullName: 'asc' as const } } },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ScheduleEntrySelect;

type PersonRecord = Prisma.WorkspaceMemberGetPayload<{ select: typeof personSelect }>;
type ScheduleRecord = Prisma.ScheduleEntryGetPayload<{ select: typeof scheduleSelect }>;

const publicToDatabaseKind: Record<ScheduleKindValue, PrismaScheduleKind> = {
  event: ScheduleKind.EVENT,
  reminder: ScheduleKind.REMINDER,
  task: ScheduleKind.TASK,
};

const databaseToPublicKind: Record<PrismaScheduleKind, ScheduleKindValue> = {
  [ScheduleKind.EVENT]: 'event',
  [ScheduleKind.REMINDER]: 'reminder',
  [ScheduleKind.TASK]: 'task',
};

const personColors = ['#87a8ff', '#d996ef', '#66c7c5', '#ff9c87', '#f1c66a', '#7cb9a8'];

function personColor(id: string): string {
  const hash = [...id].reduce((value, character) => value + character.charCodeAt(0), 0);
  return personColors[hash % personColors.length] ?? '#87a8ff';
}

function toPerson(member: PersonRecord): SchedulePerson {
  return {
    id: member.id,
    userId: member.userId,
    name: member.user.fullName,
    email: member.user.email,
    avatarUrl: member.user.avatarUrl,
    color: personColor(member.id),
  };
}

function toSchedule(schedule: ScheduleRecord): ScheduleEntry {
  const attendees = schedule.attendees.map(({ member }) => toPerson(member));
  return {
    id: schedule.id,
    organizerId: schedule.organizerId,
    organizer: {
      id: schedule.organizer.id,
      name: schedule.organizer.fullName,
      email: schedule.organizer.email,
      avatarUrl: schedule.organizer.avatarUrl,
    },
    title: schedule.title,
    description: schedule.description,
    location: schedule.location,
    kind: databaseToPublicKind[schedule.kind],
    startsAt: schedule.startsAt.toISOString(),
    endsAt: schedule.endsAt?.toISOString() ?? null,
    attendeeIds: attendees.map(({ id }) => id),
    attendees,
    createdAt: schedule.createdAt.toISOString(),
    updatedAt: schedule.updatedAt.toISOString(),
  };
}

interface RangeOptions {
  from?: Date;
  to?: Date;
}

function rangeWhere(options: RangeOptions): Prisma.ScheduleEntryWhereInput {
  if (options.from && options.to) {
    return {
      startsAt: { lte: options.to },
      OR: [{ endsAt: { gte: options.from } }, { endsAt: null, startsAt: { gte: options.from } }],
    };
  }
  if (options.from) {
    return {
      OR: [{ endsAt: { gte: options.from } }, { endsAt: null, startsAt: { gte: options.from } }],
    };
  }
  return options.to ? { startsAt: { lte: options.to } } : {};
}

function scheduleWhere(
  workspaceId: string,
  options: RangeOptions & {
    search?: string;
    kind?: ScheduleKindValue;
    attendeeId?: string;
  },
): Prisma.ScheduleEntryWhereInput {
  const search = options.search?.trim();
  const range = rangeWhere(options);
  return {
    workspaceId,
    ...(options.kind === undefined ? {} : { kind: publicToDatabaseKind[options.kind] }),
    ...(options.attendeeId === undefined
      ? {}
      : { attendees: { some: { memberId: options.attendeeId } } }),
    AND: [
      range,
      ...(search
        ? [
            {
              OR: ['title', 'description', 'location'].map((field) => ({
                [field]: { contains: search, mode: Prisma.QueryMode.insensitive },
              })),
            },
          ]
        : []),
    ],
  };
}

function scheduleData(input: ScheduleWriteInput | ScheduleChanges) {
  return {
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.location === undefined ? {} : { location: input.location }),
    ...(input.kind === undefined ? {} : { kind: publicToDatabaseKind[input.kind] }),
    ...(input.startsAt === undefined ? {} : { startsAt: input.startsAt }),
    ...(input.endsAt === undefined ? {} : { endsAt: input.endsAt }),
  };
}

export class PrismaScheduleRepository implements ScheduleRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  async list(workspaceId: string, options: ScheduleListOptions): Promise<SchedulePage> {
    const where = scheduleWhere(workspaceId, options);
    const [items, total] = await this.database.$transaction([
      this.database.scheduleEntry.findMany({
        where,
        select: scheduleSelect,
        orderBy: [{ startsAt: options.order }, { id: 'asc' }],
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      this.database.scheduleEntry.count({ where }),
    ]);
    return { items: items.map(toSchedule), total };
  }

  async listCalendarEvents(
    workspaceId: string,
    options: CalendarEventOptions,
  ): Promise<ScheduleEntry[]> {
    const items = await this.database.scheduleEntry.findMany({
      where: scheduleWhere(workspaceId, options),
      select: scheduleSelect,
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      take: 2_000,
    });
    return items.map(toSchedule);
  }

  async listPeople(workspaceId: string): Promise<SchedulePerson[]> {
    const members = await this.database.workspaceMember.findMany({
      where: { workspaceId },
      select: personSelect,
      orderBy: [{ user: { fullName: 'asc' } }, { id: 'asc' }],
    });
    return members.map(toPerson);
  }

  async findById(workspaceId: string, scheduleId: string): Promise<ScheduleEntry | null> {
    const schedule = await this.database.scheduleEntry.findFirst({
      where: { id: scheduleId, workspaceId },
      select: scheduleSelect,
    });
    return schedule ? toSchedule(schedule) : null;
  }

  async membersExist(workspaceId: string, memberIds: string[]): Promise<boolean> {
    const uniqueIds = [...new Set(memberIds)];
    const count = await this.database.workspaceMember.count({
      where: { workspaceId, id: { in: uniqueIds } },
    });
    return count === uniqueIds.length;
  }

  async create(
    workspaceId: string,
    organizerId: string,
    input: ScheduleWriteInput,
  ): Promise<ScheduleEntry> {
    const schedule = await this.database.scheduleEntry.create({
      data: {
        workspaceId,
        organizerId,
        ...scheduleData(input),
        title: input.title,
        kind: publicToDatabaseKind[input.kind],
        startsAt: input.startsAt,
        attendees: { create: input.attendeeIds.map((memberId) => ({ memberId })) },
      },
      select: scheduleSelect,
    });
    return toSchedule(schedule);
  }

  async update(
    workspaceId: string,
    scheduleId: string,
    changes: ScheduleChanges,
  ): Promise<ScheduleEntry | null> {
    return this.database.$transaction(async (transaction) => {
      const existing = await transaction.scheduleEntry.findFirst({
        where: { id: scheduleId, workspaceId },
        select: { id: true },
      });
      if (!existing) return null;

      await transaction.scheduleEntry.update({
        where: { id: scheduleId },
        data: scheduleData(changes),
      });
      if (changes.attendeeIds) {
        await transaction.scheduleAttendee.deleteMany({ where: { scheduleId } });
        await transaction.scheduleAttendee.createMany({
          data: changes.attendeeIds.map((memberId) => ({ scheduleId, memberId })),
        });
      }
      const schedule = await transaction.scheduleEntry.findUnique({
        where: { id: scheduleId },
        select: scheduleSelect,
      });
      return schedule ? toSchedule(schedule) : null;
    });
  }

  async delete(workspaceId: string, scheduleId: string): Promise<boolean> {
    const deleted = await this.database.scheduleEntry.deleteMany({
      where: { id: scheduleId, workspaceId },
    });
    return deleted.count === 1;
  }
}
