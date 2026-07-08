import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 100;

const ipMap = new Map<string, { count: number; resetAt: number }>();

function getIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = getIp(req);
  const now = Date.now();
  let entry = ipMap.get(ip);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    ipMap.set(ip, entry);
  }

  entry.count++;
  res.setHeader('X-RateLimit-Limit', String(MAX_REQUESTS));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, MAX_REQUESTS - entry.count)));

  if (entry.count > MAX_REQUESTS) {
    res.status(429).json({ error: 'Too many requests. Please slow down.' });
    return;
  }

  next();
}

export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  const csp = [
    "default-src 'self'",
    "script-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.googletagmanager.com 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https: http://images.unsplash.com https://img.youtube.com https://i.ytimg.com https://ui-avatars.com https://api.dicebear.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
    "connect-src 'self' https://*.supabase.co http://localhost:* https://www.googleapis.com https://kgsearch.googleapis.com https://www.youtube.com https://oembed.com",
    "media-src 'self' https://www.youtube.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  res.setHeader('Content-Security-Policy', csp);
  next();
}

export function sanitizeError(err: unknown, defaultMsg = 'Internal server error'): string {
  if (err instanceof Error) {
    const msg = err.message;
    if (
      msg.includes('Invalid API key') ||
      msg.includes('placeholder') ||
      msg.includes('password') ||
      msg.includes('secret') ||
      msg.includes('token') ||
      msg.includes('key')
    ) {
      return defaultMsg;
    }
    return msg;
  }
  return defaultMsg;
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const message = sanitizeError(err);
  console.error('[Security Error]', err instanceof Error ? err.message : err);
  res.status(500).json({ error: message });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  const adminClient = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  try {
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !user) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }
    (req as any).authenticatedUser = user;

    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('uid', user.id)
      .maybeSingle();

    (req as any).userRole = profile?.role || 'user';
    next();
  } catch {
    res.status(401).json({ error: 'Authentication failed' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req as any).userRole;
    if (!userRole || !roles.includes(userRole)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export function inputValidation(schema: Record<string, { type: string; required?: boolean; min?: number; max?: number; pattern?: RegExp }>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];
    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`Missing required field: ${field}`);
        continue;
      }
      if (value === undefined || value === null) continue;
      if (typeof value !== rules.type) {
        errors.push(`Field ${field} must be of type ${rules.type}`);
        continue;
      }
      if (typeof value === 'string') {
        if (rules.min && value.length < rules.min) errors.push(`Field ${field} must be at least ${rules.min} characters`);
        if (rules.max && value.length > rules.max) errors.push(`Field ${field} must be at most ${rules.max} characters`);
        if (rules.pattern && !rules.pattern.test(value)) errors.push(`Field ${field} has invalid format`);
      }
    }
    if (errors.length > 0) {
      res.status(400).json({ error: 'Validation failed', details: errors });
      return;
    }
    next();
  };
}

export function allowlistUpdate(allowedFields: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const sanitized: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        sanitized[key] = req.body[key];
      }
    }
    req.body = sanitized;
    next();
  };
}

export function cleanupIpMap(): void {
  const now = Date.now();
  for (const [ip, entry] of ipMap) {
    if (now > entry.resetAt) ipMap.delete(ip);
  }
}
setInterval(cleanupIpMap, 60 * 1000);
