import { randomUUID } from 'node:crypto';

import { compare } from 'bcryptjs';

import { ApiError } from '../../errors/api-error.js';
import type { LoginInput, RefreshTokenInput } from './auth.schemas.js';
import { createRefreshToken, hashRefreshToken } from './refresh-token.js';
import type {
  AccessTokenService,
  AuthenticatedSession,
  AuthSessionRepository,
  RegisteredAccount,
  SessionMetadata,
} from './auth.types.js';

const millisecondsPerDay = 24 * 60 * 60 * 1000;
const dummyPasswordHash = '$2b$12$7YMBLbDjQpD76eAu4rIyTOPhZCVMVJuZ9G8sukLQ13s7xeakVijvq';

export interface AuthenticationService {
  login(input: LoginInput, metadata: SessionMetadata): Promise<AuthenticatedSession>;
  refresh(input: RefreshTokenInput, metadata: SessionMetadata): Promise<AuthenticatedSession>;
  logout(input: RefreshTokenInput): Promise<void>;
}

export interface AuthSessionServiceOptions {
  accessTokenTtlSeconds: number;
  refreshTokenTtlDays: number;
}

export class AuthSessionService implements AuthenticationService {
  constructor(
    private readonly repository: AuthSessionRepository,
    private readonly accessTokens: AccessTokenService,
    private readonly options: AuthSessionServiceOptions,
  ) {}

  async login(input: LoginInput, metadata: SessionMetadata): Promise<AuthenticatedSession> {
    const loginAccount = await this.repository.findLoginAccount(input.email);
    const passwordHash = loginAccount?.passwordHash ?? dummyPasswordHash;
    const passwordMatches = await compare(input.password, passwordHash);

    if (!loginAccount || !passwordMatches) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }

    const session = this.createSessionInput(metadata);
    const accessToken = await this.accessTokens.sign({
      userId: loginAccount.account.user.id,
      sessionId: session.id,
      workspaceId: loginAccount.account.workspace.id,
      role: loginAccount.account.workspace.role,
    });

    await this.repository.createSession({
      ...session,
      userId: loginAccount.account.user.id,
      tokenHash: hashRefreshToken(session.refreshToken),
    });

    return this.createAuthenticatedSession(loginAccount.account, accessToken, session);
  }

  async refresh(
    input: RefreshTokenInput,
    metadata: SessionMetadata,
  ): Promise<AuthenticatedSession> {
    const replacement = this.createSessionInput(metadata);
    const account = await this.repository.rotateSession(
      hashRefreshToken(input.refreshToken),
      {
        ...replacement,
        tokenHash: hashRefreshToken(replacement.refreshToken),
      },
      new Date(),
    );

    if (!account) {
      throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired.');
    }

    const accessToken = await this.accessTokens.sign({
      userId: account.user.id,
      sessionId: replacement.id,
      workspaceId: account.workspace.id,
      role: account.workspace.role,
    });

    return this.createAuthenticatedSession(account, accessToken, replacement);
  }

  async logout(input: RefreshTokenInput): Promise<void> {
    await this.repository.revokeSession(hashRefreshToken(input.refreshToken), new Date());
  }

  private createSessionInput(metadata: SessionMetadata) {
    const refreshToken = createRefreshToken();
    const refreshExpiresAt = new Date(
      Date.now() + this.options.refreshTokenTtlDays * millisecondsPerDay,
    );

    return {
      id: randomUUID(),
      refreshToken,
      expiresAt: refreshExpiresAt,
      ...(metadata.ipAddress === undefined ? {} : { ipAddress: metadata.ipAddress }),
      ...(metadata.userAgent === undefined ? {} : { userAgent: metadata.userAgent }),
    };
  }

  private createAuthenticatedSession(
    account: RegisteredAccount,
    accessToken: string,
    session: ReturnType<AuthSessionService['createSessionInput']>,
  ): AuthenticatedSession {
    return {
      ...account,
      tokens: {
        accessToken,
        refreshToken: session.refreshToken,
        tokenType: 'Bearer',
        expiresIn: this.options.accessTokenTtlSeconds,
        refreshExpiresAt: session.expiresAt.toISOString(),
      },
    };
  }
}
