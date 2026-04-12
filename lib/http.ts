import { NextResponse } from 'next/server';
import type { ZodTypeAny } from 'zod';
import { ZodError } from 'zod';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function apiError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return new ApiError(status, code, message, details);
}

export function jsonResponse<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function ok<T>(data: T, status = 200) {
  return jsonResponse(data, { status });
}

export function toErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.flatten(),
        },
      },
      { status: 422 },
    );
  }

  console.error(error);

  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unexpected server error',
      },
    },
    { status: 500 },
  );
}

export function route<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<NextResponse>,
) {
  return async (...args: TArgs) => {
    try {
      return await handler(...args);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

export async function parseJsonBody<T extends ZodTypeAny>(
  request: Request,
  schema: T,
) {
  const raw = await request.json().catch(() => {
    throw apiError(400, 'INVALID_JSON', 'Request body must be valid JSON');
  });

  return schema.parse(raw);
}
