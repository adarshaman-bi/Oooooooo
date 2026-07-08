import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

function createWindowedLimiter(windowMs: number, maxRequests: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = (req.headers['x-forwarded-for'] as string || req.ip || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
    const now = Date.now();

    let entry = stores.get(ip);
    if (!entry || now > (entry.get('_meta')?.resetAt || 0)) {
      entry = new Map();
      entry.set('_meta', { count: 0, resetAt: now + windowMs });
      entry.set('global', { count: 0, resetAt: now + windowMs });
      stores.set(ip, entry);
    }

    const meta = entry.get('_meta')!;

    if (now > meta.resetAt) {
      stores.delete(ip);
      return next();
    }

    meta.count++;
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - meta.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(meta.resetAt / 1000)));

    if (meta.count > maxRequests) {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((meta.resetAt - now) / 1000),
      });
      return;
    }

    next();
  };
}

export const globalLimiter = createWindowedLimiter(60 * 1000, 100);
export const authLimiter = createWindowedLimiter(60 * 1000, 10);
export const signupLimiter = createWindowedLimiter(60 * 1000, 3);
export const passwordResetLimiter = createWindowedLimiter(60 * 1000, 3);
export const searchLimiter = createWindowedLimiter(60 * 1000, 30);
export const uploadLimiter = createWindowedLimiter(60 * 1000, 5);
export const signedUrlLimiter = createWindowedLimiter(60 * 1000, 20);

export function applyEndpointLimits(app: any): void {
  app.use('/api/', globalLimiter);

  // Auth endpoints
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/signup', signupLimiter);
  app.use('/api/auth/password-reset', passwordResetLimiter);

  // Search
  app.use('/api/search/', searchLimiter);

  // Storage
  app.use('/api/upload', uploadLimiter);
  app.use('/api/storage/signed-url', signedUrlLimiter);
}

export function getRateLimitStoresSize(): number {
  return stores.size;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of stores) {
    const meta = entry.get('_meta');
    if (meta && now > meta.resetAt) stores.delete(ip);
  }
}, 60 * 1000);
