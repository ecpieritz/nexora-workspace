import { randomUUID } from 'node:crypto';

import { prisma } from '../../database/prisma.js';
import { Prisma, WorkspaceRole, type PrismaClient } from '../../generated/prisma/client.js';
import type {
  AuthRegistrationRepository,
  AuthSessionRepository,
  CreateAccountInput,
  CreateSessionInput,
  LoginAccount,
  ReplacementSessionInput,
  RegisteredAccount,
} from './auth.types.js';

const authenticatedUserSelect = {
  id: true,
  email: true,
  username: true,
  passwordHash: true,
  fullName: true,
  displayName: true,
  createdAt: true,
  memberships: {
    orderBy: { joinedAt: 'asc' },
    take: 1,
    select: {
      role: true,
      workspace: {
        select: { id: true, name: true, slug: true },
      },
    },
  },
} satisfies Prisma.UserSelect;

type AuthenticatedUserRecord = Prisma.UserGetPayload<{
  select: typeof authenticatedUserSelect;
}>;

function toLoginAccount(user: AuthenticatedUserRecord | null): LoginAccount | null {
  const membership = user?.memberships[0];
  if (!user || !membership) return null;

  return {
    passwordHash: user.passwordHash,
    account: {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        displayName: user.displayName,
        createdAt: user.createdAt.toISOString(),
      },
      workspace: {
        id: membership.workspace.id,
        name: membership.workspace.name,
        slug: membership.workspace.slug,
        role: membership.role,
      },
    },
  };
}

function toSessionData(input: CreateSessionInput) {
  return {
    id: input.id,
    userId: input.userId,
    tokenHash: input.tokenHash,
    expiresAt: input.expiresAt,
    ...(input.userAgent === undefined ? {} : { userAgent: input.userAgent }),
    ...(input.ipAddress === undefined ? {} : { ipAddress: input.ipAddress }),
  };
}

function createDisplayName(fullName: string): string {
  return (fullName.split(/\s+/)[0] ?? fullName).slice(0, 80);
}

function createWorkspaceName(displayName: string): string {
  return `${displayName}'s Workspace`;
}

function createWorkspaceSlug(username: string, workspaceId: string): string {
  const slugBase = username.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slugBase}-${workspaceId.slice(0, 8)}`;
}

export class PrismaAuthRepository implements AuthRegistrationRepository, AuthSessionRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  async createAccount(input: CreateAccountInput): Promise<RegisteredAccount> {
    const userId = randomUUID();
    const workspaceId = randomUUID();
    const membershipId = randomUUID();
    const displayName = createDisplayName(input.fullName);
    const workspaceName = createWorkspaceName(displayName);
    const workspaceSlug = createWorkspaceSlug(input.username, workspaceId);

    return this.database.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          id: userId,
          email: input.email,
          username: input.username,
          passwordHash: input.passwordHash,
          fullName: input.fullName,
          displayName,
        },
      });
      const workspace = await transaction.workspace.create({
        data: {
          id: workspaceId,
          ownerId: user.id,
          name: workspaceName,
          slug: workspaceSlug,
        },
      });
      const membership = await transaction.workspaceMember.create({
        data: {
          id: membershipId,
          workspaceId: workspace.id,
          userId: user.id,
          role: WorkspaceRole.OWNER,
        },
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.fullName,
          displayName: user.displayName,
          createdAt: user.createdAt.toISOString(),
        },
        workspace: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          role: membership.role,
        },
      };
    });
  }

  async findLoginAccount(email: string): Promise<LoginAccount | null> {
    const user = await this.database.user.findUnique({
      where: { email },
      select: authenticatedUserSelect,
    });

    return toLoginAccount(user);
  }

  async createSession(input: CreateSessionInput): Promise<void> {
    await this.database.authSession.create({ data: toSessionData(input) });
  }

  async rotateSession(
    currentTokenHash: string,
    replacement: ReplacementSessionInput,
    now: Date,
  ): Promise<RegisteredAccount | null> {
    return this.database.$transaction(async (transaction) => {
      const currentSession = await transaction.authSession.findFirst({
        where: {
          tokenHash: currentTokenHash,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        select: {
          id: true,
          user: { select: authenticatedUserSelect },
        },
      });
      const loginAccount = toLoginAccount(currentSession?.user ?? null);
      if (!currentSession || !loginAccount) return null;

      const revoked = await transaction.authSession.updateMany({
        where: { id: currentSession.id, revokedAt: null },
        data: { revokedAt: now },
      });
      if (revoked.count !== 1) return null;

      await transaction.authSession.create({
        data: toSessionData({ ...replacement, userId: currentSession.user.id }),
      });
      return loginAccount.account;
    });
  }

  async revokeSession(tokenHash: string, revokedAt: Date): Promise<void> {
    await this.database.authSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt },
    });
  }
}
