import type { ErrorRequestHandler } from 'express';

import { ApiError } from '../errors/api-error.js';

interface ErrorLogger {
  error(message: string, context: unknown): void;
}

export interface ErrorHandlerOptions {
  logger?: ErrorLogger;
}

interface NormalizedError {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  path: string;
  timestamp: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasErrorType(error: unknown, type: string): boolean {
  return isRecord(error) && error['type'] === type;
}

function hasPrismaCode(error: unknown, code: string): boolean {
  return isRecord(error) && error['code'] === code;
}

function normalizeError(error: unknown): NormalizedError {
  if (error instanceof ApiError) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    };
  }

  if (hasErrorType(error, 'entity.parse.failed')) {
    return {
      statusCode: 400,
      code: 'INVALID_JSON',
      message: 'The request body contains invalid JSON.',
    };
  }

  if (hasErrorType(error, 'entity.too.large')) {
    return {
      statusCode: 413,
      code: 'PAYLOAD_TOO_LARGE',
      message: 'The request body exceeds the allowed size.',
    };
  }

  if (hasPrismaCode(error, 'P2002')) {
    return {
      statusCode: 409,
      code: 'RESOURCE_CONFLICT',
      message: 'A resource with the provided unique data already exists.',
    };
  }

  if (hasPrismaCode(error, 'P2003')) {
    return {
      statusCode: 409,
      code: 'RELATION_CONFLICT',
      message: 'The operation conflicts with a related resource.',
    };
  }

  if (hasPrismaCode(error, 'P2025')) {
    return {
      statusCode: 404,
      code: 'RESOURCE_NOT_FOUND',
      message: 'The requested resource was not found.',
    };
  }

  return {
    statusCode: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred.',
  };
}

function createResponse(error: NormalizedError, path: string): ErrorResponse {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    },
    path,
    timestamp: new Date().toISOString(),
  };
}

export function createErrorHandler(options: ErrorHandlerOptions = {}): ErrorRequestHandler {
  const logger = options.logger ?? console;

  return (error: unknown, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    const normalizedError = normalizeError(error);

    if (normalizedError.statusCode >= 500) {
      logger.error('Unhandled API error.', {
        error,
        method: request.method,
        path: request.originalUrl,
      });
    }

    response
      .status(normalizedError.statusCode)
      .json(createResponse(normalizedError, request.originalUrl));
  };
}
