import type { WorkspaceRole } from '../../generated/prisma/client.js';

export interface CreateAccountInput {
  email: string;
  fullName: string;
  passwordHash: string;
  username: string;
}

export interface RegisteredAccount {
  user: {
    id: string;
    email: string;
    username: string;
    fullName: string;
    displayName: string | null;
    createdAt: string;
  };
  workspace: {
    id: string;
    name: string;
    slug: string;
    role: WorkspaceRole;
  };
}

export interface AuthRegistrationRepository {
  createAccount(input: CreateAccountInput): Promise<RegisteredAccount>;
}
