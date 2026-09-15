import { prisma } from '../../database/prisma.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import type { UserProfile, UserProfileChanges, UserProfileRepository } from './profile.types.js';

const profileSelect = {
  id: true,
  email: true,
  username: true,
  fullName: true,
  displayName: true,
  phone: true,
  birthDate: true,
  bio: true,
  taxId: true,
  avatarUrl: true,
  language: true,
  timezone: true,
  dateFormat: true,
  currency: true,
  compactSidebar: true,
  taskNotifications: true,
  invoiceNotifications: true,
  eventNotifications: true,
  customerNotifications: true,
  createdAt: true,
  updatedAt: true,
  memberships: {
    select: {
      role: true,
      workspace: { select: { id: true, name: true, slug: true } },
    },
  },
} satisfies Prisma.UserSelect;

type ProfileRecord = Prisma.UserGetPayload<{ select: typeof profileSelect }>;

function toProfile(user: ProfileRecord, workspaceId: string): UserProfile | null {
  const membership = user.memberships.find((item) => item.workspace.id === workspaceId);
  if (!membership) return null;

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    displayName: user.displayName,
    phone: user.phone,
    birthDate: user.birthDate?.toISOString().slice(0, 10) ?? null,
    bio: user.bio,
    taxId: user.taxId,
    avatarUrl: user.avatarUrl,
    preferences: {
      language: user.language,
      timezone: user.timezone,
      dateFormat: user.dateFormat,
      currency: user.currency,
      compactSidebar: user.compactSidebar,
      notifications: {
        tasks: user.taskNotifications,
        invoices: user.invoiceNotifications,
        events: user.eventNotifications,
        customers: user.customerNotifications,
      },
    },
    workspace: {
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      role: membership.role,
    },
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function toUpdateData(changes: UserProfileChanges): Prisma.UserUpdateManyMutationInput {
  return {
    ...changes,
    ...(changes.birthDate === undefined
      ? {}
      : {
          birthDate: changes.birthDate === null ? null : new Date(`${changes.birthDate}T00:00:00Z`),
        }),
  };
}

export class PrismaUserProfileRepository implements UserProfileRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  async findById(userId: string, workspaceId: string): Promise<UserProfile | null> {
    const user = await this.database.user.findFirst({
      where: { id: userId, memberships: { some: { workspaceId } } },
      select: profileSelect,
    });

    return user ? toProfile(user, workspaceId) : null;
  }

  async update(
    userId: string,
    workspaceId: string,
    expectedTaxId: string | null,
    changes: UserProfileChanges,
  ): Promise<UserProfile | null> {
    return this.database.$transaction(async (transaction) => {
      const result = await transaction.user.updateMany({
        where: { id: userId, taxId: expectedTaxId, memberships: { some: { workspaceId } } },
        data: toUpdateData(changes),
      });
      if (result.count !== 1) return null;

      const user = await transaction.user.findFirst({
        where: { id: userId, memberships: { some: { workspaceId } } },
        select: profileSelect,
      });
      return user ? toProfile(user, workspaceId) : null;
    });
  }
}
