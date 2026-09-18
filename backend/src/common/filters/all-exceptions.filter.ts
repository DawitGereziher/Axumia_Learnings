import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * AllExceptionsFilter — single normalized error shape for all consumers.
 *
 * Handles:
 *   - NestJS HttpException (validation, guards, manual throws)
 *   - Prisma errors (P2002 unique, P2025 not found)
 *   - Unknown errors (never leaks stack traces in production)
 *
 * Response shape:
 *   { statusCode, message, error, path, timestamp }
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    // ── NestJS HttpException ──────────────────────────────────────────────────
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        message = (body.message as string | string[]) ?? exception.message;
      }
      error = HttpStatus[status] ?? 'Error';

    // ── Prisma known errors ───────────────────────────────────────────────────
    } else if (isPrismaError(exception)) {
      switch (exception.code) {
        case 'P2002': // Unique constraint violation
          status = HttpStatus.CONFLICT;
          message = 'A record with this value already exists';
          error = 'Conflict';
          break;
        case 'P2025': // Record not found
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          error = 'Not Found';
          break;
        case 'P2003': // Foreign key constraint
          status = HttpStatus.BAD_REQUEST;
          message = 'Invalid reference: related record does not exist';
          error = 'Bad Request';
          break;
        default:
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = 'Database error';
          error = 'Internal Server Error';
          this.logger.error(
            `Prisma error ${exception.code}: ${exception.message}`,
            exception.meta,
          );
      }

    // ── Unknown / unexpected errors ───────────────────────────────────────────
    } else {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      // In production never expose internals
      if (process.env.NODE_ENV !== 'production') {
        message = exception instanceof Error ? exception.message : String(exception);
      }
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}

// ── Type guard for Prisma errors ──────────────────────────────────────────────
function isPrismaError(
  err: unknown,
): err is { code: string; message: string; meta?: unknown } {
  if (typeof err !== 'object' || err === null) return false;
  const obj = err as Record<string, unknown>;
  return typeof obj.code === 'string' && obj.code.startsWith('P');
}
