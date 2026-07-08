import { Request, Response, NextFunction } from 'express';

const SLOW_QUERY_THRESHOLD_MS = 500;

export function slowQueryLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  const originalEnd = res.end;
  res.end = function (this: Response, ...args: any[]) {
    const duration = Date.now() - start;
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      console.warn(JSON.stringify({
        type: 'slow_query',
        method: req.method,
        path: req.path,
        duration,
        threshold: SLOW_QUERY_THRESHOLD_MS,
        timestamp: new Date().toISOString(),
      }));
    }
    return originalEnd.apply(this, args);
  };

  next();
}
