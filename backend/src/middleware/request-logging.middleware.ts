import { Logger, LoggerService } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

// Request logging middleware
export function RequestLoggingMiddleware(
  logger: LoggerService,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const start = process.hrtime();
    const originalEnd = res.end.bind(res);
    res.end = function (this: Response, ...args: any[]) {
      const duration = process.hrtime(start);
      logger.log(
        `Request: ${req.method} ${req.url} ${req.headers['user-agent']} ${res.statusCode} ${duration[0] * 1000 + duration[1] / 1000000}ms`,
      );
      const response = originalEnd(...args);
      logger.log(
        `Response: ${res.statusCode} ${
          process.hrtime(start)[0] * 1000 + process.hrtime(start)[1] / 1000000
        }ms`,
      );

      return response;
    };

    next();
  };
}
