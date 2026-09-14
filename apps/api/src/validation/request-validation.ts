import type { Request, RequestHandler } from 'express';
import type { z } from 'zod';

import { ApiError } from '../errors/api-error.js';

const requestSegments = ['body', 'params', 'query'] as const;

type RequestSegment = (typeof requestSegments)[number];
type RequestSchema = z.ZodType;

export interface RequestSchemas {
  body?: RequestSchema;
  params?: RequestSchema;
  query?: RequestSchema;
}

export interface ValidatedRequestData<Body = unknown, Params = unknown, Query = unknown> {
  body: Body;
  params: Params;
  query: Query;
}

interface ValidationIssue {
  code: string;
  message: string;
  path: string;
}

type RequestWithValidation = Request & {
  validatedRequest?: ValidatedRequestData;
};

function formatPath(segment: RequestSegment, path: readonly PropertyKey[]): string {
  return [segment, ...path].map(String).join('.');
}

export function validateRequest(schemas: RequestSchemas): RequestHandler {
  return async (request, _response, next) => {
    const input: ValidatedRequestData = {
      body: request.body as unknown,
      params: request.params,
      query: request.query,
    };
    const validated: ValidatedRequestData = { ...input };
    const issues: ValidationIssue[] = [];

    for (const segment of requestSegments) {
      const schema = schemas[segment];
      if (!schema) continue;

      const result = await schema.safeParseAsync(input[segment]);
      if (result.success) {
        validated[segment] = result.data;
        continue;
      }

      issues.push(
        ...result.error.issues.map((issue) => ({
          code: issue.code,
          message: issue.message,
          path: formatPath(segment, issue.path),
        })),
      );
    }

    if (issues.length > 0) {
      next(
        new ApiError(422, 'VALIDATION_ERROR', 'The request contains invalid data.', {
          details: { issues },
        }),
      );
      return;
    }

    (request as RequestWithValidation).validatedRequest = validated;
    next();
  };
}

export function getValidatedRequest<Body = unknown, Params = unknown, Query = unknown>(
  request: Request,
): ValidatedRequestData<Body, Params, Query> {
  const validatedRequest = (request as RequestWithValidation).validatedRequest;

  if (!validatedRequest) {
    throw new Error(
      'Validated request data is unavailable. Add validateRequest before the handler.',
    );
  }

  return validatedRequest as ValidatedRequestData<Body, Params, Query>;
}
