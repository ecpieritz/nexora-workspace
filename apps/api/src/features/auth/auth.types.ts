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

export interface LoginAccount {
  account: RegisteredAccount;
  passwordHash: string;
}

export interface SessionMetadata {
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateSessionInput extends SessionMetadata {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export type ReplacementSessionInput = Omit<CreateSessionInput, 'userId'>;

export interface AuthSessionRepository {
  findLoginAccount(email: string): Promise<LoginAccount | null>;
  createSession(input: CreateSessionInput): Promise<void>;
  rotateSession(
    currentTokenHash: string,
    replacement: ReplacementSessionInput,
    now: Date,
  ): Promise<RegisteredAccount | null>;
  revokeSession(tokenHash: string, revokedAt: Date): Promise<void>;
}

export interface AuthPrincipal {
  userId: string;
  sessionId: string;
  workspaceId: string;
  role: WorkspaceRole;
}

export interface AccessTokenService {
  sign(principal: AuthPrincipal): Promise<string>;
  verify(token: string): Promise<AuthPrincipal>;
}

export interface AuthenticatedSession extends RegisteredAccount {
  tokens: {
    accessToken: string;
    refreshToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
    refreshExpiresAt: string;
  };
}
