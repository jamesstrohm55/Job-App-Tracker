import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import type { ApiErrorResponse } from '../types/common.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    const body: ApiErrorResponse = {
      success: false,
      error: {
        message: err.message,
        code: err.code,
        ...(err.details ? { details: err.details } : {}),
      },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  logger.error({ err }, 'Unhandled error');

  const body: ApiErrorResponse = {
    success: false,
    error: {
      message:
        process.env['NODE_ENV'] === 'production'
          ? 'Internal server error'
          : err.message,
      code: 'INTERNAL_ERROR',
    },
  };
  res.status(500).json(body);
}
