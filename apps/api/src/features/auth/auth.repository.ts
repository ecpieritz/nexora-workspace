import { randomUUID } from 'node:crypto';

import { prisma } from '../../database/prisma.js';
import { WorkspaceRole, type PrismaClient } from '../../generated/prisma/client.js';
import type {
  AuthRegistrationRepository,
  CreateAccountInput,
  RegisteredAccount,
} from './auth.types.js';

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

export class PrismaAuthRepository implements AuthRegistrationRepository {
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
}
