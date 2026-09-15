import { TextEncoder } from 'node:util';

import { jwtVerify, SignJWT } from 'jose';

import { WorkspaceRole } from '../../generated/prisma/client.js';
import type { AccessTokenService, AuthPrincipal } from './auth.types.js';

export interface JwtTokenServiceOptions {
  audience: string;
  issuer: string;
  secret: string;
  ttlSeconds: number;
}

function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return Object.values(WorkspaceRole).some((role) => role === value);
}

export class JwtTokenService implements AccessTokenService {
  private readonly secret: Uint8Array;

  constructor(private readonly options: JwtTokenServiceOptions) {
    this.secret = new TextEncoder().encode(options.secret);
  }

  async sign(principal: AuthPrincipal): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    return new SignJWT({
      sid: principal.sessionId,
      workspaceId: principal.workspaceId,
      role: principal.role,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(principal.userId)
      .setIssuer(this.options.issuer)
      .setAudience(this.options.audience)
      .setIssuedAt(now)
      .setExpirationTime(now + this.options.ttlSeconds)
      .sign(this.secret);
  }

  async verify(token: string): Promise<AuthPrincipal> {
    const { payload } = await jwtVerify(token, this.secret, {
      algorithms: ['HS256'],
      audience: this.options.audience,
      issuer: this.options.issuer,
    });

    if (
      typeof payload.sub !== 'string' ||
      typeof payload['sid'] !== 'string' ||
      typeof payload['workspaceId'] !== 'string' ||
      !isWorkspaceRole(payload['role'])
    ) {
      throw new Error('Access token claims are invalid.');
    }

    return {
      userId: payload.sub,
      sessionId: payload['sid'],
      workspaceId: payload['workspaceId'],
      role: payload['role'],
    };
  }
}
