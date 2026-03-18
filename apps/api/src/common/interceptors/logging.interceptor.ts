import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, originalUrl, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const delay = Date.now() - now;
        const statusCode = response.statusCode;
        this.logger.log(
          `[HTTP_SUCCESS] ${method} ${originalUrl} ${statusCode} - ${delay}ms - IP: ${ip} - UA: ${userAgent}`,
        );
      }),
      catchError((error: unknown) => {
        const delay = Date.now() - now;
        const statusCode =
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        const isSecurityEvent = [
          HttpStatus.UNAUTHORIZED,
          HttpStatus.FORBIDDEN,
          HttpStatus.TOO_MANY_REQUESTS,
        ].includes(statusCode);

        if (isSecurityEvent) {
          this.logger.warn(
            `[SECURITY_EVENT] ${method} ${originalUrl} ${statusCode} - ${delay}ms - IP: ${ip} - Err: ${errorMessage}`,
          );
        } else if (statusCode >= 500) {
          this.logger.error(
            `[HTTP_ERROR] ${method} ${originalUrl} ${statusCode} - ${delay}ms - IP: ${ip} - UA: ${userAgent} - Err: ${errorMessage}`,
            error instanceof Error ? error.stack : undefined,
          );
        } else {
          this.logger.log(
            `[HTTP_CLIENT_ERROR] ${method} ${originalUrl} ${statusCode} - ${delay}ms - IP: ${ip} - Err: ${errorMessage}`,
          );
        }

        return throwError(() => error);
      }),
    );
  }
}
