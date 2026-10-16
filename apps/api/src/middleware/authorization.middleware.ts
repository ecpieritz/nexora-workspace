import type { RequestHandler } from 'express';

import { ApiError } from '../errors/api-error.js';
import type { WorkspaceRole } from '../generated/prisma/client.js';
import { getAuthPrincipal } from './authentication.middleware.js';

export function requireWorkspaceRoles(...allowedRoles: readonly WorkspaceRole[]): RequestHandler {
  const allowed = new Set(allowedRoles);

  return (request, _response, next) => {
    const principal = getAuthPrincipal(request);
    if (!allowed.has(principal.role)) {
      next(ApiError.forbidden('Your workspace role does not allow this action.'));
      return;
    }
    next();
  };
}

export function requireCurrentWorkspace(parameterName = 'workspaceId'): RequestHandler {
  return (request, _response, next) => {
    const principal = getAuthPrincipal(request);
    const requestedWorkspaceId = request.params[parameterName];
    if (!requestedWorkspaceId || requestedWorkspaceId !== principal.workspaceId) {
      next(ApiError.forbidden('You do not have access to this workspace.'));
      return;
    }
    next();
  };
}
