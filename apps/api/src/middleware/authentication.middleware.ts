import type { Request, RequestHandler } from 'express';

import { ApiError } from '../errors/api-error.js';
import type { AccessTokenService, AuthPrincipal } from '../features/auth/auth.types.js';

type AuthenticatedRequest = Request & { authPrincipal?: AuthPrincipal };

function readBearerToken(authorization: string | undefined): string | null {
  if (!authorization) return null;

  const [scheme, token, extra] = authorization.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token || extra) return null;
  return token;
}

export function createAuthenticationMiddleware(accessTokens: AccessTokenService): RequestHandler {
  return async (request, _response, next) => {
    const token = readBearerToken(request.get('authorization'));
    if (!token) {
      next(ApiError.unauthorized());
      return;
    }

    try {
      (request as AuthenticatedRequest).authPrincipal = await accessTokens.verify(token);
      next();
    } catch {
      next(new ApiError(401, 'INVALID_ACCESS_TOKEN', 'Access token is invalid or expired.'));
    }
  };
}

export function getAuthPrincipal(request: Request): AuthPrincipal {
  const principal = (request as AuthenticatedRequest).authPrincipal;
  if (!principal) throw ApiError.unauthorized();
  return principal;
}
